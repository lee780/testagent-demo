/**
 * Task Manager — dynamic task tree for orchestrator pattern.
 * Ported from Python task_manager.py → TypeScript.
 *
 * Manages a tree of TaskNodes with state machine:
 *   pending → running → completed | failed
 */

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface TaskNode {
  taskId: string;
  description: string;
  workerName: string;
  inputData: Record<string, unknown>;
  status: TaskStatus;
  result: string;
  error: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export type TaskEvent =
  | { type: "task_tree_node_created"; data: TaskNode }
  | { type: "task_tree_node_started"; data: { taskId: string } }
  | { type: "task_tree_node_completed"; data: { taskId: string; result: string } }
  | { type: "task_tree_node_failed"; data: { taskId: string; error: string } };

export type ProgressCallback = (event: TaskEvent) => void;

const MAX_DEPTH = 3;
const MAX_RESULT_LENGTH = 500;

export class TaskManager {
  private tasks = new Map<string, TaskNode>();
  private taskCounter = 0;
  private depthOffset: number;
  private onProgress?: ProgressCallback;

  constructor(opts: { depthOffset?: number; onProgress?: ProgressCallback } = {}) {
    this.depthOffset = opts.depthOffset ?? 0;
    this.onProgress = opts.onProgress;
  }

  createTask(params: {
    description: string;
    workerName: string;
    inputData?: Record<string, unknown>;
    parentId?: string;
  }): string {
    this.taskCounter++;
    const taskId = `task_${String(this.taskCounter).padStart(3, "0")}`;

    let depth = this.depthOffset;
    if (params.parentId) {
      const parent = this.tasks.get(params.parentId);
      if (parent) depth = parent.depth + 1;
    }

    const node: TaskNode = {
      taskId,
      description: params.description,
      workerName: params.workerName,
      inputData: params.inputData ?? {},
      status: "pending",
      result: "",
      error: "",
      parentId: params.parentId ?? null,
      depth,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    this.tasks.set(taskId, node);
    this.emit({ type: "task_tree_node_created", data: node });

    return taskId;
  }

  markRunning(taskId: string): void {
    const node = this.getTask(taskId);
    node.status = "running";
    node.startedAt = new Date().toISOString();
    this.emit({ type: "task_tree_node_started", data: { taskId } });
  }

  markCompleted(taskId: string, result: string): void {
    const node = this.getTask(taskId);
    node.status = "completed";
    node.result = result.slice(0, MAX_RESULT_LENGTH);
    node.completedAt = new Date().toISOString();
    this.emit({ type: "task_tree_node_completed", data: { taskId, result: node.result } });
  }

  markFailed(taskId: string, error: string): void {
    const node = this.getTask(taskId);
    node.status = "failed";
    node.error = error;
    node.completedAt = new Date().toISOString();
    this.emit({ type: "task_tree_node_failed", data: { taskId, error } });
  }

  getTask(taskId: string): TaskNode {
    const node = this.tasks.get(taskId);
    if (!node) throw new Error(`Unknown task: ${taskId}`);
    return node;
  }

  canSpawn(taskId: string): boolean {
    const node = this.tasks.get(taskId);
    if (!node) return false;
    return node.depth < MAX_DEPTH;
  }

  listTasks(): string {
    const lines: string[] = [];
    for (const node of this.tasks.values()) {
      const indent = "  ".repeat(node.depth);
      const icon = { pending: "\u25CB", running: "\u25CF", completed: "\u2713", failed: "\u2717" }[node.status];
      lines.push(`${indent}${icon} [${node.taskId}] ${node.description} (${node.workerName}) - ${node.status}`);
    }
    return lines.join("\n") || "No tasks";
  }

  getTreeSnapshot(): { nodes: TaskNode[] } {
    return { nodes: Array.from(this.tasks.values()) };
  }

  getAllTasks(): Map<string, TaskNode> {
    return this.tasks;
  }

  /**
   * Execute a single task by running a worker function.
   * The workerFn is injected by the caller (runner/orchestrator).
   */
  async spawnAndWait(
    taskId: string,
    workerFn: (task: TaskNode) => Promise<string>,
    timeoutMs = 300_000,
  ): Promise<string> {
    const node = this.getTask(taskId);
    if (node.depth >= MAX_DEPTH) {
      const err = `Max depth ${MAX_DEPTH} exceeded for task ${taskId}`;
      this.markFailed(taskId, err);
      return `ERROR: ${err}`;
    }

    this.markRunning(taskId);

    try {
      const result = await Promise.race([
        workerFn(node),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Task ${taskId} timed out after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
      this.markCompleted(taskId, result);
      return result;
    } catch (e: any) {
      const error = e.message ?? String(e);
      this.markFailed(taskId, error);
      return `ERROR: ${error}`;
    }
  }

  /**
   * Execute multiple tasks concurrently.
   */
  async spawnBatchAndWait(
    taskIds: string[],
    workerFn: (task: TaskNode) => Promise<string>,
    timeoutMs = 600_000,
  ): Promise<string> {
    // Validate all task IDs first
    for (const id of taskIds) {
      if (!this.tasks.has(id)) throw new Error(`Unknown task: ${id}`);
    }

    const results = await Promise.allSettled(
      taskIds.map((id) => this.spawnAndWait(id, workerFn, timeoutMs)),
    );

    const summary = taskIds.map((id, i) => {
      const r = results[i];
      const status = r.status === "fulfilled" ? "ok" : "error";
      const output = r.status === "fulfilled"
        ? r.value.slice(0, 300)
        : (r.reason?.message ?? String(r.reason)).slice(0, 300);
      return { task_id: id, status, output };
    });

    const succeeded = summary.filter((s) => s.status === "ok").length;
    return JSON.stringify({
      total: taskIds.length,
      succeeded,
      failed: taskIds.length - succeeded,
      results: summary,
    });
  }

  private emit(event: TaskEvent): void {
    this.onProgress?.(event);
  }
}
