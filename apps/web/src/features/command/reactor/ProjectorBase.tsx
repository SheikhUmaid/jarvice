import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AdditiveBlending, DoubleSide, ShaderMaterial } from 'three';
import { baseFragment, beamFragment, fresnelVertex, uvVertex } from '../../../shaders/reactor';
import type { ReactorDynamics } from './dynamics';

/** Floor emitter under the reactor with a rising light cone — grounds the hologram in space. */
export function ProjectorBase({ dyn, y }: { dyn: ReactorDynamics; y: number }) {
  const uniforms = useMemo(
    () => ({ uColor: { value: dyn.color }, uTime: { value: 0 }, uEnergy: { value: dyn.energy } }),
    [dyn],
  );
  const materials = useMemo(
    () => ({
      disc: new ShaderMaterial({
        uniforms,
        vertexShader: uvVertex,
        fragmentShader: baseFragment,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
      beam: new ShaderMaterial({
        uniforms,
        vertexShader: fresnelVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    }),
    [uniforms],
  );
  useEffect(
    () => () => {
      materials.disc.dispose();
      materials.beam.dispose();
    },
    [materials],
  );

  useFrame(() => {
    uniforms.uTime.value = dyn.elapsed;
    uniforms.uEnergy.value = dyn.energy;
  });

  const beamTop = -0.62;
  const beamHeight = beamTop - y;
  return (
    <group>
      <mesh material={materials.disc} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
      </mesh>
      <mesh material={materials.beam} position={[0, y + beamHeight / 2, 0]}>
        <cylinderGeometry args={[0.62, 1.22, beamHeight, 64, 1, true]} />
      </mesh>
    </group>
  );
}
