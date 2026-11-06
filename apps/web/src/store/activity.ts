import { create } from 'zustand';
import { createId } from '../utils/id';

export type ActivityKind = 'system' | 'mode' | 'command' | 'tool' | 'link' | 'device' | 'settings';
export type ActivityLevel = 'info' | 'success' | 'warn' | 'error';

export interface ActivityEvent {
  id: string;
  at: number;
  kind: ActivityKind;
  level: ActivityLevel;
  message: string;
  detail?: string;
}

const MAX_EVENTS = 200;

interface ActivityState {
  events: ActivityEvent[];
  log(event: Omit<ActivityEvent, 'id' | 'at'>): void;
  clear(): void;
}

export const useActivity = create<ActivityState>((set) => ({
  events: [],
  log: (event) =>
    set((state) => ({
      events: [
        ...state.events.slice(-(MAX_EVENTS - 1)),
        { ...event, id: createId('evt'), at: Date.now() },
      ],
    })),
  clear: () => set({ events: [] }),
}));

/** Records a real application event on the activity timeline. */
export function logActivity(
  kind: ActivityKind,
  message: string,
  options: { level?: ActivityLevel; detail?: string } = {},
): void {
  useActivity
    .getState()
    .log({ kind, message, level: options.level ?? 'info', detail: options.detail });
}
