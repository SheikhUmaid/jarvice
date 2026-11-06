import { useSettings } from '../store/settings';
import { useMediaQuery } from './useMediaQuery';

/** Effective reduced-motion preference: the in-app setting, falling back to the OS preference. */
export function useReducedMotion(): boolean {
  const motion = useSettings((state) => state.motion);
  const system = useMediaQuery('(prefers-reduced-motion: reduce)');
  return motion === 'reduced' || (motion === 'system' && system);
}
