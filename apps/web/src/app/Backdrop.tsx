import { HolographicGrid } from '@jarvis/ui';

/** Ambient background shared by every mode (pure CSS — no GPU cost beyond compositing). */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="app-backdrop absolute inset-0" />
      <HolographicGrid cell={32} major={4} opacity={0.22} fade="radial" />
      <HolographicGrid
        cell={48}
        major={4}
        opacity={0.35}
        perspective
        animate
        speed={14}
        fade="bottom"
        className="top-1/2"
      />
      <div className="app-vignette absolute inset-0" />
      <div className="app-noise absolute inset-0" />
    </div>
  );
}
