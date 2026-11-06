import { HolographicButton, HolographicPanel, toneStyle } from '@jarvis/ui';
import {
  HolographicGlobe,
  HolographicParticleField,
  type GlobeArc,
  type GlobeMarker,
  type LatLon,
} from '@jarvis/ui/three';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Crosshair, Grid3x3, RotateCcw, RotateCw } from 'lucide-react';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Readout } from '../../components/Atoms';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { RENDER_PRESETS } from '../../services/telemetry/quality';
import { useQualityLevel } from '../../store/settings';
import { formatUtcOffset } from '../../utils/format';

/** Reference cities (real coordinates). Routes between them are illustrative. */
const CITIES: ReadonlyArray<GlobeMarker & { name: string }> = [
  { id: 'lon', name: 'London', lat: 51.5072, lon: -0.1276 },
  { id: 'nyc', name: 'New York', lat: 40.7128, lon: -74.006 },
  { id: 'tyo', name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'syd', name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { id: 'dxb', name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { id: 'sin', name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { id: 'sao', name: 'São Paulo', lat: -23.5558, lon: -46.6396 },
  { id: 'cpt', name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  { id: 'rey', name: 'Reykjavík', lat: 64.1466, lon: -21.9426 },
];

const city = (id: string): LatLon => {
  const found = CITIES.find((entry) => entry.id === id);
  return { lat: found?.lat ?? 0, lon: found?.lon ?? 0 };
};

const ROUTES: readonly GlobeArc[] = [
  { id: 'lon-nyc', from: city('lon'), to: city('nyc') },
  { id: 'lon-dxb', from: city('lon'), to: city('dxb') },
  { id: 'dxb-sin', from: city('dxb'), to: city('sin') },
  { id: 'sin-syd', from: city('sin'), to: city('syd') },
  { id: 'tyo-sin', from: city('tyo'), to: city('sin') },
  { id: 'nyc-sao', from: city('nyc'), to: city('sao') },
  { id: 'cpt-dxb', from: city('cpt'), to: city('dxb'), color: '#ffb347' },
];

function formatCoordinate(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

/** MODE F — Spatial Environment (preview). Full suite (orbits, model viewer, datasets) in Milestone 10. */
export function SpatialMode() {
  const quality = useQualityLevel();
  const preset = RENDER_PRESETS[quality];
  const reducedMotion = useReducedMotion();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [hover, setHover] = useState<LatLon | null>(null);
  const [rotate, setRotate] = useState(true);
  const [graticule, setGraticule] = useState(true);

  // Longitude of the local time-zone meridian (15° per hour of UTC offset) — derived from the clock,
  // no geolocation involved.
  const meridian = useMemo(() => -new Date().getTimezoneOffset() / 4, []);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={preset.dpr}
        flat
        camera={{ position: [0, 0.5, 3.9], fov: 42 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#02050c']} />
        <HolographicParticleField
          count={preset.ambientParticles}
          radius={9}
          size={1.2}
          opacity={0.5}
          speed={reducedMotion ? 0.1 : 0.6}
        />
        <HolographicGlobe
          radius={1}
          focusLongitude={meridian}
          meridian={meridian}
          markers={CITIES}
          arcs={ROUTES}
          graticuleStep={graticule ? 15 : 0}
          autoRotate={rotate && !reducedMotion ? 0.045 : 0}
          onHover={setHover}
        />
        <OrbitControls
          ref={controls}
          enablePan={false}
          enableDamping
          minDistance={1.55}
          maxDistance={7}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
        />
        {preset.bloom && (
          <EffectComposer multisampling={preset.multisampling} enableNormalPass={false}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.22} luminanceSmoothing={0.3} />
          </EffectComposer>
        )}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 pb-[calc(var(--chrome-bottom)+0.75rem)] pl-[calc(var(--chrome-left)+0.75rem)] pr-3 pt-[calc(var(--chrome-top)+0.75rem)]">
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <HolographicPanel
              title="Coordinates"
              icon={<Crosshair size={12} className="text-holo-300" />}
              code="GEO"
              className="pointer-events-auto w-[17rem]"
            >
              <Readout label="Latitude">
                {hover ? formatCoordinate(hover.lat, 'N', 'S') : '—'}
              </Readout>
              <Readout label="Longitude">
                {hover ? formatCoordinate(hover.lon, 'E', 'W') : '—'}
              </Readout>
              <p className="mt-1.5 text-[12.5px] leading-snug text-holo-300/60">
                {hover
                  ? 'Pointer position on the globe surface.'
                  : 'Move the pointer over the globe · drag to rotate · scroll to zoom.'}
              </p>
            </HolographicPanel>
            <HolographicPanel title="Reference" code="F" className="pointer-events-auto w-[17rem]">
              <Readout
                label="Your meridian"
                tone="amber"
                title="Derived from your clock's UTC offset; no location is requested"
              >
                {formatCoordinate(meridian, 'E', 'W')}
              </Readout>
              <Readout label="Clock offset">{formatUtcOffset()}</Readout>
              <Readout label="Cities">{CITIES.length} reference markers</Readout>
              <Readout label="Routes">{ROUTES.length} illustrative arcs</Readout>
              <Readout label="Coastlines">Natural Earth 1:110m</Readout>
              <span className="holo-chip mt-2" style={toneStyle('ice')}>
                Preview · full suite in Milestone 10
              </span>
            </HolographicPanel>
          </div>
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            <HolographicButton
              size="sm"
              active={rotate}
              icon={<RotateCw size={13} />}
              onClick={() => setRotate((value) => !value)}
            >
              Auto-rotate
            </HolographicButton>
            <HolographicButton
              size="sm"
              active={graticule}
              icon={<Grid3x3 size={13} />}
              onClick={() => setGraticule((value) => !value)}
            >
              Graticule
            </HolographicButton>
            <HolographicButton
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={() => controls.current?.reset()}
            >
              Reset view
            </HolographicButton>
          </div>
        </div>
      </div>
    </div>
  );
}
