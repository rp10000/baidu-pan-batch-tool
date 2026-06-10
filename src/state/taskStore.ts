import { createContext, createElement, useCallback, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type { ProcessingTask } from "../domain/types";

export interface TaskState {
  tasks: ProcessingTask[];
  activeTaskId?: string;
}

type TaskAction =
  | { type: "createTask"; task: ProcessingTask }
  | { type: "updateTask"; task: ProcessingTask }
  | { type: "selectTask"; taskId: string }
  | { type: "clearTasks" };

interface TaskStoreValue extends TaskState {
  activeTask?: ProcessingTask;
  createTask: (task: ProcessingTask) => void;
  updateTask: (task: ProcessingTask) => void;
  selectTask: (taskId: string) => void;
  clearTasks: () => void;
}

const TaskStoreContext = createContext<TaskStoreValue | undefined>(undefined);

export function createInitialTaskState(): TaskState {
  return {
    tasks: [],
    activeTaskId: undefined
  };
}

export function getActiveTask(state: TaskState): ProcessingTask | undefined {
  return state.tasks.find((task) => task.id === state.activeTaskId) ?? state.tasks[0];
}

export function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case "createTask":
      return {
        tasks: [action.task, ...state.tasks.filter((task) => task.id !== action.task.id)],
        activeTaskId: action.task.id
      };
    case "updateTask": {
      const exists = state.tasks.some((task) => task.id === action.task.id);
      const tasks = exists
        ? state.tasks.map((task) => (task.id === action.task.id ? action.task : task))
        : [action.task, ...state.tasks];
      return {
        tasks,
        activeTaskId: state.activeTaskId ?? action.task.id
      };
    }
    case "selectTask":
      return {
        ...state,
        activeTaskId: action.taskId
      };
    case "clearTasks":
      return createInitialTaskState();
  }
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, undefined, createInitialTaskState);
  const createTask = useCallback((task: ProcessingTask) => dispatch({ type: "createTask", task }), []);
  const updateTask = useCallback((task: ProcessingTask) => dispatch({ type: "updateTask", task }), []);
  const selectTask = useCallback((taskId: string) => dispatch({ type: "selectTask", taskId }), []);
  const clearTasks = useCallback(() => dispatch({ type: "clearTasks" }), []);
  const value = useMemo(
    () => ({
      ...state,
      activeTask: getActiveTask(state),
      createTask,
      updateTask,
      selectTask,
      clearTasks
    }),
    [clearTasks, createTask, selectTask, state, updateTask]
  );

  return createElement(TaskStoreContext.Provider, { value }, children);
}

export function useTaskStore(): TaskStoreValue {
  const value = useContext(TaskStoreContext);
  if (!value) {
    throw new Error("useTaskStore must be used inside TaskProvider");
  }

  return value;
}
