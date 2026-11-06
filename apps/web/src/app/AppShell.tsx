import { HoloConfigProvider } from '@jarvis/ui';
import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQualityLevel } from '../store/settings';
import { Backdrop } from './Backdrop';
import { CommandDeck } from './CommandDeck';
import { ModeStage } from './ModeStage';
import { ModeWheel } from './ModeWheel';
import { NavRail } from './NavRail';
import { TopBar } from './TopBar';
import { useGlobalHotkeys } from './useGlobalHotkeys';

/** Layering: backdrop → active mode (full viewport) → floating chrome → overlays. */
export function AppShell() {
  useGlobalHotkeys();
  const quality = useQualityLevel();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.quality = quality;
    root.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [quality, reducedMotion]);

  return (
    <HoloConfigProvider reducedMotion={reducedMotion} quality={quality}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <div className="fixed inset-0 overflow-hidden bg-void text-holo-100">
          <Backdrop />
          <ModeStage />
          <TopBar />
          <NavRail />
          <CommandDeck />
          <ModeWheel />
        </div>
      </MotionConfig>
    </HoloConfigProvider>
  );
}
