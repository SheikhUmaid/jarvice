import { REACTOR_STATE_LABELS } from '@jarvis/shared';
import { CornerBrackets, cssVars, useHoloConfig } from '@jarvis/ui';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { Readout } from '../../../components/Atoms';
import { LiveValue } from '../../../components/Live';
import { readFps, readFrameMs } from '../../../utils/signal';
import { useNow } from '../../../hooks/useNow';
import { getWebGLInfo, shortRendererName } from '../../../services/telemetry/webgl';
import { useActivity } from '../../../store/activity';
import { useConversation } from '../../../store/conversation';
import { selectReactorState, useCore } from '../../../store/core';
import { useQualityLevel } from '../../../store/settings';
import { useToolRuns } from '../../../store/tools';
import { formatDuration } from '../../../utils/format';

/** 3D information cards: tilt towards the pointer with a moving glare (real data on every card). */
export function CardsWindow() {
  return (
    <div className="grid h-full grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] content-start gap-3 overflow-y-auto p-3 [perspective:900px]">
      <TiltCard title="Reactor core" code="RX-1">
        <ReactorCard />
      </TiltCard>
      <TiltCard title="Render" code="GX-2">
        <RenderCard />
      </TiltCard>
      <TiltCard title="Session" code="SS-3">
        <SessionCard />
      </TiltCard>
    </div>
  );
}

function TiltCard({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useHoloConfig();

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card || reducedMotion) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateX(${(-py * 14).toFixed(2)}deg) rotateY(${(px * 18).toFixed(2)}deg) translateZ(10px)`;
    card.style.setProperty('--glare-x', `${((px + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty('--glare-y', `${((py + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty('--glare', '1');
  };
  const onPointerLeave = () => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = '';
    card.style.setProperty('--glare', '0');
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative min-h-[8.5rem] rounded-[3px] border border-holo-400/25 bg-navy-950/75 p-3 shadow-[0_14px_40px_-20px_rgb(0_0_0/0.9)] transition-transform duration-200 ease-out [transform-style:preserve-3d]"
      style={cssVars({ '--glare': 0, '--glare-x': '50%', '--glare-y': '50%' })}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3px] transition-opacity duration-300"
        style={{
          opacity: 'var(--glare)',
          background:
            'radial-gradient(circle at var(--glare-x) var(--glare-y), rgb(25 220 255 / 0.2), transparent 55%)',
        }}
      />
      <CornerBrackets size={8} />
      <header className="mb-2 flex items-center justify-between [transform:translateZ(18px)]">
        <span className="font-display text-[9.5px] font-semibold tracking-[0.22em] text-holo-100">
          {title.toUpperCase()}
        </span>
        <span className="font-mono text-[9px] text-holo-400/60">{code}</span>
      </header>
      <div className="[transform:translateZ(26px)]">{children}</div>
    </div>
  );
}

function ReactorCard() {
  const state = useCore(selectReactorState);
  const status = useCore((s) => s.status);
  const override = useCore((s) => s.override);
  return (
    <>
      <p className="holo-text-glow font-display text-[15px] font-bold leading-tight tracking-[0.1em] text-holo-50">
        {REACTOR_STATE_LABELS[state].toUpperCase()}
      </p>
      <Readout label="Pipeline">{status}</Readout>
      <Readout label="Preview" tone={override ? 'amber' : undefined}>
        {override ?? 'off'}
      </Readout>
    </>
  );
}

function RenderCard() {
  const quality = useQualityLevel();
  const webgl = getWebGLInfo();
  return (
    <>
      <p className="holo-text-glow font-display text-[15px] font-bold text-holo-50">
        <LiveValue read={readFps} /> <span className="text-[11px] tracking-[0.2em]">FPS</span>
      </p>
      <Readout label="Frame">
        <LiveValue read={readFrameMs} /> ms
      </Readout>
      <Readout label="Tier">{quality}</Readout>
      <Readout label="GPU" title={webgl.renderer ?? undefined}>
        {shortRendererName(webgl.renderer)}
      </Readout>
    </>
  );
}

function SessionCard() {
  const startedAt = useConversation((state) => state.sessionStartedAt);
  const messages = useConversation((state) => state.messages.length);
  const commands = useActivity(
    (state) => state.events.filter((event) => event.kind === 'command').length,
  );
  const tools = useToolRuns((state) => state.runs.length);
  const now = useNow(1000);
  return (
    <>
      <p className="holo-text-glow font-display text-[15px] font-bold tracking-[0.08em] text-holo-50">
        {formatDuration(now - startedAt)}
      </p>
      <Readout label="Messages">{messages}</Readout>
      <Readout label="Commands">{commands}</Readout>
      <Readout label="Tool runs">{tools}</Readout>
    </>
  );
}
