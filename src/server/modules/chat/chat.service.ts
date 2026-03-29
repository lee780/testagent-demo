/**
 * Chat Service — rewritten for pi-mono native Agent (no subprocess spawning).
 *
 * Uses runTestAgent() from agent-core, bridges events via AsyncQueue → generator.
 */

import { v4 as uuidv4 } from 'uuid';
import { resolve } from 'node:path';
import { getLogger } from '../../config/logger.js';
import { getConfig } from '../../config/index.js';
import { runTestAgent } from '../../../agent-core/runner.js';
import { AgentWorkspace } from '../../../agent-core/workspace.js';
import {
  createConversationInternal,
  createMessageInternal,
  createMessageWithMetadataInternal,
  updateConversationTitleInternal,
} from '../conversation/conversation.service.js';
import { generateTitle } from '../../llm/title-generator.js';
import { loadKnowledgeContext } from '../knowledge/knowledge.service.js';

// ── Active agent runs (for interrupt support) ──────────────

const activeAbortControllers = new Map<string, AbortController>();

// ── AsyncQueue utility ─────────────────────────────────────

// Heartbeat interval (ms). Keeps SSE connection alive during long agent thinks.
// Configurable via SSE_HEARTBEAT_INTERVAL_MS env var; default 15 s.
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.SSE_HEARTBEAT_INTERVAL_MS ?? '15000', 10);

// Idle timeout (ms) after which the queue stops waiting if no items arrive.
// Should be well above the longest expected agent think time.
// Configurable via SSE_IDLE_TIMEOUT_MS env var; default 120 s.
const IDLE_TIMEOUT_MS = parseInt(process.env.SSE_IDLE_TIMEOUT_MS ?? '120000', 10);

if (HEARTBEAT_INTERVAL_MS >= IDLE_TIMEOUT_MS) {
  throw new Error(
    `SSE misconfiguration: HEARTBEAT_INTERVAL_MS (${HEARTBEAT_INTERVAL_MS}) must be less than IDLE_TIMEOUT_MS (${IDLE_TIMEOUT_MS})`
  );
}

const HEARTBEAT_ITEM = { type: 'heartbeat' } as const;

class AsyncQueue<T> {
  private queue: T[] = [];
  private resolve: (() => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  push(item: T): void {
    this.queue.push(item);
    if (this.resolve) {
      this.resolve();
      this.resolve = null;
    }
  }

  /** Start periodic heartbeat pushes so SSE connection stays alive. */
  startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.push(HEARTBEAT_ITEM as unknown as T);
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    while (true) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!;
      }
      // Wait for next push or idle timeout
      const timedOut = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(true), IDLE_TIMEOUT_MS);
        this.resolve = () => {
          clearTimeout(timer);
          resolve(false);
        };
      });
      if (timedOut) break; // idle timeout — stop iteration
    }
  }
}

// ── sendMessage (non-streaming, simple) ────────────────────

export async function sendMessage(
  message: string,
  userId: string,
  conversationId?: string | null
) {
  if (!conversationId) {
    const conv = await createConversationInternal(userId, message.slice(0, 50));
    conversationId = conv.id;
  }

  const replyId = uuidv4();
  const userMessageId = uuidv4();
  await createMessageInternal(conversationId, 'user', message, userMessageId);

  return {
    conversation_id: conversationId,
    reply_id: replyId,
    status: 'processing',
    timestamp: new Date().toISOString(),
  };
}

// ── sendMessageStreaming (core) ────────────────────────────

export interface SSEStreamOptions {
  message: string;
  userId: string;
  conversationId?: string | null;
  uploadedFiles?: string[];
  mode?: 'regression' | 'systematic' | 'exploratory';
  modelId?: string;   // 绑定知识库的被测模型 ID（如 "MODEL_001"）
}

export async function* sendMessageStreaming(
  options: SSEStreamOptions
): AsyncGenerator<Record<string, unknown>> {
  const { message, userId, uploadedFiles, mode, modelId } = options;
  let { conversationId } = options;
  const logger = getLogger();
  const config = getConfig();

  // 1. Create/get conversation
  let isNewConversation = false;
  if (!conversationId) {
    const conv = await createConversationInternal(userId, message.slice(0, 50));
    conversationId = conv.id;
    isNewConversation = true;
  }

  const replyId = uuidv4();
  const userMessageId = uuidv4();
  const assistantMessageId = uuidv4();

  // 2. Save user message
  await createMessageInternal(conversationId, 'user', message, userMessageId);

  // 3. Yield start event
  yield {
    type: 'start',
    conversation_id: conversationId,
    reply_id: replyId,
  };

  // 4. AsyncQueue bridges onEvent callback → async generator
  const queue = new AsyncQueue<Record<string, unknown> | null>();

  // Collect content and events for persistence
  const assistantContent: string[] = [];
  const assistantEvents: Array<Record<string, unknown>> = [];

  // 5. Prepare workspace
  const workspace = new AgentWorkspace({ rootDir: config.workspace.dir });
  await workspace.ensure();
  // Also ensure the per-conversation scratch dir exists (agent's cwd)
  const { mkdir } = await import('node:fs/promises');
  await mkdir(workspace.getScratchDir(conversationId), { recursive: true });

  // 6. AbortController for interruption
  const abortController = new AbortController();
  activeAbortControllers.set(replyId, abortController);

  // 5.5. 从知识库加载上下文（如果传入了 modelId）
  let knowledgeCtx: Awaited<ReturnType<typeof loadKnowledgeContext>> | null = null;
  if (modelId) {
    try {
      knowledgeCtx = await loadKnowledgeContext(modelId, mode);
    } catch (err) {
      logger.warn({ err, modelId }, '[Chat] 知识库加载失败，忽略继续');
    }
  }

  // Build query with file context and knowledge base context
  let agentQuery = message;
  const hasFiles = uploadedFiles && uploadedFiles.length > 0;
  const hasKnowledge = knowledgeCtx && knowledgeCtx.businessRulesMd;

  if (hasFiles || hasKnowledge) {
    const contextParts: string[] = [];
    contextParts.push(`user_id: ${userId}`);
    contextParts.push(`conversation_id: ${conversationId}`);

    if (hasFiles) {
      const fileStoragePath = resolve(config.storage.root, 'chat', userId, conversationId!);
      contextParts.push(`file_storage_path: ${fileStoragePath}`);
      contextParts.push(`uploaded_files:\n${uploadedFiles!.map(f => `  - ${fileStoragePath}/${f}`).join('\n')}`);
      contextParts.push(`IMPORTANT: To read uploaded files, use the read tool with the FULL absolute paths listed above.`);
    }

    if (knowledgeCtx?.businessRulesMd) {
      contextParts.push(`knowledge_model_id: ${modelId}`);
      contextParts.push(`knowledge_business_rules:\n${knowledgeCtx.businessRulesMd}`);
    }

    agentQuery = `[SYSTEM CONTEXT]\n${contextParts.join('\n')}\n[/SYSTEM CONTEXT]\n\n${message}`;
  }

  // 7. Start title generation early so it runs in parallel with the agent.
  // The null sentinel must not be pushed until title generation completes,
  // otherwise the SSE connection closes before title_generated reaches the client.
  const titlePromise = isNewConversation
    ? generateAndUpdateTitle(conversationId, userId, message, queue)
    : Promise.resolve();

  // 8. Start heartbeat and agent (non-blocking — pushes events to queue)
  queue.startHeartbeat();
  runTestAgent({
    query: agentQuery,
    workspace: workspace.getScratchDir(conversationId),
    provider: config.llm.provider,
    modelId: config.llm.modelName,
    apiKey: config.llm.apiKey,
    baseUrl: config.llm.baseUrl,
    sessionFile: workspace.getSessionFile(conversationId),
    userId,
    conversationId,
    outputDir: config.agentOutputDir,
    mode,
    uploadedFiles: uploadedFiles && uploadedFiles.length > 0 ? uploadedFiles : undefined,
    customInstructions: knowledgeCtx?.customInstructions ?? undefined,
    onEvent: (event) => {
      // event is SSEEvent { type, data } from the bridge.
      // Map bridge types → frontend types that ChatView.vue expects.
      const t = event.type;
      const d = event.data;
      if (t === 'agent_message') {
        queue.push({ type: 'chunk', content: d.content });
      } else if (t === 'agent_thinking') {
        queue.push({ type: 'thinking', content: d.content });
      } else if (t === 'tool_call') {
        queue.push({ type: 'tool_call', id: d.tool_call_id, name: d.tool_name, input: d.arguments });
      } else if (t === 'tool_result') {
        queue.push({ type: 'tool_result', id: d.tool_call_id, name: d.tool_name, output: d.result, success: !d.is_error });
      } else if (t === 'coordinator_event') {
        queue.push(d as Record<string, unknown>);
      } else if (t === 'stage_update') {
        queue.push({ type: 'stage_update', ...d });
      } else if (t === 'test_progress') {
        queue.push({ type: 'test_progress', ...d });
      }
    },
    signal: abortController.signal,
  }).then(async () => {
    await titlePromise; // ensure title_generated is sent before closing the stream
    queue.push(null);  // end signal
  }).catch((err) => {
    logger.error({ err, conversationId }, 'Agent error');
    queue.push({ type: 'error', message: err.message ?? String(err) });
    queue.push(null);
  });

  // 9. Consume queue and yield events
  try {
    for await (const event of queue) {
      if (event === null) break;

      // Forward heartbeat as-is so SSE connection stays alive; skip persistence
      if ((event as Record<string, unknown>).type === 'heartbeat') {
        yield event;
        continue;
      }

      // Collect for persistence
      collectForPersistence(event, assistantContent, assistantEvents);

      yield event;
    }

    // 10. Save assistant message to DB
    await saveAssistantMessage(
      conversationId!,
      assistantMessageId,
      assistantContent.join(''),
      assistantEvents,
      logger
    );

    // 11. Yield done
    yield {
      type: 'done',
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
    };
  } finally {
    queue.stopHeartbeat();
    activeAbortControllers.delete(replyId);
  }
}

// ── interrupt ──────────────────────────────────────────────

export async function interruptAgent(replyId: string): Promise<boolean> {
  const controller = activeAbortControllers.get(replyId);
  if (!controller) return false;
  controller.abort();
  activeAbortControllers.delete(replyId);
  return true;
}

// ── Helpers ────────────────────────────────────────────────

function collectForPersistence(
  event: Record<string, unknown>,
  assistantContent: string[],
  assistantEvents: Array<Record<string, unknown>>
): void {
  const type = event.type as string;

  if (type === 'chunk') {
    const content = (event.content as string) || '';
    assistantContent.push(content);
    assistantEvents.push({ type: 'text', content });
  } else if (type === 'thinking') {
    assistantEvents.push({ type: 'thinking', content: event.content });
  } else if (type === 'tool_call') {
    assistantEvents.push({
      type: 'tool_call',
      id: event.id,
      name: event.name,
      input: event.input,
    });
  } else if (type === 'tool_result') {
    assistantEvents.push({
      type: 'tool_result',
      id: event.id,
      name: event.name,
      output: event.output,
      success: event.success,
    });
  } else if (type === 'coordinator_event') {
    const subType = event.event_type as string;
    if (subType?.startsWith('task_tree_')) {
      assistantEvents.push({
        type: 'coordinator_event',
        event_type: subType,
        data: (event.data ?? {}) as Record<string, unknown>,
      });
    }
  } else if (type === 'stage_update') {
    assistantEvents.push({
      type: 'stage_update',
      stage: event.stage,
      status: event.status,
      detail: event.detail,
    });
  }
}

async function generateAndUpdateTitle(
  conversationId: string,
  userId: string,
  message: string,
  queue: AsyncQueue<Record<string, unknown> | null>
): Promise<void> {
  const logger = getLogger();
  try {
    const title = await generateTitle(message);
    await updateConversationTitleInternal(conversationId, userId, title);
    queue.push({
      type: 'title_generated',
      conversation_id: conversationId,
      title,
    });
    logger.info({ conversationId, title }, 'Title generated for new conversation');
  } catch (err) {
    logger.error({ err, conversationId }, 'Failed to generate title');
  }
}

async function saveAssistantMessage(
  conversationId: string,
  messageId: string,
  content: string,
  events: Array<Record<string, unknown>>,
  logger: ReturnType<typeof getLogger>
): Promise<void> {
  try {
    const mergedEvents = mergeAdjacentTextEvents(events);
    await createMessageWithMetadataInternal(
      conversationId,
      'assistant',
      content || '(no text content)',
      messageId,
      { events: mergedEvents }
    );
    logger.debug({ conversationId, messageId, eventCount: mergedEvents.length }, 'Saved assistant message');
  } catch (err) {
    logger.error({ err, conversationId, messageId }, 'Failed to save assistant message');
  }
}

function mergeAdjacentTextEvents(events: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];
  for (const event of events) {
    const last = result[result.length - 1];
    if (event.type === 'text' && last?.type === 'text') {
      last.content = (last.content as string) + (event.content as string);
    } else {
      result.push({ ...event });
    }
  }
  return result;
}
