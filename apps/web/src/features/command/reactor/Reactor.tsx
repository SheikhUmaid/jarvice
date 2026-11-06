import type { ReactorState } from '@jarvis/shared';
import { HolographicGridPlane } from '@jarvis/ui/three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { MathUtils, type Group } from 'three';
import type { RenderPreset } from '../../../services/telemetry/quality';
import { createDynamics, stepDynamics } from './dynamics';
import { ProjectorBase } from './ProjectorBase';
import { ReactorCore } from './ReactorCore';
import { ReactorExecution, ReactorPulses, ReactorScanner } from './ReactorEffects';
import { ReactorGyro, ReactorLight } from './ReactorGyro';
import { ReactorParticles } from './ReactorParticles';
import { ReactorRings } from './ReactorRings';

export interface ReactorLayout {
  /** Scale that fits the reactor into its DOM slot (set by the stage). */
  scale: number;
}

interface ReactorProps {
  state: ReactorState;
  preset: RenderPreset;
  reducedMotion: boolean;
  layout: RefObject<ReactorLayout>;
}

const FLOOR_Y = -2.35;

/**
 * The JARVIS reactor. All parts read one shared, continuously damped `ReactorDynamics` object that
 * is stepped first every frame (priority −1), so a state change blends smoothly everywhere at once.
 */
export function Reactor({ state, preset, reducedMotion, layout }: ReactorProps) {
  const root = useRef<Group>(null);
  const stack = useRef<Group>(null);
  // The dynamics object lives for the reactor's lifetime; later state changes are damped into it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dyn = useMemo(() => createDynamics(state), []);

  useFrame((_, delta) => {
    stepDynamics(dyn, state, delta, reducedMotion);
    const group = root.current;
    if (group) {
      const scale = MathUtils.damp(group.scale.x, layout.current.scale, 6, Math.min(delta, 0.1));
      group.scale.setScalar(scale);
    }
    const rings = stack.current;
    if (rings && !reducedMotion) {
      rings.rotation.x = Math.sin(dyn.elapsed * 0.21) * 0.06;
      rings.rotation.y = Math.cos(dyn.elapsed * 0.17) * 0.07;
    }
  }, -1);

  return (
    <group ref={root}>
      <ReactorLight dyn={dyn} />
      <ReactorCore dyn={dyn} detail={preset.coreDetail} />
      <group ref={stack}>
        <ReactorRings dyn={dyn} thetaSegments={preset.ringSegments} />
        <ReactorScanner dyn={dyn} />
        <ReactorExecution dyn={dyn} />
        <ReactorPulses dyn={dyn} />
      </group>
      <ReactorGyro dyn={dyn} />
      <ReactorParticles dyn={dyn} count={preset.reactorParticles} />
      <ProjectorBase dyn={dyn} y={FLOOR_Y} />
      <HolographicGridPlane
        position={[0, FLOOR_Y - 0.01, 0]}
        size={70}
        cell={0.55}
        major={5}
        fadeDistance={16}
        opacity={0.55}
        ripple={0.4}
        paused={reducedMotion}
      />
    </group>
  );
}
