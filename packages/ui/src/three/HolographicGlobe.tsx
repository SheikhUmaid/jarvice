import { useFrame, type ThreeElements, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  ShaderMaterial,
  Vector3,
  type ColorRepresentation,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import {
  buildGraticule,
  buildMeridian,
  latLonToVector3,
  loadCoastlines,
  longitudeToRotationY,
  vector3ToLatLon,
  type LatLon,
} from './geo';

export interface GlobeMarker {
  id: string;
  lat: number;
  lon: number;
  color?: ColorRepresentation;
}

export interface GlobeArc {
  id: string;
  from: LatLon;
  to: LatLon;
  color?: ColorRepresentation;
}

export interface HolographicGlobeProps extends Omit<ThreeElements['group'], 'children'> {
  radius?: number;
  color?: ColorRepresentation;
  atmosphereColor?: ColorRepresentation;
  /** Degrees between graticule lines; 0 hides the graticule. */
  graticuleStep?: number;
  /** Natural Earth coastlines (lazy-loaded). */
  coastlines?: boolean;
  /** Opacity of coastlines seen through the globe (x-ray look); 0 disables. */
  ghostOpacity?: number;
  /** Radians per second around the polar axis. */
  autoRotate?: number;
  /** Longitude turned towards the camera on mount. */
  focusLongitude?: number;
  markers?: readonly GlobeMarker[];
  arcs?: readonly GlobeArc[];
  /** Highlights one meridian (e.g. the local time-zone meridian). */
  meridian?: number | null;
  meridianColor?: ColorRepresentation;
  /** Latitude/longitude under the pointer (null when it leaves the globe). */
  onHover?: (coords: LatLon | null) => void;
  /** Extra content that rotates with the globe. */
  children?: ReactNode;
}

const surfaceVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uRim;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
    float scan = smoothstep(0.92, 1.0, sin(vLocal.y * 90.0 - uTime * 1.5));
    vec3 color = uBase + uRim * (fresnel * 0.85 + scan * 0.035);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uRim;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float glow = pow(clamp(-dot(vNormal, vView), 0.0, 1.0), 2.2);
    gl_FragColor = vec4(uRim * 1.6, glow * 0.9);
    #include <colorspace_fragment>
  }
`;

const arcVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const arcFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOffset;
  varying float vT;
  void main() {
    float head = fract(uTime * 0.3 + uOffset);
    float behind = head - vT;
    float pulse = behind >= 0.0 ? exp(-behind * 14.0) : 0.0;
    gl_FragColor = vec4(uColor * (0.7 + pulse * 1.8), 0.16 + pulse * 0.84);
    #include <colorspace_fragment>
  }
`;

function segmentsGeometry(segments: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(segments, 3));
  return geometry;
}

function useDisposable<T extends { dispose(): void }>(value: T): T {
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

/**
 * Holographic Earth: occluding core with a fresnel rim, atmosphere glow, graticule, Natural Earth
 * coastlines (plus an optional x-ray "ghost" of the far side), pulsing markers and animated arcs.
 */
export function HolographicGlobe({
  radius = 1,
  color = '#19dcff',
  atmosphereColor = '#19dcff',
  graticuleStep = 15,
  coastlines = true,
  ghostOpacity = 0.1,
  autoRotate = 0.06,
  focusLongitude,
  markers = [],
  arcs = [],
  meridian = null,
  meridianColor = '#ffb347',
  onHover,
  children,
  ...groupProps
}: HolographicGlobeProps) {
  const spinRef = useRef<Group>(null);
  const [coastSegments, setCoastSegments] = useState<Float32Array | null>(null);

  useEffect(() => {
    if (!coastlines) return;
    let cancelled = false;
    loadCoastlines()
      .then((segments) => {
        if (!cancelled) setCoastSegments(segments);
      })
      .catch((error: unknown) => console.warn('[HolographicGlobe] coastlines unavailable:', error));
    return () => {
      cancelled = true;
    };
  }, [coastlines]);

  useLayoutEffect(() => {
    if (focusLongitude != null && spinRef.current) {
      spinRef.current.rotation.y = longitudeToRotationY(focusLongitude);
    }
  }, [focusLongitude]);

  const surfaceUniforms = useMemo(
    () => ({
      uBase: { value: new Color('#020a14') },
      uRim: { value: new Color(atmosphereColor) },
      uTime: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    surfaceUniforms.uRim.value.set(atmosphereColor);
  }, [surfaceUniforms, atmosphereColor]);

  const surfaceMaterial = useDisposable(
    useMemo(
      () =>
        new ShaderMaterial({
          uniforms: surfaceUniforms,
          vertexShader: surfaceVertex,
          fragmentShader: surfaceFragment,
        }),
      [surfaceUniforms],
    ),
  );
  const atmosphereMaterial = useDisposable(
    useMemo(
      () =>
        new ShaderMaterial({
          uniforms: { uRim: surfaceUniforms.uRim },
          vertexShader: surfaceVertex,
          fragmentShader: atmosphereFragment,
          side: BackSide,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      [surfaceUniforms],
    ),
  );

  const lineMaterial = useDisposable(
    useMemo(
      () =>
        new LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      [color],
    ),
  );
  const graticuleMaterial = useDisposable(
    useMemo(
      () =>
        new LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      [color],
    ),
  );
  const ghostMaterial = useDisposable(
    useMemo(
      () =>
        new LineBasicMaterial({
          color,
          transparent: true,
          opacity: ghostOpacity,
          depthTest: false,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      [color, ghostOpacity],
    ),
  );
  const meridianMaterial = useDisposable(
    useMemo(
      () =>
        new LineBasicMaterial({
          color: meridianColor,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      [meridianColor],
    ),
  );

  const graticule = useDisposable(
    useMemo(() => segmentsGeometry(buildGraticule(graticuleStep || 90)), [graticuleStep]),
  );
  const coast = useMemo(
    () => (coastSegments ? segmentsGeometry(coastSegments) : null),
    [coastSegments],
  );
  useEffect(() => () => coast?.dispose(), [coast]);
  const meridianGeometry = useMemo(
    () => (meridian == null ? null : segmentsGeometry(buildMeridian(meridian))),
    [meridian],
  );
  useEffect(() => () => meridianGeometry?.dispose(), [meridianGeometry]);

  useFrame((_, delta) => {
    surfaceUniforms.uTime.value += delta;
    if (spinRef.current && autoRotate) spinRef.current.rotation.y += delta * autoRotate;
  });

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!onHover || !spinRef.current) return;
    onHover(vector3ToLatLon(spinRef.current.worldToLocal(event.point.clone())));
  };

  return (
    <group {...groupProps}>
      <group ref={spinRef}>
        <mesh
          material={surfaceMaterial}
          onPointerMove={onHover ? handlePointerMove : undefined}
          onPointerLeave={onHover ? () => onHover(null) : undefined}
        >
          <sphereGeometry args={[radius * 0.995, 72, 48]} />
        </mesh>
        {graticuleStep > 0 && (
          <lineSegments geometry={graticule} material={graticuleMaterial} scale={radius * 1.001} />
        )}
        {coast && (
          <>
            <lineSegments geometry={coast} material={lineMaterial} scale={radius * 1.002} />
            {ghostOpacity > 0 && (
              <lineSegments
                geometry={coast}
                material={ghostMaterial}
                scale={radius * 1.002}
                renderOrder={-1}
              />
            )}
          </>
        )}
        {meridianGeometry && (
          <lineSegments
            geometry={meridianGeometry}
            material={meridianMaterial}
            scale={radius * 1.004}
          />
        )}
        {markers.map((marker, index) => (
          <GlobeMarkerPoint
            key={marker.id}
            marker={marker}
            radius={radius}
            phase={index * 0.37}
            fallback={color}
          />
        ))}
        {arcs.map((arc, index) => (
          <GlobeArcLine
            key={arc.id}
            arc={arc}
            radius={radius}
            offset={index * 0.29}
            fallback={color}
          />
        ))}
        {children}
      </group>
      <mesh material={atmosphereMaterial} scale={1.16}>
        <sphereGeometry args={[radius, 48, 32]} />
      </mesh>
    </group>
  );
}

function GlobeMarkerPoint({
  marker,
  radius,
  phase,
  fallback,
}: {
  marker: GlobeMarker;
  radius: number;
  phase: number;
  fallback: ColorRepresentation;
}) {
  const ringRef = useRef<Mesh>(null);
  const position = useMemo(
    () => latLonToVector3(marker.lat, marker.lon, radius * 1.004),
    [marker.lat, marker.lon, radius],
  );
  const tip = useMemo(() => position.clone().multiplyScalar(1.09), [position]);
  const stem = useMemo(() => {
    const geometry = new BufferGeometry().setFromPoints([position, tip]);
    return new Line(
      geometry,
      new LineBasicMaterial({ color: marker.color ?? fallback, transparent: true, opacity: 0.7 }),
    );
  }, [position, tip, marker.color, fallback]);
  useEffect(
    () => () => {
      stem.geometry.dispose();
      (stem.material as LineBasicMaterial).dispose();
    },
    [stem],
  );

  useLayoutEffect(() => {
    // Orient the pulse ring flat against the surface (facing outward).
    ringRef.current?.lookAt(position.clone().multiplyScalar(2));
  }, [position]);

  useFrame(({ clock }) => {
    const ring = ringRef.current;
    if (!ring) return;
    const t = (clock.elapsedTime * 0.6 + phase) % 1;
    ring.scale.setScalar(1 + t * 2.6);
    (ring.material as MeshBasicMaterial).opacity = (1 - t) * 0.85;
  });

  const markerColor = marker.color ?? fallback;
  return (
    <group>
      <mesh position={tip}>
        <sphereGeometry args={[radius * 0.012, 10, 10]} />
        <meshBasicMaterial color={markerColor} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} position={position}>
        <ringGeometry args={[radius * 0.018, radius * 0.024, 40]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <primitive object={stem} />
    </group>
  );
}

function GlobeArcLine({
  arc,
  radius,
  offset,
  fallback,
}: {
  arc: GlobeArc;
  radius: number;
  offset: number;
  fallback: ColorRepresentation;
}) {
  const line = useMemo(() => {
    const start = latLonToVector3(arc.from.lat, arc.from.lon, 1);
    const end = latLonToVector3(arc.to.lat, arc.to.lon, 1);
    const angle = start.angleTo(end);
    const lift = 0.08 + angle * 0.12;
    const steps = 72;
    const positions = new Float32Array((steps + 1) * 3);
    const progress = new Float32Array(steps + 1);
    const point = new Vector3();
    const axis = new Vector3().crossVectors(start, end).normalize();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Great-circle interpolation (rotate `start` towards `end`), lifted by a sine arch.
      point.copy(start).applyAxisAngle(axis, angle * t);
      point.multiplyScalar(radius * (1.004 + lift * Math.sin(Math.PI * t)));
      positions.set([point.x, point.y, point.z], i * 3);
      progress[i] = t;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aT', new BufferAttribute(progress, 1));
    const material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(arc.color ?? fallback) },
        uTime: { value: 0 },
        uOffset: { value: offset },
      },
      vertexShader: arcVertex,
      fragmentShader: arcFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return new Line(geometry, material);
  }, [arc.from.lat, arc.from.lon, arc.to.lat, arc.to.lon, arc.color, radius, offset, fallback]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as ShaderMaterial).dispose();
    },
    [line],
  );

  useFrame((_, delta) => {
    const uniform = (line.material as ShaderMaterial).uniforms.uTime;
    if (uniform) uniform.value += delta;
  });

  return <primitive object={line} />;
}
