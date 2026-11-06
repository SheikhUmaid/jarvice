import type { Transition, Variants } from 'motion/react';

/** Expo-out: fast start, long settle — the house easing for holographic UI. */
export const HOLO_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const holoTransition: Transition = { duration: 0.45, ease: HOLO_EASE };

/**
 * Panel/window entrance: a top-down clip reveal with a slight lift. The clip is released when the
 * animation ends so glows, focus rings and overflow are never cut off afterwards.
 */
export const holoReveal: Variants = {
  hidden: { opacity: 0, y: 8, clipPath: 'inset(0% 0% 100% 0%)' },
  visible: {
    opacity: 1,
    y: 0,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: holoTransition,
    transitionEnd: { clipPath: 'none' },
  },
  exit: { opacity: 0, y: 4, transition: { duration: 0.18 } },
};

/** Fade + scale used for overlays (mode wheel, drawers' backdrops, toasts). */
export const holoPop: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: holoTransition },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.16 } },
};

/** Parent variant that staggers `holoItem` children. */
export function holoStagger(stagger = 0.045, delay = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

export const holoItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: holoTransition },
};
