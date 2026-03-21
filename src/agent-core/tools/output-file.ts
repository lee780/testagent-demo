/**
 * Output file tool — write deliverable files to user-specific download directory.
 * Ported from Python write_output_file.py → TypeScript AgentTool.
 */

import { Type, type Static } from "@sinclair/typebox";
import { resolve, basename, relative } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";
import type { ToolConfig } from "./config.js";

// ── Helpers ──────────────────────────────────────────────

function textResult(data: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ── Tool Definition ──────────────────────────────────────

const WriteOutputFileParams = Type.Object({
  filename: Type.String({ description: "Output filename (path components are stripped for security)" }),
  content: Type.String({ description: "File content to write (UTF-8)" }),
});

export function createOutputFileTools(config: ToolConfig): AgentToolDef[] {
  const writeOutputFile: AgentToolDef<Static<typeof WriteOutputFileParams>> = {
    name: "write_output_file",
    label: "Write Output File",
    description: "Write a deliverable file to the user's download directory. The file will be available for download via the frontend.",
    parameters: WriteOutputFileParams,
    execute: async (_id, params) => {
      if (!config.outputDir) {
        return textResult({ status: "error", error: "Output directory not configured" });
      }
      if (!config.userId || !config.conversationId) {
        return textResult({ status: "error", error: "userId and conversationId are required" });
      }

      // Strip directory components (path traversal defense)
      const safeName = basename(params.filename);
      if (!safeName) {
        return textResult({ status: "error", error: "Invalid filename" });
      }

      // Only HTML files are allowed as final deliverables
      if (!safeName.toLowerCase().endsWith('.html')) {
        return textResult({
          status: "error",
          error: `Only .html files are allowed as output deliverables. Got: "${safeName}". ` +
            `YAML/MD/TXT files are intermediate files — save them to the workspace scratch directory instead, not the output directory.`,
        });
      }

      const targetDir = resolve(config.outputDir, config.userId, config.conversationId);
      await mkdir(targetDir, { recursive: true });

      const filePath = resolve(targetDir, safeName);

      // Ensure resolved path is within target directory
      const rel = relative(targetDir, filePath);
      if (rel.startsWith("..") || resolve(targetDir, rel) !== filePath) {
        return textResult({ status: "error", error: "Path traversal detected" });
      }

      await writeFile(filePath, params.content, "utf-8");
      const bytesWritten = Buffer.byteLength(params.content, "utf-8");

      return textResult({
        status: "ok",
        file_path: filePath,
        bytes_written: bytesWritten,
      });
    },
  };

  return [writeOutputFile];
}
