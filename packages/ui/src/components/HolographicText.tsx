import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ElementType } from 'react';
import { useHoloConfig } from '../config';
import { cx } from '../utils';

const DEFAULT_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/\\|=+*#%';

export interface HolographicTextProps {
  text: string;
  /** `decode` scrambles then resolves left→right; `type` reveals like a typewriter. */
  effect?: 'decode' | 'type' | 'none';
  /** Milliseconds for the full effect. */
  duration?: number;
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  glow?: boolean;
  cursor?: boolean;
  charset?: string;
  onDone?: () => void;
}

/**
 * Animated text that re-runs whenever `text` changes. The animation writes straight to the DOM
 * (no React renders per frame); screen readers receive the final text via a visually hidden copy.
 */
export function HolographicText({
  text,
  effect = 'decode',
  duration = 700,
  delay = 0,
  as: Tag = 'span',
  className,
  style,
  glow = false,
  cursor = false,
  charset = DEFAULT_GLYPHS,
  onDone,
}: HolographicTextProps) {
  const { reducedMotion } = useHoloConfig();
  const nodeRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  const animated = effect !== 'none' && !reducedMotion && text.length > 0;

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (!animated) {
      node.textContent = text;
      onDoneRef.current?.();
      return;
    }

    const scramble = (resolved: number) => {
      let out = text.slice(0, resolved);
      for (let i = resolved; i < text.length; i++) {
        const char = text[i] ?? ' ';
        out += char === ' ' ? ' ' : (charset[Math.floor(Math.random() * charset.length)] ?? char);
      }
      return out;
    };

    // Paint the first frame synchronously so the text never flashes empty or complete.
    node.textContent = effect === 'type' ? '' : scramble(0);
    const start = performance.now() + delay;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      const resolved = Math.floor(text.length * progress);
      node.textContent = effect === 'type' ? text.slice(0, resolved) : scramble(resolved);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        node.textContent = text;
        onDoneRef.current?.();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, effect, duration, delay, animated, charset]);

  return (
    <Tag className={cx(glow && 'holo-text-glow', className)} style={style}>
      <span className="sr-only">{text}</span>
      <span ref={nodeRef} aria-hidden>
        {animated ? null : text}
      </span>
      {cursor && <span aria-hidden className="holo-cursor" />}
    </Tag>
  );
}
