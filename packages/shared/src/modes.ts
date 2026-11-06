/** The eight interface modes, in navigation order (hotkeys 1–8). */
export const MODE_IDS = [
  'command',
  'holographic',
  'vision',
  'live-vision',
  'screen-intelligence',
  'spatial',
  'system',
  'laboratory',
] as const;

export type ModeId = (typeof MODE_IDS)[number];

export interface ModeMeta {
  id: ModeId;
  /** Letter used in the specification (MODE A … MODE H). */
  code: string;
  title: string;
  shortTitle: string;
  summary: string;
  /** Milestone that delivers the complete mode. */
  milestone: number;
}

export const MODES: readonly ModeMeta[] = [
  {
    id: 'command',
    code: 'A',
    title: 'Command Centre',
    shortTitle: 'Command',
    summary: 'Conversational core — voice, text, tools and the reactor.',
    milestone: 1,
  },
  {
    id: 'holographic',
    code: 'B',
    title: 'Holographic Environment',
    shortTitle: 'Holo',
    summary: 'Floating panels, circular HUD, globe and terminal in a spatial workspace.',
    milestone: 2,
  },
  {
    id: 'vision',
    code: 'C',
    title: 'Vision Laboratory',
    shortTitle: 'Vision',
    summary: 'Image processing, OCR and Claude-powered image understanding.',
    milestone: 5,
  },
  {
    id: 'live-vision',
    code: 'D',
    title: 'Live Vision',
    shortTitle: 'Live',
    summary: 'On-device webcam detection, landmarks, gestures and pose.',
    milestone: 6,
  },
  {
    id: 'screen-intelligence',
    code: 'E',
    title: 'Screen Intelligence',
    shortTitle: 'Screen',
    summary: 'Shared-screen OCR, error analysis and visual assistance.',
    milestone: 7,
  },
  {
    id: 'spatial',
    code: 'F',
    title: 'Spatial Environment',
    shortTitle: 'Spatial',
    summary: 'Interactive globe, coordinates, orbits and 3D models.',
    milestone: 10,
  },
  {
    id: 'system',
    code: 'G',
    title: 'System Monitor',
    shortTitle: 'System',
    summary: 'Real machine telemetry and approved launchers via the local agent.',
    milestone: 8,
  },
  {
    id: 'laboratory',
    code: 'H',
    title: 'AI Laboratory',
    shortTitle: 'AI Lab',
    summary: 'Model configuration, prompt editor, tool inspector and usage.',
    milestone: 4,
  },
];

export const DEFAULT_MODE: ModeId = 'command';

export function isModeId(value: unknown): value is ModeId {
  return typeof value === 'string' && (MODE_IDS as readonly string[]).includes(value);
}

export function getModeMeta(id: ModeId): ModeMeta {
  const meta = MODES.find((mode) => mode.id === id);
  if (!meta) throw new Error(`Unknown mode: ${id}`);
  return meta;
}
