import { useConnection } from '../store/connection';
import { getWebGLInfo } from '../services/telemetry/webgl';
import type { ReadinessCheck } from './ModuleStandby';

/** Runtime capability probes shared by the standby modules. None of them touch a device. */
export const READINESS = {
  webgl2: { label: 'WebGL 2 (GPU overlays and delegates)', check: () => getWebGLInfo().webgl2 },
  wasm: {
    label: 'WebAssembly (OpenCV.js, Tesseract.js)',
    check: () => typeof WebAssembly === 'object',
  },
  workers: {
    label: 'Web Workers (off-main-thread processing)',
    check: () => typeof Worker === 'function',
  },
  offscreen: { label: 'OffscreenCanvas', check: () => typeof OffscreenCanvas === 'function' },
  getUserMedia: {
    label: 'Camera API (getUserMedia)',
    check: () => typeof navigator.mediaDevices?.getUserMedia === 'function',
  },
  cameraHardware: {
    label: 'Camera hardware present',
    hint: 'Checked with enumerateDevices — the camera is not opened.',
    check: async () => {
      const devices = (await navigator.mediaDevices?.enumerateDevices?.()) ?? [];
      return devices.some((device) => device.kind === 'videoinput');
    },
  },
  displayMedia: {
    label: 'Screen capture API (getDisplayMedia)',
    check: () => typeof navigator.mediaDevices?.getDisplayMedia === 'function',
  },
  backend: {
    label: 'Backend link (relays Claude requests)',
    check: () => useConnection.getState().backend.status === 'online',
  },
  claudeKey: {
    label: 'Anthropic API key configured on the backend',
    check: () => useConnection.getState().backend.ai?.keyConfigured === true,
  },
} satisfies Record<string, ReadinessCheck>;
