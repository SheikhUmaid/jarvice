import type { CSSProperties } from 'react';

/** Accent tones as "r g b" triplets, consumed in CSS as `rgb(var(--tone) / <alpha>)`. */
export const TONES = {
  cyan: '25 220 255',
  ice: '191 239 255',
  amber: '255 179 71',
  alert: '255 77 109',
  ok: '77 255 195',
} as const;

export type Tone = keyof typeof TONES;

/** Hex equivalents for Three.js materials and canvas drawing. */
export const TONE_HEX: Record<Tone, string> = {
  cyan: '#19dcff',
  ice: '#bfefff',
  amber: '#ffb347',
  alert: '#ff4d6d',
  ok: '#4dffc3',
};

export type GlowLevel = 'none' | 'soft' | 'medium' | 'strong';

export const GLOW_CLASS: Record<GlowLevel, string> = {
  none: '',
  soft: 'holo-glow-soft',
  medium: 'holo-glow-medium',
  strong: 'holo-glow-strong',
};

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

/** Returns `style` with the tone exposed as `--tone`; an explicit `--tone` in `style` wins. */
export function toneStyle(tone: Tone = 'cyan', style?: CSSProperties): CSSProperties {
  const vars: CssVars = { '--tone': TONES[tone], ...style };
  return vars;
}

/** Typed helper for inline CSS custom properties. */
export function cssVars(
  vars: Record<`--${string}`, string | number>,
  style?: CSSProperties,
): CSSProperties {
  const merged: CssVars = { ...style, ...vars };
  return merged;
}
