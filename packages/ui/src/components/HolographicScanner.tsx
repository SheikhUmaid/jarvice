import type { CSSProperties } from 'react';
import { useHoloConfig } from '../config';
import { cssVars, toneStyle, type Tone } from '../tokens';
import { cx } from '../utils';

export interface HolographicScannerProps {
  active?: boolean;
  direction?: 'down' | 'up' | 'right' | 'left';
  /** Seconds per pass. */
  duration?: number;
  /** 0–1 overall opacity. */
  intensity?: number;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
}

/** Scanning beam with a fading trail that sweeps across its positioned parent. */
export function HolographicScanner({
  active = true,
  direction = 'down',
  duration = 3.2,
  intensity = 1,
  tone = 'cyan',
  className,
  style,
}: HolographicScannerProps) {
  const { reducedMotion } = useHoloConfig();
  if (!active || reducedMotion) return null;
  return (
    <div
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={toneStyle(
        tone,
        cssVars({ '--scan-duration': `${duration}s` }, { ...style, opacity: intensity }),
      )}
    >
      <div className={cx('holo-scanner-beam', `holo-scanner-${direction}`)} />
    </div>
  );
}
