/**
 * write_test_cases_html — reads YAML test case files and generates a self-contained HTML table.
 *
 * This tool is the fixed counterpart to run_test_suite: the report HTML comes from
 * run_test_suite (real execution data), and the test-cases HTML comes from here (design data).
 * Neither depends on the agent writing HTML manually.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { Type, type Static } from "@sinclair/typebox";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";
import type { ToolConfig } from "./config.js";

function text(data: unknown): AgentToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], details: data };
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtml(allCases: any[], suiteMeta: { name: string; modelId: string; endpoint: string }): string {
  const total = allCases.length;
  const categories = [...new Set(allCases.map((c) => c.category || "其他"))];
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  const categoryRows = categories.map((cat) => {
    const count = allCases.filter((c) => (c.category || "其他") === cat).length;
    return `<tr><td>${esc(cat)}</td><td>${count}</td></tr>`;
  }).join("\n");

  const caseRows = allCases.map((tc, idx) => {
    const db = tc.preconditions?.db_setup ?? {};
    const dbParts: string[] = [];
    if (db.user_info) dbParts.push(`user_level=${db.user_info.user_level}`);
    if (db.account_balance) dbParts.push(`avg_3m_balance=${db.account_balance.avg_3m_balance}`);
    if (db.cgs_social_security) dbParts.push(`social_security_flag=${db.cgs_social_security.social_security_flag}`);
    if (db.salary_summary) dbParts.push(`monthly_salary=${db.salary_summary.monthly_salary}`);
    const dbHtml = dbParts.length
      ? dbParts.map((p) => `<span class="db-tag">${esc(p)}</span>`).join(" ")
      : "<span class='na'>-</span>";

    const assertions = (tc.assertions ?? []).map((a: any) =>
      `<div class="assert-item"><code>${esc(a.path)}</code> ${esc(a.op)} <code>${esc(a.value)}</code>${a.desc ? ` <span class="assert-desc">— ${esc(a.desc)}</span>` : ""}</div>`
    ).join("");

    const priorityCls = (tc.priority ?? "P2").toLowerCase();
    const catBadge: Record<string, string> = {
      "正常流程": "badge-normal", "边界值": "badge-boundary",
      "等价类": "badge-ep", "异常流程": "badge-error",
    };
    const catCls = catBadge[tc.category] ?? "badge-other";

    return `
    <tr class="case-row" onclick="toggle(${idx})">
      <td class="tc-idx">${idx + 1}</td>
      <td class="tc-id">${esc(tc.id)}</td>
      <td>${esc(tc.name)}</td>
      <td><span class="badge ${catCls}">${esc(tc.category || "-")}</span></td>
      <td><span class="priority p${priorityCls}">${esc(tc.priority || "P2")}</span></td>
      <td class="cp-cell">${esc(tc.coverage_point || "-")}</td>
    </tr>
    <tr class="detail-row" id="d${idx}" style="display:none">
      <td colspan="6">
        <div class="detail-body">
          <div class="detail-section"><span class="dl">🗄 预置数据</span><div>${dbHtml}</div></div>
          <div class="detail-section"><span class="dl">✔ 断言检查点</span><div>${assertions || "<span class='na'>无</span>"}</div></div>
          ${tc.notes ? `<div class="detail-section"><span class="dl">📝 备注</span><div>${esc(tc.notes)}</div></div>` : ""}
        </div>
      </td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(suiteMeta.name)} — 测试用例</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6fa;color:#333;font-size:14px}
  .header{background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 100%);color:#fff;padding:24px 32px}
  .header h1{font-size:22px;font-weight:600;margin-bottom:4px}
  .header .meta{opacity:.8;font-size:13px}
  .container{max-width:1200px;margin:24px auto;padding:0 24px}
  .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
  .card{background:#fff;border-radius:8px;padding:20px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .card .val{font-size:36px;font-weight:700;color:#2e7d32}
  .card .lbl{color:#888;font-size:12px;margin-top:4px}
  .section{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px;overflow:hidden}
  .section-title{padding:14px 20px;font-weight:600;font-size:15px;border-bottom:1px solid #f0f0f0;background:#fafafa}
  table{width:100%;border-collapse:collapse}
  th{background:#f5f6fa;padding:10px 14px;text-align:left;font-weight:600;font-size:13px;color:#555;border-bottom:2px solid #e0e0e0}
  td{padding:10px 14px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  .case-row{cursor:pointer;transition:background .15s}
  .case-row:hover{background:#f0fff0}
  .detail-row td{padding:0;background:#f7fff7}
  .detail-body{padding:16px 20px;border-left:3px solid #2e7d32;display:flex;flex-direction:column;gap:10px}
  .detail-section{display:flex;gap:12px;align-items:flex-start}
  .dl{font-size:12px;font-weight:600;color:#555;white-space:nowrap;min-width:110px}
  .db-tag{display:inline-block;padding:2px 8px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:4px;font-family:monospace;font-size:12px;margin:2px}
  .assert-item{font-size:13px;padding:3px 0;border-bottom:1px dashed #e0e0e0}
  .assert-item:last-child{border-bottom:none}
  .assert-desc{color:#888;font-size:12px}
  code{background:#f0f0f0;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px}
  .tc-id{font-family:monospace;font-size:12px;color:#555}
  .tc-idx{color:#aaa;font-size:12px;text-align:center;width:36px}
  .cp-cell{font-size:12px;color:#444;max-width:300px}
  .badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:500}
  .badge-normal{background:#e8f5e9;color:#2e7d32}
  .badge-boundary{background:#fff3e0;color:#e65100}
  .badge-ep{background:#e3f2fd;color:#1565c0}
  .badge-error{background:#fce4ec;color:#c62828}
  .badge-other{background:#f3e5f5;color:#6a1b9a}
  .priority{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .pp0{background:#fce4ec;color:#c62828}
  .pp1{background:#fff3e0;color:#e65100}
  .pp2{background:#e3f2fd;color:#1565c0}
  .na{color:#bbb;font-style:italic}
  .footer{text-align:center;color:#aaa;font-size:12px;padding:20px;margin-top:8px}
</style>
</head>
<body>
<div class="header">
  <h1>📋 ${esc(suiteMeta.name)} — 测试用例集</h1>
  <div class="meta">模型: ${esc(suiteMeta.modelId)} &nbsp;|&nbsp; 接口: ${esc(suiteMeta.endpoint)} &nbsp;|&nbsp; 生成时间: ${now}</div>
</div>
<div class="container">
  <div class="summary-grid">
    <div class="card"><div class="val">${total}</div><div class="lbl">总用例数</div></div>
    <div class="card"><div class="val">${categories.length}</div><div class="lbl">覆盖分类数</div></div>
    <div class="card"><div class="val">${allCases.filter(c => c.priority === 'P0').length}</div><div class="lbl">P0 核心用例</div></div>
  </div>
  <div class="section">
    <div class="section-title">分类统计</div>
    <table><thead><tr><th>分类</th><th>用例数</th></tr></thead><tbody>${categoryRows}</tbody></table>
  </div>
  <div class="section">
    <div class="section-title">用例明细（点击行展开预置数据和断言）</div>
    <table>
      <thead><tr><th>#</th><th>用例ID</th><th>用例名称</th><th>分类</th><th>优先级</th><th>覆盖点</th></tr></thead>
      <tbody>${caseRows}</tbody>
    </table>
  </div>
</div>
<div class="footer">TestPilot 测试领航 · 自动生成测试用例集</div>
<script>
function toggle(i){var el=document.getElementById('d'+i);if(el)el.style.display=el.style.display==='none'?'table-row':'none';}
</script>
</body>
</html>`;
}

// ── Tool Definition ───────────────────────────────────────

const Params = Type.Object({
  yaml_dir: Type.String({
    description: "Directory containing the generated *.yaml test case files",
  }),
  model_id: Type.Optional(Type.String({
    description: "Model ID used in the output filename, e.g. MODEL001. Defaults to MODEL001.",
  })),
});

export function createTestCasesHtmlTools(config: ToolConfig): AgentToolDef[] {
  const tool: AgentToolDef<Static<typeof Params>> = {
    name: "write_test_cases_html",
    label: "Write Test Cases HTML",
    description:
      "Read all *.yaml test case files from a directory and generate a self-contained HTML test-cases document. " +
      "Saves the file to the download directory automatically. " +
      "Use this instead of write_output_file for the test cases deliverable.",
    parameters: Params,
    execute: async (_id, params) => {
      const yamlDir = resolve(params.yaml_dir);
      const modelId = params.model_id ?? "MODEL001";

      // Collect and parse YAML files
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

      const allCases: any[] = [];
      const suiteMeta = { name: `${modelId} 接口测试`, modelId, endpoint: "/mock/model/score" };

      for (const filePath of files) {
        try {
          const raw = readFileSync(filePath, "utf-8");
          const parsed = parseYaml(raw);
          if (parsed?.suite?.name) suiteMeta.name = parsed.suite.name;
          if (parsed?.suite?.model_id) suiteMeta.modelId = parsed.suite.model_id;
          if (parsed?.suite?.endpoint) suiteMeta.endpoint = parsed.suite.endpoint;
          for (const tc of (parsed?.test_cases ?? [])) {
            allCases.push(tc);
          }
        } catch {
          // skip unparseable files
        }
      }

      if (allCases.length === 0) {
        return text({ status: "error", error: "No test cases found in YAML files" });
      }

      const html = buildHtml(allCases, suiteMeta);
      const filename = `${modelId}_测试用例.html`;

      // Save to output dir
      if (!config.outputDir || !config.userId || !config.conversationId) {
        return text({ status: "error", error: "Output directory not configured" });
      }
      const outDir = resolve(config.outputDir, config.userId, config.conversationId);
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, filename);
      writeFileSync(outPath, html, "utf-8");

      return text({
        status: "ok",
        filename,
        total_cases: allCases.length,
        download_path: outPath,
      });
    },
  };

  return [tool];
}
