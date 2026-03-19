import { describe, it, expect, afterAll } from "vitest";
import { createOutputFileTools } from "../../src/agent-core/tools/output-file.js";
import { createToolConfig } from "../../src/agent-core/tools/config.js";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const testOutputDir = resolve(tmpdir(), `testagent-pi-test-${Date.now()}`);

const config = createToolConfig({
  outputDir: testOutputDir,
  userId: "testuser",
  conversationId: "conv123",
});

const tools = createOutputFileTools(config);
const writeOutputFile = tools.find((t) => t.name === "write_output_file")!;

afterAll(async () => {
  await rm(testOutputDir, { recursive: true, force: true });
});

describe("write_output_file", () => {
  it("should write file and return metadata", async () => {
    const result = await writeOutputFile.execute("tc1", {
      filename: "report.txt",
      content: "Test report content",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.bytes_written).toBe(Buffer.byteLength("Test report content", "utf-8"));
    expect(data.file_path).toContain("report.txt");

    // Verify file was actually written
    const content = await readFile(data.file_path, "utf-8");
    expect(content).toBe("Test report content");
  });

  it("should strip directory components from filename", async () => {
    const result = await writeOutputFile.execute("tc2", {
      filename: "../../../etc/passwd",
      content: "malicious",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.file_path).toContain("passwd");
    expect(data.file_path).not.toContain("..");
  });

  it("should error on empty filename", async () => {
    const result = await writeOutputFile.execute("tc3", {
      filename: "",
      content: "test",
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
  });

  it("should error when userId is missing", async () => {
    const noUserConfig = createToolConfig({ outputDir: testOutputDir, userId: "", conversationId: "c1" });
    const noUserTools = createOutputFileTools(noUserConfig);
    const tool = noUserTools[0];

    const result = await tool.execute("tc4", { filename: "test.txt", content: "x" });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
  });
});
