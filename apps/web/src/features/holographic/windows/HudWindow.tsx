import { HolographicRadar, HolographicRing, type RadarBlip } from '@jarvis/ui';
import { useMemo, useRef, type PointerEvent } from 'react';
import { useElementSize } from '../../../hooks/useElementSize';
import { HOLO_WINDOWS, useWorkspace } from '../workspace';

/**
 * Interactive circular HUD. Blips are the other open windows, positioned by where they sit in the
 * workspace (drag a window and its contact moves). The reticle reports bearing and range.
 */
export function HudWindow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const { width, height } = useElementSize(containerRef);
  const size = Math.max(120, Math.min(width, height - 28) - 56);
  const geometry = useWorkspace((state) => state.geometry);
  const open = useWorkspace((state) => state.open);
  const bounds = useWorkspace((state) => state.bounds);

  const blips = useMemo<RadarBlip[]>(() => {
    if (!bounds.width || !bounds.height) return [];
    const cx = bounds.width / 2;
    const cy = bounds.height / 2;
    return HOLO_WINDOWS.filter(
      (definition) => definition.id !== 'hud' && open[definition.id],
    ).flatMap((definition) => {
      const g = geometry[definition.id];
      if (!g) return [];
      const dx = (g.x + g.width / 2 - cx) / cx;
      const dy = (g.y + g.height / 2 - cy) / cy;
      const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const distance = Math.min(1, 0.12 + Math.hypot(dx, dy) / 1.5);
      return [
        {
          id: definition.id,
          angle,
          distance,
          label: definition.code,
          tone: definition.id === 'ambient' ? 'amber' : 'cyan',
        },
      ];
    });
  }, [geometry, open, bounds]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const bearing = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const range = Math.min(1, Math.hypot(dx, dy) / (rect.width / 2));
    if (reticleRef.current) {
      reticleRef.current.style.opacity = range <= 1 ? '1' : '0';
      reticleRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    if (readoutRef.current) {
      readoutRef.current.textContent = `BRG ${bearing.toFixed(0).padStart(3, '0')}°  RNG ${range.toFixed(2)}`;
    }
  };

  const onPointerLeave = () => {
    if (reticleRef.current) reticleRef.current.style.opacity = '0';
    if (readoutRef.current) readoutRef.current.textContent = 'BRG ---°  RNG ----';
  };

  return (
    <div ref={containerRef} className="relative grid h-full place-items-center pb-6">
      {width > 0 && (
        <div
          className="relative cursor-crosshair"
          style={{ width: size, height: size }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <HolographicRing
            size={size + 44}
            radius={49}
            thickness={0.25}
            ticks={{ count: 72, length: 1.4, majorEvery: 6, majorLength: 3, opacity: 0.6 }}
            spin={60}
            className="pointer-events-none absolute -left-[22px] -top-[22px]"
          />
          <HolographicRing
            size={size + 22}
            radius={49}
            thickness={0.6}
            arcs={[
              { start: -30, end: 30, tone: 'amber' },
              { start: 150, end: 210 },
            ]}
            opacity={0.3}
            spin={-24}
            className="pointer-events-none absolute -left-[11px] -top-[11px]"
          />
          <HolographicRadar
            size={size}
            blips={blips}
            showLabels
            sweep={4.5}
            label={`Workspace radar: ${blips.length} windows tracked`}
          />
          <div
            ref={reticleRef}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-3 -mt-3 h-6 w-6 opacity-0 transition-opacity"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-full w-full text-ice drop-shadow-[0_0_6px_rgb(191_239_255)]"
            >
              <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M12 0v7M12 17v7M0 12h7M17 12h7" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[10px] text-holo-300/75">
        <span ref={readoutRef}>BRG ---° RNG ----</span>
        <span>{blips.length} contacts</span>
      </div>
    </div>
  );
}
