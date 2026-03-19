/**
 * Chat Service — rewritten for pi-mono native Agent (no subprocess spawning).
 *
 * Uses runTestAgent() from agent-core, bridges events via AsyncQueue → generator.
 */

import { v4 as uuidv4 } from 'uuid';
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

// ── Active agent runs (for interrupt support) ──────────────

const activeAbortControllers = new Map<string, AbortController>();

// ── AsyncQueue utility ─────────────────────────────────────

class AsyncQueue<T> {
  private queue: T[] = [];
  private resolve: (() => void) | null = null;

  push(item: T): void {
    this.queue.push(item);
    if (this.resolve) {
      this.resolve();
      this.resolve = null;
    }
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    while (true) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!;
      }
      // Wait for new items or timeout (heartbeat)
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 30000);
        this.resolve = () => {
          clearTimeout(timer);
          resolve();
        };
      });
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
}

export async function* sendMessageStreaming(
  options: SSEStreamOptions
): AsyncGenerator<Record<string, unknown>> {
  const { message, userId, uploadedFiles } = options;
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

  // 6. AbortController for interruption
  const abortController = new AbortController();
  activeAbortControllers.set(replyId, abortController);

  // Build query with file context if needed
  let agentQuery = message;
  if (uploadedFiles && uploadedFiles.length > 0) {
    const fileStoragePath = `${config.storage.root}/chat/${userId}/${conversationId}`;
    agentQuery = `[SYSTEM CONTEXT]
user_id: ${userId}
conversation_id: ${conversationId}
file_storage_path: ${fileStoragePath}
uploaded_files:
${uploadedFiles.map(f => `  - ${fileStoragePath}/${f}`).join('\n')}

IMPORTANT: To read uploaded files, use read tool with the full path above.
[/SYSTEM CONTEXT]

${message}`;
  }

  // 7. Start agent (non-blocking — pushes events to queue)
  const agentPromise = runTestAgent({
    query: agentQuery,
    workspace: workspace.getScratchDir(),
    provider: config.llm.provider,
    modelId: config.llm.modelName,
    apiKey: config.llm.apiKey,
    baseUrl: config.llm.baseUrl,
    sessionFile: workspace.getSessionFile(conversationId),
    userId,
    conversationId,
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
      }
    },
    signal: abortController.signal,
  }).then(() => {
    queue.push(null); // end signal
  }).catch((err) => {
    logger.error({ err, conversationId }, 'Agent error');
    queue.push({ type: 'error', message: err.message ?? String(err) });
    queue.push(null);
  });

  // 8. Async title generation for new conversations
  if (isNewConversation) {
    generateAndUpdateTitle(conversationId, userId, message, queue);
  }

  // 9. Consume queue and yield events
  try {
    for await (const event of queue) {
      if (event === null) break;

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
