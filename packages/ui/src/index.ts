// @jarvis/ui — holographic design system (DOM/SVG). Three.js components: '@jarvis/ui/three'.
export { HoloConfigProvider, useHoloConfig } from './config';
export type { HoloConfig } from './config';
export { CornerBrackets } from './effects/CornerBrackets';
export {
  HOLO_EASE,
  holoItem,
  holoPop,
  holoReveal,
  holoStagger,
  holoTransition,
} from './effects/motion';
export { GLOW_CLASS, TONES, TONE_HEX, cssVars, toneStyle } from './tokens';
export type { GlowLevel, Tone } from './tokens';
export { clamp, cx, mod } from './utils';

export { HolographicButton } from './components/HolographicButton';
export type { HolographicButtonProps } from './components/HolographicButton';
export { HolographicDataStream, createHexSource } from './components/HolographicDataStream';
export type { HolographicDataStreamProps, StreamLine } from './components/HolographicDataStream';
export { HolographicGrid } from './components/HolographicGrid';
export type { HolographicGridProps } from './components/HolographicGrid';
export { HolographicPanel } from './components/HolographicPanel';
export type { HolographicPanelProps } from './components/HolographicPanel';
export { HolographicRadar } from './components/HolographicRadar';
export type { HolographicRadarProps, RadarBlip } from './components/HolographicRadar';
export { HolographicRing } from './components/HolographicRing';
export type { HolographicRingProps, RingArc, RingTicks } from './components/HolographicRing';
export { HolographicScanner } from './components/HolographicScanner';
export type { HolographicScannerProps } from './components/HolographicScanner';
export { HolographicTerminal } from './components/HolographicTerminal';
export type {
  HolographicTerminalProps,
  TerminalLine,
  TerminalLineKind,
} from './components/HolographicTerminal';
export { HolographicText } from './components/HolographicText';
export type { HolographicTextProps } from './components/HolographicText';
export { HolographicWindow } from './components/HolographicWindow';
export type { HolographicWindowProps, WindowGeometry } from './components/HolographicWindow';
