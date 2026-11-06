import { HolographicButton, HolographicWindow } from '@jarvis/ui';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import { useElementSize } from '../../hooks/useElementSize';
import { HoloBackdropScene } from './HoloBackdropScene';
import { AmbientWindow } from './windows/AmbientWindow';
import { CardsWindow } from './windows/CardsWindow';
import { GlobeWindow } from './windows/GlobeWindow';
import { HudWindow } from './windows/HudWindow';
import { StreamWindow } from './windows/StreamWindow';
import { TerminalWindow } from './windows/TerminalWindow';
import { HOLO_WINDOWS, defaultLayout, useWorkspace, type HoloWindowId } from './workspace';

const CONTENT: Record<HoloWindowId, ComponentType> = {
  globe: GlobeWindow,
  hud: HudWindow,
  terminal: TerminalWindow,
  stream: StreamWindow,
  cards: CardsWindow,
  ambient: AmbientWindow,
};

/** MODE B — Holographic Environment: a spatial workspace of floating, draggable, resizable windows. */
export function HolographicMode() {
  const boundsRef = useRef<HTMLDivElement>(null);
  const bounds = useElementSize(boundsRef);
  const open = useWorkspace((state) => state.open);
  const order = useWorkspace((state) => state.order);
  const geometry = useWorkspace((state) => state.geometry);
  const layoutVersion = useWorkspace((state) => state.layoutVersion);
  const scanlines = useWorkspace((state) => state.ambient.scanlines);

  const layout = useMemo(
    () => (bounds.width > 0 ? defaultLayout(bounds.width, bounds.height) : null),
    // The default layout is only consulted when windows (re)mount: on first measure and on reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bounds.width > 0, layoutVersion],
  );

  useEffect(() => {
    useWorkspace.getState().setBounds(bounds);
  }, [bounds]);

  useEffect(() => {
    if (layout) useWorkspace.getState().seedGeometry(layout);
  }, [layout]);

  return (
    <div className="absolute inset-0">
      <HoloBackdropScene />
      {scanlines && (
        <div aria-hidden className="holo-scanlines pointer-events-none absolute inset-0 z-[1]" />
      )}
      <div
        ref={boundsRef}
        className="absolute bottom-[calc(var(--chrome-bottom)+3rem)] left-[calc(var(--chrome-left)+0.75rem)] right-3 top-[calc(var(--chrome-top)+0.75rem)]"
      >
        {layout &&
          HOLO_WINDOWS.filter((definition) => open[definition.id]).map((definition) => {
            const Content = CONTENT[definition.id];
            const Icon = definition.icon;
            return (
              <HolographicWindow
                key={`${definition.id}-${layoutVersion}`}
                title={definition.title}
                code={definition.code}
                icon={<Icon size={12} className="shrink-0 text-holo-300" />}
                initial={geometry[definition.id] ?? layout[definition.id]}
                minWidth={definition.minWidth}
                minHeight={definition.minHeight}
                boundsRef={boundsRef}
                zIndex={10 + order.indexOf(definition.id)}
                focused={order.at(-1) === definition.id}
                onFocus={() => useWorkspace.getState().focus(definition.id)}
                onClose={() => useWorkspace.getState().setOpen(definition.id, false)}
                onGeometryChange={(next) =>
                  useWorkspace.getState().setGeometry(definition.id, next)
                }
              >
                <Content />
              </HolographicWindow>
            );
          })}
      </div>
      <WindowDock />
    </div>
  );
}

function WindowDock() {
  const open = useWorkspace((state) => state.open);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--chrome-bottom)+0.5rem)] flex justify-center px-3 md:pl-[var(--chrome-left)]">
      <nav
        aria-label="Workspace windows"
        className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[3px] border border-holo-400/15 bg-void/65 px-2 py-1.5 backdrop-blur-md"
      >
        {HOLO_WINDOWS.map((definition) => {
          const Icon = definition.icon;
          return (
            <HolographicButton
              key={definition.id}
              size="xs"
              variant="ghost"
              active={open[definition.id]}
              icon={<Icon size={12} />}
              onClick={() => useWorkspace.getState().setOpen(definition.id, !open[definition.id])}
              title={`${open[definition.id] ? 'Close' : 'Open'} ${definition.title}`}
            >
              <span className="hidden xl:inline">{definition.title}</span>
            </HolographicButton>
          );
        })}
        <span aria-hidden className="mx-1 h-4 w-px bg-holo-400/20" />
        <HolographicButton
          size="xs"
          variant="ghost"
          icon={<RotateCcw size={12} />}
          onClick={() => useWorkspace.getState().resetLayout()}
        >
          Reset layout
        </HolographicButton>
      </nav>
    </div>
  );
}
