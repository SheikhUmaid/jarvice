import { HolographicGridPlane, HolographicParticleField } from '@jarvis/ui/three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, Color, DoubleSide, MathUtils, ShaderMaterial, type Group } from 'three';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { uvVertex } from '../../shaders/reactor';
import { RENDER_PRESETS } from '../../services/telemetry/quality';
import { getWebGLInfo } from '../../services/telemetry/webgl';
import { useQualityLevel } from '../../store/settings';
import { useWorkspace } from './workspace';

const panelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  varying vec2 vUv;
  void main() {
    vec2 edge = min(vUv, 1.0 - vUv);
    float nearEdge = 1.0 - smoothstep(0.0, 0.012, min(edge.x, edge.y));
    float corner = nearEdge * step(edge.x, 0.09) * step(edge.y, 0.09);
    float grid = (step(0.985, fract(vUv.x * 14.0)) + step(0.98, fract(vUv.y * 9.0))) * 0.07;
    float scan = exp(-pow((fract(uTime * 0.08 + uSeed) - vUv.y) * 30.0, 2.0)) * 0.35;
    float alpha = (corner * 1.1 + nearEdge * 0.22 + grid + scan + 0.035) * uOpacity;
    gl_FragColor = vec4(uColor * (1.0 + corner * 1.2), alpha);
    #include <colorspace_fragment>
  }
`;

const PANELS: ReadonlyArray<{
  position: [number, number, number];
  rotation: number;
  size: [number, number];
}> = [
  { position: [-4.4, 1.4, -3.2], rotation: 0.5, size: [2.6, 1.6] },
  { position: [4.6, 1.0, -4.2], rotation: -0.55, size: [2.8, 1.7] },
  { position: [-3.4, -1.3, -5.2], rotation: 0.35, size: [2.2, 1.4] },
  { position: [3.8, -1.5, -2.8], rotation: -0.42, size: [2.0, 1.3] },
  { position: [0.2, 2.5, -7.5], rotation: 0, size: [3.6, 2.0] },
  { position: [-0.6, -0.4, -9.5], rotation: 0.1, size: [4.2, 2.4] },
];

/** Semi-transparent 3D panels floating at different depths (parallax gives the space depth). */
function FloatingPanels({ intensity, animate }: { intensity: number; animate: boolean }) {
  const group = useRef<Group>(null);
  const materials = useMemo(
    () =>
      PANELS.map(
        (_, index) =>
          new ShaderMaterial({
            uniforms: {
              uColor: { value: new Color('#19dcff') },
              uTime: { value: 0 },
              uOpacity: { value: 0.6 },
              uSeed: { value: index * 0.17 },
            },
            vertexShader: uvVertex,
            fragmentShader: panelFragment,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
            blending: AdditiveBlending,
          }),
      ),
    [],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    materials.forEach((material) => {
      const time = material.uniforms.uTime;
      const opacity = material.uniforms.uOpacity;
      if (time) time.value = animate ? t : 0;
      if (opacity) opacity.value = 0.3 + intensity * 0.6;
    });
    group.current?.children.forEach((child, index) => {
      const base = PANELS[index];
      if (!base || !animate) return;
      child.position.y = base.position[1] + Math.sin(t * 0.35 + index * 1.7) * 0.12;
      child.rotation.y = base.rotation + Math.sin(t * 0.2 + index) * 0.04;
    });
  });

  return (
    <group ref={group}>
      {PANELS.map((panel, index) => (
        <mesh
          key={index}
          position={panel.position}
          rotation={[0, panel.rotation, 0]}
          material={materials[index]}
        >
          <planeGeometry args={panel.size} />
        </mesh>
      ))}
    </group>
  );
}

/** Mouse-driven parallax plus an optional slow orbit drift. */
function ParallaxRig({ drift }: { drift: boolean }) {
  useFrame((state, delta) => {
    const { camera, pointer, clock } = state;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const x = pointer.x * 0.9 + (drift ? Math.sin(t * 0.05) * 1.4 : 0);
    const y = 0.4 + pointer.y * 0.45 + (drift ? Math.sin(t * 0.08) * 0.25 : 0);
    camera.position.x = MathUtils.damp(camera.position.x, x, 1.8, dt);
    camera.position.y = MathUtils.damp(camera.position.y, y, 1.8, dt);
    camera.lookAt(0, 0, -2.5);
  });
  return null;
}

/** Background 3D space for the holographic workspace. */
export function HoloBackdropScene() {
  const ambient = useWorkspace((state) => state.ambient);
  const quality = useQualityLevel();
  const preset = RENDER_PRESETS[quality];
  const reducedMotion = useReducedMotion();
  const [eventSource] = useState(() => document.getElementById('root') ?? undefined);
  if (!getWebGLInfo().webgl2) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={preset.dpr}
        flat
        camera={{ position: [0, 0.4, 7], fov: 50 }}
        eventSource={eventSource}
        eventPrefix="client"
      >
        <color attach="background" args={['#02050c']} />
        <ParallaxRig drift={ambient.drift && !reducedMotion} />
        {ambient.particles && (
          <HolographicParticleField
            count={Math.round(preset.ambientParticles * 1.6)}
            radius={12}
            size={1.6}
            opacity={0.3 + ambient.intensity * 0.5}
            speed={reducedMotion ? 0.15 : 0.8}
          />
        )}
        {ambient.grid && (
          <HolographicGridPlane
            position={[0, -2.2, 0]}
            size={80}
            cell={0.6}
            major={5}
            fadeDistance={22}
            opacity={0.2 + ambient.intensity * 0.45}
            ripple={0.3}
            paused={reducedMotion}
          />
        )}
        {ambient.panels && (
          <FloatingPanels intensity={ambient.intensity} animate={!reducedMotion} />
        )}
        {preset.bloom && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.25} luminanceSmoothing={0.3} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
