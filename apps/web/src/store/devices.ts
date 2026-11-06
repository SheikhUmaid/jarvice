import { create } from 'zustand';

export type MicStatus = 'off' | 'requesting' | 'live' | 'denied' | 'unavailable' | 'error';

interface DevicesState {
  mic: MicStatus;
  micError: string | null;
  /** Label of the active input device, when the browser exposes it. */
  micLabel: string | null;
  setMic(status: MicStatus, details?: { error?: string | null; label?: string | null }): void;
}

export const useDevices = create<DevicesState>((set) => ({
  mic: 'off',
  micError: null,
  micLabel: null,
  setMic: (mic, details = {}) =>
    set({ mic, micError: details.error ?? null, micLabel: details.label ?? null }),
}));
