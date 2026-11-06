import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  type ColorRepresentation,
} from 'three';

export interface HolographicGridPlaneProps extends Omit<
  ThreeElements['mesh'],
  'args' | 'children' | 'geometry' | 'material'
> {
  /** Plane edge length in world units. */
  size?: number;
  /** Minor cell size in world units. */
  cell?: number;
  /** Minor cells per major line. */
  major?: number;
  color?: ColorRepresentation;
  opacity?: number;
  /** Distance from the centre where the grid has faded out. */
  fadeDistance?: number;
  /** 0–1 strength of the outward ripple. */
  ripple?: number;
  speed?: number;
  paused?: boolean;
}

const vertexShader = /* glsl */ `
  varying vec2 vPlane;
  void main() {
    vPlane = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uCell;
  uniform float uMajor;
  uniform float uFade;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uRipple;
  varying vec2 vPlane;

  // Anti-aliased grid lines whose width stays ~constant in screen space.
  float gridLine(vec2 coord, float width) {
    vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    return 1.0 - min(min(g.x, g.y) / width, 1.0);
  }

  void main() {
    float minor = gridLine(vPlane / uCell, 1.0);
    float major = gridLine(vPlane / (uCell * uMajor), 1.4);
    float d = length(vPlane);
    float fade = 1.0 - smoothstep(uFade * 0.15, uFade, d);
    float wave = 0.5 + 0.5 * sin(d * 1.1 - uTime * 1.6);
    float alpha = (minor * 0.26 + major * 0.8) * fade * mix(1.0, wave, uRipple);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** Shader floor grid with distance fade and an optional ripple; lies flat (XZ) by default. */
export function HolographicGridPlane({
  size = 60,
  cell = 0.5,
  major = 5,
  color = '#19dcff',
  opacity = 0.55,
  fadeDistance = 18,
  ripple = 0.35,
  speed = 1,
  paused = false,
  rotation = [-Math.PI / 2, 0, 0],
  ...props
}: HolographicGridPlaneProps) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uCell: { value: cell },
      uMajor: { value: major },
      uFade: { value: fadeDistance },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uRipple: { value: ripple },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    [uniforms],
  );

  useEffect(() => {
    uniforms.uColor.value.set(color);
    uniforms.uCell.value = cell;
    uniforms.uMajor.value = major;
    uniforms.uFade.value = fadeDistance;
    uniforms.uOpacity.value = opacity;
    uniforms.uRipple.value = ripple;
  }, [uniforms, color, cell, major, fadeDistance, opacity, ripple]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (!paused) uniforms.uTime.value += delta * speed;
  });

  return (
    <mesh {...props} rotation={rotation} material={material} renderOrder={-1}>
      <planeGeometry args={[size, size, 1, 1]} />
    </mesh>
  );
}
