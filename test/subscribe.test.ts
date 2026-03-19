import { describe, it, expect } from "vitest";
import { mapPiEventToSSE, createEventBridge, type PiAgentEvent, type SSEEvent } from "../src/agent-core/subscribe.js";

describe("mapPiEventToSSE", () => {
  it("should map agent_start", () => {
    const result = mapPiEventToSSE({ type: "agent_start" });
    expect(result).toEqual({ type: "agent_start", data: {} });
  });

  it("should map agent_end to agent_complete", () => {
    const result = mapPiEventToSSE({ type: "agent_end" });
    expect(result).toEqual({ type: "agent_complete", data: {} });
  });

  it("should map text_delta to agent_message", () => {
    const result = mapPiEventToSSE({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", text: "Hello" },
    });
    expect(result).toEqual({
      type: "agent_message",
      data: { content: "Hello", delta: true },
    });
  });

  it("should map thinking_delta to agent_thinking", () => {
    const result = mapPiEventToSSE({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_delta", thinking: "Let me think..." },
    });
    expect(result).toEqual({
      type: "agent_thinking",
      data: { content: "Let me think...", delta: true },
    });
  });

  it("should map tool_execution_start to tool_call", () => {
    const result = mapPiEventToSSE({
      type: "tool_execution_start",
      toolCallId: "tc1",
      toolName: "search_symbol",
      args: { pattern: "User" },
    });
    expect(result).toEqual({
      type: "tool_call",
      data: { tool_call_id: "tc1", tool_name: "search_symbol", arguments: { pattern: "User" } },
    });
  });

  it("should map tool_execution_end to tool_result", () => {
    const result = mapPiEventToSSE({
      type: "tool_execution_end",
      toolCallId: "tc1",
      toolName: "search_symbol",
      result: { count: 5 },
      isError: false,
    });
    expect(result).toEqual({
      type: "tool_result",
      data: { tool_call_id: "tc1", tool_name: "search_symbol", result: { count: 5 }, is_error: false },
    });
  });

  it("should return null for turn_start/turn_end", () => {
    expect(mapPiEventToSSE({ type: "turn_start" })).toBeNull();
    expect(mapPiEventToSSE({ type: "turn_end" })).toBeNull();
  });
});

describe("createEventBridge", () => {
  it("should forward pi events as SSE", () => {
    const events: SSEEvent[] = [];
    const bridge = createEventBridge((e) => events.push(e));

    bridge.onAgentEvent({ type: "agent_start" });
    bridge.onAgentEvent({ type: "agent_end" });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("agent_start");
    expect(events[1].type).toBe("agent_complete");
  });

  it("should forward task events as coordinator_event", () => {
    const events: SSEEvent[] = [];
    const bridge = createEventBridge((e) => events.push(e));

    bridge.onTaskEvent({
      type: "task_tree_node_created",
      data: { taskId: "task_001", description: "Test" },
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("coordinator_event");
    expect(events[0].data.event_type).toBe("task_tree_node_created");
    expect(events[0].data.display_mode).toBe("tree");
  });
});
