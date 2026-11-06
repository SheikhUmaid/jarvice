import { FRAME_SAMPLES, frameSignal } from '../../utils/signal';

let users = 0;
let frame = 0;
let last = 0;

function loop(now: number) {
  const dt = now - last;
  last = now;
  // Ignore pauses (hidden tab) so they don't pollute the averages.
  if (dt > 0 && dt < 500) {
    frameSignal.samples[frameSignal.cursor] = dt;
    frameSignal.cursor = (frameSignal.cursor + 1) % FRAME_SAMPLES;
    frameSignal.frameMs = frameSignal.frameMs ? frameSignal.frameMs * 0.92 + dt * 0.08 : dt;
    frameSignal.fps = 1000 / frameSignal.frameMs;
  }
  frame = requestAnimationFrame(loop);
}

/** Starts the page-wide frame-time monitor (reference counted). Returns a release function. */
export function startFrameMonitor(): () => void {
  users++;
  if (users === 1) {
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }
  return () => {
    users = Math.max(0, users - 1);
    if (users === 0) cancelAnimationFrame(frame);
  };
}

/** Measures the real frame rate over `durationMs` (used by diagnostics). */
export function sampleFps(
  durationMs = 1000,
  signal?: AbortSignal,
): Promise<{ fps: number; frameMs: number; frames: number }> {
  return new Promise((resolve, reject) => {
    let frames = 0;
    let id = 0;
    const start = performance.now();
    const onAbort = () => {
      cancelAnimationFrame(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const tick = (now: number) => {
      frames++;
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        signal?.removeEventListener('abort', onAbort);
        resolve({ fps: (frames * 1000) / elapsed, frameMs: elapsed / frames, frames });
        return;
      }
      id = requestAnimationFrame(tick);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    id = requestAnimationFrame(tick);
  });
}
