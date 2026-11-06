import type { ReactorState } from '@jarvis/shared';
import { HolographicRing, cssVars, cx, toneStyle, type Tone } from '@jarvis/ui';

const SPEED: Record<ReactorState, number> = {
  idle: 1,
  listening: 0.75,
  thinking: 0.28,
  speaking: 0.6,
  executing: 0.4,
};
const TONE: Record<ReactorState, Tone> = {
  idle: 'cyan',
  listening: 'ice',
  thinking: 'cyan',
  speaking: 'ice',
  executing: 'amber',
};
const BREATHE: Record<ReactorState, string> = {
  idle: '3.4s',
  listening: '1.6s',
  thinking: '0.7s',
  speaking: '0.9s',
  executing: '0.8s',
};

/**
 * 2D reactor built from SVG rings: the header status indicator and the no-WebGL fallback.
 * Shows the same five states as the 3D reactor through speed, colour and breathing rate.
 */
export function ReactorGlyph({
  state,
  size,
  className,
}: {
  state: ReactorState;
  size: number | string;
  className?: string;
}) {
  const speed = SPEED[state];
  const tone = TONE[state];
  return (
    <div
      aria-hidden
      data-state={state}
      className={cx('relative grid shrink-0 place-items-center', className)}
      style={toneStyle(
        tone,
        cssVars({ '--breathe': BREATHE[state] }, { width: size, height: size }),
      )}
    >
      <HolographicRing
        size="100%"
        radius={47}
        thickness={1.4}
        segments={6}
        gap={0.14}
        spin={16 * speed}
        className="absolute inset-0"
      />
      <HolographicRing
        size="100%"
        radius={39}
        thickness={3}
        segments={24}
        gap={0.38}
        spin={-10 * speed}
        tone={tone}
        className="absolute inset-0"
      />
      <HolographicRing
        size="100%"
        radius={31}
        thickness={0.9}
        arcs={[{ start: 20, end: 290 }]}
        opacity={0.35}
        spin={6 * speed}
        tone="ice"
        className="absolute inset-0"
      />
      <span className="reactor-glyph-core" />
    </div>
  );
}
