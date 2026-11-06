import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  type Group,
  type Mesh,
} from 'three';
import {
  pulseFragment,
  scanLineFragment,
  spikeFragment,
  spikeVertex,
  sweepFragment,
  uvVertex,
} from '../../../shaders/reactor';
import type { ReactorDynamics } from './dynamics';

const PULSE_POOL = 5;
const PULSE_SECONDS = 1.7;

/**
 * Expanding shockwaves: a strong pulse on every state change, ambient pulses at the state's
 * rhythm, and voice-driven pulses when the audio level crosses a threshold.
 */
export function ReactorPulses({ dyn }: { dyn: ReactorDynamics }) {
  const meshes = useRef<Array<Mesh | null>>([]);
  const timing = useRef({ next: 0, ambient: 0, lastState: dyn.state, lastAudio: 0, cooldown: 0 });

  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const pool = useMemo(
    () =>
      Array.from({ length: PULSE_POOL }, () => {
        const uniforms = {
          uColor: { value: new Color() },
          uProgress: { value: 1 },
          uStrength: { value: 0 },
        };
        const material = new ShaderMaterial({
          uniforms,
          vertexShader: uvVertex,
          fragmentShader: pulseFragment,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
        });
        return { uniforms, material };
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => pool.forEach(({ material }) => material.dispose()), [pool]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = timing.current;
    const trigger = (strength: number, color: Color) => {
      const pulse = pool[t.next];
      t.next = (t.next + 1) % PULSE_POOL;
      if (!pulse) return;
      pulse.uniforms.uProgress.value = 0;
      pulse.uniforms.uStrength.value = strength;
      pulse.uniforms.uColor.value.copy(color);
    };

    if (dyn.state !== t.lastState) {
      t.lastState = dyn.state;
      trigger(1, dyn.state === 'executing' ? dyn.accent : dyn.color);
    }
    t.ambient += dt * dyn.pulseRate;
    if (t.ambient >= 1) {
      t.ambient -= 1;
      trigger(dyn.state === 'thinking' ? 0.5 : 0.28, dyn.color);
    }
    t.cooldown -= dt;
    if (dyn.audio > 0.5 && t.lastAudio <= 0.5 && t.cooldown <= 0) {
      trigger(0.4 + dyn.audio * 0.6, dyn.accent);
      t.cooldown = 0.25;
    }
    t.lastAudio = dyn.audio;

    pool.forEach(({ uniforms }, index) => {
      const progress = Math.min(1, uniforms.uProgress.value + dt / PULSE_SECONDS);
      uniforms.uProgress.value = progress;
      const mesh = meshes.current[index];
      if (!mesh) return;
      mesh.visible = progress < 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      mesh.scale.setScalar(0.55 + eased * 2.9);
    });
  });

  return (
    <group>
      {pool.map(({ material }, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            meshes.current[index] = mesh;
          }}
          geometry={geometry}
          material={material}
          visible={false}
        />
      ))}
    </group>
  );
}

/** Thinking: a radar sweep around the rings and a scan line passing through the core. */
export function ReactorScanner({ dyn }: { dyn: ReactorDynamics }) {
  const sweepRef = useRef<Mesh>(null);
  const lineRef = useRef<Mesh>(null);
  const sweep = useMemo(
    () => ({ uColor: { value: dyn.color }, uTime: { value: 0 }, uScan: { value: 0 } }),
    [dyn],
  );
  const line = useMemo(() => ({ uColor: { value: dyn.color }, uScan: { value: 0 } }), [dyn]);
  const materials = useMemo(() => {
    const make = (uniforms: Record<string, { value: unknown }>, fragmentShader: string) =>
      new ShaderMaterial({
        uniforms,
        vertexShader: uvVertex,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      });
    return [make(sweep, sweepFragment), make(line, scanLineFragment)] as const;
  }, [sweep, line]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useFrame(() => {
    const visible = dyn.scan > 0.01;
    sweep.uTime.value = dyn.time;
    sweep.uScan.value = dyn.scan;
    line.uScan.value = dyn.scan;
    if (sweepRef.current) sweepRef.current.visible = visible;
    const scanLine = lineRef.current;
    if (scanLine) {
      scanLine.visible = visible;
      scanLine.position.y = Math.sin(dyn.elapsed * 1.7) * 1.45;
    }
  });

  return (
    <group>
      <mesh ref={sweepRef} material={materials[0]} visible={false}>
        <planeGeometry args={[4.4, 4.4]} />
      </mesh>
      <mesh ref={lineRef} material={materials[1]} position-z={0.05} visible={false}>
        <planeGeometry args={[3.8, 0.6]} />
      </mesh>
    </group>
  );
}

const SPIKES = 30;

/** Executing: amber data spikes around the outer ring and fast-orbiting execution nodes. */
export function ReactorExecution({ dyn }: { dyn: ReactorDynamics }) {
  const groupRef = useRef<Group>(null);
  const nodes = useRef<Array<Mesh | null>>([]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uExec: { value: 0 }, uAccent: { value: dyn.accent } }),
    [dyn],
  );

  const resources = useMemo(() => {
    const angle = new Float32Array(SPIKES * 2);
    const end = new Float32Array(SPIKES * 2);
    const seed = new Float32Array(SPIKES * 2);
    for (let i = 0; i < SPIKES; i++) {
      const a = (i / SPIKES) * Math.PI * 2;
      const s = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      angle.set([a, a], i * 2);
      end.set([0, 1], i * 2);
      seed.set([Math.abs(s), Math.abs(s)], i * 2);
    }
    const spikes = new BufferGeometry();
    spikes.setAttribute('position', new BufferAttribute(new Float32Array(SPIKES * 6), 3));
    spikes.setAttribute('aAngle', new BufferAttribute(angle, 1));
    spikes.setAttribute('aEnd', new BufferAttribute(end, 1));
    spikes.setAttribute('aSeed', new BufferAttribute(seed, 1));
    return {
      spikes,
      spikeMaterial: new ShaderMaterial({
        uniforms,
        vertexShader: spikeVertex,
        fragmentShader: spikeFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      node: new SphereGeometry(0.035, 12, 12),
      nodeMaterial: new MeshBasicMaterial({ color: dyn.accent.clone(), toneMapped: false }),
    };
  }, [uniforms, dyn]);

  useEffect(
    () => () => {
      resources.spikes.dispose();
      resources.spikeMaterial.dispose();
      resources.node.dispose();
      resources.nodeMaterial.dispose();
    },
    [resources],
  );

  useFrame(() => {
    uniforms.uTime.value = dyn.time;
    uniforms.uExec.value = dyn.exec;
    const group = groupRef.current;
    if (!group) return;
    group.visible = dyn.exec > 0.01;
    if (!group.visible) return;
    resources.nodeMaterial.color.copy(dyn.accent).multiplyScalar(2);
    nodes.current.forEach((node, index) => {
      if (!node) return;
      const angle = dyn.time * 4 + (index / 3) * Math.PI * 2;
      node.position.set(Math.cos(angle) * 1.31, Math.sin(angle) * 1.31, 0.02);
      node.scale.setScalar(Math.max(0.001, dyn.exec));
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      <lineSegments
        geometry={resources.spikes}
        material={resources.spikeMaterial}
        frustumCulled={false}
      />
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            nodes.current[index] = mesh;
          }}
          geometry={resources.node}
          material={resources.nodeMaterial}
        />
      ))}
    </group>
  );
}
