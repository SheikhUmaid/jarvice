import { QUALITY_LEVELS } from '@jarvis/shared';
import { HolographicParticleField } from '@jarvis/ui/three';
import { PerformanceMonitor, type PerformanceMonitorApi } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { MathUtils, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RENDER_PRESETS, stepQuality, type RenderPreset } from '../../services/telemetry/quality';
import { getWebGLInfo } from '../../services/telemetry/webgl';
import { logActivity } from '../../store/activity';
import { selectReactorState, useCore } from '../../store/core';
import { useQualityLevel, useSettings } from '../../store/settings';
import { Reactor, type ReactorLayout } from './reactor/Reactor';

const CAMERA_BASE = new Vector3(0, 0.38, 7.2);
const CAMERA_FOV = 38;
/** Diameter (world units) that has to fit the slot: rings + gyroscope. */
const REACTOR_EXTENT = 4.3;

/**
 * Full-viewport WebGL stage behind the command centre. The reactor is projected into the centre of
 * `slotRef` (a DOM element in the layout) with a camera view offset, and scaled to fit it.
 */
export function ReactorStage({ slotRef }: { slotRef: RefObject<HTMLElement | null> }) {
  const state = useCore(selectReactorState);
  const quality = useQualityLevel();
  const preset = RENDER_PRESETS[quality];
  const reducedMotion = useReducedMotion();
  const layout = useRef<ReactorLayout>({ scale: 0.8 });
  const [eventSource] = useState(() => document.getElementById('root') ?? undefined);

  if (!getWebGLInfo().webgl2) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={preset.dpr}
        flat
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        camera={{ position: CAMERA_BASE.toArray(), fov: CAMERA_FOV, near: 0.1, far: 120 }}
        eventSource={eventSource}
        eventPrefix="client"
      >
        <color attach="background" args={['#02050c']} />
        <AutoQualityTuner />
        <SlotProjection slotRef={slotRef} layout={layout} />
        <CameraRig reducedMotion={reducedMotion} />
        <Reactor state={state} preset={preset} reducedMotion={reducedMotion} layout={layout} />
        <HolographicParticleField
          count={preset.ambientParticles}
          radius={13}
          size={1.5}
          opacity={0.4}
          speed={reducedMotion ? 0.15 : 1}
        />
        {preset.bloom && <Effects preset={preset} />}
      </Canvas>
    </div>
  );
}

/** Centres the projection on the slot element and computes the reactor's fit scale. */
function SlotProjection({
  slotRef,
  layout,
}: {
  slotRef: RefObject<HTMLElement | null>;
  layout: RefObject<ReactorLayout>;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const update = () => {
      const rect = slot.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const centerX = rect.left + rect.width / 2 - size.left;
      const centerY = rect.top + rect.height / 2 - size.top;
      camera.setViewOffset(
        size.width,
        size.height,
        size.width / 2 - centerX,
        size.height / 2 - centerY,
        size.width,
        size.height,
      );
      camera.updateProjectionMatrix();
      const worldHeight = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * CAMERA_BASE.z;
      const worldPerPixel = worldHeight / size.height;
      // Leave a margin inside the slot for the DOM HUD ring that frames the reactor.
      const fit = Math.min(rect.width, rect.height) * 0.86 * worldPerPixel;
      layout.current.scale = MathUtils.clamp(fit / REACTOR_EXTENT, 0.3, 1.15);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(slot);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
  }, [camera, size, slotRef, layout]);

  return null;
}

/** Subtle pointer parallax and slow drift (disabled for reduced motion). */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame((state, delta) => {
    const { camera, pointer, clock } = state;
    const amount = reducedMotion ? 0 : 1;
    const t = clock.elapsedTime;
    const x = CAMERA_BASE.x + (pointer.x * 0.45 + Math.sin(t * 0.07) * 0.18) * amount;
    const y = CAMERA_BASE.y + (pointer.y * 0.25 + Math.sin(t * 0.11) * 0.08) * amount;
    const dt = Math.min(delta, 0.1);
    camera.position.x = MathUtils.damp(camera.position.x, x, 2, dt);
    camera.position.y = MathUtils.damp(camera.position.y, y, 2, dt);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * In `auto` quality, steps the tier down when the frame rate stays low (and back up, never above
 * the device's starting tier). Starts after a warm-up so shader compilation doesn't count.
 */
function AutoQualityTuner() {
  const enabled = useSettings((state) => state.quality === 'auto' && state.qualityOverride == null);
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWarm(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!enabled || !warm) return null;

  const adjust = (direction: 1 | -1, api: PerformanceMonitorApi) => {
    const settings = useSettings.getState();
    const next = stepQuality(settings.autoQuality, direction);
    if (next === settings.autoQuality) return;
    if (
      direction > 0 &&
      QUALITY_LEVELS.indexOf(next) > QUALITY_LEVELS.indexOf(settings.deviceQuality)
    )
      return;
    settings.setAutoQuality(next);
    logActivity('settings', `Auto quality → ${next}`, {
      detail: `${Math.round(api.fps)} fps measured`,
      level: direction < 0 ? 'warn' : 'info',
    });
  };

  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={(api) => adjust(-1, api)}
      onIncline={(api) => adjust(1, api)}
      onFallback={() => {
        useSettings.getState().setAutoQuality('low');
        logActivity('settings', 'Auto quality locked to low', { level: 'warn' });
      }}
    />
  );
}

function Effects({ preset }: { preset: RenderPreset }) {
  const offset = useMemo(
    () => new Vector2(preset.chromaticAberration, preset.chromaticAberration * 0.6),
    [preset.chromaticAberration],
  );
  const bloom = (
    <Bloom
      mipmapBlur
      intensity={preset.bloomIntensity}
      luminanceThreshold={0.2}
      luminanceSmoothing={0.3}
      radius={0.72}
    />
  );
  const vignette = <Vignette offset={0.25} darkness={0.72} />;
  return preset.chromaticAberration > 0 ? (
    <EffectComposer multisampling={preset.multisampling} enableNormalPass={false}>
      {bloom}
      <ChromaticAberration offset={offset} radialModulation modulationOffset={0.4} />
      {vignette}
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={preset.multisampling} enableNormalPass={false}>
      {bloom}
      {vignette}
    </EffectComposer>
  );
}
