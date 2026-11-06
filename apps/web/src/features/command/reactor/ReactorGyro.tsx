import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Group,
  type PointLight,
} from 'three';
import type { ReactorDynamics } from './dynamics';

interface GyroSpec {
  radius: number;
  tube: number;
  tilt: [number, number, number];
  /** Precession speed around the vertical axis. */
  speed: number;
  nodes: number;
}

const GYROS: readonly GyroSpec[] = [
  { radius: 1.86, tube: 0.007, tilt: [1.2, 0.25, 0], speed: 0.32, nodes: 2 },
  { radius: 1.98, tube: 0.0055, tilt: [0.45, -0.95, 0.3], speed: -0.24, nodes: 1 },
  { radius: 2.1, tube: 0.0045, tilt: [1.95, 0.6, -0.2], speed: 0.17, nodes: 3 },
];

/** Metallic gyroscope rings lit by the core, with satellite nodes travelling along them. */
export function ReactorGyro({ dyn }: { dyn: ReactorDynamics }) {
  const precession = useRef<Array<Group | null>>([]);
  const carriers = useRef<Array<Group | null>>([]);

  const resources = useMemo(
    () => ({
      tori: GYROS.map((gyro) => new TorusGeometry(gyro.radius, gyro.tube, 8, 240)),
      node: new SphereGeometry(0.028, 12, 12),
      ringMaterial: new MeshStandardMaterial({
        color: '#0b2537',
        metalness: 0.85,
        roughness: 0.3,
        emissive: dyn.color.clone(),
        emissiveIntensity: 0.6,
      }),
      nodeMaterial: new MeshBasicMaterial({ color: dyn.accent.clone(), toneMapped: false }),
    }),
    [dyn],
  );

  useEffect(
    () => () => {
      resources.tori.forEach((geometry) => geometry.dispose());
      resources.node.dispose();
      resources.ringMaterial.dispose();
      resources.nodeMaterial.dispose();
    },
    [resources],
  );

  useFrame(() => {
    resources.ringMaterial.emissive.copy(dyn.color);
    resources.ringMaterial.emissiveIntensity = 0.3 + 0.45 * dyn.energy;
    resources.nodeMaterial.color.copy(dyn.accent).multiplyScalar(1.4 + dyn.exec);
    GYROS.forEach((gyro, index) => {
      const outer = precession.current[index];
      if (outer) outer.rotation.y = dyn.time * gyro.speed + index * 2.1;
      const carrier = carriers.current[index];
      if (carrier) carrier.rotation.z = dyn.time * gyro.speed * 3.2;
    });
  });

  return (
    <group>
      {GYROS.map((gyro, index) => (
        <group
          key={index}
          ref={(group) => {
            precession.current[index] = group;
          }}
        >
          <group rotation={gyro.tilt}>
            <mesh geometry={resources.tori[index]} material={resources.ringMaterial} />
            <group
              ref={(group) => {
                carriers.current[index] = group;
              }}
            >
              {Array.from({ length: gyro.nodes }, (_, node) => {
                const angle = (node / gyro.nodes) * Math.PI * 2;
                return (
                  <mesh
                    key={node}
                    geometry={resources.node}
                    material={resources.nodeMaterial}
                    position={[Math.cos(angle) * gyro.radius, Math.sin(angle) * gyro.radius, 0]}
                  />
                );
              })}
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Point light at the core; its colour and intensity follow the reactor state. */
export function ReactorLight({ dyn }: { dyn: ReactorDynamics }) {
  const light = useRef<PointLight>(null);
  useFrame(() => {
    const current = light.current;
    if (!current) return;
    current.color.copy(dyn.color).lerp(dyn.accent, dyn.exec * 0.6);
    current.intensity = 8 + dyn.energy * 16;
  });
  return (
    <>
      <pointLight ref={light} position={[0, 0, 0.4]} distance={9} decay={1.6} />
      <ambientLight intensity={0.12} />
    </>
  );
}
