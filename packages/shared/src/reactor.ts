/** The five assistant states the reactor visualises. */
export const REACTOR_STATES = ['idle', 'listening', 'thinking', 'speaking', 'executing'] as const;

export type ReactorState = (typeof REACTOR_STATES)[number];

export const REACTOR_STATE_LABELS: Record<ReactorState, string> = {
  idle: 'Standing by',
  listening: 'Listening',
  thinking: 'Processing',
  speaking: 'Responding',
  executing: 'Executing',
};
