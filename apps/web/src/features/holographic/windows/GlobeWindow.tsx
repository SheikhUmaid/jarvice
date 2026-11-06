import { HolographicGlobe, type LatLon } from '@jarvis/ui/three';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { RENDER_PRESETS } from '../../../services/telemetry/quality';
import { getWebGLInfo } from '../../../services/telemetry/webgl';
import { useQualityLevel } from '../../../store/settings';

const format = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;

/** Rotating holographic Earth; drag to orbit, scroll to zoom, hover for coordinates. */
export function GlobeWindow() {
  const preset = RENDER_PRESETS[useQualityLevel()];
  const reducedMotion = useReducedMotion();
  const [hover, setHover] = useState<LatLon | null>(null);

  if (!getWebGLInfo().webgl2) {
    return (
      <p className="p-4 text-[13px] text-holo-300/70">
        WebGL 2 is unavailable, so the globe cannot render here.
      </p>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={preset.dpr}
        flat
        camera={{ position: [0, 0.35, 3.1], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <HolographicGlobe
          radius={1}
          graticuleStep={20}
          ghostOpacity={0.12}
          autoRotate={reducedMotion ? 0 : 0.12}
          onHover={setHover}
        />
        <OrbitControls
          enablePan={false}
          enableDamping
          minDistance={1.7}
          maxDistance={5}
          rotateSpeed={0.6}
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[10px] text-holo-300/70">
        <span>
          {hover
            ? `${format(hover.lat, 'N', 'S')}  ${format(hover.lon, 'E', 'W')}`
            : 'drag · scroll · hover'}
        </span>
        <span>NE 1:110m</span>
      </div>
    </div>
  );
}
