import { useMemo, type CSSProperties } from 'react';
import { TONES, cssVars, toneStyle, type Tone } from '../tokens';
import { clamp, cx } from '../utils';

export interface RingTicks {
  count: number;
  /** Tick length in viewBox units (the ring lives in a 100×100 box). */
  length: number;
  width?: number;
  /** Every n-th tick is a major tick. */
  majorEvery?: number;
  majorLength?: number;
  /** Draw ticks towards the centre instead of outwards. */
  inward?: boolean;
  opacity?: number;
}

export interface RingArc {
  /** Degrees, clockwise from 12 o'clock. */
  start: number;
  end: number;
  width?: number;
  opacity?: number;
  tone?: Tone;
}

export interface HolographicRingProps {
  /** Rendered size (px number or any CSS length). */
  size: number | string;
  /** Radius in viewBox units (0–50). */
  radius?: number;
  thickness?: number;
  /** Split the ring into n dashes. */
  segments?: number;
  /** Fraction of each segment left empty (0–1). */
  gap?: number;
  opacity?: number;
  ticks?: RingTicks;
  arcs?: readonly RingArc[];
  /** 0–1 progress arc drawn on top of the ring. */
  progress?: number;
  progressTone?: Tone;
  /** Seconds per revolution; negative spins counter-clockwise; 0 is static. */
  spin?: number;
  tone?: Tone;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}

const TAU = Math.PI * 2;

function polar(radius: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180;
  return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
}

function arcPath(radius: number, start: number, end: number): string {
  const sweep = Math.min(Math.abs(end - start), 359.99);
  const [x1, y1] = polar(radius, start);
  const [x2, y2] = polar(radius, start + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M${x1.toFixed(3)} ${y1.toFixed(3)}A${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

function ticksPath(radius: number, ticks: RingTicks): string {
  let d = '';
  for (let i = 0; i < ticks.count; i++) {
    const major = ticks.majorEvery ? i % ticks.majorEvery === 0 : false;
    const length = major ? (ticks.majorLength ?? ticks.length * 2) : ticks.length;
    const outer = ticks.inward ? radius - length : radius + length;
    const degrees = (i / ticks.count) * 360;
    const [x1, y1] = polar(radius, degrees);
    const [x2, y2] = polar(outer, degrees);
    d += `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return d;
}

/** Configurable SVG ring: dashes, ticks, highlighted arcs, progress and CSS rotation. */
export function HolographicRing({
  size,
  radius = 46,
  thickness = 0.6,
  segments = 0,
  gap = 0.3,
  opacity = 0.8,
  ticks,
  arcs,
  progress,
  progressTone,
  spin = 0,
  tone = 'cyan',
  glow = false,
  className,
  style,
}: HolographicRingProps) {
  const circumference = TAU * radius;
  const dash =
    segments > 0
      ? `${((circumference / segments) * (1 - gap)).toFixed(3)} ${((circumference / segments) * gap).toFixed(3)}`
      : undefined;

  const tickD = useMemo(
    () => (ticks ? ticksPath(radius, ticks) : null),
    // Ticks are usually passed as an inline object; depend on its fields, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [radius, ticks?.count, ticks?.length, ticks?.majorEvery, ticks?.majorLength, ticks?.inward],
  );

  const spinStyle = spin
    ? cssVars(
        {
          '--spin-duration': `${Math.abs(spin)}s`,
          '--spin-direction': spin < 0 ? 'reverse' : 'normal',
        },
        style,
      )
    : style;

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cx('holo-ring', spin !== 0 && 'holo-spin', glow && 'holo-ring-glow', className)}
      style={toneStyle(tone, spinStyle)}
    >
      <g transform="rotate(-90 50 50)" className="holo-ring-stroke">
        <circle
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={thickness}
          strokeOpacity={opacity}
          strokeDasharray={dash}
        />
        {tickD && (
          <path
            d={tickD}
            strokeWidth={ticks?.width ?? 0.35}
            strokeOpacity={ticks?.opacity ?? opacity * 0.8}
          />
        )}
        {arcs?.map((arc, index) => (
          <path
            key={index}
            d={arcPath(radius, arc.start, arc.end)}
            strokeWidth={arc.width ?? thickness * 2.4}
            strokeOpacity={arc.opacity ?? 1}
            style={arc.tone ? { stroke: `rgb(${TONES[arc.tone]})` } : undefined}
          />
        ))}
        {progress != null && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth={thickness * 2.6}
            strokeDasharray={`${(circumference * clamp(progress, 0, 1)).toFixed(3)} ${circumference.toFixed(3)}`}
            style={progressTone ? { stroke: `rgb(${TONES[progressTone]})` } : undefined}
          />
        )}
      </g>
    </svg>
  );
}
