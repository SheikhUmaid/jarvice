import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { CornerBrackets } from '../effects/CornerBrackets';
import { toneStyle, type Tone } from '../tokens';
import { clamp, cx } from '../utils';

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HolographicWindowProps {
  title: string;
  code?: ReactNode;
  icon?: ReactNode;
  /** Extra title-bar controls (rendered before the close button). */
  actions?: ReactNode;
  /** Starting geometry in px, relative to the bounds element. Later changes are ignored. */
  initial: WindowGeometry;
  minWidth?: number;
  minHeight?: number;
  /** Element the window is constrained to (defaults to the parent element). */
  boundsRef?: RefObject<HTMLElement | null>;
  zIndex?: number;
  focused?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  tone?: Tone;
  onFocus?: () => void;
  /** Shows a close button when provided. */
  onClose?: () => void;
  onGeometryChange?: (geometry: WindowGeometry) => void;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

type Gesture = {
  mode: 'move' | 'resize';
  pointerId: number;
  startX: number;
  startY: number;
  origin: WindowGeometry;
};

type Size = { width: number; height: number };

const NO_DRAG_SELECTOR = 'button, a, input, select, textarea, [data-no-drag]';
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function fitGeometry(
  g: WindowGeometry,
  bounds: Size,
  min: Size,
  mode: Gesture['mode'],
): WindowGeometry {
  const minWidth = Math.min(min.width, bounds.width);
  const minHeight = Math.min(min.height, bounds.height);
  let width = clamp(g.width, minWidth, bounds.width);
  let height = clamp(g.height, minHeight, bounds.height);
  if (mode === 'resize') {
    // Resizing keeps the top-left corner fixed and grows towards the far edges.
    width = Math.min(width, Math.max(bounds.width - g.x, minWidth));
    height = Math.min(height, Math.max(bounds.height - g.y, minHeight));
  }
  return {
    x: clamp(g.x, 0, Math.max(0, bounds.width - width)),
    y: clamp(g.y, 0, Math.max(0, bounds.height - height)),
    width,
    height,
  };
}

/**
 * Floating window: drag by the title bar, resize from the corner, keyboard move (arrows) and
 * resize (Alt+arrows, Shift for larger steps). Geometry is applied straight to the DOM so dragging
 * never re-renders the window's content (which may be a WebGL canvas).
 */
export function HolographicWindow({
  title,
  code,
  icon,
  actions,
  initial,
  minWidth = 220,
  minHeight = 140,
  boundsRef,
  zIndex,
  focused = false,
  draggable = true,
  resizable = true,
  tone = 'cyan',
  onFocus,
  onClose,
  onGeometryChange,
  className,
  bodyClassName,
  children,
}: HolographicWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const geometry = useRef<WindowGeometry>(initial);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);

  const getBounds = useCallback((): Size => {
    const container = boundsRef?.current ?? rootRef.current?.parentElement;
    return container
      ? { width: container.clientWidth, height: container.clientHeight }
      : { width: window.innerWidth, height: window.innerHeight };
  }, [boundsRef]);

  const apply = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const g = geometry.current;
    el.style.transform = `translate3d(${Math.round(g.x)}px, ${Math.round(g.y)}px, 0)`;
    el.style.width = `${Math.round(g.width)}px`;
    el.style.height = `${Math.round(g.height)}px`;
  }, []);

  const refit = useCallback(
    (next: WindowGeometry, mode: Gesture['mode']) => {
      geometry.current = fitGeometry(
        next,
        getBounds(),
        { width: minWidth, height: minHeight },
        mode,
      );
    },
    [getBounds, minWidth, minHeight],
  );

  useLayoutEffect(() => {
    refit(geometry.current, 'move');
    apply();
  }, [refit, apply]);

  useEffect(() => {
    const container = boundsRef?.current ?? rootRef.current?.parentElement;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      refit(geometry.current, 'move');
      apply();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [boundsRef, refit, apply]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const begin = (mode: Gesture['mode']) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (mode === 'move' && (event.target as HTMLElement).closest(NO_DRAG_SELECTOR)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...geometry.current },
    };
    rootRef.current?.setAttribute('data-dragging', mode);
  };

  const move = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    refit(
      g.mode === 'move'
        ? { ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy }
        : { ...g.origin, width: g.origin.width + dx, height: g.origin.height + dy },
      g.mode,
    );
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(apply);
  };

  const end = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    rootRef.current?.removeAttribute('data-dragging');
    onGeometryChange?.(geometry.current);
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = ARROWS[event.key];
    if (!direction || event.target !== event.currentTarget) return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 12;
    const [dx, dy] = [direction[0] * step, direction[1] * step];
    const g = geometry.current;
    if (event.altKey && resizable)
      refit({ ...g, width: g.width + dx, height: g.height + dy }, 'resize');
    else if (!event.altKey && draggable) refit({ ...g, x: g.x + dx, y: g.y + dy }, 'move');
    else return;
    apply();
    onGeometryChange?.(geometry.current);
  };

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={title}
      className={cx('holo-window', className)}
      style={toneStyle(tone, { zIndex })}
      data-focused={focused ? '' : undefined}
      onPointerDownCapture={onFocus}
      onFocusCapture={onFocus}
    >
      <CornerBrackets />
      <div
        className="holo-window-titlebar"
        tabIndex={draggable || resizable ? 0 : -1}
        title="Drag to move · Arrow keys move · Alt+Arrow keys resize"
        onPointerDown={draggable ? begin('move') : undefined}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onTitleKeyDown}
      >
        {icon ?? <span aria-hidden className="holo-panel-marker" />}
        <span className="min-w-0 truncate">{title}</span>
        {code != null && <span className="holo-panel-code">{code}</span>}
        <div className={cx('flex items-center gap-1', code == null && 'ml-auto')} data-no-drag>
          {actions}
          {onClose && (
            <button
              type="button"
              className="holo-window-close"
              onClick={onClose}
              aria-label={`Close ${title}`}
            >
              <svg aria-hidden viewBox="0 0 10 10" className="h-2.5 w-2.5">
                <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className={cx('holo-window-body', bodyClassName)}>{children}</div>
      {resizable && (
        <div
          aria-hidden
          className="holo-window-resize"
          onPointerDown={begin('resize')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </div>
  );
}
