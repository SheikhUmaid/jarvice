import type { QualityLevel } from '@jarvis/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { detectDeviceQuality, isQualityLevel } from '../services/telemetry/quality';

export type QualitySetting = 'auto' | QualityLevel;
export type MotionSetting = 'system' | 'reduced' | 'full';

interface SettingsState {
  quality: QualitySetting;
  /** Device heuristic: the ceiling `auto` may climb back to. */
  deviceQuality: QualityLevel;
  /** What `auto` currently resolves to (tuned live by the renderer). */
  autoQuality: QualityLevel;
  /** Session-only override from `?quality=` (never persisted). */
  qualityOverride: QualityLevel | null;
  motion: MotionSetting;
  /** Optional form of address in responses (e.g. a name). Empty means none. */
  honorific: string;
  setQuality(quality: QualitySetting): void;
  setAutoQuality(quality: QualityLevel): void;
  setMotion(motion: MotionSetting): void;
  setHonorific(honorific: string): void;
}

const deviceQuality = detectDeviceQuality();
const urlQuality = new URLSearchParams(window.location.search).get('quality');

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      quality: 'auto',
      deviceQuality,
      autoQuality: deviceQuality,
      qualityOverride: isQualityLevel(urlQuality) ? urlQuality : null,
      motion: 'system',
      honorific: '',
      setQuality: (quality) => set({ quality, qualityOverride: null }),
      setAutoQuality: (autoQuality) => set({ autoQuality }),
      setMotion: (motion) => set({ motion }),
      setHonorific: (honorific) => set({ honorific: honorific.slice(0, 40) }),
    }),
    {
      name: 'jarvis.settings.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        quality: state.quality,
        motion: state.motion,
        honorific: state.honorific,
      }),
    },
  ),
);

export function selectQualityLevel(state: SettingsState): QualityLevel {
  if (state.qualityOverride) return state.qualityOverride;
  return state.quality === 'auto' ? state.autoQuality : state.quality;
}

export function useQualityLevel(): QualityLevel {
  return useSettings(selectQualityLevel);
}
