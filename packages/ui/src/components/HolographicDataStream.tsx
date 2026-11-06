import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { toneStyle, type Tone } from '../tokens';
import { cx } from '../utils';

export interface StreamLine {
  id: string | number;
  text: string;
  tone?: Tone;
}

export interface HolographicDataStreamProps {
  /** Controlled mode: the lines to show (newest last). */
  lines?: readonly StreamLine[];
  /** Generator mode: called every `interval` ms to produce the next line. */
  source?: () => string;
  interval?: number;
  maxLines?: number;
  paused?: boolean;
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

/** Scrolling monospace feed; older lines fade, the newest glows. */
export function HolographicDataStream({
  lines,
  source,
  interval = 180,
  maxLines = 18,
  paused = false,
  tone = 'cyan',
  className,
  style,
  'aria-label': ariaLabel = 'Data stream',
}: HolographicDataStreamProps) {
  const [generated, setGenerated] = useState<StreamLine[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (!source || paused) return;
    const timer = window.setInterval(() => {
      const line = { id: nextId.current++, text: source() };
      setGenerated((previous) => [...previous.slice(-(maxLines - 1)), line]);
    }, interval);
    return () => window.clearInterval(timer);
  }, [source, paused, interval, maxLines]);

  const items = lines ? lines.slice(-maxLines) : generated;

  return (
    <div
      role="log"
      aria-live="off"
      aria-label={ariaLabel}
      className={cx('holo-stream', className)}
      style={toneStyle(tone, style)}
    >
      {items.map((line, index) => (
        <div
          key={line.id}
          className="holo-stream-line"
          style={{
            opacity: 0.25 + 0.75 * ((index + 1) / items.length),
            ...(line.tone ? toneStyle(line.tone) : null),
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}

/** Decorative hex-dump generator (ambient visuals only — not real data). */
export function createHexSource(): () => string {
  let address = Math.floor(Math.random() * 0xffff);
  return () => {
    address = (address + 16) & 0xffff;
    const bytes = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0'),
    ).join(' ');
    return `${address.toString(16).padStart(4, '0')}  ${bytes}`.toUpperCase();
  };
}
