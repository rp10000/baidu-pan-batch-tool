import type { ProcessingOptions, ProcessingTask } from "../domain/types";

export type TaskUpdateHandler = (task: ProcessingTask) => void;

export interface ProcessingService {
  createAndRunTask(
    rawText: string,
    options: ProcessingOptions,
    onUpdate?: TaskUpdateHandler
  ): Promise<ProcessingTask>;
}
