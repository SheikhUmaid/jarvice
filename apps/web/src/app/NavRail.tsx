import { cx, toneStyle } from '@jarvis/ui';
import { STATUS_TONE, MODE_REGISTRY, statusLabel, type ModeDefinition } from '../features/modes';
import { useUi } from '../store/ui';

/** Global navigation between the eight modes (left edge, md+). */
export function NavRail() {
  const current = useUi((state) => state.mode);
  return (
    <nav
      aria-label="Interface modes"
      className="pointer-events-auto absolute bottom-[var(--chrome-bottom)] left-0 top-[var(--chrome-top)] z-30 hidden w-[var(--chrome-left)] flex-col items-center gap-1.5 overflow-y-auto border-r border-holo-400/10 bg-void/45 py-3 backdrop-blur-md md:flex"
    >
      {MODE_REGISTRY.map((mode) => (
        <RailButton key={mode.id} mode={mode} active={mode.id === current} />
      ))}
    </nav>
  );
}

function RailButton({ mode, active }: { mode: ModeDefinition; active: boolean }) {
  const Icon = mode.icon;
  return (
    <button
      type="button"
      onClick={() => useUi.getState().setMode(mode.id, 'nav')}
      aria-current={active ? 'page' : undefined}
      aria-label={`Mode ${mode.code}: ${mode.title} — ${statusLabel(mode)} (key ${mode.hotkey})`}
      className={cx(
        'group relative grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border transition-colors',
        active
          ? 'border-holo-400/50 bg-holo-400/15 text-holo-50 shadow-[0_0_18px_-6px_rgb(25_220_255/0.9)]'
          : 'border-transparent text-holo-300/60 hover:border-holo-400/25 hover:bg-holo-400/8 hover:text-holo-100',
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -left-[11px] top-2 bottom-2 w-[2px] bg-holo-400 shadow-[0_0_8px_rgb(25_220_255)]"
        />
      )}
      <Icon size={18} strokeWidth={1.5} />
      <span
        aria-hidden
        className="absolute bottom-0.5 right-1 font-mono text-[8px] text-holo-400/50"
      >
        {mode.hotkey}
      </span>
      <span
        aria-hidden
        className="absolute right-1 top-1 h-1 w-1 rounded-full"
        style={toneStyle(STATUS_TONE[mode.status], {
          background: 'rgb(var(--tone))',
          opacity: mode.status === 'standby' ? 0.55 : 1,
        })}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-[2px] border border-holo-400/25 bg-navy-950/95 px-2.5 py-1.5 text-left opacity-0 shadow-lg transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      >
        <span className="block font-display text-[9.5px] tracking-[0.22em] text-holo-50">
          {mode.code} · {mode.title.toUpperCase()}
        </span>
        <span className="mt-0.5 block text-[12px] text-holo-300/70">{statusLabel(mode)}</span>
      </span>
    </button>
  );
}
