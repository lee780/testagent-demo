/**
 * TestAgent Runner — the core integration with pi-mono.
 *
 * Modeled after OpenClaw's runEmbeddedPiAgent():
 * 1. Creates AgentSession via pi-mono SDK
 * 2. Registers custom tools (code-index, testing, orchestrator)
 * 3. Subscribes to events and bridges them to SSE
 * 4. Executes the user's prompt
 *
 * NOTE: pi-mono imports are type-only until the actual packages are installed.
 * The runner is designed to work with the pi-mono API surface described in the plan.
 */

import { getPrisma } from '../server/config/database.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCustomTools, createToolConfig, type ToolConfig } from "./tools/index.js";
import { TaskManager, type ProgressCallback, type TaskEvent } from "./orchestrator/task-manager.js";
import { createOrchestratorTools, type WorkerFn } from "./orchestrator/orchestrator-tools.js";
import { buildSystemPrompt, type TestMode } from "./system-prompt.js";
import { createEventBridge, type PiAgentEvent, type SSEEvent } from "./subscribe.js";
import type { AgentToolDef } from "./tools/code-index.js";

// ── Types ────────────────────────────────────────────────

export interface RunTestAgentParams {
  /** User's message / query. */
  query: string;
  /** Workspace directory (cwd for the agent). */
  workspace: string;
  /** LLM provider identifier (e.g. "anthropic", "openai", "intranet"). */
  provider?: string;
  /** Model ID (e.g. "claude-sonnet-4-20250514"). */
  modelId?: string;
  /** LLM API key (injected into provider-specific env var). */
  apiKey?: string;
  /** LLM base URL (injected into provider-specific env var). */
  baseUrl?: string;
  /** Thinking level for the model. */
  thinkingLevel?: "off" | "low" | "medium" | "high";
  /** Session file path for persistence (JSONL). */
  sessionFile?: string;
  /** User ID (for output files). */
  userId?: string;
  /** Conversation ID (for output files + session). */
  conversationId?: string;
  /** Output directory for downloadable files. */
  outputDir?: string;
  /** Test mode — controls which system prompt and behavior to use. */
  mode?: TestMode;
  /** Custom instructions to append to system prompt. */
  customInstructions?: string;
  /** SSE event callback. */
  onEvent: (event: SSEEvent) => void;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

export interface RunTestAgentResult {
  /** Final assistant text. */
  assistantText: string;
  /** Tool invocation summaries. */
  toolMetas: Array<{ toolName: string; meta?: string }>;
}

// ── Runner ───────────────────────────────────────────────

/**
 * Run the TestAgent using pi-mono's native Agent loop.
 *
 * This function is the heart of TestAgent-PI. It:
 * 1. Builds the tool config and custom tools
 * 2. Creates the TaskManager for orchestration
 * 3. Sets up event bridging (pi events → SSE)
 * 4. Creates and runs the pi AgentSession
 */
export async function runTestAgent(params: RunTestAgentParams): Promise<RunTestAgentResult> {
  // For regression mode, pre-populate workspace/baseline/ from DB BASELINE cases
  if (params.mode === 'regression') {
    await setupRegressionBaseline(params.workspace);
  }

  // 1. Build tool config
  const toolConfig = createToolConfig({
    workspace: params.workspace,
    userId: params.userId,
    conversationId: params.conversationId,
    outputDir: params.outputDir,
    onProgress: (event) => params.onEvent({
      type: 'test_progress',
      data: { ...event },
    }),
  });

  // 2. Event bridge
  const bridge = createEventBridge(params.onEvent);

  // 3. Task Manager with event forwarding
  const taskManager = new TaskManager({
    onProgress: (event: TaskEvent) => {
      bridge.onTaskEvent(event);
    },
  });

  // 4. Worker function for orchestrator tools
  // In the full implementation, this would create a sub-Agent.
  // For now, it's a placeholder that the runner configures.
  const workerFn: WorkerFn = async (task) => {
    // TODO: Create sub-Agent via pi-mono and execute the task
    // For now, return a placeholder
    return `Worker "${task.workerName}" completed task: ${task.description}`;
  };

  // 5. Build all custom tools
  const customTools: AgentToolDef[] = [
    ...buildCustomTools(toolConfig),
    ...createOrchestratorTools(taskManager, workerFn),
  ];

  // 6. Build system prompt
  const systemPrompt = buildSystemPrompt({
    workspace: params.workspace,
    mode: params.mode,
    customInstructions: params.customInstructions,
  });

  // 7. Try to import and use pi-mono (graceful fallback if not installed)
  try {
    return await runWithPiMono(params, customTools, systemPrompt, bridge);
  } catch (importErr: any) {
    if (importErr.code === "ERR_MODULE_NOT_FOUND" || importErr.code === "MODULE_NOT_FOUND") {
      console.warn("[TestAgent] pi-mono packages not found, running in standalone mode");
      return runStandalone(params, customTools, systemPrompt, bridge);
    }
    throw importErr;
  }
}

// ── Pi-Mono Integration ─────────────────────────────────

async function runWithPiMono(
  params: RunTestAgentParams,
  customTools: AgentToolDef[],
  systemPrompt: string,
  bridge: ReturnType<typeof createEventBridge>,
): Promise<RunTestAgentResult> {
  // Dynamic import of pi-mono packages
  const { createAgentSession } = await import("@mariozechner/pi-coding-agent");
  const { getModel } = await import("@mariozechner/pi-ai");
  const { SessionManager } = await import("@mariozechner/pi-coding-agent");

  // Inject API key / base URL into provider-specific env vars so pi-mono can find them
  const provider = (params.provider ?? "anthropic") as Parameters<typeof getModel>[0];
  const modelId = (params.modelId ?? "claude-sonnet-4-20250514") as Parameters<typeof getModel>[1];

  const envKeyMap: Record<string, { key: string; url: string }> = {
    openai:    { key: "OPENAI_API_KEY",    url: "OPENAI_BASE_URL" },
    anthropic: { key: "ANTHROPIC_API_KEY", url: "ANTHROPIC_BASE_URL" },
  };
  const envMap = envKeyMap[provider];
  if (envMap) {
    if (params.apiKey)  process.env[envMap.key] = params.apiKey;
    if (params.baseUrl) process.env[envMap.url] = params.baseUrl;
  }

  let model = getModel(provider, modelId);

  // If model not in pi-mono registry (e.g. dashscope qwen via openai-compatible API),
  // construct a custom Model object so createAgentSession can use it.
  if (!model && params.baseUrl) {
    model = {
      id: modelId as string,
      name: modelId as string,
      api: "openai-completions" as any,
      provider: provider as string,
      baseUrl: params.baseUrl,
      reasoning: false,
      input: ["text"] as any,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 131072,
      maxTokens: 8192,
    } as any;
  }

  if (!model) {
    throw new Error(
      `Unknown model "${modelId}" for provider "${provider}". ` +
      `Either use a registered model or provide LLM_BASE_URL for OpenAI-compatible endpoints.`
    );
  }

  // Session manager for persistence
  const sessionManager = params.sessionFile
    ? SessionManager.open(params.sessionFile)
    : undefined;

  // Create AgentSession
  // `tools` defaults to codingTools (read, bash, edit, write) if omitted.
  // `customTools` adds our business tools on top.
  const { session } = await createAgentSession({
    cwd: params.workspace,
    model,
    thinkingLevel: params.thinkingLevel ?? "off",
    customTools: customTools as any, // AgentToolDef is compatible with ToolDefinition
    sessionManager,
  });

  // Subscribe to events
  const assistantTexts: string[] = [];
  const toolMetas: Array<{ toolName: string; meta?: string }> = [];

  session.agent.subscribe((event: PiAgentEvent) => {
    bridge.onAgentEvent(event);

    // Collect assistant text
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      assistantTexts.push(event.assistantMessageEvent.text ?? "");
    }
    // Collect tool metas
    if (event.type === "tool_execution_end") {
      toolMetas.push({ toolName: event.toolName });
    }
  });

  // Execute prompt
  await session.prompt(params.query);

  return {
    assistantText: assistantTexts.join(""),
    toolMetas,
  };
}

// ── Standalone Mode (no pi-mono) ─────────────────────────

// ── Regression Baseline Setup ────────────────────────────

/**
 * For regression mode: fetch all BASELINE test cases from DB and write
 * their YAML to workspace/baseline/ so the agent can find them directly.
 */
async function setupRegressionBaseline(workspaceDir: string): Promise<void> {
  try {
    const prisma = getPrisma();

    const groups = await prisma.testCaseGroup.findMany({ select: { latestId: true } });
    const latestIds = groups.map((g: any) => g.latestId).filter(Boolean) as string[];

    const cases = await prisma.testCase.findMany({
      where: { id: { in: latestIds }, status: 'BASELINE' },
      include: { group: { select: { modelId: true, caseCode: true } } },
    });

    if (cases.length === 0) return;

    const baselineDir = join(workspaceDir, 'baseline');
    mkdirSync(baselineDir, { recursive: true });

    for (const tc of cases as any[]) {
      const filename = `${tc.group.caseCode}.yaml`;

      // Prefer stored yamlContent (full original YAML)
      if (tc.yamlContent) {
        try {
          // yamlContent may be JSON-serialized raw tc object or YAML string
          const parsed = JSON.parse(tc.yamlContent);
          const { stringify } = await import('yaml');
          writeFileSync(join(baselineDir, filename), stringify(parsed), 'utf-8');
          continue;
        } catch {
          // Fall through to reconstruction
        }
      }

      // Reconstruct minimal YAML from inputParams / expectedResult
      const { stringify } = await import('yaml');
      const yamlObj = {
        id: tc.group.caseCode,
        name: tc.title,
        coverage_point: tc.coveragePoint ?? '',
        priority: tc.priority,
        request: tc.inputParams ?? {},
        assertions: Array.isArray(tc.expectedResult) ? tc.expectedResult : [],
      };
      writeFileSync(join(baselineDir, filename), stringify(yamlObj), 'utf-8');
    }
  } catch (err) {
    // Non-fatal: agent will fall back to searching for YAML files itself
    console.warn('[TestAgent] setupRegressionBaseline failed:', err);
  }
}

async function runStandalone(
  params: RunTestAgentParams,
  customTools: AgentToolDef[],
  systemPrompt: string,
  bridge: ReturnType<typeof createEventBridge>,
): Promise<RunTestAgentResult> {
  // Emit agent_start
  params.onEvent({ type: "agent_start", data: {} });

  // In standalone mode, we can only echo the query and list available tools
  const toolNames = customTools.map((t) => t.name).join(", ");
  const response = [
    `[TestAgent Standalone Mode - pi-mono not installed]`,
    ``,
    `Received query: "${params.query}"`,
    ``,
    `Available custom tools: ${toolNames}`,
    ``,
    `To enable full Agent capabilities, install pi-mono packages:`,
    `  pnpm add @mariozechner/pi-ai @mariozechner/pi-agent-core @mariozechner/pi-coding-agent`,
  ].join("\n");

  params.onEvent({
    type: "agent_message",
    data: { content: response, delta: false },
  });

  params.onEvent({ type: "agent_complete", data: {} });

  return {
    assistantText: response,
    toolMetas: [],
  };
}
