import { HolographicPanel, toneStyle } from '@jarvis/ui';
import {
  CheckCircle2,
  Cpu,
  Globe2,
  Layers,
  Mic,
  Network,
  Settings2,
  Terminal,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, Readout, StatusDot } from '../../components/Atoms';
import { useNow } from '../../hooks/useNow';
import {
  getEnvironmentSnapshot,
  type EnvironmentSnapshot,
} from '../../services/telemetry/environment';
import { useActivity, type ActivityKind } from '../../store/activity';
import { useToolRuns } from '../../store/tools';
import { formatClock, formatMs } from '../../utils/format';
import { LEVEL_TONE } from './levels';

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  system: Cpu,
  mode: Layers,
  command: Terminal,
  tool: Wrench,
  link: Network,
  device: Mic,
  settings: Settings2,
};

/** Real application events, newest first. */
export function ActivityPanel({ limit = 40, className }: { limit?: number; className?: string }) {
  const events = useActivity((state) => state.events);
  const recent = useMemo(() => events.slice(-limit).reverse(), [events, limit]);
  return (
    <HolographicPanel
      title="Activity timeline"
      code={`${events.length} EVT`}
      className={className}
      padded={false}
      bodyClassName="min-h-0 flex-1 overflow-y-auto"
    >
      {recent.length === 0 ? (
        <EmptyState className="px-3">Nothing has happened yet.</EmptyState>
      ) : (
        <ol className="relative px-3 py-2">
          <span
            aria-hidden
            className="absolute bottom-2 left-[1.15rem] top-2 w-px bg-holo-400/12"
          />
          {recent.map((event) => {
            const Icon = KIND_ICON[event.kind];
            const tone = LEVEL_TONE[event.level];
            return (
              <li key={event.id} className="relative flex gap-2.5 py-1">
                <span
                  className="relative z-10 mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border bg-navy-950"
                  style={toneStyle(tone, {
                    borderColor: 'rgb(var(--tone) / 0.5)',
                    color: 'rgb(var(--tone))',
                  })}
                >
                  <Icon size={9} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-tight text-holo-100">{event.message}</p>
                  <p className="font-mono text-[9.5px] text-holo-400/50">
                    {formatClock(new Date(event.at))}
                    {event.detail && <span className="text-holo-300/60"> · {event.detail}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </HolographicPanel>
  );
}

/** Tools running now and the most recent results. */
export function ToolRunsPanel({ recent = 5, className }: { recent?: number; className?: string }) {
  const runs = useToolRuns((state) => state.runs);
  const now = useNow(250);
  const running = runs.filter((run) => run.status === 'running');
  const finished = runs
    .filter((run) => run.status !== 'running')
    .slice(-recent)
    .reverse();
  return (
    <HolographicPanel
      title="Active tools"
      code={running.length ? `${running.length} RUN` : 'IDLE'}
      className={className}
      tone={running.length ? 'amber' : 'cyan'}
    >
      {runs.length === 0 ? (
        <EmptyState>No tools have run yet — try “run diagnostics”.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {running.map((run) => (
            <li key={run.id} className="flex items-center gap-2" style={toneStyle('amber')}>
              <span aria-hidden className="holo-btn-spinner" />
              <span className="flex-1 truncate font-mono text-[11.5px] text-amber-hud">
                {run.name}
              </span>
              <span className="text-readout text-[10px] text-amber-hud/70">
                {formatMs(now - run.startedAt)}
              </span>
            </li>
          ))}
          {finished.map((run) => {
            const ok = run.status === 'success';
            const Icon = ok ? CheckCircle2 : XCircle;
            return (
              <li key={run.id} className="flex items-start gap-2" title={run.summary ?? undefined}>
                <Icon
                  size={13}
                  className={
                    ok
                      ? 'mt-px shrink-0 text-ok/80'
                      : run.status === 'cancelled'
                        ? 'mt-px shrink-0 text-amber-hud/80'
                        : 'mt-px shrink-0 text-alert/80'
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-holo-100">{run.name}</p>
                  {run.summary && (
                    <p className="truncate text-[12px] leading-tight text-holo-300/60">
                      {run.summary}
                    </p>
                  )}
                </div>
                <span className="text-readout text-[10px] text-holo-400/55">
                  {run.endedAt ? formatMs(run.endedAt - run.startedAt) : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </HolographicPanel>
  );
}

function useEnvironment(): EnvironmentSnapshot {
  const [snapshot, setSnapshot] = useState(getEnvironmentSnapshot);
  useEffect(() => {
    const refresh = () => setSnapshot(getEnvironmentSnapshot());
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('resize', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);
  return snapshot;
}

/** What the browser can truthfully report about this environment. */
export function EnvironmentPanel({
  className,
  detailed = false,
}: {
  className?: string;
  detailed?: boolean;
}) {
  const env = useEnvironment();
  const now = useNow(1000);
  const date = new Date(now);
  return (
    <HolographicPanel
      title="Environment"
      icon={<Globe2 size={12} className="text-holo-300" />}
      code="ENV"
      className={className}
    >
      <Readout label="Local time">{formatClock(date)}</Readout>
      <Readout label="Date">
        {date.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </Readout>
      <Readout label="Time zone" title={env.timezone}>
        {env.timezone} · {env.utcOffset}
      </Readout>
      <Readout label="Network" tone={env.online ? undefined : 'amber'}>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone={env.online ? 'ok' : 'amber'} />
          {env.online ? 'Online' : 'Offline'}
          {env.connection?.effectiveType ? ` · ${env.connection.effectiveType}` : ''}
        </span>
      </Readout>
      <Readout label="Display">
        {env.screen} @{env.dpr}x
      </Readout>
      <Readout label="Viewport">{env.viewport}</Readout>
      <Readout label="Locale">{env.locale}</Readout>
      {detailed && (
        <>
          <Readout label="Browser">{env.browser}</Readout>
          <Readout label="Platform">{env.platform}</Readout>
          <Readout label="Logical cores">{env.cores ?? 'not reported'}</Readout>
          <Readout label="Device memory" title="Approximate value reported by the browser (capped)">
            {env.deviceMemoryGb ? `≈ ${env.deviceMemoryGb} GB (browser-reported)` : 'not reported'}
          </Readout>
          <Readout label="Colour depth">{env.colorDepth}-bit</Readout>
          <Readout label="Prefers">
            {env.colorScheme} · {env.reducedMotion ? 'reduced motion' : 'full motion'}
          </Readout>
          <Readout label="WebGPU">{env.webgpu ? 'available' : 'not available'}</Readout>
          {env.connection && (
            <Readout label="Link estimate">
              {env.connection.rttMs != null ? `${env.connection.rttMs} ms RTT` : '—'}
              {env.connection.downlinkMbps != null ? ` · ${env.connection.downlinkMbps} Mb/s` : ''}
            </Readout>
          )}
        </>
      )}
    </HolographicPanel>
  );
}
