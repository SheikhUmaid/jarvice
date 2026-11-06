import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  EdgesGeometry,
  IcosahedronGeometry,
  LineBasicMaterial,
  OctahedronGeometry,
  ShaderMaterial,
  type Group,
  type Mesh,
} from 'three';
import { coreFragment, coreVertex, haloFragment, uvVertex } from '../../../shaders/reactor';
import type { ReactorDynamics } from './dynamics';

const CORE_RADIUS = 0.5;

function edges(source: IcosahedronGeometry | OctahedronGeometry): EdgesGeometry {
  const geometry = new EdgesGeometry(source);
  source.dispose();
  return geometry;
}

/** Noise-displaced energy sphere, camera-facing halos and counter-rotating wireframe shells. */
export function ReactorCore({ dyn, detail }: { dyn: ReactorDynamics; detail: number }) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Group>(null);
  const outerShellRef = useRef<Group>(null);
  const innerShellRef = useRef<Group>(null);

  const coreUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNoise: { value: dyn.noise },
      uPulse: { value: 0 },
      uEnergy: { value: dyn.energy },
      uColor: { value: dyn.color },
      uAccent: { value: dyn.accent },
    }),
    [dyn],
  );
  const coreMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: coreUniforms,
        vertexShader: coreVertex,
        fragmentShader: coreFragment,
      }),
    [coreUniforms],
  );
  const coreGeometry = useMemo(() => new IcosahedronGeometry(CORE_RADIUS, detail), [detail]);

  const haloInner = useMemo(
    () => ({ uColor: { value: dyn.color }, uIntensity: { value: 0.9 } }),
    [dyn],
  );
  const haloOuter = useMemo(
    () => ({ uColor: { value: dyn.color }, uIntensity: { value: 0.22 } }),
    [dyn],
  );
  const haloMaterials = useMemo(
    () =>
      [haloInner, haloOuter].map(
        (uniforms) =>
          new ShaderMaterial({
            uniforms,
            vertexShader: uvVertex,
            fragmentShader: haloFragment,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
          }),
      ),
    [haloInner, haloOuter],
  );

  const shells = useMemo(
    () => ({
      outer: edges(new IcosahedronGeometry(0.66, 1)),
      inner: edges(new OctahedronGeometry(0.6, 0)),
      material: new LineBasicMaterial({
        color: dyn.color,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [dyn],
  );

  useEffect(
    () => () => {
      coreMaterial.dispose();
      haloMaterials.forEach((material) => material.dispose());
    },
    [coreMaterial, haloMaterials],
  );
  useEffect(() => () => coreGeometry.dispose(), [coreGeometry]);
  useEffect(
    () => () => {
      shells.outer.dispose();
      shells.inner.dispose();
      shells.material.dispose();
    },
    [shells],
  );

  useFrame(() => {
    coreUniforms.uTime.value = dyn.elapsed;
    coreUniforms.uNoise.value = dyn.noise;
    coreUniforms.uEnergy.value = dyn.energy;
    coreUniforms.uPulse.value =
      0.5 + 0.5 * Math.sin(dyn.elapsed * Math.PI * 2 * (0.35 + dyn.pulseRate));
    coreRef.current?.scale.setScalar(dyn.core);

    haloInner.uIntensity.value = 0.55 + 0.4 * dyn.energy + dyn.audio * 0.3;
    haloOuter.uIntensity.value = 0.12 + 0.12 * dyn.energy;
    haloRef.current?.scale.setScalar(0.9 + dyn.core * 0.15 + dyn.audio * 0.25);

    shells.material.color.copy(dyn.color);
    shells.material.opacity = 0.18 + 0.2 * dyn.energy;
    const outer = outerShellRef.current;
    if (outer) {
      outer.rotation.x = dyn.time * 0.32;
      outer.rotation.y = dyn.time * 0.46;
    }
    const inner = innerShellRef.current;
    if (inner) {
      inner.rotation.x = -dyn.time * 0.5;
      inner.rotation.z = dyn.time * 0.38;
    }
  });

  return (
    <group>
      <mesh ref={coreRef} geometry={coreGeometry} material={coreMaterial} />
      <group ref={outerShellRef}>
        <lineSegments geometry={shells.outer} material={shells.material} />
      </group>
      <group ref={innerShellRef}>
        <lineSegments geometry={shells.inner} material={shells.material} />
      </group>
      <Billboard>
        <group ref={haloRef}>
          <mesh material={haloMaterials[0]} scale={2.3}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <mesh material={haloMaterials[1]} scale={7}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}
