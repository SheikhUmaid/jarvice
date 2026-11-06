import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
}

export function useIsFullscreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement != null,
    () => false,
  );
}

export const fullscreenSupported = (): boolean =>
  typeof document !== 'undefined' && document.fullscreenEnabled === true;

/** Toggles fullscreen for the whole app. Resolves to the new state; rejects if the browser refuses. */
export async function toggleFullscreen(force?: boolean): Promise<boolean> {
  const active = document.fullscreenElement != null;
  const enter = force ?? !active;
  if (enter && !active) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  if (!enter && active) await document.exitFullscreen();
  return document.fullscreenElement != null;
}
