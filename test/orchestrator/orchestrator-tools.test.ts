import { describe, it, expect } from "vitest";
import { TaskManager } from "../../src/agent-core/orchestrator/task-manager.js";
import { createOrchestratorTools } from "../../src/agent-core/orchestrator/orchestrator-tools.js";

describe("orchestrator tools", () => {
  const tm = new TaskManager();
  const workerFn = async (task: any) => `Completed: ${task.description}`;
  const tools = createOrchestratorTools(tm, workerFn);

  const createTask = tools.find((t) => t.name === "create_task")!;
  const spawnWorker = tools.find((t) => t.name === "spawn_worker")!;
  const listTasks = tools.find((t) => t.name === "list_tasks")!;

  it("should create a task via tool", async () => {
    const result = await createTask.execute("tc1", {
      description: "Analyze code",
      worker_name: "code_analysis",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.task_id).toMatch(/^task_/);
  });

  it("should spawn and complete a task", async () => {
    const createResult = await createTask.execute("tc2", {
      description: "Run tests",
      worker_name: "testing",
    });
    const taskId = JSON.parse(createResult.content[0].text).task_id;

    const spawnResult = await spawnWorker.execute("tc3", { task_id: taskId });
    const data = JSON.parse(spawnResult.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.result).toContain("Completed: Run tests");
  });

  it("should list all tasks", async () => {
    const result = await listTasks.execute("tc4", {});
    expect(result.content[0].text).toContain("task_");
  });
});
