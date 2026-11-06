import { seededRandom } from '@jarvis/ui/three';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { orbitFragment, orbitVertex } from '../../../shaders/reactor';
import type { ReactorDynamics } from './dynamics';

/** Orbital planes shared with the gyroscope rings (x/y tilt in radians). */
const INCLINED_PLANES: ReadonlyArray<[number, number]> = [
  [1.2, 0.25],
  [0.45, -0.95],
  [1.95, 0.6],
];

/**
 * Particles on structured orbits — most in the reactor plane, some on the gyroscope planes, a few
 * in a loose outer halo. Positions are computed in the vertex shader from per-particle orbit data,
 * so animating thousands of particles costs one uniform update per frame.
 */
export function ReactorParticles({ dyn, count }: { dyn: ReactorDynamics; count: number }) {
  const geometry = useMemo(() => {
    const random = seededRandom(42);
    const radius = new Float32Array(count);
    const speed = new Float32Array(count);
    const phase = new Float32Array(count);
    const tilt = new Float32Array(count * 2);
    const size = new Float32Array(count);
    const mix = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const roll = random();
      if (roll < 0.55) {
        radius[i] = 0.72 + random() * 0.95;
        tilt[i * 2] = (random() - 0.5) * 0.25;
        tilt[i * 2 + 1] = (random() - 0.5) * 0.25;
        speed[i] = (0.25 + random() * 0.55) * (random() < 0.85 ? 1 : -1);
        size[i] = 0.6 + random() * 0.9;
      } else if (roll < 0.85) {
        const plane = INCLINED_PLANES[Math.floor(random() * INCLINED_PLANES.length)] ?? [0, 0];
        radius[i] = 1.8 + random() * 0.35;
        tilt[i * 2] = plane[0] + (random() - 0.5) * 0.06;
        tilt[i * 2 + 1] = plane[1] + (random() - 0.5) * 0.06;
        speed[i] = (0.2 + random() * 0.4) * (random() < 0.5 ? 1 : -1);
        size[i] = 0.5 + random() * 0.8;
      } else {
        radius[i] = 2.25 + random() * 0.7;
        tilt[i * 2] = random() * Math.PI;
        tilt[i * 2 + 1] = random() * Math.PI;
        speed[i] = 0.05 + random() * 0.15;
        size[i] = 0.4 + random() * 0.6;
      }
      phase[i] = random() * Math.PI * 2;
      mix[i] = random() < 0.15 ? 1 : 0;
    }
    const buffer = new BufferGeometry();
    // Three.js needs a position attribute for the draw count; real positions come from the shader.
    buffer.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    buffer.setAttribute('aRadius', new BufferAttribute(radius, 1));
    buffer.setAttribute('aSpeed', new BufferAttribute(speed, 1));
    buffer.setAttribute('aPhase', new BufferAttribute(phase, 1));
    buffer.setAttribute('aTilt', new BufferAttribute(tilt, 2));
    buffer.setAttribute('aSize', new BufferAttribute(size, 1));
    buffer.setAttribute('aMix', new BufferAttribute(mix, 1));
    return buffer;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpread: { value: 1 },
      uPixelRatio: { value: 1 },
      uSize: { value: 2.6 },
      uAudio: { value: 0 },
      uEnergy: { value: 1 },
      uColor: { value: dyn.color },
      uAccent: { value: dyn.accent },
    }),
    [dyn],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms,
        vertexShader: orbitVertex,
        fragmentShader: orbitFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [uniforms],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    uniforms.uTime.value = dyn.time;
    uniforms.uSpread.value = dyn.spread;
    uniforms.uAudio.value = dyn.audio;
    uniforms.uEnergy.value = dyn.energy;
    uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
