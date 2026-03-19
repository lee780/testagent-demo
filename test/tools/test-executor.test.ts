import { describe, it, expect } from "vitest";
import { createTestExecutorTools } from "../../src/agent-core/tools/test-executor.js";

const tools = createTestExecutorTools();
const validateResponse = tools.find((t) => t.name === "validate_response")!;
const captureMetrics = tools.find((t) => t.name === "capture_metrics")!;

describe("validate_response", () => {
  it("should pass when status code matches", async () => {
    const result = await validateResponse.execute("tc1", {
      response_json: JSON.stringify({ status_code: 200, headers: {}, body: { ok: true } }),
      assertions_json: JSON.stringify([{ type: "status_code", operator: "eq", expected: 200 }]),
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.all_passed).toBe(true);
    expect(data.passed_count).toBe(1);
  });

  it("should fail when status code does not match", async () => {
    const result = await validateResponse.execute("tc2", {
      response_json: JSON.stringify({ status_code: 404, headers: {}, body: {} }),
      assertions_json: JSON.stringify([{ type: "status_code", operator: "eq", expected: 200 }]),
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.all_passed).toBe(false);
    expect(data.failed_count).toBe(1);
  });

  it("should evaluate json_path assertion", async () => {
    const result = await validateResponse.execute("tc3", {
      response_json: JSON.stringify({
        status_code: 200,
        body: { user: { name: "Alice", age: 30 } },
      }),
      assertions_json: JSON.stringify([
        { type: "json_path", expression: "$.user.name", operator: "eq", expected: "Alice" },
        { type: "json_path", expression: "$.user.age", operator: "gt", expected: 25 },
      ]),
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.all_passed).toBe(true);
    expect(data.passed_count).toBe(2);
  });

  it("should handle contains assertion", async () => {
    const result = await validateResponse.execute("tc4", {
      response_json: JSON.stringify({ status_code: 200, body: "Hello World" }),
      assertions_json: JSON.stringify([{ type: "contains", operator: "in", expected: "World" }]),
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.all_passed).toBe(true);
  });

  it("should handle regex assertion", async () => {
    const result = await validateResponse.execute("tc5", {
      response_json: JSON.stringify({ status_code: 200, body: "order-12345-abc" }),
      assertions_json: JSON.stringify([{ type: "regex", operator: "matches", expected: "order-\\d+-[a-z]+" }]),
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.all_passed).toBe(true);
  });

  it("should return error for invalid JSON input", async () => {
    const result = await validateResponse.execute("tc6", {
      response_json: "not json",
      assertions_json: "[]",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
  });
});

describe("capture_metrics", () => {
  it("should compute pass rate and duration stats", async () => {
    const results = [
      { test_name: "t1", test_status: "PASSED", duration: 0.5 },
      { test_name: "t2", test_status: "PASSED", duration: 1.2 },
      { test_name: "t3", test_status: "FAILED", duration: 0.3, error_message: "assertion error" },
      { test_name: "t4", test_status: "ERROR", duration: 5.0, error_message: "timeout after 5s" },
    ];

    const result = await captureMetrics.execute("tc7", {
      results_json: JSON.stringify(results),
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.summary.total_tests).toBe(4);
    expect(data.summary.passed).toBe(2);
    expect(data.summary.failed).toBe(1);
    expect(data.summary.error).toBe(1);
    expect(data.summary.pass_rate).toBe(50);
    expect(data.summary.max_duration).toBe(5.0);
    expect(data.slowest_tests).toHaveLength(4);
    expect(data.error_distribution.assertion_failure).toBe(1);
    expect(data.error_distribution.timeout).toBe(1);
  });

  it("should handle empty results", async () => {
    const result = await captureMetrics.execute("tc8", {
      results_json: "[]",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.summary.total_tests).toBe(0);
    expect(data.summary.pass_rate).toBe(0);
  });
});
