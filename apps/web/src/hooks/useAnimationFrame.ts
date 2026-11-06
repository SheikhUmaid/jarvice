import { useEffect, useRef } from 'react';

/**
 * Runs `callback` every animation frame while `active`. Use it to write high-frequency values
 * (audio levels, frame times) straight into DOM nodes without re-rendering React.
 */
export function useAnimationFrame(
  callback: (time: number, delta: number) => void,
  active = true,
): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      callbackRef.current(time, time - last);
      last = time;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active]);
}

/** Like useAnimationFrame but throttled to `hz` updates per second (for numeric read-outs). */
export function useThrottledFrame(callback: () => void, hz: number, active = true): void {
  const last = useRef(0);
  useAnimationFrame((time) => {
    if (time - last.current < 1000 / hz) return;
    last.current = time;
    callback();
  }, active);
}
