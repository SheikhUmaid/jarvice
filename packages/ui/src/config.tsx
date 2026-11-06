import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface HoloConfig {
  /** When true, decorative animation is paused and text effects resolve instantly. */
  reducedMotion: boolean;
  quality: 'low' | 'medium' | 'high';
}

const systemPrefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const HoloConfigContext = createContext<HoloConfig>({
  reducedMotion: systemPrefersReducedMotion,
  quality: 'medium',
});

export function HoloConfigProvider({
  reducedMotion,
  quality,
  children,
}: HoloConfig & { children: ReactNode }) {
  const value = useMemo(() => ({ reducedMotion, quality }), [reducedMotion, quality]);
  return <HoloConfigContext value={value}>{children}</HoloConfigContext>;
}

export function useHoloConfig(): HoloConfig {
  return useContext(HoloConfigContext);
}
