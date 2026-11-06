import { MODES, type ModeId, type ModeMeta } from '@jarvis/shared';
import {
  Atom,
  Camera,
  Cpu,
  Earth,
  FlaskConical,
  Layers,
  ScanEye,
  ScreenShare,
  type LucideIcon,
} from 'lucide-react';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** online: complete for this milestone · preview: partially built · standby: planned for a later milestone. */
export type ModeStatus = 'online' | 'preview' | 'standby';

export interface ModeDefinition extends ModeMeta {
  icon: LucideIcon;
  status: ModeStatus;
  /** Keyboard shortcut (1–8). */
  hotkey: string;
  /** Capabilities from the specification, shown on the module screen. */
  capabilities: readonly string[];
  /** Planned technology. */
  stack: readonly string[];
  /** Privacy guarantees the module will uphold. */
  privacy: readonly string[];
  component: LazyExoticComponent<ComponentType>;
}

type ModeDetails = Omit<ModeDefinition, keyof ModeMeta | 'hotkey'>;

const DETAILS: Record<ModeId, ModeDetails> = {
  command: {
    icon: Atom,
    status: 'online',
    capabilities: [
      'Text commands with history and a local command layer',
      'Five-state reactor driven by the real assistant pipeline',
      'Live microphone visualisation (speech recognition: Milestone 3)',
      'Claude reasoning, streaming and tool calls (Milestone 4)',
    ],
    stack: ['React Three Fiber', 'GLSL shaders', 'Postprocessing bloom', 'Web Audio API'],
    privacy: ['Microphone audio is analysed in memory and never recorded or sent anywhere'],
    component: lazy(() =>
      import('./command/CommandMode').then((m) => ({ default: m.CommandMode })),
    ),
  },
  holographic: {
    icon: Layers,
    status: 'preview',
    capabilities: [
      'Draggable, resizable holographic windows',
      'Interactive circular HUD and radar',
      'Rotating globe, telemetry streams and 3D information cards',
      'Holographic terminal with local commands',
      'Configurable ambient effects',
    ],
    stack: ['@jarvis/ui component library', 'React Three Fiber', 'CSS 3D transforms'],
    privacy: [],
    component: lazy(() =>
      import('./holographic/HolographicMode').then((m) => ({ default: m.HolographicMode })),
    ),
  },
  vision: {
    icon: ScanEye,
    status: 'standby',
    capabilities: [
      'Upload or drop images; zoom, pan, compare and export',
      'Grayscale, blur, sharpen, edges, Canny, threshold, contours, segmentation',
      'Colour extraction, histograms, resize, rotate, enhance, background removal',
      'Claude vision: describe, read text, explain diagrams, find defects, compare',
      'Bounding boxes, labels, confidence scores and timings',
    ],
    stack: [
      'OpenCV.js in a Web Worker (lazy, ~10 MB)',
      'Tesseract.js OCR worker',
      'Claude vision via the backend',
    ],
    privacy: [
      'Images are processed on this device; they reach Claude only when you ask',
      'Face detection never becomes identification of people',
    ],
    component: lazy(() => import('./vision/VisionMode').then((m) => ({ default: m.VisionMode }))),
  },
  'live-vision': {
    icon: Camera,
    status: 'standby',
    capabilities: [
      'Camera permission handling with a permanent live indicator',
      'Object and face detection, face and hand landmarks',
      'Gesture recognition, pose estimation and object tracking',
      'Pause, resume and frame capture; FPS and overlays',
      '“What am I looking at?” — selected frames go to Claude',
    ],
    stack: [
      'MediaPipe Tasks Vision (GPU delegate)',
      'Canvas/WebGL overlays',
      '640×480 at up to 30 fps',
    ],
    privacy: [
      'The camera never starts without your click',
      'Detection runs locally; frames are never stored unless you save them',
    ],
    component: lazy(() =>
      import('./live-vision/LiveVisionMode').then((m) => ({ default: m.LiveVisionMode })),
    ),
  },
  'screen-intelligence': {
    icon: ScreenShare,
    status: 'standby',
    capabilities: [
      'Share a screen or a single window',
      'Screenshot analysis and OCR',
      'UI understanding, error-message and code-screenshot explanations',
    ],
    stack: ['getDisplayMedia', 'Tesseract.js', 'Claude vision'],
    privacy: [
      'Capture starts only through the browser’s share dialog and stops when you end sharing',
      'Screenshots stay in memory unless you save them',
    ],
    component: lazy(() =>
      import('./screen-intelligence/ScreenIntelligenceMode').then((m) => ({
        default: m.ScreenIntelligenceMode,
      })),
    ),
  },
  spatial: {
    icon: Earth,
    status: 'preview',
    capabilities: [
      'Interactive 3D Earth with zoom and rotation',
      'Geographic markers and live coordinate read-out',
      'Planetary objects, orbit visualisation, 3D model viewer (GLB/GLTF/OBJ)',
      'Spatial data panels',
    ],
    stack: ['Three.js', 'Natural Earth (world-atlas)', 'OrbitControls'],
    privacy: ['No geolocation is requested; the time-zone meridian comes from your clock'],
    component: lazy(() =>
      import('./spatial/SpatialMode').then((m) => ({ default: m.SpatialMode })),
    ),
  },
  system: {
    icon: Cpu,
    status: 'preview',
    capabilities: [
      'CPU, memory, disk and network interfaces',
      'Uptime, running processes and system information',
      'Application launcher for approved apps',
    ],
    stack: ['Local agent on 127.0.0.1', 'systeminformation', 'Pairing token + allowlists'],
    privacy: ['No invented numbers: host metrics appear only when the paired agent reports them'],
    component: lazy(() => import('./system/SystemMode').then((m) => ({ default: m.SystemMode }))),
  },
  laboratory: {
    icon: FlaskConical,
    status: 'standby',
    capabilities: [
      'Claude model configuration',
      'Prompt editor and conversation experiments',
      'Tool-call inspector and execution history',
      'Memory viewer and image-analysis lab',
      'Streaming view, token and usage reporting',
    ],
    stack: [
      '@anthropic-ai/sdk (backend only)',
      'claude-opus-5-5 by default',
      'Streaming over WebSocket',
    ],
    privacy: ['API keys live on the backend only — never in the browser or logs'],
    component: lazy(() =>
      import('./laboratory/LaboratoryMode').then((m) => ({ default: m.LaboratoryMode })),
    ),
  },
};

export const MODE_REGISTRY: readonly ModeDefinition[] = MODES.map((meta, index) => ({
  ...meta,
  ...DETAILS[meta.id],
  hotkey: String(index + 1),
}));

export function getMode(id: ModeId): ModeDefinition {
  const mode = MODE_REGISTRY.find((entry) => entry.id === id);
  if (!mode) throw new Error(`Unknown mode: ${id}`);
  return mode;
}

export const STATUS_TONE = { online: 'cyan', preview: 'ice', standby: 'amber' } as const;

export function statusLabel(mode: ModeDefinition): string {
  return mode.status === 'online'
    ? 'Online'
    : mode.status === 'preview'
      ? `Preview · M${mode.milestone}`
      : `Standby · M${mode.milestone}`;
}
