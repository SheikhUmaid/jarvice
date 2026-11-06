import { HolographicDataStream, type StreamLine } from '@jarvis/ui';
import { useEffect, useRef, useState } from 'react';
import { useActivity } from '../../../store/activity';
import { useConnection } from '../../../store/connection';
import { frameSignal } from '../../../utils/signal';
import { LEVEL_TONE } from '../../system/levels';

const MAX_LINES = 60;
const sign = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;

/** Live telemetry feed: frame timing, pointer, backend latency — interleaved with real events. */
export function StreamWindow() {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const nextId = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const push = (line: Omit<StreamLine, 'id'>) => {
      const id = nextId.current++;
      setLines((previous) => [...previous.slice(-(MAX_LINES - 1)), { id, ...line }]);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: 1 - (event.clientY / window.innerHeight) * 2,
      };
    };
    const started = performance.now();
    const timer = window.setInterval(() => {
      const t = ((performance.now() - started) / 1000).toFixed(1).padStart(6, ' ');
      const latency = useConnection.getState().backend.latencyMs;
      push({
        text: `T+${t}  FPS ${frameSignal.fps.toFixed(1).padStart(5)}  FRM ${frameSignal.frameMs.toFixed(1).padStart(4)}ms  PTR ${sign(pointer.current.x)} ${sign(pointer.current.y)}  LNK ${latency == null ? ' off' : `${Math.round(latency)}ms`.padStart(4)}`,
      });
    }, 450);
    let lastSeen = useActivity.getState().events.at(-1)?.id;
    const unsubscribe = useActivity.subscribe((state) => {
      const index = lastSeen ? state.events.findIndex((event) => event.id === lastSeen) : -1;
      state.events
        .slice(index + 1)
        .forEach((event) =>
          push({
            text: `▸ ${event.kind.toUpperCase().padEnd(8)} ${event.message}`,
            tone: LEVEL_TONE[event.level],
          }),
        );
      lastSeen = state.events.at(-1)?.id;
    });
    window.addEventListener('pointermove', onPointerMove);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <div className="h-full px-3 py-2">
      <HolographicDataStream
        lines={lines}
        maxLines={MAX_LINES}
        className="h-full"
        aria-label="Live telemetry stream"
      />
    </div>
  );
}
