/**
 * SAMPLE DATA — illustrative entries shown until the SQLite memory engine ships (Milestone 9).
 * Rendered with a "Sample" badge and never treated as real user data.
 */
export interface SampleConversation {
  id: string;
  title: string;
  daysAgo: number;
  messages: number;
}

export interface SampleMemory {
  id: string;
  kind: 'preference' | 'fact' | 'project' | 'command';
  text: string;
}

export const SAMPLE_CONVERSATIONS: readonly SampleConversation[] = [
  { id: 'c1', title: 'Reactor shader tuning', daysAgo: 1, messages: 18 },
  { id: 'c2', title: 'Weekend hiking route', daysAgo: 3, messages: 9 },
  { id: 'c3', title: 'Camera calibration notes', daysAgo: 6, messages: 24 },
];

export const SAMPLE_MEMORIES: readonly SampleMemory[] = [
  { id: 'm1', kind: 'preference', text: 'Prefers metric units and 24-hour time' },
  { id: 'm2', kind: 'project', text: 'Building JARVIS — milestone-by-milestone' },
  { id: 'm3', kind: 'command', text: '“Morning briefing” = weather, calendar, news' },
];
