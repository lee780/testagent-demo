/**
 * Tool configuration — workspace boundary enforcement + service URLs.
 */

import { resolve, relative } from "node:path";

export interface TestProgressEvent {
  caseId: string;
  caseName: string;
  status: string;
  current: number;
  total: number;
  passed: number;
  failed: number;
}

export interface SaveTestCaseEvent {
  modelId: string;
  caseCode: string;
  title: string;
  coveragePoint?: string;
  priority?: string;
  inputParams?: Record<string, unknown>;
  expectedResult?: Record<string, unknown>;
  conversationId?: string;
  sourceMode?: string;
}

export interface ToolConfig {
  /** Root workspace directory (all file access is bounded here). */
  workspace: string;
  /** Code-index service base URL. */
  codeIndexUrl: string;
  /** Output directory for deliverable files. */
  outputDir: string;
  /** Current user ID. */
  userId: string;
  /** Current conversation ID. */
  conversationId: string;
  /** Called after each test case completes — for real-time SSE progress. */
  onProgress?: (event: TestProgressEvent) => void;
  /** Called for each test case to save to the test case library (fire-and-forget). */
  onSaveTestCase?: (tc: SaveTestCaseEvent) => void;
}

const DEFAULT_CODE_INDEX_URL = "http://code-index-service:8080";
const DEFAULT_OUTPUT_DIR = "/app/agent-outputs";

export function createToolConfig(overrides: Partial<ToolConfig> = {}): ToolConfig {
  return {
    workspace: overrides.workspace ?? process.cwd(),
    codeIndexUrl: overrides.codeIndexUrl ?? process.env.CODE_INDEX_SERVICE_URL ?? DEFAULT_CODE_INDEX_URL,
    outputDir: overrides.outputDir ?? process.env.AGENT_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR,
    userId: overrides.userId ?? "",
    conversationId: overrides.conversationId ?? "",
    onProgress: overrides.onProgress,
    onSaveTestCase: overrides.onSaveTestCase,
  };
}

/**
 * Validate that a resolved path is within the allowed workspace.
 * Returns the resolved absolute path or throws.
 */
export function assertWithinWorkspace(filePath: string, workspace: string): string {
  const resolved = resolve(filePath);
  const rel = relative(workspace, resolved);
  if (rel.startsWith("..") || resolve(workspace, rel) !== resolved) {
    throw new Error(`Path "${filePath}" is outside workspace "${workspace}"`);
  }
  return resolved;
}
