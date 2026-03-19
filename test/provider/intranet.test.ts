import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createIntranetStreamFn,
  DEFAULT_INTRANET_CONFIG,
  type IntranetConfig,
  type Message,
} from "../../src/agent-core/provider/intranet.js";

// Mock config for testing (won't actually call the API)
const testConfig: IntranetConfig = {
  ...DEFAULT_INTRANET_CONFIG,
  apiKey: "test-key",
  modelName: "test-model",
  stream: false,
};

describe("Intranet Provider", () => {
  it("should create streamFn with correct config", () => {
    const streamFn = createIntranetStreamFn(testConfig);
    expect(typeof streamFn).toBe("function");
  });

  it("should have correct default config values", () => {
    expect(DEFAULT_INTRANET_CONFIG.baseUrl).toBe("http://10.252.167.50:8021");
    expect(DEFAULT_INTRANET_CONFIG.apiPath).toBe("/ai-service/ainlpllm/chat");
    expect(DEFAULT_INTRANET_CONFIG.txCode).toBe("A4011LM01");
    expect(DEFAULT_INTRANET_CONFIG.secNodeNo).toBe("400136");
  });

  describe("streamFn network call", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should construct correct request for block mode", async () => {
      // Mock fetch to capture the request
      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;

      vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
        capturedUrl = url.toString();
        capturedInit = init;

        // Return a mock successful response
        const innerPayload = {
          choices: [{
            message: { content: "Hello from mock", tool_calls: [] },
          }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };

        const envelope = {
          "C-API-Status": "00",
          "C-Response-Body": {
            "Data_Enqr_Rslt": JSON.stringify(innerPayload),
          },
        };

        return new Response(JSON.stringify(envelope), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const streamFn = createIntranetStreamFn(testConfig);
      const messages: Message[] = [
        { role: "user", content: "Hello" },
      ];

      const result = await streamFn(null, { messages });

      // Verify URL
      expect(capturedUrl).toBe("http://10.252.167.50:8021/ai-service/ainlpllm/chat");

      // Verify headers
      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers["Access_Key_Id"]).toBe("test-key");
      expect(headers["Tx-Code"]).toBe("A4011LM01");
      expect(headers["Sec-Node-No"]).toBe("400136");

      // Verify body envelope
      const body = JSON.parse(capturedInit?.body as string);
      expect(body.Fst_Attr_Rmrk).toBe("test-key");
      const inner = JSON.parse(body.Data_cntnt);
      expect(inner.messages).toEqual(messages);
      expect(inner.model_config.model).toBe("test-model");

      // Verify parsed response
      expect(result).toBeDefined();
      expect((result as any).content[0].text).toBe("Hello from mock");
    });

    it("should handle API error status", async () => {
      vi.stubGlobal("fetch", async () => {
        const envelope = {
          "C-API-Status": "99",
          "C-API-Description": "Auth failed",
        };
        return new Response(JSON.stringify(envelope), { status: 200 });
      });

      const streamFn = createIntranetStreamFn(testConfig);
      await expect(streamFn(null, { messages: [{ role: "user", content: "Hi" }] }))
        .rejects.toThrow("Intranet API error");
    });

    it("should handle tool calls in response", async () => {
      vi.stubGlobal("fetch", async () => {
        const innerPayload = {
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: "call_123",
                type: "function",
                function: { name: "search_symbol", arguments: '{"pattern":"User"}' },
              }],
            },
          }],
          usage: { input_tokens: 10, output_tokens: 20 },
        };

        return new Response(JSON.stringify({
          "C-API-Status": "00",
          "C-Response-Body": { "Data_Enqr_Rslt": JSON.stringify(innerPayload) },
        }), { status: 200 });
      });

      const streamFn = createIntranetStreamFn(testConfig);
      const result = await streamFn(null, { messages: [{ role: "user", content: "Search" }] }) as any;

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("tool_use");
      expect(result.content[0].name).toBe("search_symbol");
      expect(result.content[0].input).toEqual({ pattern: "User" });
    });

    it("should handle malformed tool arguments with repair", async () => {
      vi.stubGlobal("fetch", async () => {
        const innerPayload = {
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: "call_456",
                type: "function",
                function: { name: "test", arguments: '{"key": "value"' }, // Missing closing brace
              }],
            },
          }],
        };

        return new Response(JSON.stringify({
          "C-API-Status": "00",
          "C-Response-Body": { "Data_Enqr_Rslt": JSON.stringify(innerPayload) },
        }), { status: 200 });
      });

      const streamFn = createIntranetStreamFn(testConfig);
      const result = await streamFn(null, { messages: [{ role: "user", content: "Test" }] }) as any;

      expect(result.content[0].type).toBe("tool_use");
      expect(result.content[0].input).toEqual({ key: "value" }); // Repaired
    });
  });
});
