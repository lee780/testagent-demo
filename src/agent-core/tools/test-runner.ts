/**
 * Test Runner Tool — end-to-end: YAML → DB setup → HTTP call → validate → report
 *
 * run_test_suite(yaml_dir, base_url, report_path?)
 *   1. Scans the directory for *.yaml test case files
 *   2. For each case: upserts DB preconditions via Prisma
 *   3. POSTs the XML request to the mock endpoint
 *   4. Validates XML response against assertions (xpath-style //tag)
 *   5. Outputs a Markdown test report
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { Type, type Static } from "@sinclair/typebox";
import { getPrisma } from "../../server/config/database.js";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";
import type { ToolConfig } from "./config.js";

// ── Helpers ──────────────────────────────────────────────

function text(data: unknown): AgentToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], details: data };
}

/** Extract value of first matching tag from XML string, e.g. //result_code */
function extractXmlValue(xml: string, path: string): string | null {
  const tag = path.replace(/^\/+/, "");
  const re = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

/** Compare actual vs expected using assertion operator */
function applyOp(actual: string | null, op: string, expected: string): boolean {
  if (actual === null) return false;
  switch (op) {
    case "eq":  return actual === expected;
    case "ne":  return actual !== expected;
    case "gt":  return parseFloat(actual) > parseFloat(expected);
    case "lt":  return parseFloat(actual) < parseFloat(expected);
    case "gte": return parseFloat(actual) >= parseFloat(expected);
    case "lte": return parseFloat(actual) <= parseFloat(expected);
    case "contains": return actual.includes(expected);
    case "matches": return new RegExp(expected).test(actual);
    default:    return actual === expected;
  }
}

// ── DB setup ─────────────────────────────────────────────

interface DbSetup {
  user_info?: { user_id: string; user_level: number };
  account_balance?: { user_id: string; avg_3m_balance: number };
  cgs_social_security?: { user_id: string; social_security_flag: number };
  salary_summary?: { user_id: string; monthly_salary: number };
}

async function setupDb(db: DbSetup): Promise<void> {
  const prisma = getPrisma();

  if (db.user_info) {
    await prisma.mockUserInfo.upsert({
      where:  { userId: db.user_info.user_id },
      update: { userLevel: db.user_info.user_level },
      create: { userId: db.user_info.user_id, userLevel: db.user_info.user_level },
    });
  }
  if (db.account_balance) {
    await prisma.mockAccountBalance.upsert({
      where:  { userId: db.account_balance.user_id },
      update: { avg3mBalance: db.account_balance.avg_3m_balance },
      create: { userId: db.account_balance.user_id, avg3mBalance: db.account_balance.avg_3m_balance },
    });
  }
  if (db.cgs_social_security) {
    await prisma.mockSocialSecurity.upsert({
      where:  { userId: db.cgs_social_security.user_id },
      update: { socialSecurityFlag: db.cgs_social_security.social_security_flag },
      create: { userId: db.cgs_social_security.user_id, socialSecurityFlag: db.cgs_social_security.social_security_flag },
    });
  }
  if (db.salary_summary) {
    await prisma.mockSalarySummary.upsert({
      where:  { userId: db.salary_summary.user_id },
      update: { monthlySalary: db.salary_summary.monthly_salary },
      create: { userId: db.salary_summary.user_id, monthlySalary: db.salary_summary.monthly_salary },
    });
  }
}

// ── Suite config (read from YAML suite section) ──────────

interface SuiteConfig {
  endpoint: string;
  method: string;
  contentType: string;
}

// ── Concurrency helper ────────────────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ── Single test case runner ───────────────────────────────

interface AssertionResult {
  path: string;
  op: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  desc?: string;
}

interface CaseResult {
  id: string;
  name: string;
  category: string;
  priority: string;
  coverage_point?: string;
  status: "PASSED" | "FAILED" | "ERROR";
  duration_ms: number;
  http_status?: number;
  request_url?: string;
  request_body?: string;
  response_body?: string;
  db_setup_summary?: string;
  assertions: AssertionResult[];
  error?: string;
}

async function runOneCase(tc: any, baseUrl: string, suite: SuiteConfig): Promise<CaseResult> {
  const start = Date.now();
  const id: string = tc.id ?? "UNKNOWN";
  const name: string = tc.name ?? "";
  const category: string = tc.category ?? "";
  const priority: string = tc.priority ?? "P2";
  const coverage_point: string | undefined = tc.coverage_point;

  try {
    // 1. DB preconditions
    const dbSetup: DbSetup = tc.preconditions?.db_setup ?? {};
    await setupDb(dbSetup);

    // Build human-readable DB setup summary
    const dbParts: string[] = [];
    if (dbSetup.user_info) dbParts.push(`user_level=${dbSetup.user_info.user_level}`);
    if (dbSetup.account_balance) dbParts.push(`avg_3m_balance=${dbSetup.account_balance.avg_3m_balance}`);
    if (dbSetup.cgs_social_security) dbParts.push(`social_security_flag=${dbSetup.cgs_social_security.social_security_flag}`);
    if (dbSetup.salary_summary) dbParts.push(`monthly_salary=${dbSetup.salary_summary.monthly_salary}`);
    const db_setup_summary = dbParts.length > 0 ? dbParts.join("  |  ") : "（无预置数据）";

    // 2. HTTP request — endpoint/method/content-type from suite config
    const requestBody: string = tc.request?.body ?? "";
    const requestUrl = `${baseUrl}${suite.endpoint}`;

    const resp = await fetch(requestUrl, {
      method: suite.method,
      headers: { "Content-Type": suite.contentType },
      body: requestBody,
    });

    const responseXml = await resp.text();
    const duration_ms = Date.now() - start;

    // 3. Validate assertions
    const assertions: any[] = tc.assertions ?? [];
    const results: AssertionResult[] = assertions.map((a: any) => {
      const actual = extractXmlValue(responseXml, a.path ?? "");
      const passed = applyOp(actual, a.op ?? "eq", String(a.value ?? ""));
      return { path: a.path, op: a.op, expected: String(a.value), actual, passed, desc: a.desc };
    });

    const allPassed = results.every((r) => r.passed);

    return {
      id, name, category, priority, coverage_point,
      status: allPassed ? "PASSED" : "FAILED",
      duration_ms,
      http_status: resp.status,
      request_url: requestUrl,
      request_body: requestBody,
      response_body: responseXml,
      db_setup_summary,
      assertions: results,
    };
  } catch (err: any) {
    return {
      id, name, category, priority, coverage_point,
      status: "ERROR",
      duration_ms: Date.now() - start,
      assertions: [],
      error: err.message ?? String(err),
    };
  }
}

// ── Markdown report ───────────────────────────────────────

function buildReport(results: CaseResult[], baseUrl: string, durationMs: number, suiteName = "接口测试"): string {
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  const errors = results.filter((r) => r.status === "ERROR").length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  const lines: string[] = [
    `# ${suiteName} — 测试报告`,
    ``,
    `- **生成时间**: ${now}`,
    `- **被测地址**: ${baseUrl}/mock/model/score`,
    `- **总耗时**: ${(durationMs / 1000).toFixed(2)}s`,
    ``,
    `## 汇总`,
    ``,
    `| 指标 | 数值 |`,
    `|------|------|`,
    `| 总用例数 | ${total} |`,
    `| 通过 | ✅ ${passed} |`,
    `| 失败 | ❌ ${failed} |`,
    `| 错误 | ⚠️ ${errors} |`,
    `| 通过率 | **${passRate}%** |`,
    ``,
    `## 详细结果`,
    ``,
  ];

  for (const r of results) {
    const icon = r.status === "PASSED" ? "✅" : r.status === "FAILED" ? "❌" : "⚠️";
    lines.push(`### ${icon} [${r.status}] ${r.id} — ${r.name}`);
    lines.push(``);
    lines.push(`- 分类: ${r.category}  优先级: ${r.priority}  耗时: ${r.duration_ms}ms  HTTP: ${r.http_status ?? "N/A"}`);
    if (r.error) {
      lines.push(`- **错误**: ${r.error}`);
    }
    if (r.assertions.length > 0) {
      lines.push(``);
      lines.push(`| 断言 | 期望 | 实际 | 结果 |`);
      lines.push(`|------|------|------|------|`);
      for (const a of r.assertions) {
        const icon2 = a.passed ? "✅" : "❌";
        lines.push(`| ${a.desc ?? a.path} \`${a.op}\` | \`${a.expected}\` | \`${a.actual ?? "null"}\` | ${icon2} |`);
      }
    }
    lines.push(``);
  }

  // Failed cases summary at bottom
  const failedCases = results.filter((r) => r.status !== "PASSED");
  if (failedCases.length > 0) {
    lines.push(`## 失败/异常用例汇总`);
    lines.push(``);
    for (const r of failedCases) {
      lines.push(`- **${r.id}** (${r.status}): ${r.name}`);
      for (const a of r.assertions.filter((a) => !a.passed)) {
        lines.push(`  - \`${a.path}\`: 期望 \`${a.expected}\` 实际 \`${a.actual ?? "null"}\``);
      }
      if (r.error) lines.push(`  - 错误: ${r.error}`);
    }
  }

  return lines.join("\n");
}

// ── HTML Report (HttpRunner style) ───────────────────────

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtmlReport(results: CaseResult[], baseUrl: string, durationMs: number, suiteName = "MODEL_001 接口测试"): string {
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  const errors = results.filter((r) => r.status === "ERROR").length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  const durationS = (durationMs / 1000).toFixed(2);

  // Per-category summary
  const categories = [...new Set(results.map((r) => r.category || "其他"))];
  const catRows = categories.map((cat) => {
    const catRes = results.filter((r) => (r.category || "其他") === cat);
    const cp = catRes.filter((r) => r.status === "PASSED").length;
    return `<tr><td>${esc(cat)}</td><td>${catRes.length}</td><td class="pass">${cp}</td><td class="fail">${catRes.length - cp}</td></tr>`;
  }).join("\n");

  // Coverage point summary table
  const coverageMap = new Map<string, { total: number; passed: number }>();
  for (const r of results) {
    const cp = r.coverage_point ?? "（未标注）";
    const prev = coverageMap.get(cp) ?? { total: 0, passed: 0 };
    coverageMap.set(cp, {
      total: prev.total + 1,
      passed: prev.passed + (r.status === "PASSED" ? 1 : 0),
    });
  }
  const coverageRows = [...coverageMap.entries()].map(([cp, s]) => {
    const allPass = s.passed === s.total;
    const cls = allPass ? "pass" : "fail";
    const icon = allPass ? "✅" : "❌";
    return `<tr><td class="cp-cell">${esc(cp)}</td><td>${s.total}</td><td class="${cls}">${s.passed}</td><td class="${s.total - s.passed > 0 ? "fail" : "pass"}">${s.total - s.passed}</td><td>${icon}</td></tr>`;
  }).join("\n");

  // Case rows with execution detail
  const caseRows = results.map((r) => {
    const statusCls = r.status === "PASSED" ? "badge-pass" : r.status === "FAILED" ? "badge-fail" : "badge-error";
    const assertHtml = r.assertions.map((a) => {
      const cls = a.passed ? "assert-pass" : "assert-fail";
      return `<div class="assert-row ${cls}">
        <span class="assert-icon">${a.passed ? "✓" : "✗"}</span>
        <span class="assert-desc">${esc(a.desc ?? a.path)}</span>
        <span class="assert-detail">期望 <code>${esc(a.expected)}</code> · 实际 <code>${esc(String(a.actual ?? "null"))}</code></span>
      </div>`;
    }).join("\n");
    const errorHtml = r.error ? `<div class="error-msg">⚠ ${esc(r.error)}</div>` : "";
    const coverageTag = r.coverage_point
      ? `<span class="cp-tag" title="设计来源">${esc(r.coverage_point)}</span>` : "";
    const reqHtml = r.request_body
      ? `<div class="log-block"><div class="log-label">📤 请求报文 <span class="log-url">${esc(r.request_url ?? "")}</span></div><pre class="log-pre">${esc(r.request_body)}</pre></div>` : "";
    const respHtml = r.response_body
      ? `<div class="log-block"><div class="log-label">📥 应答报文</div><pre class="log-pre">${esc(r.response_body)}</pre></div>` : "";
    const dbHtml = r.db_setup_summary
      ? `<div class="log-block"><div class="log-label">🗄 埋数（DB preconditions）</div><div class="log-db">${esc(r.db_setup_summary)}</div></div>` : "";
    return `
    <tr class="case-row" onclick="toggleDetail('${esc(r.id)}')">
      <td><span class="badge ${statusCls}">${r.status}</span></td>
      <td class="case-id">${esc(r.id)}</td>
      <td>${esc(r.name)}${coverageTag}</td>
      <td>${esc(r.category)}</td>
      <td><span class="priority-badge p${r.priority.toLowerCase()}">${r.priority}</span></td>
      <td>${r.http_status ?? "-"}</td>
      <td>${r.duration_ms}ms</td>
    </tr>
    <tr class="detail-row" id="detail-${esc(r.id)}" style="display:none">
      <td colspan="7">
        <div class="detail-body">
          ${errorHtml}
          ${dbHtml}
          ${reqHtml}
          ${respHtml}
          <div class="log-block assertions-block">
            <div class="log-label">✔ 检查点断言</div>
            ${assertHtml || "<div class='no-assert'>无断言</div>"}
          </div>
        </div>
      </td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(suiteName)} — 测试报告</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;color:#333;font-size:14px}
  .header{background:linear-gradient(135deg,#1a237e 0%,#283593 100%);color:#fff;padding:24px 32px}
  .header h1{font-size:22px;font-weight:600;margin-bottom:4px}
  .header .meta{opacity:.8;font-size:13px}
  .container{max-width:1200px;margin:24px auto;padding:0 24px}
  .summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:24px}
  .summary-card{background:#fff;border-radius:8px;padding:20px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .summary-card .value{font-size:32px;font-weight:700;line-height:1.2}
  .summary-card .label{color:#888;font-size:12px;margin-top:4px}
  .summary-card.total .value{color:#333}
  .summary-card.pass .value{color:#2e7d32}
  .summary-card.fail .value{color:#c62828}
  .summary-card.error .value{color:#e65100}
  .summary-card.rate .value{color:#1565c0}
  .progress-bar{height:8px;background:#e0e0e0;border-radius:4px;margin:16px 0;overflow:hidden}
  .progress-fill{height:100%;background:linear-gradient(90deg,#2e7d32,#66bb6a);border-radius:4px;transition:width .3s}
  .section{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px;overflow:hidden}
  .section-title{padding:14px 20px;font-weight:600;font-size:15px;border-bottom:1px solid #f0f0f0;background:#fafafa}
  table{width:100%;border-collapse:collapse}
  th{background:#f5f6fa;padding:10px 14px;text-align:left;font-weight:600;font-size:13px;color:#555;border-bottom:2px solid #e0e0e0}
  td{padding:10px 14px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  .case-row{cursor:pointer;transition:background .15s}
  .case-row:hover{background:#f9f9ff}
  .detail-row td{padding:0;background:#f7f8ff}
  .detail-body{padding:16px 20px;border-left:3px solid #3f51b5}
  .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600}
  .badge-pass{background:#e8f5e9;color:#2e7d32}
  .badge-fail{background:#ffebee;color:#c62828}
  .badge-error{background:#fff3e0;color:#e65100}
  .priority-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .priority-badge.pp0{background:#fce4ec;color:#c62828}
  .priority-badge.pp1{background:#fff3e0;color:#e65100}
  .priority-badge.pp2{background:#e3f2fd;color:#1565c0}
  .assert-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #eee;flex-wrap:wrap}
  .assert-row:last-child{border-bottom:none}
  .assert-pass .assert-icon{color:#2e7d32;font-weight:700}
  .assert-fail .assert-icon{color:#c62828;font-weight:700}
  .assert-desc{font-weight:500;min-width:120px}
  .assert-detail{color:#666;font-size:13px}
  code{background:#f0f0f0;padding:1px 6px;border-radius:3px;font-family:monospace;font-size:12px}
  .error-msg{color:#c62828;background:#ffebee;padding:8px 12px;border-radius:4px;margin-bottom:8px}
  .no-assert{color:#aaa;font-style:italic}
  .pass{color:#2e7d32;font-weight:600}
  .fail{color:#c62828;font-weight:600}
  .case-id{font-family:monospace;font-size:12px;color:#555}
  .footer{text-align:center;color:#aaa;font-size:12px;padding:20px;margin-top:8px}
  /* execution log styles */
  .cp-tag{display:inline-block;margin-left:8px;padding:1px 8px;background:#e8f4fd;color:#1565c0;border-radius:10px;font-size:11px;font-weight:500;vertical-align:middle}
  .cp-cell{font-size:12px;color:#444;max-width:360px}
  .log-block{margin-bottom:12px}
  .log-block:last-child{margin-bottom:0}
  .log-label{font-size:12px;font-weight:600;color:#555;margin-bottom:6px}
  .log-url{font-weight:400;color:#888;font-family:monospace;font-size:11px;margin-left:6px}
  .log-pre{background:#f5f6fa;border:1px solid #e0e0e0;border-radius:4px;padding:10px 12px;font-family:monospace;font-size:12px;color:#333;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto}
  .log-db{background:#f5f6fa;border:1px solid #e0e0e0;border-radius:4px;padding:8px 12px;font-family:monospace;font-size:12px;color:#333}
  .assertions-block .assert-row{padding:8px 0}
</style>
</head>
<body>
<div class="header">
  <h1>📊 ${esc(suiteName)}</h1>
  <div class="meta">生成时间: ${now} &nbsp;|&nbsp; 被测地址: ${esc(baseUrl)}/mock/model/score &nbsp;|&nbsp; 总耗时: ${durationS}s</div>
</div>
<div class="container">

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card total"><div class="value">${total}</div><div class="label">总用例数</div></div>
    <div class="summary-card pass"><div class="value">${passed}</div><div class="label">通过</div></div>
    <div class="summary-card fail"><div class="value">${failed}</div><div class="label">失败</div></div>
    <div class="summary-card error"><div class="value">${errors}</div><div class="label">错误</div></div>
    <div class="summary-card rate"><div class="value">${passRate}%</div><div class="label">通过率</div></div>
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${passRate}%"></div></div>

  <!-- Category Summary -->
  <div class="section">
    <div class="section-title">按分类汇总</div>
    <table>
      <thead><tr><th>分类</th><th>总数</th><th>通过</th><th>失败/错误</th></tr></thead>
      <tbody>${catRows}</tbody>
    </table>
  </div>

  <!-- Coverage Traceability Table -->
  <div class="section">
    <div class="section-title">设计追溯（思维导图覆盖点 → 执行结果）</div>
    <table>
      <thead><tr><th>覆盖点（思维导图节点）</th><th>用例数</th><th>通过</th><th>失败/错误</th><th>结果</th></tr></thead>
      <tbody>${coverageRows}</tbody>
    </table>
  </div>

  <!-- Case Details -->
  <div class="section">
    <div class="section-title">用例明细（点击行展开：埋数 / 请求报文 / 应答报文 / 检查点）</div>
    <table>
      <thead><tr><th>状态</th><th>用例ID</th><th>用例名称</th><th>分类</th><th>优先级</th><th>HTTP</th><th>耗时</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </div>

</div>
<div class="footer">TestPilot 测试领航 · 自动化测试报告 · 参考 HttpRunner 报告体系</div>
<script>
function toggleDetail(id){
  var el=document.getElementById('detail-'+id);
  if(el) el.style.display=el.style.display==='none'?'table-row':'none';
}
</script>
</body>
</html>`;
}

// ── Save raw test case data for later import ─────────────

function saveRawTestCases(
  cases: Array<unknown>,
  outputDir: string,
  userId: string,
  conversationId: string,
): string | undefined {
  if (!outputDir || !userId || !conversationId) return undefined;
  try {
    const outDir = resolve(outputDir, userId, conversationId);
    mkdirSync(outDir, { recursive: true });
    const rawPath = join(outDir, "test_cases_raw.json");
    writeFileSync(rawPath, JSON.stringify(cases, null, 2), "utf-8");
    return rawPath;
  } catch {
    return undefined;
  }
}

// ── Tool Definition ───────────────────────────────────────

const RunTestSuiteParams = Type.Object({
  yaml_dir: Type.String({
    description: "Directory containing *.yaml test case files generated from the test case template",
  }),
  base_url: Type.Optional(Type.String({
    description: "Base URL of the system under test (default: http://localhost:8000)",
  })),
  report_path: Type.Optional(Type.String({
    description: "Output path for the Markdown test report (default: <yaml_dir>/test_report.md)",
  })),
});

export function createTestRunnerTools(config?: ToolConfig): AgentToolDef[] {
  const runTestSuite: AgentToolDef<Static<typeof RunTestSuiteParams>> = {
    name: "run_test_suite",
    label: "Run Test Suite",
    description:
      "Execute all YAML test cases in a directory against the mock API: sets up DB preconditions, " +
      "sends HTTP requests, validates assertions, and writes a Markdown test report.",
    parameters: RunTestSuiteParams,
    execute: async (_id, params) => {
      const baseUrl = params.base_url ?? "http://localhost:8000";
      const yamlDir = resolve(params.yaml_dir);

      // Collect yaml files
      let files: string[];
      try {
        files = readdirSync(yamlDir)
          .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
          .sort()
          .map((f) => join(yamlDir, f));
      } catch (err: any) {
        return text({ status: "error", error: `Cannot read directory: ${err.message}` });
      }

      if (files.length === 0) {
        return text({ status: "error", error: `No .yaml files found in: ${yamlDir}` });
      }

      const suiteStart = Date.now();
      const parseErrors: CaseResult[] = [];
      let suiteName = "接口测试";

      // Phase 1: parse all YAML files, collect cases + suite configs
      const allJobs: Array<{ tc: any; suite: SuiteConfig }> = [];
      for (const filePath of files) {
        let parsed: any;
        try {
          const raw = readFileSync(filePath, "utf-8");
          parsed = parseYaml(raw);
        } catch (err: any) {
          parseErrors.push({
            id: filePath, name: filePath, category: "", priority: "P2",
            status: "ERROR", duration_ms: 0, assertions: [],
            error: `YAML parse error: ${err.message}`,
          });
          continue;
        }

        if (parsed?.suite?.name && suiteName === "接口测试") {
          suiteName = parsed.suite.name;
        }

        const suiteConfig: SuiteConfig = {
          endpoint: parsed?.suite?.endpoint ?? "/mock/model/score",
          method: (parsed?.suite?.method ?? "POST").toUpperCase(),
          contentType: parsed?.suite?.content_type ?? "application/xml; charset=utf-8",
        };

        for (const tc of (parsed?.test_cases ?? [])) {
          allJobs.push({ tc, suite: suiteConfig });
        }
      }

      // Save raw test case data to output dir for later manual import
      if (config?.outputDir && config?.userId && config?.conversationId) {
        saveRawTestCases(allJobs.map(j => j.tc), config.outputDir, config.userId, config.conversationId);
      }

      // Phase 2: run cases concurrently (limit 10), emit progress after each
      const total = allJobs.length;
      let completed = 0;
      let progressPassed = 0;
      let progressFailed = 0;

      const concurrentResults = await runWithConcurrency(allJobs, 10, async ({ tc, suite }) => {
        const result = await runOneCase(tc, baseUrl, suite);
        completed++;
        if (result.status === "PASSED") progressPassed++;
        else if (result.status === "FAILED") progressFailed++;
        config?.onProgress?.({
          caseId: result.id,
          caseName: result.name,
          status: result.status,
          current: completed,
          total,
          passed: progressPassed,
          failed: progressFailed,
        });
        return result;
      });

      const allResults: CaseResult[] = [...parseErrors, ...concurrentResults];
      const suiteDuration = Date.now() - suiteStart;
      const report = buildReport(allResults, baseUrl, suiteDuration, suiteName);
      const htmlReport = buildHtmlReport(allResults, baseUrl, suiteDuration, suiteName);

      // Write Markdown report
      const reportPath = params.report_path ?? join(yamlDir, "test_report.md");
      const htmlReportPath = reportPath.replace(/\.md$/, ".html");
      try {
        mkdirSync(dirname(reportPath), { recursive: true });
        writeFileSync(reportPath, report, "utf-8");
        writeFileSync(htmlReportPath, htmlReport, "utf-8");
      } catch (err: any) {
        return text({ status: "error", error: `Cannot write report: ${err.message}` });
      }

      const passed = allResults.filter((r) => r.status === "PASSED").length;
      const failed = allResults.filter((r) => r.status === "FAILED").length;
      const errors = allResults.filter((r) => r.status === "ERROR").length;

      // Also copy reports to the agent output dir so the frontend download panel can list them
      let downloadPath: string | undefined;
      let htmlDownloadPath: string | undefined;
      if (config?.outputDir && config.userId && config.conversationId) {
        try {
          const outDir = resolve(config.outputDir, config.userId, config.conversationId);
          mkdirSync(outDir, { recursive: true });
          const outFile = join(outDir, basename(reportPath));
          const htmlOutFile = join(outDir, basename(htmlReportPath));
          writeFileSync(outFile, report, "utf-8");
          writeFileSync(htmlOutFile, htmlReport, "utf-8");
          downloadPath = outFile;
          htmlDownloadPath = htmlOutFile;
        } catch {
          // non-fatal
        }
      }

      return text({
        status: "ok",
        summary: {
          total: allResults.length,
          passed,
          failed,
          errors,
          pass_rate: allResults.length > 0
            ? `${((passed / allResults.length) * 100).toFixed(1)}%`
            : "0.0%",
          duration_ms: suiteDuration,
        },
        report_path: reportPath,
        html_report_path: htmlReportPath,
        download_path: downloadPath,
        html_download_path: htmlDownloadPath,
        failed_cases: allResults
          .filter((r) => r.status !== "PASSED")
          .map((r) => ({
            id: r.id,
            name: r.name,
            status: r.status,
            failed_assertions: r.assertions
              .filter((a) => !a.passed)
              .map((a) => `${a.path}: expected=${a.expected} actual=${a.actual}`),
            error: r.error,
          })),
      });
    },
  };

  return [runTestSuite];
}
