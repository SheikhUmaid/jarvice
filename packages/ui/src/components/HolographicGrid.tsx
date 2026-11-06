import type { CSSProperties } from 'react';
import { useHoloConfig } from '../config';
import { cssVars, toneStyle, type Tone } from '../tokens';
import { cx } from '../utils';

export interface HolographicGridProps {
  /** Minor cell size in px. */
  cell?: number;
  /** Minor cells per major cell. */
  major?: number;
  tone?: Tone;
  opacity?: number;
  /** Tilt the grid into a receding floor plane. */
  perspective?: boolean;
  /** Scroll the grid continuously (GPU transform, one major cell per loop). */
  animate?: boolean;
  /** Seconds per major cell when animated. */
  speed?: number;
  fade?: 'radial' | 'bottom' | 'edges' | 'none';
  className?: string;
  style?: CSSProperties;
}

/** CSS grid backdrop — flat or as a perspective floor. Fills its positioned parent. */
export function HolographicGrid({
  cell = 28,
  major = 4,
  tone = 'cyan',
  opacity = 0.5,
  perspective = false,
  animate = false,
  speed = 8,
  fade = 'radial',
  className,
  style,
}: HolographicGridProps) {
  const { reducedMotion } = useHoloConfig();
  return (
    <div
      aria-hidden
      className={cx(
        'pointer-events-none absolute inset-0 overflow-hidden',
        fade !== 'none' && `holo-fade-${fade}`,
        perspective && 'holo-grid-perspective',
        className,
      )}
      style={toneStyle(tone, style)}
    >
      <div
        className={cx(
          'holo-grid',
          perspective ? 'holo-grid-floor' : 'holo-grid-flat',
          animate && !reducedMotion && 'is-animated',
        )}
        style={cssVars(
          { '--cell': `${cell}px`, '--major': `${cell * major}px`, '--grid-speed': `${speed}s` },
          { opacity },
        )}
      />
    </div>
  );
}
