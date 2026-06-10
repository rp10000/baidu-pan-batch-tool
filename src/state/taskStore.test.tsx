import { describe, expect, it } from "vitest";
import type { ProcessingTask } from "../domain/types";
import { createEmptyStages } from "../domain/pipeline";
import { createInitialTaskState, getActiveTask, taskReducer } from "./taskStore";

function makeTask(id: string, progress = 0): ProcessingTask {
  return {
    id,
    name: `任务 ${id}`,
    createdAt: "2026-06-10T00:00:00.000Z",
    status: progress === 100 ? "completed" : "draft",
    progress,
    inputs: [],
    options: {
      autoClassify: true,
      autoTransfer: true,
      scanWatermark: true,
      scanTrafficContent: true,
      autoRemoveWatermark: true,
      removeTrafficFields: true,
      autoCreateShareCode: true,
      autoRenameFiles: true,
      renameRule: "{分类}_{日期}_{序号}",
      targetDirectory: "/自动归档/{分类}"
    },
    stages: createEmptyStages(),
    processedFiles: [],
    summary: {
      recognizedFiles: 0,
      classifiedFiles: 0,
      removedWatermarks: 0,
      removedTrafficItems: 0,
      renamedFiles: 0,
      transferredFiles: 0,
      failedFiles: 0
    }
  };
}

describe("taskStore reducer", () => {
  it("creates, updates, selects, and clears tasks", () => {
    const first = makeTask("task-1");
    const second = makeTask("task-2");

    const withFirst = taskReducer(createInitialTaskState(), { type: "createTask", task: first });
    expect(withFirst.tasks).toEqual([first]);
    expect(getActiveTask(withFirst)).toBe(first);

    const withSecond = taskReducer(withFirst, { type: "createTask", task: second });
    expect(withSecond.activeTaskId).toBe("task-2");
    expect(withSecond.tasks.map((task) => task.id)).toEqual(["task-2", "task-1"]);

    const updatedSecond = makeTask("task-2", 100);
    const afterUpdate = taskReducer(withSecond, { type: "updateTask", task: updatedSecond });
    expect(getActiveTask(afterUpdate)?.progress).toBe(100);

    const afterSelect = taskReducer(afterUpdate, { type: "selectTask", taskId: "task-1" });
    expect(getActiveTask(afterSelect)?.id).toBe("task-1");

    const cleared = taskReducer(afterSelect, { type: "clearTasks" });
    expect(cleared).toEqual({ tasks: [], activeTaskId: undefined });
  });
});
