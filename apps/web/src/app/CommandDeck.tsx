import { HolographicButton, cx } from '@jarvis/ui';
import { Mic, MicOff, SendHorizontal, Square } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AudioMeter } from '../components/Live';
import { getMode } from '../features/modes';
import { micMonitor } from '../services/audio/micMonitor';
import { interrupt, submitCommand } from '../services/assistant/runner';
import { useCore } from '../store/core';
import { useDevices } from '../store/devices';
import { useUi } from '../store/ui';
import { FOCUS_COMMAND_EVENT } from './events';

/** Global command bar: mode wheel, command input with history, microphone, interrupt, send. */
export function CommandDeck() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const draft = useRef('');
  const status = useCore((state) => state.status);
  const mic = useDevices((state) => state.mic);
  const micError = useDevices((state) => state.micError);
  const busy = status === 'thinking' || status === 'executing' || status === 'speaking';

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener(FOCUS_COMMAND_EVENT, focus);
    return () => window.removeEventListener(FOCUS_COMMAND_EVENT, focus);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    history.current = [...history.current.filter((entry) => entry !== text), text].slice(-50);
    historyIndex.current = -1;
    setValue('');
    void submitCommand(text, 'text');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const entries = history.current;
    if (event.key === 'ArrowUp' && entries.length > 0) {
      event.preventDefault();
      if (historyIndex.current === -1) {
        draft.current = value;
        historyIndex.current = entries.length - 1;
      } else {
        historyIndex.current = Math.max(0, historyIndex.current - 1);
      }
      setValue(entries[historyIndex.current] ?? '');
    } else if (event.key === 'ArrowDown' && historyIndex.current !== -1) {
      event.preventDefault();
      const next = historyIndex.current + 1;
      historyIndex.current = next >= entries.length ? -1 : next;
      setValue(next >= entries.length ? draft.current : (entries[next] ?? ''));
    }
  };

  const micLive = mic === 'live';
  const onInterrupt = () => {
    if (!interrupt('interrupt button') && micLive) micMonitor.stop();
  };

  return (
    <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 border-t border-holo-400/10 bg-gradient-to-t from-void/95 to-void/55 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-2.5 backdrop-blur-md md:pl-[calc(var(--chrome-left)+0.75rem)] md:pr-4">
      <form onSubmit={submit} className="mx-auto flex max-w-5xl items-center gap-2">
        <ModeWheelButton />
        <label className="relative flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[3px] border border-holo-400/25 bg-navy-950/70 px-3 shadow-[inset_0_0_18px_-10px_rgb(25_220_255/0.7)] transition focus-within:border-holo-400/60 focus-within:shadow-[inset_0_0_22px_-8px_rgb(25_220_255/0.8),0_0_18px_-8px_rgb(25_220_255/0.8)]">
          <span aria-hidden className="font-mono text-[13px] text-holo-400/70">
            ›
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Command"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              micLive
                ? 'Listening… type your command (voice commands arrive in Milestone 3)'
                : 'Type a command — try “help” or “run diagnostics”'
            }
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-wide text-holo-50 outline-none placeholder:text-holo-300/40"
          />
          {micLive && <AudioMeter bars={14} className="hidden sm:flex" />}
          <kbd aria-hidden className="holo-kbd hidden md:inline-flex">
            /
          </kbd>
        </label>
        <HolographicButton
          iconOnly
          tone={micLive ? 'alert' : 'cyan'}
          active={micLive}
          loading={mic === 'requesting'}
          aria-label={micLive ? 'Stop microphone' : 'Start microphone'}
          title={
            micError ??
            (micLive ? 'Stop microphone' : 'Start microphone (level monitor — no recording)')
          }
          icon={micLive ? <MicOff size={16} /> : <Mic size={16} />}
          onClick={() => (micLive ? micMonitor.stop() : void micMonitor.start())}
        />
        <HolographicButton
          iconOnly
          tone="amber"
          aria-label="Interrupt (Esc)"
          title="Interrupt (Esc)"
          disabled={!busy && !micLive}
          icon={<Square size={14} />}
          onClick={onInterrupt}
        />
        <HolographicButton
          type="submit"
          variant="solid"
          disabled={!value.trim()}
          icon={<SendHorizontal size={15} />}
          className="hidden sm:inline-flex"
        >
          Send
        </HolographicButton>
      </form>
      <div className="mx-auto mt-1.5 hidden max-w-5xl items-center justify-between gap-4 px-1 md:flex">
        <span className="holo-label">
          Local command layer online · Claude reasoning core: Milestone 4
        </span>
        <span className="holo-label">
          ↑↓ history · Esc interrupt · M modes · 1–8 jump · F fullscreen
        </span>
      </div>
    </footer>
  );
}

function ModeWheelButton() {
  const mode = getMode(useUi((state) => state.mode));
  const open = useUi((state) => state.wheelOpen);
  const Icon = mode.icon;
  return (
    <HolographicButton
      iconOnly
      variant="outline"
      active={open}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Mode selector — current: ${mode.title} (M)`}
      title="Mode selector (M or Ctrl+K)"
      className={cx('relative')}
      icon={<Icon size={16} strokeWidth={1.6} />}
      onClick={() => useUi.getState().setWheelOpen(!open)}
    />
  );
}
