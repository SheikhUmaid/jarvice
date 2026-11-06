import { REACTOR_STATE_LABELS, type ReactorState } from '@jarvis/shared';
import { HolographicRing, HolographicText, cx, toneStyle, type Tone } from '@jarvis/ui';
import type { ReactNode } from 'react';
import { StatusDot } from '../../components/Atoms';
import { AudioMeter, LiveValue } from '../../components/Live';
import { readFps, readMicDb } from '../../utils/signal';
import { useNow } from '../../hooks/useNow';
import { useConversation } from '../../store/conversation';
import { selectReactorState, useCore } from '../../store/core';
import { useDevices } from '../../store/devices';
import { useQualityLevel } from '../../store/settings';
import { formatDuration } from '../../utils/format';

const STATE_TONE: Record<ReactorState, Tone> = {
  idle: 'cyan',
  listening: 'ice',
  thinking: 'cyan',
  speaking: 'ice',
  executing: 'amber',
};

/** HUD frame around the reactor. Every callout shows real data — nothing decorative is invented. */
export function ReactorHud({ webgl2 }: { webgl2: boolean }) {
  const override = useCore((state) => state.override);
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-1/2 aspect-square h-[min(100%,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2">
        <HolographicRing
          size="100%"
          radius={49}
          thickness={0.22}
          ticks={{
            count: 120,
            length: 1.1,
            majorEvery: 10,
            majorLength: 2.6,
            inward: true,
            opacity: 0.45,
          }}
          opacity={0.35}
          spin={webgl2 ? 240 : 0}
          className="absolute inset-0"
        />
        <HolographicRing
          size="100%"
          radius={47}
          thickness={0.35}
          segments={4}
          gap={0.64}
          opacity={0.5}
          spin={webgl2 ? -160 : 0}
          className="absolute inset-0"
        />
      </div>

      <Callout corner="tl" label="Core state">
        <CoreStateValue />
      </Callout>
      <Callout corner="tr" label="Session">
        <SessionValue />
      </Callout>
      <Callout corner="bl" label="Voice input">
        <VoiceValue />
      </Callout>
      <Callout corner="br" label="Render">
        <RenderValue />
      </Callout>

      {override && (
        <div className="absolute left-1/2 top-1 -translate-x-1/2">
          <span className="holo-chip" style={toneStyle('amber')}>
            Preview override · {override}
          </span>
        </div>
      )}
    </div>
  );
}

function Callout({
  corner,
  label,
  children,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br';
  label: string;
  children: ReactNode;
}) {
  const right = corner === 'tr' || corner === 'br';
  const position = {
    tl: 'left-1 top-1',
    tr: 'right-1 top-1 items-end text-right',
    bl: 'bottom-1 left-1',
    br: 'bottom-1 right-1 items-end text-right',
  }[corner];
  return (
    <div className={cx('absolute hidden min-w-[9rem] flex-col md:flex', position)}>
      <span className="holo-label">{label}</span>
      <div className="mt-1 font-display text-[12.5px] tracking-[0.14em] text-holo-50">
        {children}
      </div>
      <span
        aria-hidden
        className={cx(
          'mt-1.5 h-px w-28',
          right ? 'bg-gradient-to-l' : 'bg-gradient-to-r',
          'from-holo-400/70 to-transparent',
        )}
      />
    </div>
  );
}

function CoreStateValue() {
  const state = useCore(selectReactorState);
  const detail = useCore((s) => s.detail);
  return (
    <div style={toneStyle(STATE_TONE[state])} className="flex flex-col">
      <span className="flex items-center gap-2" style={{ color: 'rgb(var(--tone))' }}>
        <StatusDot tone={STATE_TONE[state]} pulse={state !== 'idle'} />
        <HolographicText text={REACTOR_STATE_LABELS[state].toUpperCase()} duration={420} />
      </span>
      {detail && state === 'executing' && (
        <span className="mt-0.5 font-mono text-[10px] tracking-normal text-amber-hud/80">
          {detail}
        </span>
      )}
    </div>
  );
}

function SessionValue() {
  const startedAt = useConversation((state) => state.sessionStartedAt);
  const messages = useConversation((state) => state.messages.length);
  const now = useNow(1000);
  return (
    <div className="flex flex-col items-end">
      <span className="text-readout">{formatDuration(now - startedAt)}</span>
      <span className="font-mono text-[10px] tracking-normal text-holo-300/60">
        {messages} messages
      </span>
    </div>
  );
}

function VoiceValue() {
  const mic = useDevices((state) => state.mic);
  if (mic !== 'live') {
    return (
      <span className="text-holo-300/60">
        {mic === 'requesting' ? 'REQUESTING…' : mic.toUpperCase()}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <AudioMeter bars={10} className="h-4" />
      <LiveValue read={readMicDb} hz={8} className="text-[11px] tracking-normal" />
    </span>
  );
}

function RenderValue() {
  const quality = useQualityLevel();
  return (
    <div className="flex flex-col items-end">
      <span>
        <LiveValue read={readFps} /> FPS
      </span>
      <span className="font-mono text-[10px] tracking-normal text-holo-300/60">
        {quality} quality
      </span>
    </div>
  );
}

const STATUS_TEXT: Record<ReactorState, string> = {
  idle: 'Awaiting command',
  listening: 'Listening — microphone live',
  thinking: 'Processing request',
  speaking: 'Responding',
  executing: 'Executing tool',
};

/** One-line conversation status under the reactor. */
export function StatusLine() {
  const state = useCore((s) => s.status);
  const detail = useCore((s) => s.detail);
  const text = state === 'executing' && detail ? `Executing · ${detail}` : STATUS_TEXT[state];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2.5 py-2"
      style={toneStyle(STATE_TONE[state])}
    >
      <StatusDot tone={STATE_TONE[state]} pulse={state !== 'idle'} />
      <HolographicText
        text={text.toUpperCase()}
        duration={380}
        className="font-display text-[10.5px] tracking-[0.3em] text-holo-100"
      />
    </div>
  );
}
