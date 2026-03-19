/**
 * Code Index Service tools — search symbols, call chains, annotations, method source.
 * Ported from Python code_index_query.py → TypeScript AgentTool.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolConfig } from "./config.js";

// ── Types ────────────────────────────────────────────────

export interface AgentToolResult<T = unknown> {
  content: Array<{ type: "text"; text: string }>;
  details: T;
}

type AgentToolExecute<P> = (
  toolCallId: string,
  params: P,
  signal?: AbortSignal,
) => Promise<AgentToolResult>;

export interface AgentToolDef<P = any> {
  name: string;
  label: string;
  description: string;
  parameters: any;
  execute: AgentToolExecute<P>;
}

// ── Helpers ──────────────────────────────────────────────

const TIMEOUT_MS = 10_000;

function textResult(data: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

function errorResult(error: string, code = "REQUEST_ERROR"): AgentToolResult {
  const data = { status: "error", error_code: code, message: error };
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    details: data,
  };
}

async function indexFetch(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString(), {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`Code-index HTTP ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

// ── Tool Definitions ─────────────────────────────────────

const SearchSymbolParams = Type.Object({
  pattern: Type.String({ description: "Symbol name pattern (FTS5 syntax, e.g. 'UserService' or 'get*')" }),
  symbol_type: Type.Optional(Type.String({ description: "Filter: CLASS | METHOD | FIELD | INTERFACE | ENUM" })),
  language: Type.Optional(Type.String({ description: "Programming language (default: java)" })),
  limit: Type.Optional(Type.Number({ description: "Max results (default: 20)" })),
});

const CallChainParams = Type.Object({
  fqn: Type.String({ description: "Fully qualified method name" }),
  direction: Type.Optional(Type.String({ description: "'downstream' (who calls this) or 'upstream' (who it calls)" })),
  depth: Type.Optional(Type.Number({ description: "Max traversal depth (default: 5)" })),
  include_external: Type.Optional(Type.Boolean({ description: "Include external service calls" })),
});

const FindByAnnotationParams = Type.Object({
  annotation: Type.String({ description: "Annotation name (e.g. TransCode, RequestMapping)" }),
  value: Type.Optional(Type.String({ description: "Filter annotation value" })),
  scope: Type.Optional(Type.String({ description: "Scope: METHOD | CLASS | FIELD (default: METHOD)" })),
  codebase_path: Type.Optional(Type.String({ description: "Codebase path filter" })),
});

const ReadMethodSourceParams = Type.Object({
  fqn: Type.String({ description: "Fully qualified method name" }),
  include_body: Type.Optional(Type.Boolean({ description: "Include method body (default: true)" })),
  max_tokens: Type.Optional(Type.Number({ description: "Max tokens for source (default: 2000)" })),
});

export function createCodeIndexTools(config: ToolConfig): AgentToolDef[] {
  const baseUrl = config.codeIndexUrl;

  const searchSymbol: AgentToolDef<Static<typeof SearchSymbolParams>> = {
    name: "search_symbol",
    label: "Search Symbol",
    description: "Search code symbols (class, method, field) by name pattern using FTS5 syntax",
    parameters: SearchSymbolParams,
    execute: async (_id, params, signal) => {
      try {
        const data = await indexFetch(baseUrl, "/api/v1/query/symbols", {
          pattern: params.pattern,
          symbol_type: params.symbol_type,
          language: params.language ?? "java",
          limit: params.limit ?? 20,
        }, signal);
        return textResult(data);
      } catch (e: any) {
        return errorResult(e.message);
      }
    },
  };

  const getCallChain: AgentToolDef<Static<typeof CallChainParams>> = {
    name: "get_call_chain",
    label: "Get Call Chain",
    description: "Query the call graph for upstream or downstream call chains of a method",
    parameters: CallChainParams,
    execute: async (_id, params, signal) => {
      try {
        const data = await indexFetch(baseUrl, "/api/v1/query/call-chain", {
          fqn: params.fqn,
          direction: params.direction ?? "downstream",
          depth: params.depth ?? 5,
          include_external: params.include_external ?? false,
        }, signal);
        return textResult(data);
      } catch (e: any) {
        return errorResult(e.message);
      }
    },
  };

  const findByAnnotation: AgentToolDef<Static<typeof FindByAnnotationParams>> = {
    name: "find_by_annotation",
    label: "Find by Annotation",
    description: "Find code elements marked with a specific annotation (e.g. @TransCode, @RequestMapping)",
    parameters: FindByAnnotationParams,
    execute: async (_id, params, signal) => {
      try {
        const annotation = params.annotation.replace(/^@/, "");
        const data = await indexFetch(baseUrl, "/api/v1/query/annotations", {
          annotation,
          value: params.value,
          scope: params.scope ?? "METHOD",
        }, signal);
        return textResult(data);
      } catch (e: any) {
        return errorResult(e.message);
      }
    },
  };

  const readMethodSource: AgentToolDef<Static<typeof ReadMethodSourceParams>> = {
    name: "read_method_source",
    label: "Read Method Source",
    description: "Fetch complete source code for a method by its fully qualified name",
    parameters: ReadMethodSourceParams,
    execute: async (_id, params, signal) => {
      try {
        const data = await indexFetch(baseUrl, "/api/v1/query/source", {
          fqn: params.fqn,
          include_body: params.include_body ?? true,
          max_tokens: params.max_tokens ?? 2000,
        }, signal);
        return textResult(data);
      } catch (e: any) {
        return errorResult(e.message);
      }
    },
  };

  return [searchSymbol, getCallChain, findByAnnotation, readMethodSource];
}
