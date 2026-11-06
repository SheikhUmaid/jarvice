import type { WindowGeometry } from '@jarvis/ui';
import {
  Earth,
  LayoutGrid,
  Radar,
  SlidersHorizontal,
  Terminal,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { create } from 'zustand';

export type HoloWindowId = 'globe' | 'hud' | 'terminal' | 'stream' | 'cards' | 'ambient';

export interface HoloWindowDefinition {
  id: HoloWindowId;
  title: string;
  code: string;
  icon: LucideIcon;
  minWidth: number;
  minHeight: number;
  /** Default placement as fractions of the workspace (x, y, width, height). */
  frame: [number, number, number, number];
}

export const HOLO_WINDOWS: readonly HoloWindowDefinition[] = [
  {
    id: 'globe',
    title: 'Orbital globe',
    code: 'GEO-01',
    icon: Earth,
    minWidth: 240,
    minHeight: 220,
    frame: [0, 0.02, 0.3, 0.52],
  },
  {
    id: 'hud',
    title: 'Workspace radar',
    code: 'HUD-02',
    icon: Radar,
    minWidth: 240,
    minHeight: 240,
    frame: [0.345, 0, 0.3, 0.52],
  },
  {
    id: 'terminal',
    title: 'Holo terminal',
    code: 'TTY-03',
    icon: Terminal,
    minWidth: 280,
    minHeight: 180,
    frame: [0.69, 0.04, 0.31, 0.5],
  },
  {
    id: 'stream',
    title: 'Telemetry stream',
    code: 'DAT-04',
    icon: Waves,
    minWidth: 240,
    minHeight: 150,
    frame: [0.01, 0.6, 0.26, 0.4],
  },
  {
    id: 'cards',
    title: 'Information cards',
    code: 'INF-05',
    icon: LayoutGrid,
    minWidth: 300,
    minHeight: 180,
    frame: [0.3, 0.58, 0.42, 0.42],
  },
  {
    id: 'ambient',
    title: 'Ambient controls',
    code: 'ENV-06',
    icon: SlidersHorizontal,
    minWidth: 220,
    minHeight: 170,
    frame: [0.75, 0.6, 0.25, 0.4],
  },
];

export function getHoloWindow(id: HoloWindowId): HoloWindowDefinition {
  const definition = HOLO_WINDOWS.find((entry) => entry.id === id);
  if (!definition) throw new Error(`Unknown window ${id}`);
  return definition;
}

/** Default layout for a workspace of `width`×`height` px (a cascade on small screens). */
export function defaultLayout(width: number, height: number): Record<HoloWindowId, WindowGeometry> {
  // The spread layout keeps every window above its minimum size down to ~820×440.
  const wide = width >= 820 && height >= 440;
  return Object.fromEntries(
    HOLO_WINDOWS.map((definition, index) => {
      if (wide) {
        const [x, y, w, h] = definition.frame;
        return [
          definition.id,
          { x: x * width, y: y * height, width: w * width, height: h * height },
        ];
      }
      const w = Math.min(width, 420);
      const h = Math.min(height, 330);
      return [
        definition.id,
        {
          x: Math.min(index * 16, Math.max(0, width - w)),
          y: Math.min(index * 30, Math.max(0, height - h)),
          width: w,
          height: h,
        },
      ];
    }),
  ) as Record<HoloWindowId, WindowGeometry>;
}

export interface AmbientSettings {
  particles: boolean;
  grid: boolean;
  panels: boolean;
  scanlines: boolean;
  drift: boolean;
  /** 0–1 */
  intensity: number;
}

interface WorkspaceState {
  open: Record<HoloWindowId, boolean>;
  /** Stacking order; the last id is on top. */
  order: HoloWindowId[];
  geometry: Partial<Record<HoloWindowId, WindowGeometry>>;
  bounds: { width: number; height: number };
  /** Bumped by resetLayout so windows remount at their default positions. */
  layoutVersion: number;
  ambient: AmbientSettings;
  setOpen(id: HoloWindowId, open: boolean): void;
  focus(id: HoloWindowId): void;
  setGeometry(id: HoloWindowId, geometry: WindowGeometry): void;
  seedGeometry(layout: Record<HoloWindowId, WindowGeometry>): void;
  setBounds(bounds: { width: number; height: number }): void;
  resetLayout(): void;
  setAmbient(patch: Partial<AmbientSettings>): void;
}

const ALL_OPEN = Object.fromEntries(HOLO_WINDOWS.map((w) => [w.id, true])) as Record<
  HoloWindowId,
  boolean
>;

/** Holographic workspace state — survives leaving and re-entering the mode. */
export const useWorkspace = create<WorkspaceState>((set) => ({
  open: ALL_OPEN,
  order: HOLO_WINDOWS.map((w) => w.id),
  geometry: {},
  bounds: { width: 0, height: 0 },
  layoutVersion: 0,
  ambient: {
    particles: true,
    grid: true,
    panels: true,
    scanlines: false,
    drift: true,
    intensity: 0.7,
  },
  setOpen: (id, open) =>
    set((state) => ({
      open: { ...state.open, [id]: open },
      order: open ? [...state.order.filter((entry) => entry !== id), id] : state.order,
    })),
  focus: (id) =>
    set((state) =>
      state.order.at(-1) === id
        ? state
        : { order: [...state.order.filter((entry) => entry !== id), id] },
    ),
  setGeometry: (id, geometry) =>
    set((state) => ({ geometry: { ...state.geometry, [id]: geometry } })),
  seedGeometry: (layout) => set((state) => ({ geometry: { ...layout, ...state.geometry } })),
  setBounds: (bounds) => set({ bounds }),
  resetLayout: () =>
    set((state) => ({ geometry: {}, open: ALL_OPEN, layoutVersion: state.layoutVersion + 1 })),
  setAmbient: (patch) => set((state) => ({ ambient: { ...state.ambient, ...patch } })),
}));
