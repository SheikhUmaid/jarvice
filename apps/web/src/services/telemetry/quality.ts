import { QUALITY_LEVELS, type QualityLevel } from '@jarvis/shared';
import { getWebGLInfo, type WebGLInfo } from './webgl';

export interface RenderPreset {
  /** Device-pixel-ratio range handed to the R3F canvas. */
  dpr: [number, number];
  reactorParticles: number;
  ambientParticles: number;
  ringSegments: number;
  coreDetail: number;
  bloom: boolean;
  bloomIntensity: number;
  chromaticAberration: number;
  multisampling: number;
}

export const RENDER_PRESETS: Record<QualityLevel, RenderPreset> = {
  low: {
    dpr: [1, 1],
    reactorParticles: 700,
    ambientParticles: 350,
    ringSegments: 160,
    coreDetail: 14,
    bloom: false,
    bloomIntensity: 0,
    chromaticAberration: 0,
    multisampling: 0,
  },
  medium: {
    dpr: [1, 1.5],
    reactorParticles: 1800,
    ambientParticles: 900,
    ringSegments: 256,
    coreDetail: 26,
    bloom: true,
    bloomIntensity: 1.0,
    chromaticAberration: 0,
    multisampling: 0,
  },
  high: {
    dpr: [1, 2],
    reactorParticles: 3600,
    ambientParticles: 1800,
    ringSegments: 384,
    coreDetail: 42,
    bloom: true,
    bloomIntensity: 1.2,
    chromaticAberration: 0.0007,
    multisampling: 4,
  },
};

const INTEGRATED_GPU = /intel|uhd|iris|mali|adreno|powervr|videocore|apple m1/i;

/** Starting tier for `auto` quality; PerformanceMonitor refines it at runtime. */
export function detectDeviceQuality(info: WebGLInfo = getWebGLInfo()): QualityLevel {
  if (!info.webgl2 || info.software) return 'low';
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  if (mobile || cores <= 4 || memory <= 4) return 'low';
  if (INTEGRATED_GPU.test(info.renderer ?? '')) return 'medium';
  return 'high';
}

export function stepQuality(level: QualityLevel, direction: 1 | -1): QualityLevel {
  const index = QUALITY_LEVELS.indexOf(level) + direction;
  return QUALITY_LEVELS[Math.min(QUALITY_LEVELS.length - 1, Math.max(0, index))] ?? level;
}

export function isQualityLevel(value: unknown): value is QualityLevel {
  return typeof value === 'string' && (QUALITY_LEVELS as readonly string[]).includes(value);
}
