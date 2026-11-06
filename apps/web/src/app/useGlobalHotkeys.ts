import { useEffect } from 'react';
import { MODE_REGISTRY } from '../features/modes';
import { toggleFullscreen } from '../hooks/useFullscreen';
import { interrupt } from '../services/assistant/runner';
import { logActivity } from '../store/activity';
import { useUi } from '../store/ui';
import { focusCommandInput } from './events';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * Esc: close overlay → interrupt → leave the input · Ctrl/⌘+K or M: mode wheel · 1–8: modes ·
 * /: focus the command input · F: fullscreen · [ ]: side panels (narrow screens).
 * Single-key shortcuts are ignored while typing.
 */
export function useGlobalHotkeys(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUi.getState();
      const typing = isTyping(event.target);

      if (event.key === 'Escape') {
        if (ui.wheelOpen) ui.setWheelOpen(false);
        else if (ui.leftOpen || ui.rightOpen) ui.closeDrawers();
        else if (!interrupt('Esc') && typing) (event.target as HTMLElement).blur();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.setWheelOpen(!ui.wheelOpen);
        return;
      }
      if (typing || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

      if (event.key === '/') {
        event.preventDefault();
        focusCommandInput();
      } else if (/^[1-8]$/.test(event.key)) {
        const mode = MODE_REGISTRY[Number(event.key) - 1];
        if (mode) ui.setMode(mode.id, 'hotkey');
      } else if (event.key === 'm' || event.key === 'M') {
        ui.setWheelOpen(!ui.wheelOpen);
      } else if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen().catch((error: unknown) =>
          logActivity('system', 'Fullscreen refused', {
            level: 'warn',
            detail: error instanceof Error ? error.message : undefined,
          }),
        );
      } else if (event.key === '[') {
        ui.toggleLeft();
      } else if (event.key === ']') {
        ui.toggleRight();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
