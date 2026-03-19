import { describe, it, expect, vi } from "vitest";
import { TaskManager, type TaskEvent } from "../../src/agent-core/orchestrator/task-manager.js";

describe("TaskManager", () => {
  it("should create tasks with sequential IDs", () => {
    const tm = new TaskManager();
    const id1 = tm.createTask({ description: "Task 1", workerName: "worker_a" });
    const id2 = tm.createTask({ description: "Task 2", workerName: "worker_b" });

    expect(id1).toBe("task_001");
    expect(id2).toBe("task_002");
  });

  it("should emit task_tree_node_created event", () => {
    const events: TaskEvent[] = [];
    const tm = new TaskManager({ onProgress: (e) => events.push(e) });

    tm.createTask({ description: "Test", workerName: "w" });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("task_tree_node_created");
  });

  it("should track parent-child depth", () => {
    const tm = new TaskManager();
    const parent = tm.createTask({ description: "Parent", workerName: "w" });
    const child = tm.createTask({ description: "Child", workerName: "w", parentId: parent });

    expect(tm.getTask(parent).depth).toBe(0);
    expect(tm.getTask(child).depth).toBe(1);
  });

  it("should execute task via spawnAndWait", async () => {
    const events: TaskEvent[] = [];
    const tm = new TaskManager({ onProgress: (e) => events.push(e) });

    const id = tm.createTask({ description: "Work", workerName: "w" });
    const result = await tm.spawnAndWait(id, async () => "done!");

    expect(result).toBe("done!");
    expect(tm.getTask(id).status).toBe("completed");

    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain("task_tree_node_started");
    expect(eventTypes).toContain("task_tree_node_completed");
  });

  it("should handle task failure", async () => {
    const tm = new TaskManager();
    const id = tm.createTask({ description: "Fail", workerName: "w" });

    const result = await tm.spawnAndWait(id, async () => {
      throw new Error("boom");
    });

    expect(result).toContain("ERROR:");
    expect(tm.getTask(id).status).toBe("failed");
    expect(tm.getTask(id).error).toBe("boom");
  });

  it("should handle task timeout", async () => {
    const tm = new TaskManager();
    const id = tm.createTask({ description: "Slow", workerName: "w" });

    const result = await tm.spawnAndWait(
      id,
      () => new Promise((resolve) => setTimeout(resolve, 5000)),
      100, // 100ms timeout
    );

    expect(result).toContain("ERROR:");
    expect(result).toContain("timed out");
    expect(tm.getTask(id).status).toBe("failed");
  });

  it("should enforce max depth", async () => {
    const tm = new TaskManager({ depthOffset: 3 }); // Already at max
    const id = tm.createTask({ description: "Deep", workerName: "w" });

    const result = await tm.spawnAndWait(id, async () => "ok");

    expect(result).toContain("ERROR:");
    expect(result).toContain("Max depth");
  });

  it("should execute batch tasks concurrently", async () => {
    const tm = new TaskManager();
    const id1 = tm.createTask({ description: "A", workerName: "w" });
    const id2 = tm.createTask({ description: "B", workerName: "w" });

    const startTime = Date.now();
    const result = await tm.spawnBatchAndWait(
      [id1, id2],
      async (task) => {
        await new Promise((r) => setTimeout(r, 50));
        return `done: ${task.description}`;
      },
    );

    const elapsed = Date.now() - startTime;
    const data = JSON.parse(result);

    expect(data.total).toBe(2);
    expect(data.succeeded).toBe(2);
    // Both should run concurrently, so total time should be ~50ms not ~100ms
    expect(elapsed).toBeLessThan(150);
  });

  it("should list tasks with tree formatting", () => {
    const tm = new TaskManager();
    const parent = tm.createTask({ description: "Parent task", workerName: "analyzer" });
    tm.createTask({ description: "Child task", workerName: "tester", parentId: parent });

    const listing = tm.listTasks();
    expect(listing).toContain("Parent task");
    expect(listing).toContain("Child task");
    expect(listing).toContain("analyzer");
  });

  it("should return tree snapshot", () => {
    const tm = new TaskManager();
    tm.createTask({ description: "A", workerName: "w" });
    tm.createTask({ description: "B", workerName: "w" });

    const snapshot = tm.getTreeSnapshot();
    expect(snapshot.nodes).toHaveLength(2);
  });
});
