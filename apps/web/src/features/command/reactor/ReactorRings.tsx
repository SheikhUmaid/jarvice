import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, DoubleSide, RingGeometry, ShaderMaterial, type Mesh } from 'three';
import { ringFragment, ringVertex } from '../../../shaders/reactor';
import type { ReactorDynamics } from './dynamics';

interface RingSpec {
  inner: number;
  outer: number;
  /** 0 = continuous. */
  segments: number;
  /** Empty fraction of each segment. */
  gap: number;
  /** Visible fraction of the circle (1 = full ring). */
  arc: number;
  /** Radians per unit of reactor time. */
  speed: number;
  /** Speed of the bright sweep highlight (0 = none). */
  sweep: number;
  opacity: number;
  /** Segments light up in an amber chase while executing. */
  chase: boolean;
  z: number;
  phase: number;
}

const RINGS: readonly RingSpec[] = [
  {
    inner: 0.7,
    outer: 0.716,
    segments: 0,
    gap: 0,
    arc: 1,
    speed: 0.22,
    sweep: 0.35,
    opacity: 0.55,
    chase: false,
    z: 0.02,
    phase: 0,
  },
  {
    inner: 0.78,
    outer: 0.865,
    segments: 36,
    gap: 0.32,
    arc: 1,
    speed: -0.3,
    sweep: 0,
    opacity: 0.85,
    chase: true,
    z: 0,
    phase: 0,
  },
  {
    inner: 0.95,
    outer: 0.966,
    segments: 0,
    gap: 0,
    arc: 0.72,
    speed: 0.55,
    sweep: 0.6,
    opacity: 0.9,
    chase: false,
    z: 0.03,
    phase: 0.6,
  },
  {
    inner: 1.05,
    outer: 1.12,
    segments: 120,
    gap: 0.58,
    arc: 1,
    speed: 0.09,
    sweep: 0.2,
    opacity: 0.45,
    chase: false,
    z: -0.02,
    phase: 0,
  },
  {
    inner: 1.24,
    outer: 1.266,
    segments: 6,
    gap: 0.16,
    arc: 1,
    speed: -0.14,
    sweep: 0.15,
    opacity: 0.75,
    chase: true,
    z: 0.01,
    phase: 0.3,
  },
  {
    inner: 1.42,
    outer: 1.43,
    segments: 0,
    gap: 0,
    arc: 1,
    speed: 0.05,
    sweep: 0.45,
    opacity: 0.32,
    chase: false,
    z: -0.04,
    phase: 0,
  },
  {
    inner: 1.5,
    outer: 1.58,
    segments: 64,
    gap: 0.5,
    arc: 0.3,
    speed: 0.32,
    sweep: 0,
    opacity: 0.6,
    chase: false,
    z: 0.02,
    phase: 0,
  },
  {
    inner: 1.5,
    outer: 1.58,
    segments: 64,
    gap: 0.5,
    arc: 0.3,
    speed: 0.32,
    sweep: 0,
    opacity: 0.6,
    chase: false,
    z: 0.02,
    phase: Math.PI,
  },
];

/** Concentric HUD rings in the reactor plane (segments, arcs, sweeps and execution chase). */
export function ReactorRings({
  dyn,
  thetaSegments,
}: {
  dyn: ReactorDynamics;
  thetaSegments: number;
}) {
  const meshes = useRef<Array<Mesh | null>>([]);

  const shared = useMemo(
    () => ({
      uColor: { value: dyn.color },
      uAccent: { value: dyn.accent },
      uTime: { value: 0 },
      uEnergy: { value: dyn.energy },
      uScan: { value: 0 },
      uExec: { value: 0 },
    }),
    [dyn],
  );

  const rings = useMemo(
    () =>
      RINGS.map((spec) => ({
        spec,
        geometry: new RingGeometry(
          spec.inner,
          spec.outer,
          Math.max(48, Math.round((thetaSegments * spec.outer) / 1.2)),
          1,
        ),
        material: new ShaderMaterial({
          uniforms: {
            ...shared,
            uOpacity: { value: spec.opacity },
            uInner: { value: spec.inner },
            uOuter: { value: spec.outer },
            uSegments: { value: spec.segments },
            uGap: { value: spec.gap },
            uArc: { value: spec.arc },
            uSweepSpeed: { value: spec.sweep },
            uChase: { value: spec.chase ? 1 : 0 },
          },
          vertexShader: ringVertex,
          fragmentShader: ringFragment,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
        }),
      })),
    [shared, thetaSegments],
  );

  useEffect(
    () => () =>
      rings.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      }),
    [rings],
  );

  useFrame(() => {
    shared.uTime.value = dyn.time;
    shared.uEnergy.value = dyn.energy;
    shared.uScan.value = dyn.scan;
    shared.uExec.value = dyn.exec;
    rings.forEach(({ spec }, index) => {
      const mesh = meshes.current[index];
      if (!mesh) return;
      mesh.rotation.z = spec.phase + dyn.time * spec.speed;
      const spread = 1 + (dyn.spread - 1) * (0.55 + index * 0.12);
      mesh.scale.set(spread, spread, 1);
    });
  });

  return (
    <group>
      {rings.map(({ spec, geometry, material }, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
          geometry={geometry}
          material={material}
          position-z={spec.z}
        />
      ))}
    </group>
  );
}
