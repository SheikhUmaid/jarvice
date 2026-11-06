import { HOLO_EASE, HolographicRing, cx, toneStyle } from '@jarvis/ui';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MODE_REGISTRY, STATUS_TONE, statusLabel } from '../features/modes';
import { useUi } from '../store/ui';

const COUNT = MODE_REGISTRY.length;
const STEP = 360 / COUNT;

function polar(radius: number, degrees: number): [number, number] {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function sectorPath(index: number, inner: number, outer: number, gapDeg = 1.6): string {
  const start = index * STEP - STEP / 2 + gapDeg;
  const end = start + STEP - gapDeg * 2;
  const [x1, y1] = polar(outer, start);
  const [x2, y2] = polar(outer, end);
  const [x3, y3] = polar(inner, end);
  const [x4, y4] = polar(inner, start);
  return `M${x1} ${y1}A${outer} ${outer} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${inner} ${inner} 0 0 0 ${x4} ${y4}Z`;
}

/** Radial HUD selector for the eight modes (M or Ctrl/⌘+K; arrows + Enter; 1–8; Esc closes). */
export function ModeWheel() {
  const open = useUi((state) => state.wheelOpen);
  return <AnimatePresence>{open && <Wheel />}</AnimatePresence>;
}

function Wheel() {
  const current = useUi((state) => state.mode);
  const [focused, setFocused] = useState(() =>
    Math.max(
      0,
      MODE_REGISTRY.findIndex((m) => m.id === current),
    ),
  );
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const focusedMode = MODE_REGISTRY[focused] ?? MODE_REGISTRY[0]!;

  useEffect(() => {
    buttons.current[focused]?.focus({ preventScroll: true });
  }, [focused]);

  const close = () => useUi.getState().setWheelOpen(false);
  const select = (index: number) => {
    const mode = MODE_REGISTRY[index];
    if (mode) useUi.getState().setMode(mode.id, 'wheel');
    close();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setFocused((index) => (index + 1) % COUNT);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setFocused((index) => (index - 1 + COUNT) % COUNT);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      setFocused((index) => (index + (event.shiftKey ? COUNT - 1 : 1)) % COUNT);
    }
  };

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-50 grid place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        aria-label="Close mode selector"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-void/75 backdrop-blur-sm"
        onClick={close}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Mode selector"
        onKeyDown={onKeyDown}
        className="relative aspect-square w-[min(34rem,92vw)]"
        initial={{ scale: 0.86, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.4, ease: HOLO_EASE }}
      >
        <HolographicRing
          size="100%"
          radius={49.5}
          thickness={0.2}
          ticks={{ count: 72, length: 1, majorEvery: 9, majorLength: 2.2, inward: true }}
          spin={90}
          opacity={0.6}
          className="absolute inset-0"
        />
        <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
          {MODE_REGISTRY.map((mode, index) => (
            <path
              key={mode.id}
              d={sectorPath(index, 46, 92)}
              className="transition-[fill,stroke] duration-200"
              style={{
                fill:
                  index === focused
                    ? 'rgb(25 220 255 / 0.16)'
                    : mode.id === current
                      ? 'rgb(25 220 255 / 0.07)'
                      : 'rgb(3 12 26 / 0.72)',
                stroke: index === focused ? 'rgb(25 220 255 / 0.9)' : 'rgb(25 220 255 / 0.25)',
                strokeWidth: 0.5,
              }}
            />
          ))}
          <circle
            r="44"
            fill="rgb(2 8 18 / 0.85)"
            stroke="rgb(25 220 255 / 0.35)"
            strokeWidth="0.4"
          />
        </svg>

        {MODE_REGISTRY.map((mode, index) => {
          const [x, y] = polar(34.5, index * STEP);
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              ref={(button) => {
                buttons.current[index] = button;
              }}
              type="button"
              aria-current={mode.id === current ? 'page' : undefined}
              aria-label={`${mode.hotkey}: ${mode.title} — ${statusLabel(mode)}`}
              onClick={() => select(index)}
              onMouseEnter={() => setFocused(index)}
              onFocus={() => setFocused(index)}
              className={cx(
                'absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-[3px] py-2 text-center outline-none transition-colors',
                index === focused ? 'text-white' : 'text-holo-300/70',
              )}
              style={{ left: `${50 + x}%`, top: `${50 + y}%` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * index, duration: 0.3, ease: HOLO_EASE }}
            >
              <Icon
                size={22}
                strokeWidth={1.4}
                className={cx(index === focused && 'drop-shadow-[0_0_8px_rgb(25_220_255)]')}
              />
              <span className="font-display text-[8.5px] font-semibold tracking-[0.2em]">
                {mode.shortTitle.toUpperCase()}
              </span>
              <span className="font-mono text-[9px] text-holo-400/60">
                {mode.code} · {mode.hotkey}
              </span>
            </motion.button>
          );
        })}

        <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-[40%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
          <span className="holo-chip" style={toneStyle(STATUS_TONE[focusedMode.status])}>
            {statusLabel(focusedMode)}
          </span>
          <span className="mt-2 font-display text-[11px] font-bold tracking-[0.24em] text-holo-50">
            {focusedMode.title.toUpperCase()}
          </span>
          <span className="mt-1.5 text-[13px] leading-snug text-holo-200/75">
            {focusedMode.summary}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
