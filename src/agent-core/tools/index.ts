/**
 * Tool registry — aggregates all custom AgentTools for TestAgent-PI.
 */

export { createCodeIndexTools } from "./code-index.js";
export { createTestExecutorTools } from "./test-executor.js";
export { createDatabaseTools } from "./database-ops.js";
export { createTestRunnerTools } from "./test-runner.js";
export { createToolConfig, assertWithinWorkspace } from "./config.js";
export { createProgressReporterTool } from "./progress-reporter.js";
export { createCalcExpectedTool } from "./calc-expected.js";
export { createSaveSummaryReportTool } from "./save-summary-report.js";
export type { ToolConfig } from "./config.js";
export type { AgentToolDef, AgentToolResult } from "./code-index.js";

import type { ToolConfig } from "./config.js";
import type { AgentToolDef } from "./code-index.js";
import { createCodeIndexTools } from "./code-index.js";
import { createTestExecutorTools } from "./test-executor.js";
import { createDatabaseTools } from "./database-ops.js";
import { createTestRunnerTools } from "./test-runner.js";
import { createProgressReporterTool } from "./progress-reporter.js";
import { createCalcExpectedTool } from "./calc-expected.js";
import { createSaveSummaryReportTool } from "./save-summary-report.js";

/**
 * Build the full set of custom tools for TestAgent.
 * pi-mono already provides built-in tools (read, bash, edit, write, grep, find, ls).
 */
export function buildCustomTools(config: ToolConfig): AgentToolDef[] {
  const tools: AgentToolDef[] = [
    ...createCodeIndexTools(config),
    ...createTestExecutorTools(),
    ...createDatabaseTools(),
    ...createTestRunnerTools(config),
    createCalcExpectedTool(),
    createSaveSummaryReportTool(),
  ];
  if (config.onStageUpdate) {
    tools.push(createProgressReporterTool(config.onStageUpdate));
  }
  return tools;
}
