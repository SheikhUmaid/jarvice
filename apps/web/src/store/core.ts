import type { ReactorState } from '@jarvis/shared';
import { create } from 'zustand';

interface CoreState {
  /** The assistant pipeline's real state. */
  status: ReactorState;
  /** What is happening right now, e.g. the tool being executed. */
  detail: string | null;
  /** Diagnostics preview of a reactor state (clearly labelled in the UI). */
  override: ReactorState | null;
  setStatus(status: ReactorState, detail?: string | null): void;
  setOverride(override: ReactorState | null): void;
}

export const useCore = create<CoreState>((set) => ({
  status: 'idle',
  detail: null,
  override: null,
  setStatus: (status, detail = null) => set({ status, detail }),
  setOverride: (override) => set({ override }),
}));

/** The state the reactor should render: the override when previewing, otherwise reality. */
export function selectReactorState(state: CoreState): ReactorState {
  return state.override ?? state.status;
}
