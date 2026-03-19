/**
 * API Test Executor tools — validate HTTP responses and capture metrics.
 * Ported from Python test_executor.py → TypeScript AgentTool.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";

// ── Types ────────────────────────────────────────────────

interface Response {
  status_code: number;
  headers: Record<string, string>;
  body: unknown;
  elapsed: number;
}

interface Assertion {
  type: "status_code" | "json_path" | "regex" | "contains";
  expression?: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in" | "matches";
  expected: unknown;
}

interface AssertionResult {
  type: string;
  expression?: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  error_message?: string;
}

// ── JSON Path extraction (simple) ─────────────────────────

function extractJsonPath(obj: unknown, path: string): unknown {
  const parts = path.replace(/^\$\.?/, "").split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    const bracketMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (bracketMatch) {
      current = current[bracketMatch[1]];
      if (Array.isArray(current)) current = current[Number(bracketMatch[2])];
      else return undefined;
    } else {
      current = current[part];
    }
  }
  return current;
}

// ── Assertion evaluation ──────────────────────────────────

function evaluateAssertion(response: Response, assertion: Assertion): AssertionResult {
  let actual: unknown;

  switch (assertion.type) {
    case "status_code":
      actual = response.status_code;
      break;
    case "json_path":
      actual = extractJsonPath(response.body, assertion.expression ?? "$");
      break;
    case "contains":
      actual = typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body);
      break;
    case "regex": {
      const text = typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body);
      try {
        actual = new RegExp(String(assertion.expected)).test(text);
      } catch {
        return { type: assertion.type, expected: assertion.expected, actual: null, passed: false, error_message: "Invalid regex" };
      }
      return { type: assertion.type, expected: assertion.expected, actual, passed: actual === true };
    }
    default:
      return { type: assertion.type, expected: assertion.expected, actual: null, passed: false, error_message: `Unknown type: ${assertion.type}` };
  }

  let passed = false;
  switch (assertion.operator) {
    case "eq": passed = actual === assertion.expected || String(actual) === String(assertion.expected); break;
    case "ne": passed = actual !== assertion.expected; break;
    case "gt": passed = Number(actual) > Number(assertion.expected); break;
    case "lt": passed = Number(actual) < Number(assertion.expected); break;
    case "gte": passed = Number(actual) >= Number(assertion.expected); break;
    case "lte": passed = Number(actual) <= Number(assertion.expected); break;
    case "in": passed = String(actual).includes(String(assertion.expected)); break;
    case "not_in": passed = !String(actual).includes(String(assertion.expected)); break;
    case "matches": {
      try { passed = new RegExp(String(assertion.expected)).test(String(actual)); } catch { passed = false; }
      break;
    }
  }

  return { type: assertion.type, expression: assertion.expression, expected: assertion.expected, actual, passed };
}

// ── Helpers ──────────────────────────────────────────────

function textResult(data: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

function classifyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("timeout")) return "timeout";
  if (lower.includes("connect") || lower.includes("econnrefused")) return "connection_error";
  if (lower.includes("401") || lower.includes("authentication")) return "authentication";
  if (lower.includes("403") || lower.includes("authorization")) return "authorization";
  if (lower.includes("404") || lower.includes("not found")) return "not_found";
  if (lower.includes("500") || lower.includes("server error")) return "server_error";
  if (lower.includes("assert")) return "assertion_failure";
  return "other";
}

// ── Tool Definitions ─────────────────────────────────────

const ValidateResponseParams = Type.Object({
  response_json: Type.String({ description: "JSON string of the HTTP response {status_code, headers, body, elapsed}" }),
  assertions_json: Type.String({ description: "JSON array of assertions [{type, expression?, operator, expected}]" }),
});

const CaptureMetricsParams = Type.Object({
  results_json: Type.String({ description: "JSON array of test results [{test_name, test_status, duration?, error_message?}]" }),
});

export function createTestExecutorTools(): AgentToolDef[] {
  const validateResponse: AgentToolDef<Static<typeof ValidateResponseParams>> = {
    name: "validate_response",
    label: "Validate Response",
    description: "Validate an API response against assertion rules (status code, JSON path, regex, contains)",
    parameters: ValidateResponseParams,
    execute: async (_id, params) => {
      try {
        const responseData = JSON.parse(params.response_json);
        const assertions: Assertion[] = JSON.parse(params.assertions_json);

        const response: Response = {
          status_code: responseData.status_code ?? responseData.statusCode ?? 0,
          headers: responseData.headers ?? {},
          body: responseData.body ?? responseData.data ?? {},
          elapsed: responseData.elapsed ?? (responseData.elapsed_ms ? responseData.elapsed_ms / 1000 : 0),
        };

        const results: AssertionResult[] = assertions.map((a) => evaluateAssertion(response, a));
        const passed = results.filter((r) => r.passed).length;
        const failed = results.length - passed;

        return textResult({
          status: "ok",
          all_passed: failed === 0,
          passed_count: passed,
          failed_count: failed,
          total_assertions: results.length,
          results,
        });
      } catch (e: any) {
        return textResult({ status: "error", error: e.message });
      }
    },
  };

  const captureMetrics: AgentToolDef<Static<typeof CaptureMetricsParams>> = {
    name: "capture_metrics",
    label: "Capture Metrics",
    description: "Analyze test results to produce performance statistics (pass rate, durations, error distribution)",
    parameters: CaptureMetricsParams,
    execute: async (_id, params) => {
      try {
        const results: Array<{ test_name?: string; test_status?: string; status?: string; duration?: number; error_message?: string }> =
          JSON.parse(params.results_json);

        let passed = 0, failed = 0, error = 0;
        const durations: number[] = [];
        const errorDist: Record<string, number> = {};

        for (const r of results) {
          const st = (r.test_status ?? r.status ?? "").toUpperCase();
          if (st === "PASSED") passed++;
          else if (st === "FAILED") failed++;
          else if (st === "ERROR") error++;

          if (r.duration != null) durations.push(r.duration);
          if (st !== "PASSED" && r.error_message) {
            const cat = classifyError(r.error_message);
            errorDist[cat] = (errorDist[cat] ?? 0) + 1;
          }
        }

        const total = results.length;
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

        // top 5 slowest
        const withDuration = results
          .filter((r) => r.duration != null)
          .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
          .slice(0, 5)
          .map((r) => ({ test_name: r.test_name, duration: r.duration }));

        return textResult({
          status: "ok",
          summary: {
            total_tests: total,
            passed,
            failed,
            error,
            skipped: total - passed - failed - error,
            pass_rate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
            avg_duration: Math.round(avgDuration * 100) / 100,
            min_duration: durations.length > 0 ? Math.min(...durations) : 0,
            max_duration: durations.length > 0 ? Math.max(...durations) : 0,
            total_duration: Math.round(durations.reduce((a, b) => a + b, 0) * 100) / 100,
          },
          slowest_tests: withDuration,
          error_distribution: errorDist,
        });
      } catch (e: any) {
        return textResult({ status: "error", error: e.message });
      }
    },
  };

  return [validateResponse, captureMetrics];
}
