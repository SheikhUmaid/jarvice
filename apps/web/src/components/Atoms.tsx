import { cx, toneStyle, type Tone } from '@jarvis/ui';
import type { ReactNode } from 'react';

export function StatusDot({
  tone = 'cyan',
  pulse = false,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
        pulse && 'animate-holo-pulse',
        className,
      )}
      style={toneStyle(tone, {
        background: 'rgb(var(--tone))',
        boxShadow: '0 0 8px rgb(var(--tone) / 0.9)',
      })}
    />
  );
}

/** Label/value row for telemetry panels. */
export function Readout({
  label,
  children,
  tone,
  title,
}: {
  label: string;
  children: ReactNode;
  tone?: Tone;
  title?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]" title={title}>
      <span className="holo-label shrink-0">{label}</span>
      <span
        className="min-w-0 truncate text-right text-readout text-[11.5px] text-holo-100"
        style={tone ? toneStyle(tone, { color: 'rgb(var(--tone))' }) : undefined}
      >
        {children}
      </span>
    </div>
  );
}

/** Marks illustrative data that a later milestone replaces with real persistence. */
export function SampleBadge({ milestone = 9 }: { milestone?: number }) {
  return (
    <span
      className="holo-chip"
      style={toneStyle('amber')}
      title={`Illustrative sample data — real persistence arrives in Milestone ${milestone}`}
    >
      Sample
    </span>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('py-2 text-[13px] leading-snug text-holo-300/55', className)}>{children}</p>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="holo-kbd">{children}</kbd>;
}
