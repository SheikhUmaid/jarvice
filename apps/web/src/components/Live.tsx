import { cx } from '@jarvis/ui';
import { useRef } from 'react';
import { useAnimationFrame, useThrottledFrame } from '../hooks/useAnimationFrame';
import { AUDIO_BANDS, FRAME_SAMPLES, audioSignal, frameSignal } from '../utils/signal';

/** Text that re-reads a high-frequency signal a few times per second, written straight to the DOM. */
export function LiveValue({
  read,
  hz = 4,
  className,
  placeholder = '—',
}: {
  read: () => string;
  hz?: number;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useThrottledFrame(() => {
    if (ref.current) ref.current.textContent = read();
  }, hz);
  return (
    <span ref={ref} className={cx('text-readout', className)}>
      {placeholder}
    </span>
  );
}

/** Microphone spectrum bars (real Web Audio data, animated without React renders). */
export function AudioMeter({
  bars = 16,
  active = true,
  className,
}: {
  bars?: number;
  active?: boolean;
  className?: string;
}) {
  const refs = useRef<Array<HTMLSpanElement | null>>([]);
  useAnimationFrame(() => {
    for (let i = 0; i < bars; i++) {
      const bar = refs.current[i];
      if (!bar) continue;
      const level = audioSignal.bands[Math.floor((i / bars) * AUDIO_BANDS)] ?? 0;
      bar.style.transform = `scaleY(${Math.max(0.08, level).toFixed(3)})`;
    }
  }, active);
  return (
    <div aria-hidden className={cx('flex h-5 items-end gap-[2px]', className)}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          ref={(bar) => {
            refs.current[i] = bar;
          }}
          className="h-full w-[3px] origin-bottom rounded-[1px] bg-holo-300/85 shadow-[0_0_6px_rgb(25_220_255/0.6)]"
          style={{ transform: 'scaleY(0.08)' }}
        />
      ))}
    </div>
  );
}

/** Frame-time history (last 120 frames) with the 60 fps budget line. */
export function FrameSparkline({
  width = 220,
  height = 40,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useThrottledFrame(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const maxMs = 50;
    const y = (ms: number) => height - 2 - (Math.min(ms, maxMs) / maxMs) * (height - 4);

    context.strokeStyle = 'rgba(255,179,71,0.4)';
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(0, y(16.7));
    context.lineTo(width, y(16.7));
    context.stroke();
    context.setLineDash([]);

    context.beginPath();
    for (let i = 0; i < FRAME_SAMPLES; i++) {
      const ms = frameSignal.samples[(frameSignal.cursor + i) % FRAME_SAMPLES] ?? 0;
      const x = (i / (FRAME_SAMPLES - 1)) * width;
      if (i === 0) context.moveTo(x, y(ms));
      else context.lineTo(x, y(ms));
    }
    context.strokeStyle = 'rgba(25,220,255,0.9)';
    context.lineWidth = 1.2;
    context.shadowColor = 'rgba(25,220,255,0.8)';
    context.shadowBlur = 4;
    context.stroke();
    context.shadowBlur = 0;
  }, 10);
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Frame time of the last 120 frames; dashed line marks the 60 fps budget"
      className={className}
      style={{ width, height }}
    />
  );
}
