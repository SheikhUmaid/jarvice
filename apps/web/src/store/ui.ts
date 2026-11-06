import { DEFAULT_MODE, getModeMeta, isModeId, type ModeId } from '@jarvis/shared';
import { create } from 'zustand';
import { logActivity } from './activity';

export type ModeChangeSource = 'nav' | 'hotkey' | 'wheel' | 'command' | 'history' | 'deck';

interface UiState {
  mode: ModeId;
  wheelOpen: boolean;
  /** Side panels as drawers on narrow screens (always visible on wide ones). */
  leftOpen: boolean;
  rightOpen: boolean;
  setMode(mode: ModeId, source: ModeChangeSource): void;
  setWheelOpen(open: boolean): void;
  toggleLeft(): void;
  toggleRight(): void;
  closeDrawers(): void;
}

function modeFromHash(): ModeId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return isModeId(id) ? id : DEFAULT_MODE;
}

export const useUi = create<UiState>((set, get) => ({
  mode: modeFromHash(),
  wheelOpen: false,
  leftOpen: false,
  rightOpen: false,
  setMode: (mode, source) => {
    if (get().mode === mode) {
      set({ wheelOpen: false });
      return;
    }
    const meta = getModeMeta(mode);
    set({ mode, wheelOpen: false, leftOpen: false, rightOpen: false });
    logActivity('mode', `Mode ${meta.code} · ${meta.title}`, { detail: `via ${source}` });
  },
  setWheelOpen: (wheelOpen) => set({ wheelOpen }),
  toggleLeft: () => set((state) => ({ leftOpen: !state.leftOpen, rightOpen: false })),
  toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen, leftOpen: false })),
  closeDrawers: () => set({ leftOpen: false, rightOpen: false }),
}));

/** Keeps `location.hash` and the mode store in sync (deep links + back/forward). */
export function bindModeToHistory(): () => void {
  const writeHash = (mode: ModeId) => {
    const hash = `#/${mode}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  };
  if (!window.location.hash) window.history.replaceState(null, '', `#/${useUi.getState().mode}`);
  const unsubscribe = useUi.subscribe((state, previous) => {
    if (state.mode !== previous.mode) writeHash(state.mode);
  });
  const onPop = () => useUi.getState().setMode(modeFromHash(), 'history');
  window.addEventListener('popstate', onPop);
  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onPop);
  };
}
