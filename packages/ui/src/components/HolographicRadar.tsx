import { useMemo, useState, type ReactNode } from 'react';
import { useHoloConfig } from '../config';
import { cssVars, toneStyle, type Tone } from '../tokens';
import { clamp, cx, mod } from '../utils';

export interface RadarBlip {
  id: string;
  /** Degrees clockwise from north. */
  angle: number;
  /** 0 (centre) – 1 (edge). */
  distance: number;
  label?: string;
  tone?: Tone;
}

export interface HolographicRadarProps {
  size: number;
  /** Seconds per sweep revolution. */
  sweep?: number;
  rings?: number;
  spokes?: number;
  blips?: readonly RadarBlip[];
  tone?: Tone;
  showLabels?: boolean;
  paused?: boolean;
  /** Accessible description; defaults to the contact count. */
  label?: string;
  className?: string;
  /** Content centred over the radar (e.g. a reticle or readout). */
  children?: ReactNode;
}

/**
 * Radar with a CSS conic sweep. Blips flash exactly when the sweep passes them: every animation is
 * phase-locked to `performance.now()`, so blips added later stay in sync with the sweep.
 */
export function HolographicRadar({
  size,
  sweep = 4,
  rings = 4,
  spokes = 12,
  blips = [],
  tone = 'cyan',
  showLabels = false,
  paused = false,
  label,
  className,
  children,
}: HolographicRadarProps) {
  const { reducedMotion } = useHoloConfig();
  const animated = !paused && !reducedMotion;
  const [epoch] = useState(() => performance.now() / 1000);

  const grid = useMemo(() => {
    let spokesD = '';
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      spokesD += `M50 50L${(50 + Math.sin(a) * 48).toFixed(2)} ${(50 - Math.cos(a) * 48).toFixed(2)}`;
    }
    let ticksD = '';
    for (let deg = 0; deg < 360; deg += 5) {
      const a = (deg * Math.PI) / 180;
      const inner = deg % 30 === 0 ? 44.5 : 46.5;
      ticksD += `M${(50 + Math.sin(a) * inner).toFixed(2)} ${(50 - Math.cos(a) * inner).toFixed(2)}L${(50 + Math.sin(a) * 48).toFixed(2)} ${(50 - Math.cos(a) * 48).toFixed(2)}`;
    }
    return { spokesD, ticksD };
  }, [spokes]);

  return (
    <div
      role="img"
      aria-label={label ?? `Radar, ${blips.length} contact${blips.length === 1 ? '' : 's'}`}
      className={cx('holo-radar relative shrink-0 rounded-full', className)}
      style={toneStyle(tone, cssVars({ '--sweep': `${sweep}s` }, { width: size, height: size }))}
    >
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <g className="holo-ring-stroke" strokeWidth={0.3}>
          {Array.from({ length: rings }, (_, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={(48 * (i + 1)) / rings}
              strokeOpacity={i === rings - 1 ? 0.55 : 0.22}
            />
          ))}
          <path d={grid.spokesD} strokeOpacity={0.14} />
          <path d={grid.ticksD} strokeOpacity={0.5} />
        </g>
      </svg>
      <div
        aria-hidden
        className={cx('holo-radar-sweep absolute inset-0 rounded-full', animated && 'is-animated')}
        style={{ animationDelay: `${-mod(epoch, sweep)}s` }}
      />
      {blips.map((blip) => (
        <RadarBlipDot
          key={blip.id}
          blip={blip}
          sweep={sweep}
          animated={animated}
          showLabel={showLabels}
        />
      ))}
      {children != null && (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      )}
    </div>
  );
}

function RadarBlipDot({
  blip,
  sweep,
  animated,
  showLabel,
}: {
  blip: RadarBlip;
  sweep: number;
  animated: boolean;
  showLabel: boolean;
}) {
  // Each dot keeps its own mount time so a changing angle re-phases without restarting.
  const [epoch] = useState(() => performance.now() / 1000);
  const angle = mod(blip.angle, 360);
  const radians = (angle * Math.PI) / 180;
  const distance = clamp(blip.distance, 0, 1) * 46;
  const delay = mod((angle / 360) * sweep - epoch, sweep) - sweep;
  return (
    <span
      aria-hidden
      className={cx('holo-radar-blip', animated && 'is-animated')}
      style={{
        left: `${50 + Math.sin(radians) * distance}%`,
        top: `${50 - Math.cos(radians) * distance}%`,
        animationDelay: `${delay}s`,
        ...(blip.tone ? toneStyle(blip.tone) : null),
      }}
    >
      {showLabel && blip.label && <span className="holo-radar-label">{blip.label}</span>}
    </span>
  );
}
