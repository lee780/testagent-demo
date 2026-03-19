/**
 * Intranet LLM Provider — custom streamFn middleware for the internal API.
 * Ported from Python model_intranet.py → TypeScript.
 *
 * Wraps requests in the intranet envelope format and normalizes responses
 * back to standard OpenAI-compatible format that pi-mono expects.
 */

import { randomUUID } from "node:crypto";

// ── Types ────────────────────────────────────────────────

export interface IntranetConfig {
  baseUrl: string;       // e.g. "http://10.252.167.50:8021"
  apiPath: string;       // e.g. "/ai-service/ainlpllm/chat"
  apiKey: string;        // Access_Key_Id
  txCode: string;        // e.g. "A4011LM01"
  secNodeNo: string;     // e.g. "400136"
  modelName: string;     // Model identifier
  stream: boolean;
  generateKwargs?: Record<string, unknown>;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | Array<{ type: string; text?: string; [k: string]: unknown }>;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ToolDef {
  type: "function";
  function: { name: string; description: string; parameters: unknown };
}

export interface ChatResponse {
  content: ContentBlock[];
  usage: { inputTokens: number; outputTokens: number };
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

// ── Helpers ──────────────────────────────────────────────

let serialNo = 0;

function jsonLoadsWithRepair(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    // Try brace/bracket balancing repair
    let repaired = s;
    const openBraces = (repaired.match(/{/g) ?? []).length;
    const closeBraces = (repaired.match(/}/g) ?? []).length;
    const openBrackets = (repaired.match(/\[/g) ?? []).length;
    const closeBrackets = (repaired.match(/]/g) ?? []).length;
    repaired += "]".repeat(Math.max(0, openBrackets - closeBrackets));
    repaired += "}".repeat(Math.max(0, openBraces - closeBraces));
    try {
      return JSON.parse(repaired);
    } catch {
      return {};
    }
  }
}

// ── Envelope ─────────────────────────────────────────────

function buildRequestBody(
  config: IntranetConfig,
  messages: Message[],
  tools?: ToolDef[],
  toolChoice?: unknown,
  stream?: boolean,
): Record<string, string> {
  const inner: Record<string, unknown> = {
    messages,
    stream: stream ?? config.stream,
    model_config: { model: config.modelName },
    ...config.generateKwargs,
  };
  if (tools?.length) inner.tools = tools;
  if (toolChoice) inner.tool_choice = toolChoice;

  return {
    Data_cntnt: JSON.stringify(inner),
    Fst_Attr_Rmrk: config.apiKey,
  };
}

function buildHeaders(config: IntranetConfig): Record<string, string> {
  serialNo++;
  return {
    "Content-Type": "application/json",
    "Access_Key_Id": config.apiKey,
    "Tx-Code": config.txCode,
    "Sec-Node-No": config.secNodeNo,
    "Trace-Id": randomUUID(),
    "Tx-Serial-No": String(serialNo),
  };
}

function unwrapResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const status = raw["C-API-Status"] as string | undefined;
  if (status !== "00") {
    const desc = raw["C-API-Description"] ?? "unknown";
    throw new Error(`Intranet API error: status=${status}, description=${desc}`);
  }
  const body = raw["C-Response-Body"] as Record<string, unknown> | undefined;
  const dataStr = body?.["Data_Enqr_Rslt"] as string | undefined;
  if (!dataStr) throw new Error("Empty Data_Enqr_Rslt in intranet response");

  return jsonLoadsWithRepair(dataStr) as Record<string, unknown>;
}

// ── Block (non-streaming) call ───────────────────────────

function parseBlockResponse(data: Record<string, unknown>): ChatResponse {
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (!choices?.length) return { content: [{ type: "text", text: "" }], usage: { inputTokens: 0, outputTokens: 0 } };

  const choice = choices[0];
  // Intranet uses "messages" (plural) instead of "message"
  const message = (choice.message ?? choice.messages) as Record<string, unknown>;
  const blocks: ContentBlock[] = [];

  if (message?.content) {
    blocks.push({ type: "text", text: String(message.content) });
  }

  const toolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined;
  if (toolCalls?.length) {
    for (const tc of toolCalls) {
      const fn = tc.function as Record<string, unknown>;
      blocks.push({
        type: "tool_use",
        id: String(tc.id ?? randomUUID()),
        name: String(fn.name),
        input: jsonLoadsWithRepair(String(fn.arguments ?? "{}")),
      });
    }
  }

  const usage = data.usage as Record<string, number> | undefined;
  return {
    content: blocks.length > 0 ? blocks : [{ type: "text", text: "" }],
    usage: {
      inputTokens: usage?.input_tokens ?? usage?.prompt_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? usage?.completion_tokens ?? 0,
    },
  };
}

// ── Streaming call ───────────────────────────────────────

async function* streamIntranet(
  config: IntranetConfig,
  messages: Message[],
  tools?: ToolDef[],
  toolChoice?: unknown,
): AsyncGenerator<ChatResponse> {
  const url = `${config.baseUrl}${config.apiPath}`;
  const headers = buildHeaders(config);
  const body = buildRequestBody(config, messages, tools, toolChoice, true);

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Intranet HTTP ${resp.status}: ${await resp.text()}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let accContent = "";
  const toolCallAcc = new Map<number, { id: string; name: string; arguments: string }>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        let envelope: Record<string, unknown>;
        try {
          envelope = JSON.parse(payload);
        } catch {
          continue;
        }

        let inner: Record<string, unknown>;
        try {
          inner = unwrapResponse(envelope);
        } catch {
          continue;
        }

        const choices = inner.choices as Array<Record<string, unknown>> | undefined;
        if (!choices?.length) continue;

        const choice = choices[0];
        const delta = (choice.delta ?? choice.messages) as Record<string, unknown> | undefined;
        if (!delta) continue;

        // Accumulate text
        if (delta.content) {
          accContent += String(delta.content);
        }

        // Accumulate tool calls
        const deltaTools = delta.tool_calls as Array<Record<string, unknown>> | undefined;
        if (deltaTools) {
          for (const tc of deltaTools) {
            const idx = Number(tc.index ?? 0);
            const fn = tc.function as Record<string, unknown> | undefined;
            if (!toolCallAcc.has(idx)) {
              toolCallAcc.set(idx, {
                id: String(tc.id ?? randomUUID()),
                name: String(fn?.name ?? ""),
                arguments: String(fn?.arguments ?? ""),
              });
            } else {
              const existing = toolCallAcc.get(idx)!;
              if (fn?.arguments) existing.arguments += String(fn.arguments);
            }
          }
        }

        // Build content blocks for this chunk
        const blocks: ContentBlock[] = [];
        if (accContent) {
          blocks.push({ type: "text", text: accContent });
        }
        for (const [, tc] of toolCallAcc) {
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: jsonLoadsWithRepair(tc.arguments),
          });
        }

        const usage = inner.usage as Record<string, number> | undefined;
        yield {
          content: blocks.length > 0 ? blocks : [{ type: "text", text: "" }],
          usage: {
            inputTokens: usage?.input_tokens ?? usage?.prompt_tokens ?? 0,
            outputTokens: usage?.output_tokens ?? usage?.completion_tokens ?? 0,
          },
        };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Public API ───────────────────────────────────────────

export const DEFAULT_INTRANET_CONFIG: Omit<IntranetConfig, "apiKey" | "modelName"> = {
  baseUrl: "http://10.252.167.50:8021",
  apiPath: "/ai-service/ainlpllm/chat",
  txCode: "A4011LM01",
  secNodeNo: "400136",
  stream: true,
};

/**
 * Create a non-streaming call function for the intranet LLM.
 */
export async function callIntranet(
  config: IntranetConfig,
  messages: Message[],
  tools?: ToolDef[],
  toolChoice?: unknown,
): Promise<ChatResponse> {
  const url = `${config.baseUrl}${config.apiPath}`;
  const headers = buildHeaders(config);
  const body = buildRequestBody(config, messages, tools, toolChoice, false);

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Intranet HTTP ${resp.status}: ${await resp.text()}`);
  }

  const raw = await resp.json() as Record<string, unknown>;
  const inner = unwrapResponse(raw);
  return parseBlockResponse(inner);
}

/**
 * Create a streaming call function for the intranet LLM.
 */
export function streamIntranetLLM(
  config: IntranetConfig,
  messages: Message[],
  tools?: ToolDef[],
  toolChoice?: unknown,
): AsyncGenerator<ChatResponse> {
  return streamIntranet(config, messages, tools, toolChoice);
}

/**
 * Create a streamFn middleware compatible with pi-mono Agent.
 *
 * This wraps the intranet LLM API in a function that can be passed as
 * the `streamFn` option to pi-mono's Agent constructor.
 *
 * Usage:
 *   const agent = new Agent({
 *     streamFn: createIntranetStreamFn(config),
 *     ...
 *   });
 */
export function createIntranetStreamFn(config: IntranetConfig) {
  return async (
    model: unknown,
    context: { messages: Message[]; tools?: ToolDef[]; tool_choice?: unknown },
    _options?: unknown,
  ) => {
    if (config.stream) {
      return streamIntranet(config, context.messages, context.tools, context.tool_choice);
    }
    return callIntranet(config, context.messages, context.tools, context.tool_choice);
  };
}
