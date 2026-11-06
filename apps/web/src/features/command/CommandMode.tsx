import { HOLO_EASE } from '@jarvis/ui';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { ReactorGlyph } from '../../components/ReactorGlyph';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getWebGLInfo } from '../../services/telemetry/webgl';
import { selectReactorState, useCore } from '../../store/core';
import { useUi } from '../../store/ui';
import { LeftPanel } from './LeftPanel';
import { ReactorHud, StatusLine } from './ReactorHud';
import { ReactorStage } from './ReactorStage';
import { RightPanel } from './RightPanel';
import { Transcript } from './Transcript';

/**
 * MODE A — Command Centre. The WebGL stage fills the viewport behind the layout; the reactor is
 * projected into the centre slot. Side panels become drawers below 1280 px (left) / 1024 px (right).
 */
export function CommandMode() {
  const slotRef = useRef<HTMLDivElement>(null);
  const xl = useMediaQuery('(min-width: 1280px)');
  const lg = useMediaQuery('(min-width: 1024px)');
  const leftOpen = useUi((state) => state.leftOpen);
  const rightOpen = useUi((state) => state.rightOpen);
  const reactorState = useCore(selectReactorState);
  const webgl2 = getWebGLInfo().webgl2;

  return (
    <div className="absolute inset-0">
      <ReactorStage slotRef={slotRef} />
      <div className="absolute inset-0 pb-[var(--chrome-bottom)] pl-[var(--chrome-left)] pt-[var(--chrome-top)]">
        <div className="grid h-full grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[17.5rem_minmax(0,1fr)_19rem]">
          {xl && <LeftPanel />}
          <section
            aria-label="Reactor and conversation"
            className="relative flex min-h-0 min-w-0 flex-col"
          >
            <div ref={slotRef} className="relative min-h-[180px] flex-1">
              {!webgl2 && (
                <div className="absolute inset-0 grid place-items-center">
                  <ReactorGlyph state={reactorState} size="min(52vh, 72%)" />
                </div>
              )}
              <ReactorHud webgl2={webgl2} />
            </div>
            <StatusLine />
            <Transcript />
          </section>
          {lg && <RightPanel />}
        </div>
      </div>
      <Drawer side="left" open={!xl && leftOpen}>
        <LeftPanel />
      </Drawer>
      <Drawer side="right" open={!lg && rightOpen}>
        <RightPanel />
      </Drawer>
    </div>
  );
}

function Drawer({
  side,
  open,
  children,
}: {
  side: 'left' | 'right';
  open: boolean;
  children: ReactNode;
}) {
  const offset = side === 'left' ? '-104%' : '104%';
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 z-40 bg-void/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => useUi.getState().closeDrawers()}
          />
          <motion.div
            className={`absolute bottom-[var(--chrome-bottom)] top-[var(--chrome-top)] z-40 flex w-[min(20rem,88vw)] p-3 ${side === 'left' ? 'left-[var(--chrome-left)]' : 'right-0'}`}
            initial={{ x: offset }}
            animate={{ x: 0 }}
            exit={{ x: offset }}
            transition={{ duration: 0.32, ease: HOLO_EASE }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
