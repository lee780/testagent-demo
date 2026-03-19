/**
 * Event subscription bridge — pi AgentEvent → TestAgent SSE events.
 *
 * Maps pi-mono's native AgentEvent types to the SSE event protocol
 * expected by the TestAgent frontend (ChatView.vue / TaskTreePanel.vue).
 */

// ── pi AgentEvent types (subset we handle) ───────────────

export type PiAgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages?: unknown[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message?: unknown; toolResults?: unknown[] }
  | { type: "message_start"; message?: unknown }
  | { type: "message_update"; message?: unknown; assistantMessageEvent?: AssistantMessageEvent }
  | { type: "message_end"; message?: unknown }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: unknown }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; args: unknown; partialResult: unknown }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: unknown; isError: boolean };

interface AssistantMessageEvent {
  type: string;
  // text_delta
  text?: string;
  // thinking_delta
  thinking?: string;
}

// ── TestAgent SSE event types ────────────────────────────

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

// ── Event mapping ────────────────────────────────────────

export function mapPiEventToSSE(event: PiAgentEvent): SSEEvent | null {
  switch (event.type) {
    case "agent_start":
      return { type: "agent_start", data: {} };

    case "agent_end":
      return { type: "agent_complete", data: {} };

    case "message_update": {
      const ame = event.assistantMessageEvent;
      if (!ame) return null;

      if (ame.type === "text_delta" && (ame as any).delta) {
        return {
          type: "agent_message",
          data: { content: (ame as any).delta, delta: true },
        };
      }
      if (ame.type === "thinking_delta" && (ame as any).delta) {
        return {
          type: "agent_thinking",
          data: { content: (ame as any).delta, delta: true },
        };
      }
      return null;
    }

    case "message_end":
      return { type: "agent_message_end", data: {} };

    case "tool_execution_start":
      return {
        type: "tool_call",
        data: {
          tool_call_id: event.toolCallId,
          tool_name: event.toolName,
          arguments: event.args,
        },
      };

    case "tool_execution_end":
      return {
        type: "tool_result",
        data: {
          tool_call_id: event.toolCallId,
          tool_name: event.toolName,
          result: event.result,
          is_error: event.isError,
        },
      };

    case "tool_execution_update":
      return {
        type: "tool_update",
        data: {
          tool_call_id: event.toolCallId,
          tool_name: event.toolName,
          partial_result: event.partialResult,
        },
      };

    // turn_start/turn_end are internal loop events, not needed by frontend
    case "turn_start":
    case "turn_end":
    case "message_start":
      return null;

    default:
      return null;
  }
}

// ── Frontend-compatible event mapping ─────────────────────
// Maps pi events to the exact SSE types that ChatView.vue expects:
//   chunk, thinking, tool_call, tool_result, coordinator_event

export interface FrontendSSEEvent {
  type: string;
  [key: string]: unknown;
}

export function mapPiEventToFrontendSSE(event: PiAgentEvent): FrontendSSEEvent | null {
  switch (event.type) {
    case "message_update": {
      const ame = event.assistantMessageEvent;
      if (!ame) return null;
      if (ame.type === "text_delta" && (ame as any).delta) {
        return { type: "chunk", content: (ame as any).delta };
      }
      if (ame.type === "thinking_delta" && (ame as any).delta) {
        return { type: "thinking", content: (ame as any).delta };
      }
      return null;
    }
    case "tool_execution_start":
      return {
        type: "tool_call",
        id: event.toolCallId,
        name: event.toolName,
        input: event.args,
      };
    case "tool_execution_end":
      return {
        type: "tool_result",
        id: event.toolCallId,
        name: event.toolName,
        output: event.result,
        success: !event.isError,
      };
    default:
      return null;
  }
}

/**
 * Subscribe to a pi Agent session and bridge events to an SSE callback.
 * Also handles TaskManager events (coordinator_event).
 */
export function createEventBridge(onSSE: (event: SSEEvent) => void) {
  return {
    /** Handle pi AgentEvent */
    onAgentEvent(event: PiAgentEvent): void {
      const sseEvent = mapPiEventToSSE(event);
      if (sseEvent) onSSE(sseEvent);
    },

    /** Handle TaskManager events (task tree updates) */
    onTaskEvent(event: { type: string; data: unknown }): void {
      onSSE({
        type: "coordinator_event",
        data: {
          event_type: event.type,
          display_mode: "tree",
          ...(event.data as Record<string, unknown>),
        },
      });
    },
  };
}
