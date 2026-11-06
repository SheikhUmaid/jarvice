/**
 * High-frequency values shared between services and renderers.
 *
 * These are plain mutable objects — read them inside requestAnimationFrame / useFrame. Writing them
 * never triggers a React render, which is the point: audio levels and frame times change 60×/s.
 */

export const AUDIO_BANDS = 24;

export const audioSignal = {
  /** Smoothed microphone level, 0–1 (perceptual). */
  mic: 0,
  /** Microphone level in dBFS (−Infinity when silent/off). */
  micDb: Number.NEGATIVE_INFINITY,
  /** Synthetic level of JARVIS's own speech output, 0–1. */
  speech: 0,
  /** Log-spaced microphone spectrum, 0–1 per band. */
  bands: new Float32Array(AUDIO_BANDS),
};

export const FRAME_SAMPLES = 120;

export const frameSignal = {
  /** Exponentially smoothed frames per second. */
  fps: 0,
  /** Smoothed frame time in ms. */
  frameMs: 0,
  /** Ring buffer of recent frame times (ms). */
  samples: new Float32Array(FRAME_SAMPLES),
  cursor: 0,
};

/** Formatted read-outs for <LiveValue read={…} />. */
export const readFps = () => (frameSignal.fps ? String(Math.round(frameSignal.fps)) : '—');
export const readFrameMs = () => (frameSignal.frameMs ? frameSignal.frameMs.toFixed(1) : '—');
export const readMicDb = () =>
  Number.isFinite(audioSignal.micDb) ? `${Math.round(audioSignal.micDb)} dB` : '−∞ dB';
