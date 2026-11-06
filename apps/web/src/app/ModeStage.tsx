import {
  HOLO_EASE,
  HolographicButton,
  HolographicPanel,
  HolographicRing,
  HolographicText,
} from '@jarvis/ui';
import { AnimatePresence, motion } from 'motion/react';
import { Suspense } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getMode, type ModeDefinition } from '../features/modes';
import { useUi } from '../store/ui';

/** Hosts the active mode: lazy-loaded, isolated by an error boundary, with a holographic transition. */
export function ModeStage() {
  const mode = getMode(useUi((state) => state.mode));
  const Component = mode.component;
  return (
    <main className="absolute inset-0 z-10" aria-label={mode.title}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.3, ease: HOLO_EASE }}
        >
          <ErrorBoundary
            fallback={(error, reset) => <ModeCrashed mode={mode} error={error} onRetry={reset} />}
          >
            <Suspense fallback={<ModeLoading mode={mode} />}>
              <Component />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
      <TransitionSweep key={mode.id} />
    </main>
  );
}

/** A single scan line that sweeps the screen on every mode change. */
function TransitionSweep() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-20 h-px bg-holo-300 shadow-[0_0_16px_2px_rgb(25_220_255/0.7)]"
      initial={{ top: '0%', opacity: 0.9 }}
      animate={{ top: '100%', opacity: 0 }}
      transition={{ duration: 0.65, ease: HOLO_EASE }}
    />
  );
}

function ModeLoading({ mode }: { mode: ModeDefinition }) {
  return (
    <div className="grid h-full place-items-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-24">
          <HolographicRing
            size="100%"
            radius={46}
            thickness={1}
            segments={12}
            gap={0.4}
            spin={2.2}
            className="absolute inset-0"
          />
          <HolographicRing
            size="100%"
            radius={36}
            thickness={2.5}
            arcs={[{ start: 0, end: 110 }]}
            opacity={0.2}
            spin={-1.4}
            className="absolute inset-0"
          />
        </div>
        <HolographicText
          text={`INITIALIZING MODE ${mode.code}`}
          className="font-display text-[10px] tracking-[0.32em] text-holo-200"
        />
      </div>
    </div>
  );
}

function ModeCrashed({
  mode,
  error,
  onRetry,
}: {
  mode: ModeDefinition;
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="grid h-full place-items-center p-6 pt-[var(--chrome-top)]">
      <HolographicPanel
        title={`Mode ${mode.code} fault`}
        tone="alert"
        className="max-w-md"
        glow="medium"
      >
        <p className="text-[14px] leading-relaxed text-holo-100">
          {mode.title} stopped with an error. The rest of JARVIS is unaffected.
        </p>
        <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-[2px] bg-black/40 p-2 font-mono text-[11px] text-alert/90">
          {error.message}
        </pre>
        <HolographicButton tone="alert" className="mt-4" onClick={onRetry}>
          Restart module
        </HolographicButton>
      </HolographicPanel>
    </div>
  );
}
