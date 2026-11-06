import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  type ColorRepresentation,
} from 'three';
import { seededRandom } from './random';

export interface HolographicParticleFieldProps extends Omit<
  ThreeElements['points'],
  'args' | 'children' | 'geometry' | 'material'
> {
  count?: number;
  /** Spread of the field in world units. */
  radius?: number;
  shape?: 'sphere' | 'shell' | 'box';
  /** Base point size in px at ~10 units from the camera. */
  size?: number;
  color?: ColorRepresentation;
  opacity?: number;
  /** Drift speed multiplier. */
  speed?: number;
  seed?: number;
  paused?: boolean;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRadius;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float angle = uTime * (0.015 + aSeed * 0.04);
    float c = cos(angle);
    float s = sin(angle);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.3 + aSeed * 6.2831) * uRadius * 0.015;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = max(-mv.z, 0.001);
    gl_PointSize = uSize * (0.35 + aSeed) * uPixelRatio * (10.0 / depth);

    float twinkle = 0.55 + 0.45 * sin(uTime * (0.7 + aSeed * 2.0) + aSeed * 40.0);
    vAlpha = twinkle * (1.0 - smoothstep(uRadius * 0.9, uRadius * 2.4, depth));
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    alpha *= alpha;
    gl_FragColor = vec4(uColor, alpha * vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** GPU-animated ambient dust: drift, bob and twinkle all happen in the vertex shader. */
export function HolographicParticleField({
  count = 1200,
  radius = 12,
  shape = 'sphere',
  size = 2.2,
  color = '#19dcff',
  opacity = 0.7,
  speed = 1,
  seed = 7,
  paused = false,
  ...props
}: HolographicParticleFieldProps) {
  const geometry = useMemo(() => {
    const random = seededRandom(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      let z: number;
      if (shape === 'box') {
        x = (random() * 2 - 1) * radius;
        y = (random() * 2 - 1) * radius * 0.6;
        z = (random() * 2 - 1) * radius;
      } else {
        const u = random() * 2 - 1;
        const theta = random() * Math.PI * 2;
        const r =
          shape === 'shell' ? radius * (0.7 + random() * 0.3) : radius * Math.cbrt(random());
        const ring = Math.sqrt(1 - u * u);
        x = r * ring * Math.cos(theta);
        y = r * u;
        z = r * ring * Math.sin(theta);
      }
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      seeds[i] = random();
    }
    const buffer = new BufferGeometry();
    buffer.setAttribute('position', new BufferAttribute(positions, 3));
    buffer.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return buffer;
  }, [count, radius, shape, seed]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uRadius: { value: radius },
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
    }),
    // Created once; the effect below keeps values in sync.
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
        blending: AdditiveBlending,
      }),
    [uniforms],
  );

  useEffect(() => {
    uniforms.uSize.value = size;
    uniforms.uRadius.value = radius;
    uniforms.uColor.value.set(color);
    uniforms.uOpacity.value = opacity;
  }, [uniforms, size, radius, color, opacity]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    if (!paused) uniforms.uTime.value += delta * speed;
    uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return <points {...props} geometry={geometry} material={material} frustumCulled={false} />;
}
