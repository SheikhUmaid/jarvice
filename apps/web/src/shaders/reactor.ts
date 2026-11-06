import { simplexNoise3D } from './noise';

/*
 * Reactor shaders. Colours are linear; every fragment shader ends with <colorspace_fragment> so
 * output is correct both when rendering to screen and into the post-processing composer. Values
 * above 1.0 are intentional: they feed the bloom pass.
 */

/** Passes local position and view-space normal/view vectors. */
export const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const uvVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Core: noise-displaced energy sphere ────────────────────────────────────────

export const coreVertex = /* glsl */ `
  uniform float uTime;
  uniform float uNoise;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vField;
  ${simplexNoise3D}
  void main() {
    vec3 n = normalize(normal);
    float field = snoise(position * 2.4 + vec3(0.0, uTime * 0.55, 0.0)) * 0.65
                + snoise(position * 5.5 - vec3(uTime * 0.8)) * 0.35;
    vec3 displaced = position + n * (field * uNoise + uPulse * 0.035);
    vField = field;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * n);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const coreFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uEnergy;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vField;
  void main() {
    float facing = max(dot(vNormal, vView), 0.0);
    float rim = pow(1.0 - facing, 2.4);
    float bands = 0.5 + 0.5 * sin(vField * 10.0 + uTime * 2.2);
    vec3 plasma = mix(uColor * 0.4, uAccent, smoothstep(0.25, 0.95, bands) * 0.6);
    vec3 color = plasma * (0.55 + 0.45 * uEnergy);
    color += uAccent * rim * 1.7 * uEnergy;
    color += vec3(1.0) * pow(facing, 7.0) * 1.15 * uEnergy;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

// ── Halo: camera-facing soft glow (works without bloom) ───────────────────────

export const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float glow = pow(1.0 - clamp(r, 0.0, 1.0), 3.0);
    gl_FragColor = vec4(uColor * uIntensity, glow * uIntensity);
    #include <colorspace_fragment>
  }
`;

// ── Flat HUD rings: segments, arcs, sweep highlight and execution chase ───────

export const ringVertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uOpacity;
  uniform float uInner;
  uniform float uOuter;
  uniform float uSegments;
  uniform float uGap;
  uniform float uArc;
  uniform float uSweepSpeed;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uScan;
  uniform float uExec;
  uniform float uChase;
  varying vec2 vPos;
  const float TAU = 6.28318530718;

  void main() {
    float angle = fract(atan(vPos.y, vPos.x) / TAU + 1.0);
    if (angle > uArc) discard;

    float segmentIndex = 0.0;
    if (uSegments > 0.5) {
      float f = angle * uSegments;
      segmentIndex = floor(f);
      if (fract(f) < uGap) discard;
    }

    float t = (length(vPos) - uInner) / max(uOuter - uInner, 1e-4);
    float edge = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.8, 1.0, t));

    float head = fract(angle - uTime * uSweepSpeed);
    float sweep = pow(1.0 - head, 10.0) * (0.3 + uScan) * step(0.001, uSweepSpeed);

    float chase = 0.0;
    if (uChase > 0.5 && uSegments > 0.5) {
      float lead = mod(uTime * 9.0, uSegments);
      float behind = mod(lead - segmentIndex + uSegments, uSegments);
      chase = exp(-behind * 0.45) * uExec;
    }

    vec3 color = uColor * (0.55 + 0.6 * uEnergy) + uColor * sweep * 1.6;
    color = mix(color, uAccent * 2.1, clamp(chase, 0.0, 1.0));
    float alpha = edge * uOpacity * (0.5 + 0.5 * uEnergy + sweep + chase);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

// ── Orbit particles: positions computed entirely on the GPU ───────────────────

export const orbitVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSpread;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uAudio;
  uniform float uEnergy;
  attribute float aRadius;
  attribute float aSpeed;
  attribute float aPhase;
  attribute vec2 aTilt;
  attribute float aSize;
  attribute float aMix;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float angle = aPhase + uTime * aSpeed;
    float wobble = 1.0 + uAudio * 0.2 * sin(aPhase * 5.0 + uTime * 6.0);
    float r = aRadius * uSpread * wobble;
    vec3 p = vec3(cos(angle) * r, sin(angle) * r, 0.0);

    float cx = cos(aTilt.x);
    float sx = sin(aTilt.x);
    p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
    float cy = cos(aTilt.y);
    float sy = sin(aTilt.y);
    p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aSize * uPixelRatio * (7.0 / max(-mv.z, 0.001));
    vAlpha = (0.35 + 0.65 * fract(aPhase * 7.31)) * (0.55 + 0.5 * uEnergy);
    vMix = aMix;
  }
`;

export const orbitFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    a *= a;
    gl_FragColor = vec4(mix(uColor, uAccent, vMix) * 1.4, a * vAlpha);
    #include <colorspace_fragment>
  }
`;

// ── Energy pulse: expanding shockwave ring ─────────────────────────────────────

export const pulseFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uProgress;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    float ring = exp(-pow((r - 0.95) / 0.035, 2.0));
    float fill = smoothstep(0.35, 0.95, r) * (1.0 - step(0.95, r)) * 0.07;
    float fade = 1.0 - uProgress;
    float alpha = (ring + fill) * fade * fade * uStrength;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * 1.6, alpha);
    #include <colorspace_fragment>
  }
`;

// ── Thinking: rotating radar sweep and vertical scan line ─────────────────────

export const sweepFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uScan;
  varying vec2 vUv;
  const float TAU = 6.28318530718;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p) * 2.2;
    float angle = fract(atan(p.y, p.x) / TAU + 1.0);
    float behind = fract(fract(uTime * 0.42) - angle);
    float wedge = pow(1.0 - behind, 14.0);
    float band = smoothstep(0.62, 0.78, r) * (1.0 - smoothstep(1.7, 2.15, r));
    float alpha = wedge * band * uScan * 0.55;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * 1.7, alpha);
    #include <colorspace_fragment>
  }
`;

export const scanLineFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uScan;
  varying vec2 vUv;
  void main() {
    float y = vUv.y - 0.5;
    float line = exp(-y * y / 0.00035);
    float glow = exp(-abs(y) * 9.0) * 0.18;
    float sides = smoothstep(0.0, 0.25, vUv.x) * (1.0 - smoothstep(0.75, 1.0, vUv.x));
    float alpha = (line + glow) * sides * uScan;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * 1.8, alpha);
    #include <colorspace_fragment>
  }
`;

// ── Executing: amber data spikes radiating from the outer ring ────────────────

export const spikeVertex = /* glsl */ `
  uniform float uTime;
  uniform float uExec;
  attribute float aAngle;
  attribute float aEnd;
  attribute float aSeed;
  varying float vEnd;
  void main() {
    float beat = pow(0.5 + 0.5 * sin(uTime * (3.0 + aSeed * 4.0) + aSeed * 30.0), 3.0);
    float len = (0.06 + 0.34 * beat) * uExec;
    float r = 1.66 + aEnd * len;
    vEnd = aEnd;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(cos(aAngle) * r, sin(aAngle) * r, 0.0, 1.0);
  }
`;

export const spikeFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uExec;
  varying float vEnd;
  void main() {
    float a = mix(0.95, 0.05, vEnd) * uExec;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uAccent * 2.0, a);
    #include <colorspace_fragment>
  }
`;

// ── Projector base: floor emitter and rising light cone ───────────────────────

export const baseFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uEnergy;
  varying vec2 vUv;
  const float TAU = 6.28318530718;
  void main() {
    vec2 p = (vUv - 0.5) * 5.0;
    float r = length(p);
    float angle = atan(p.y, p.x);
    float rings = exp(-pow((r - 0.9) / 0.014, 2.0)) * 0.9;
    rings += exp(-pow((r - 1.35) / 0.011, 2.0)) * 0.6 * step(0.45, fract(angle * 6.0 / TAU + uTime * 0.04));
    rings += exp(-pow((r - 1.8) / 0.009, 2.0)) * 0.45;
    float ticks = step(0.9, fract(angle * 60.0 / TAU)) * exp(-pow((r - 2.05) / 0.045, 2.0)) * 0.55;
    float glow = exp(-r * 1.7) * 0.5;
    float alpha = (rings + ticks + glow) * (0.55 + 0.5 * uEnergy) * (1.0 - smoothstep(2.1, 2.5, r));
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * 1.3, alpha);
    #include <colorspace_fragment>
  }
`;

export const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uEnergy;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    float h = vUv.y;
    float fade = (1.0 - h) * (1.0 - h);
    float edge = pow(1.0 - abs(dot(vNormal, vView)), 1.4);
    float streak = 0.6 + 0.4 * sin(vUv.x * 80.0 + uTime * 0.5) * sin(vUv.x * 23.0 - uTime * 0.35);
    float rise = 0.65 + 0.35 * sin(h * 16.0 - uTime * 2.2);
    float alpha = fade * (0.05 + edge * 0.3) * streak * rise * (0.55 + 0.5 * uEnergy);
    gl_FragColor = vec4(uColor * 1.3, alpha);
    #include <colorspace_fragment>
  }
`;
