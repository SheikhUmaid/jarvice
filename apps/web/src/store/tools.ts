import { create } from 'zustand';
import { createId } from '../utils/id';

export type ToolRunStatus = 'running' | 'success' | 'error' | 'cancelled';

export interface ToolRun {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  status: ToolRunStatus;
  /** One-line human summary of the structured output or error. */
  summary: string | null;
}

const MAX_RUNS = 60;

interface ToolRunState {
  runs: ToolRun[];
  start(name: string): string;
  finish(id: string, status: Exclude<ToolRunStatus, 'running'>, summary?: string | null): void;
}

export const useToolRuns = create<ToolRunState>((set) => ({
  runs: [],
  start: (name) => {
    const id = createId('tool');
    set((state) => ({
      runs: [
        ...state.runs.slice(-(MAX_RUNS - 1)),
        { id, name, startedAt: Date.now(), endedAt: null, status: 'running', summary: null },
      ],
    }));
    return id;
  },
  finish: (id, status, summary = null) =>
    set((state) => ({
      runs: state.runs.map((run) =>
        run.id === id ? { ...run, status, summary, endedAt: Date.now() } : run,
      ),
    })),
}));
