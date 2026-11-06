# JARVIS design system (`@jarvis/ui`)

Holographic, restrained, legible. Almost-black surfaces, electric cyan light, amber only for
warnings and execution. Effects mean something: glow marks focus or activity, motion marks state.

## Tokens

Defined in [packages/ui/src/styles/holo.css](../packages/ui/src/styles/holo.css) as a Tailwind v4
`@theme`, so every token is also a utility (`bg-void`, `text-holo-200`, `font-display`…).

| Group | Tokens |
| --- | --- |
| Surfaces | `void` #010307 · `abyss` #030914 · `navy-950…700` |
| Light | `holo-50…950` (electric cyan scale, `holo-400` = #19dcff) · `ice` #bfefff |
| Status | `amber-hud` warnings/execution · `alert` errors/live capture · `ok` success |
| Type | `font-display` Orbitron (labels, titles) · `font-sans` Rajdhani (UI, prose) · `font-mono` JetBrains Mono (data) |
| Motion | `ease-holo` (expo-out) · `HOLO_EASE`, `holoReveal`, `holoPop`, `holoStagger`/`holoItem` in `effects/motion.ts` |

## Tones

Every component takes `tone?: 'cyan' | 'ice' | 'amber' | 'alert' | 'ok'`. The tone is exposed as
`--tone` (an `r g b` triplet), and all effects are written once as `rgb(var(--tone) / α)`:

```tsx
<div style={toneStyle('amber')} className="border-[rgb(var(--tone)/0.4)]" />
```

## Global switches

| Attribute on `<html>` | Effect |
| --- | --- |
| `data-quality="low"` | Panels become more opaque and drop backdrop blur |
| `data-motion="reduced"` | Decorative loops (spins, sweeps, scrolling grids, cursors) pause |

`<HoloConfigProvider reducedMotion quality>` gives components the same information in JS (text
effects resolve instantly, scanners hide).

## Components

| Component | Purpose | Key props |
| --- | --- | --- |
| `HolographicPanel` | Glass container with corner brackets and header | `title`, `code`, `icon`, `actions`, `glow`, `scanlines`, `collapsible`, `reveal`, `padded` |
| `HolographicWindow` | Floating panel: drag, resize, keyboard move/resize, focus stacking | `initial`, `boundsRef`, `minWidth/Height`, `zIndex`, `focused`, `onFocus`, `onClose`, `onGeometryChange` |
| `HolographicButton` | Chamfered button with sheen, toggle and loading states | `variant` solid/outline/ghost, `size`, `active` (aria-pressed), `loading`, `icon`, `iconOnly`, `shortcut` |
| `HolographicRing` | SVG ring: dashes, ticks, arcs, progress, rotation | `radius`, `thickness`, `segments`, `gap`, `ticks`, `arcs`, `progress`, `spin` |
| `HolographicRadar` | Conic sweep with phase-locked blips | `size`, `sweep`, `blips`, `showLabels` |
| `HolographicGrid` | CSS grid, flat or perspective floor, optional scroll | `cell`, `major`, `perspective`, `animate`, `fade` |
| `HolographicText` | Decode/typewriter text, accessible final text | `text`, `effect`, `duration`, `glow`, `cursor` |
| `HolographicDataStream` | Monospace feed, controlled or generated | `lines` or `source`, `interval`, `maxLines` |
| `HolographicScanner` | Scanning beam overlay | `direction`, `duration`, `intensity` |
| `HolographicTerminal` | Terminal with history, highlighting, typewriter output | `lines`, `onSubmit`, `prompt`, `busy` |
| `HolographicParticleField` *(three)* | GPU-animated ambient particles | `count`, `radius`, `shape`, `size`, `opacity`, `speed` |
| `HolographicGlobe` *(three)* | Earth with coastlines, graticule, markers, arcs, hover coordinates | `markers`, `arcs`, `meridian`, `focusLongitude`, `autoRotate`, `onHover` |
| `HolographicGridPlane` *(three)* | Shader floor grid with distance fade and ripple | `cell`, `major`, `fadeDistance`, `ripple` |

DOM components import from `@jarvis/ui`; Three.js components from `@jarvis/ui/three` (so pages
without 3D never load Three.js).

## Guidelines

- **Real data only.** If a value isn't measured, don't display it; label illustrative content
  `SAMPLE`.
- **Glow is a signal.** Default panels use `glow="soft"`; `strong` is for the focused or active
  element. Amber means "something is executing or needs attention".
- **No per-frame React renders.** Drive animation from CSS, shaders or refs (`useAnimationFrame`,
  `LiveValue`); keep React state for discrete changes.
- **Every animation respects reduced motion.** CSS loops pause via `data-motion`; JS effects check
  `useHoloConfig().reducedMotion`.
- **Accessible by default.** Visible focus, `aria-pressed` on toggles, `role="log"` on streams and
  transcripts, screen-reader text for animated labels.
