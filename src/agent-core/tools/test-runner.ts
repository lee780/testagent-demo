/**
 * Test Runner Tool — end-to-end: YAML → DB setup → HTTP call → validate → report
 *
 * run_test_suite(yaml_dir, base_url)
 *   1. Scans the directory for *.yaml test case files
 *   2. For each case: upserts DB preconditions via Prisma
 *   3. POSTs the XML request to the mock endpoint
 *   4. Validates XML response against assertions (xpath-style //tag)
 *   5. Auto-saves TestReport record to DB; returns report_id
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { Type, type Static } from "@sinclair/typebox";
import { getPrisma } from "../../server/config/database.js";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";
import type { ToolConfig } from "./config.js";

// ── Recommendation generator ─────────────────────────────

function buildRecommendation(results: CaseResult[]): string {
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status !== "PASSED").length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const p0Failed = results.filter((r) => r.status !== "PASSED" && r.priority === "P0").length;
  const p1Failed = results.filter((r) => r.status !== "PASSED" && r.priority === "P1").length;

  const lines: string[] = [];

  if (p0Failed > 0) {
    lines.push(`❌ 存在 ${p0Failed} 个 P0 核心用例失败，系统存在高风险问题，建议修复后再入库。`);
  } else if (p1Failed > 0) {
    lines.push(`⚠️ 存在 ${p1Failed} 个 P1 用例失败，建议评估影响范围后决定是否入库。`);
  } else if (failed > 0) {
    lines.push(`ℹ️ 存在 ${failed} 个非核心用例失败，整体风险较低，可入库并跟踪缺陷。`);
  } else {
    lines.push(`✅ 全部用例通过，质量良好，可以入库。`);
  }

  if (passRate < 80) {
    lines.push(`通过率 ${passRate.toFixed(1)}% 低于 80%，建议全面排查失败原因后重新执行。`);
  } else if (passRate < 100) {
    lines.push(`通过率 ${passRate.toFixed(1)}%，请针对失败用例创建缺陷并跟踪修复。`);
  } else {
    lines.push(`通过率 100%，建议执行回归测试后将用例升级为基线。`);
  }

  return lines.join("\n");
}

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

async function setupExternal(userId: string, ext: Record<string, unknown>): Promise<void> {
  const prisma = getPrisma();
  await prisma.mockExternalIndicator.upsert({
    where: { userId },
    update: {
      cardStatus: String(ext.card_status ?? 'NORMAL'),
      recentTransAmount: String(ext.recent_trans_amount ?? 0),
      idCheckResult: String(ext.id_check_result ?? 'PASS'),
      isBlack: Boolean(ext.is_black ?? false),
    },
    create: {
      userId,
      cardStatus: String(ext.card_status ?? 'NORMAL'),
      recentTransAmount: String(ext.recent_trans_amount ?? 0),
      idCheckResult: String(ext.id_check_result ?? 'PASS'),
      isBlack: Boolean(ext.is_black ?? false),
    },
  });
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

    // 1b. External indicator setup（支持命名场景引用 + 直接定义两种方式）
    const sceneRef: string | undefined = tc.preconditions?.external_setup_ref;
    let externalSetup: Record<string, unknown> = { ...(tc.preconditions?.external_setup ?? {}) };
    if (sceneRef) {
      const { getPrisma } = await import('../../server/config/database.js');
      const scene = await getPrisma().mockScene.findUnique({ where: { name: sceneRef } });
      if (!scene) throw new Error(`挡板场景 "${sceneRef}" 不存在，请先在知识库中创建`);
      // scene.setupData 作为基础，external_setup 中的字段优先覆盖
      externalSetup = { ...(scene.setupData as Record<string, unknown>), ...externalSetup };
    }
    if (Object.keys(externalSetup).length > 0 && dbSetup.user_info?.user_id) {
      await setupExternal(dbSetup.user_info.user_id, externalSetup);
    }

    // Build human-readable DB setup summary
    const dbParts: string[] = [];
    if (dbSetup.user_info) dbParts.push(`user_level=${dbSetup.user_info.user_level}`);
    if (dbSetup.account_balance) dbParts.push(`avg_3m_balance=${dbSetup.account_balance.avg_3m_balance}`);
    if (dbSetup.cgs_social_security) dbParts.push(`social_security_flag=${dbSetup.cgs_social_security.social_security_flag}`);
    if (dbSetup.salary_summary) dbParts.push(`monthly_salary=${dbSetup.salary_summary.monthly_salary}`);
    if (sceneRef) dbParts.push(`scene=${sceneRef}`);
    if (Object.keys(externalSetup).length > 0) {
      if (externalSetup.card_status !== undefined) dbParts.push(`card_status=${externalSetup.card_status}`);
      if (externalSetup.id_check_result !== undefined) dbParts.push(`id_check=${externalSetup.id_check_result}`);
      if (externalSetup.is_black !== undefined) dbParts.push(`is_black=${externalSetup.is_black}`);
    }
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

// ── Tool Definition ───────────────────────────────────────

const RunTestSuiteParams = Type.Object({
  yaml_dir: Type.String({
    description: "Directory containing *.yaml test case files",
  }),
  base_url: Type.Optional(Type.String({
    description: "Base URL of the system under test (default: http://localhost:8000)",
  })),
});

export function createTestRunnerTools(config?: ToolConfig): AgentToolDef[] {
  const runTestSuite: AgentToolDef<Static<typeof RunTestSuiteParams>> = {
    name: "run_test_suite",
    label: "Run Test Suite",
    description:
      "Execute all YAML test cases in a directory against the mock API: sets up DB preconditions, " +
      "sends HTTP requests, validates assertions, and auto-saves a TestReport record to DB.",
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

      const passed = allResults.filter((r) => r.status === "PASSED").length;
      const failed = allResults.filter((r) => r.status === "FAILED").length;
      const errors = allResults.filter((r) => r.status === "ERROR").length;
      const recommendation = buildRecommendation(allResults);

      // Auto-create report record in DB
      let reportId: string | undefined;
      if (config?.userId && config?.conversationId) {
        try {
          const prisma = getPrisma();
          const modeStr = config.mode ?? "systematic";
          const modeLabel: Record<string, string> = { systematic: "系统化", regression: "回归", exploratory: "探索", chaos: "混沌" };
          const dateStr = new Date().toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
          const reportName = `${suiteName} [${modeLabel[modeStr] ?? modeStr}] ${dateStr}`;
          const reportRecord = await prisma.testReport.create({
            data: {
              name: reportName,
              conversationId: config.conversationId,
              executionMode: config.mode ?? "systematic",
              htmlFile: null as any,
              executionResults: allResults as any,
              testCasesData: allJobs.map((j) => j.tc) as any,
              recommendation,
              uploadedDocs: config.uploadedFiles ?? [],
              createdBy: config.userId,
            },
          });
          reportId = reportRecord.id;
        } catch {
          // non-fatal — summary still returned to agent
        }
      }

      return text({
        status: "ok",
        report_id: reportId,
        report_url: reportId ? `/reports/${reportId}` : undefined,
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
        recommendation,
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
