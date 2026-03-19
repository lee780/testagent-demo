/**
 * Orchestrator AgentTools — spawn workers, manage tasks.
 * These are injected into the pi Agent as custom tools.
 */

import { Type, type Static } from "@sinclair/typebox";
import { TaskManager, type TaskNode } from "./task-manager.js";
import type { AgentToolDef, AgentToolResult } from "../tools/code-index.js";

function textResult(data: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ── Tool Param Schemas ───────────────────────────────────

const CreateTaskParams = Type.Object({
  description: Type.String({ description: "What this task should accomplish" }),
  worker_name: Type.String({ description: "Worker type to execute (e.g. 'code_analysis', 'api_testing')" }),
  input_data: Type.Optional(Type.Object({}, { additionalProperties: true, description: "Additional context for the worker" })),
  parent_id: Type.Optional(Type.String({ description: "Parent task ID for sub-tasks" })),
});

const SpawnWorkerParams = Type.Object({
  task_id: Type.String({ description: "Task ID to execute (from create_task)" }),
});

const SpawnBatchParams = Type.Object({
  task_ids: Type.Array(Type.String(), { description: "Task IDs to execute concurrently" }),
  timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (default: 600)" })),
});

const ListTasksParams = Type.Object({});

// ── Tool Factory ─────────────────────────────────────────

export type WorkerFn = (task: TaskNode) => Promise<string>;

/**
 * Create orchestrator tools bound to a TaskManager and worker execution function.
 *
 * The workerFn is called to actually execute a task — it receives the TaskNode
 * and returns the worker's output string. The runner provides this function,
 * typically by creating a sub-Agent or calling the pi Agent loop.
 */
export function createOrchestratorTools(
  taskManager: TaskManager,
  workerFn: WorkerFn,
): AgentToolDef[] {
  const createTask: AgentToolDef<Static<typeof CreateTaskParams>> = {
    name: "create_task",
    label: "Create Task",
    description: "Register a new task in the task tree. Returns the task ID. Use spawn_worker to execute it.",
    parameters: CreateTaskParams,
    execute: async (_id, params) => {
      const taskId = taskManager.createTask({
        description: params.description,
        workerName: params.worker_name,
        inputData: params.input_data,
        parentId: params.parent_id,
      });
      return textResult({ status: "ok", task_id: taskId });
    },
  };

  const spawnWorker: AgentToolDef<Static<typeof SpawnWorkerParams>> = {
    name: "spawn_worker",
    label: "Spawn Worker",
    description: "Execute a registered task by spawning a worker agent. Blocks until the worker completes.",
    parameters: SpawnWorkerParams,
    execute: async (_id, params) => {
      const result = await taskManager.spawnAndWait(params.task_id, workerFn);
      return textResult({ status: result.startsWith("ERROR:") ? "error" : "ok", task_id: params.task_id, result });
    },
  };

  const spawnBatch: AgentToolDef<Static<typeof SpawnBatchParams>> = {
    name: "spawn_batch",
    label: "Spawn Batch",
    description: "Execute multiple tasks concurrently. Returns aggregated results.",
    parameters: SpawnBatchParams,
    execute: async (_id, params) => {
      const timeoutMs = (params.timeout ?? 600) * 1000;
      const result = await taskManager.spawnBatchAndWait(params.task_ids, workerFn, timeoutMs);
      return textResult(JSON.parse(result));
    },
  };

  const listTasks: AgentToolDef<Static<typeof ListTasksParams>> = {
    name: "list_tasks",
    label: "List Tasks",
    description: "Show the current task tree with statuses",
    parameters: ListTasksParams,
    execute: async () => {
      return {
        content: [{ type: "text", text: taskManager.listTasks() }],
        details: taskManager.getTreeSnapshot(),
      };
    },
  };

  return [createTask, spawnWorker, spawnBatch, listTasks];
}
