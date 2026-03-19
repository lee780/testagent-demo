/**
 * Agent Workspace — manages directory structure for agent file operations.
 * Zero server dependencies (only uses Node.js built-ins).
 *
 * Modeled after OpenClaw's `.openclaw/workspace` pattern.
 */

import { resolve, join } from "node:path";
import { mkdir } from "node:fs/promises";

export interface WorkspaceConfig {
  /** Workspace root directory, default `.testagent/workspace` */
  rootDir: string;
}

export class AgentWorkspace {
  readonly rootDir: string;

  constructor(config: WorkspaceConfig) {
    this.rootDir = resolve(config.rootDir);
  }

  /** Ensure workspace directory structure exists */
  async ensure(): Promise<void> {
    const dirs = [
      this.rootDir,
      join(this.rootDir, "sessions"),
      join(this.rootDir, "outputs"),
      join(this.rootDir, "uploads"),
      join(this.rootDir, "scratch"),
    ];
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
    }
  }

  /** Get session file path for a conversation (JSONL persistence) */
  getSessionFile(conversationId: string): string {
    return join(this.rootDir, "sessions", `${conversationId}.jsonl`);
  }

  /** Get output directory (isolated by userId/conversationId) */
  getOutputDir(userId: string, conversationId: string): string {
    return join(this.rootDir, "outputs", userId, conversationId);
  }

  /** Get upload directory (isolated by userId/conversationId) */
  getUploadDir(userId: string, conversationId: string): string {
    return join(this.rootDir, "uploads", userId, conversationId);
  }

  /** Get scratch directory (agent temporary working area) */
  getScratchDir(): string {
    return join(this.rootDir, "scratch");
  }
}
