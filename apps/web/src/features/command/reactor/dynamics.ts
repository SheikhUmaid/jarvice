import type { ReactorState } from '@jarvis/shared';
import { Color, MathUtils } from 'three';
import { audioSignal } from '../../../utils/signal';

/** Target parameters per state; the live values damp towards them every frame. */
interface StatePreset {
  /** Rotation speed multiplier for rings, particles and geometry. */
  spin: number;
  /** Ring/orbit radius multiplier. */
  spread: number;
  /** Core sphere scale. */
  core: number;
  /** Overall brightness (feeds bloom). */
  energy: number;
  /** Core surface displacement. */
  noise: number;
  /** Ambient shockwaves per second. */
  pulseRate: number;
  /** Scanner visibility (thinking). */
  scan: number;
  /** Execution effects (executing). */
  exec: number;
  color: string;
  accent: string;
}

export const STATE_PRESETS: Record<ReactorState, StatePreset> = {
  idle: {
    spin: 0.32,
    spread: 1,
    core: 1,
    energy: 0.8,
    noise: 0.05,
    pulseRate: 0.22,
    scan: 0,
    exec: 0,
    color: '#19dcff',
    accent: '#9ef3ff',
  },
  listening: {
    spin: 0.55,
    spread: 1.12,
    core: 1.02,
    energy: 1,
    noise: 0.07,
    pulseRate: 0.45,
    scan: 0.08,
    exec: 0,
    color: '#6fefff',
    accent: '#e6fdff',
  },
  thinking: {
    spin: 2.3,
    spread: 0.93,
    core: 0.93,
    energy: 1.15,
    noise: 0.14,
    pulseRate: 1.1,
    scan: 1,
    exec: 0,
    color: '#19dcff',
    accent: '#5ee9ff',
  },
  speaking: {
    spin: 0.75,
    spread: 1.04,
    core: 1,
    energy: 1.08,
    noise: 0.06,
    pulseRate: 0.55,
    scan: 0.06,
    exec: 0,
    color: '#a9f4ff',
    accent: '#ffffff',
  },
  executing: {
    spin: 1.45,
    spread: 1,
    core: 1.05,
    energy: 1.25,
    noise: 0.1,
    pulseRate: 0.9,
    scan: 0.3,
    exec: 1,
    color: '#33e2ff',
    accent: '#ffb347',
  },
};

const PALETTE = Object.fromEntries(
  Object.entries(STATE_PRESETS).map(([state, preset]) => [
    state,
    { color: new Color(preset.color), accent: new Color(preset.accent) },
  ]),
) as Record<ReactorState, { color: Color; accent: Color }>;

/** Live, continuously damped reactor parameters shared by every reactor component. */
export interface ReactorDynamics {
  state: ReactorState;
  /** Seconds since the last state change. */
  sinceChange: number;
  /** Animation clock scaled by `spin` (rotations, orbits). */
  time: number;
  /** Real elapsed seconds. */
  elapsed: number;
  spin: number;
  spread: number;
  core: number;
  energy: number;
  noise: number;
  pulseRate: number;
  scan: number;
  exec: number;
  /** Smoothed voice amplitude: the microphone while listening, speech output while speaking. */
  audio: number;
  color: Color;
  accent: Color;
  /** Layout scale requested by the stage (fits the reactor into its slot). */
  layoutScale: number;
}

export function createDynamics(state: ReactorState): ReactorDynamics {
  const preset = STATE_PRESETS[state];
  return {
    state,
    sinceChange: 0,
    time: 0,
    elapsed: 0,
    spin: preset.spin,
    spread: preset.spread,
    core: preset.core,
    energy: preset.energy,
    noise: preset.noise,
    pulseRate: preset.pulseRate,
    scan: preset.scan,
    exec: preset.exec,
    audio: 0,
    color: PALETTE[state].color.clone(),
    accent: PALETTE[state].accent.clone(),
    layoutScale: 1,
  };
}

/** Advances the dynamics one frame. Returns true when the state changed this frame. */
export function stepDynamics(
  d: ReactorDynamics,
  state: ReactorState,
  delta: number,
  reducedMotion: boolean,
): boolean {
  const dt = Math.min(delta, 0.1); // avoid jumps after a hidden tab resumes
  const preset = STATE_PRESETS[state];
  const motion = reducedMotion ? 0.35 : 1;
  const damp = MathUtils.damp;

  const target =
    state === 'listening' ? audioSignal.mic : state === 'speaking' ? audioSignal.speech : 0;
  d.audio = damp(d.audio, target, target > d.audio ? 22 : 7, dt);
  const voice = d.audio * (state === 'listening' || state === 'speaking' ? 1 : 0);

  d.spin = damp(d.spin, preset.spin * motion, 2.4, dt);
  d.spread = damp(d.spread, preset.spread + voice * 0.14, 5, dt);
  d.core = damp(d.core, preset.core + voice * 0.3, 9, dt);
  d.energy = damp(d.energy, preset.energy + voice * 0.5, 4, dt);
  d.noise = damp(d.noise, preset.noise + voice * 0.2, 3, dt);
  d.pulseRate = damp(d.pulseRate, preset.pulseRate, 2, dt);
  d.scan = damp(d.scan, preset.scan, 3, dt);
  d.exec = damp(d.exec, preset.exec, 4, dt);

  const k = 1 - Math.exp(-3.2 * dt);
  d.color.lerp(PALETTE[state].color, k);
  d.accent.lerp(PALETTE[state].accent, k);

  d.time += dt * d.spin;
  d.elapsed += dt;
  d.sinceChange += dt;

  if (state !== d.state) {
    d.state = state;
    d.sinceChange = 0;
    return true;
  }
  return false;
}
