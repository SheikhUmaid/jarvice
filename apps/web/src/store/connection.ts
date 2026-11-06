import type { AiStatus } from '@jarvis/schemas';
import { create } from 'zustand';

export type LinkStatus = 'connecting' | 'online' | 'offline';
export type AgentStatus = 'unknown' | 'online' | 'offline';

export interface BackendLinkState {
  status: LinkStatus;
  latencyMs: number | null;
  version: string | null;
  startedAt: number | null;
  uptimeSec: number | null;
  clients: number | null;
  ai: AiStatus | null;
}

export interface AgentLinkState {
  status: AgentStatus;
  version: string | null;
  platform: string | null;
  paired: boolean;
  checkedAt: number | null;
}

interface ConnectionState {
  backend: BackendLinkState;
  agent: AgentLinkState;
  setBackend(patch: Partial<BackendLinkState>): void;
  setAgent(patch: Partial<AgentLinkState>): void;
}

export const useConnection = create<ConnectionState>((set) => ({
  backend: {
    status: 'connecting',
    latencyMs: null,
    version: null,
    startedAt: null,
    uptimeSec: null,
    clients: null,
    ai: null,
  },
  agent: { status: 'unknown', version: null, platform: null, paired: false, checkedAt: null },
  setBackend: (patch) => set((state) => ({ backend: { ...state.backend, ...patch } })),
  setAgent: (patch) => set((state) => ({ agent: { ...state.agent, ...patch } })),
}));
