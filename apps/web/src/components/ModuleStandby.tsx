import {
  HolographicPanel,
  HolographicRing,
  HolographicScanner,
  HolographicText,
  holoItem,
  holoStagger,
  toneStyle,
} from '@jarvis/ui';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { STATUS_TONE, statusLabel, type ModeDefinition } from '../features/modes';

export interface ReadinessCheck {
  label: string;
  /** Runtime capability probe — never activates a device. */
  check: () => boolean | Promise<boolean>;
  hint?: string;
}

/**
 * Screen for a mode scheduled in a later milestone: what it will do, how, and how it protects your
 * privacy — plus real runtime readiness checks. No placeholder buttons.
 */
export function ModuleStandby({
  mode,
  checks = [],
  children,
}: {
  mode: ModeDefinition;
  checks?: readonly ReadinessCheck[];
  children?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto pb-[calc(var(--chrome-bottom)+1rem)] pl-[calc(var(--chrome-left)+1rem)] pr-4 pt-[calc(var(--chrome-top)+1.25rem)]">
      <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <Emblem mode={mode} />
        <div className="flex min-w-0 flex-col gap-3">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="holo-chip">Mode {mode.code}</span>
              <span className="holo-chip" style={toneStyle(STATUS_TONE[mode.status])}>
                {statusLabel(mode)}
              </span>
            </div>
            <HolographicText
              as="h1"
              text={mode.title.toUpperCase()}
              duration={900}
              glow
              className="mt-3 block font-display text-[1.6rem] font-bold tracking-[0.18em] text-holo-50"
            />
            <p className="mt-2 max-w-xl text-[16px] leading-snug text-holo-200/80">
              {mode.summary}
            </p>
          </header>

          <HolographicPanel title="Capability manifest" code={`MILESTONE ${mode.milestone}`}>
            <motion.ul
              className="space-y-1.5"
              variants={holoStagger(0.05, 0.2)}
              initial="hidden"
              animate="visible"
            >
              {mode.capabilities.map((capability) => (
                <motion.li
                  key={capability}
                  variants={holoItem}
                  className="flex items-start gap-2.5"
                >
                  <CircleDashed size={14} className="mt-[3px] shrink-0 text-holo-400/70" />
                  <span className="text-[14.5px] leading-snug text-holo-100">{capability}</span>
                </motion.li>
              ))}
            </motion.ul>
          </HolographicPanel>

          <div className="grid gap-3 md:grid-cols-2">
            <HolographicPanel title="Pipeline" code="STACK">
              <ul className="space-y-1">
                {mode.stack.map((item) => (
                  <li
                    key={item}
                    className="font-mono text-[11.5px] leading-relaxed text-holo-200/85"
                  >
                    › {item}
                  </li>
                ))}
              </ul>
            </HolographicPanel>
            {checks.length > 0 && <ReadinessPanel checks={checks} />}
          </div>

          {mode.privacy.length > 0 && (
            <HolographicPanel title="Privacy guarantees" tone="ice" code="PRIV">
              <ul className="space-y-1">
                {mode.privacy.map((item) => (
                  <li key={item} className="text-[14px] leading-snug text-holo-100">
                    • {item}
                  </li>
                ))}
              </ul>
            </HolographicPanel>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function ReadinessPanel({ checks }: { checks: readonly ReadinessCheck[] }) {
  const [results, setResults] = useState<Array<boolean | null>>(() => checks.map(() => null));
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      checks.map(async (item) => {
        try {
          return Boolean(await item.check());
        } catch {
          return false;
        }
      }),
    ).then((values) => {
      if (!cancelled) setResults(values);
    });
    return () => {
      cancelled = true;
    };
  }, [checks]);

  return (
    <HolographicPanel title="Readiness checks" code="LIVE">
      <ul className="space-y-1">
        {checks.map((item, index) => {
          const result = results[index];
          const Icon = result == null ? CircleDashed : result ? CheckCircle2 : XCircle;
          return (
            <li key={item.label} className="flex items-start gap-2" title={item.hint}>
              <Icon
                size={14}
                className={
                  result == null
                    ? 'mt-[3px] shrink-0 text-holo-400/50'
                    : result
                      ? 'mt-[3px] shrink-0 text-ok'
                      : 'mt-[3px] shrink-0 text-amber-hud'
                }
              />
              <span className="text-[13.5px] leading-snug text-holo-100">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </HolographicPanel>
  );
}

function Emblem({ mode }: { mode: ModeDefinition }) {
  const Icon = mode.icon;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[24rem]" aria-hidden>
      <HolographicRing
        size="100%"
        radius={48}
        thickness={0.3}
        ticks={{ count: 96, length: 1.4, majorEvery: 8, majorLength: 3.2, inward: true }}
        spin={120}
        opacity={0.55}
        className="absolute inset-0"
      />
      <HolographicRing
        size="100%"
        radius={42}
        thickness={1.8}
        segments={24}
        gap={0.52}
        spin={-60}
        opacity={0.5}
        className="absolute inset-0"
      />
      <HolographicRing
        size="100%"
        radius={35}
        thickness={0.5}
        arcs={[
          { start: 210, end: 330, width: 1.6 },
          { start: 30, end: 150, width: 1.6 },
        ]}
        opacity={0.35}
        spin={40}
        tone="ice"
        className="absolute inset-0"
      />
      <HolographicRing
        size="100%"
        radius={28.5}
        thickness={0.35}
        segments={60}
        gap={0.5}
        spin={-25}
        opacity={0.4}
        className="absolute inset-0"
      />
      <div className="absolute inset-[29%] grid place-items-center rounded-full bg-[radial-gradient(circle,rgb(25_220_255/0.16),transparent_70%)]">
        <Icon
          size="42%"
          strokeWidth={0.9}
          className="text-holo-200 drop-shadow-[0_0_14px_rgb(25_220_255/0.85)]"
        />
      </div>
      <div className="absolute inset-[6%] overflow-hidden rounded-full">
        <HolographicScanner duration={4.2} intensity={0.45} />
      </div>
      <div className="absolute inset-x-0 bottom-[2%] text-center">
        <span className="holo-label">Module standby · awaiting milestone {mode.milestone}</span>
      </div>
    </div>
  );
}
