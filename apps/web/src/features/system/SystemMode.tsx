import { HolographicButton, HolographicPanel, HolographicText, toneStyle } from '@jarvis/ui';
import { Activity, HardDrive, RefreshCw, Server } from 'lucide-react';
import { useState } from 'react';
import { Readout, StatusDot } from '../../components/Atoms';
import { FrameSparkline, LiveValue } from '../../components/Live';
import { readFps, readFrameMs } from '../../utils/signal';
import { AGENT_URL, agentProbe } from '../../services/agent/agentProbe';
import { backendLink } from '../../services/backend/backendLink';
import { getEnvironmentSnapshot } from '../../services/telemetry/environment';
import { RENDER_PRESETS } from '../../services/telemetry/quality';
import { getWebGLInfo, shortRendererName } from '../../services/telemetry/webgl';
import { useConnection } from '../../store/connection';
import { useQualityLevel, useSettings } from '../../store/settings';
import { formatBytes, formatDuration, formatMs, formatRelative } from '../../utils/format';
import { STATUS_TONE, getMode, statusLabel } from '../modes';
import { ActivityPanel, EnvironmentPanel, ToolRunsPanel } from './sharedPanels';

/** MODE G — System Monitor (preview): everything the browser can measure truthfully, today. */
export function SystemMode() {
  const mode = getMode('system');
  return (
    <div className="absolute inset-0 overflow-y-auto pb-[calc(var(--chrome-bottom)+1rem)] pl-[calc(var(--chrome-left)+0.75rem)] pr-3 pt-[calc(var(--chrome-top)+0.9rem)]">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="holo-chip">Mode {mode.code}</span>
            <span className="holo-chip" style={toneStyle(STATUS_TONE[mode.status])}>
              {statusLabel(mode)}
            </span>
          </div>
          <HolographicText
            as="h1"
            text="SYSTEM MONITOR"
            glow
            className="mt-2 block font-display text-xl font-bold tracking-[0.2em] text-holo-50"
          />
        </div>
        <p className="max-w-xl text-[13.5px] leading-snug text-holo-300/70">
          Browser-side telemetry is live. CPU, memory, disk, processes and launchers appear only
          when the paired local agent reports them (Milestone 8) — JARVIS never shows estimated
          hardware numbers.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <RenderPipelinePanel />
        <ServicesPanel />
        <HostMetricsPanel />
        <EnvironmentPanel detailed />
        <ToolRunsPanel recent={8} />
        <ActivityPanel limit={80} className="max-h-[26rem] md:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}

function RenderPipelinePanel() {
  const quality = useQualityLevel();
  const preset = RENDER_PRESETS[quality];
  const setting = useSettings((state) => state.quality);
  const webgl = getWebGLInfo();
  return (
    <HolographicPanel
      title="Render pipeline"
      icon={<Activity size={12} className="text-holo-300" />}
      code="GPU"
    >
      <div className="flex items-end gap-4">
        <div>
          <div className="holo-text-glow font-display text-4xl font-bold text-holo-50">
            <LiveValue read={readFps} hz={4} />
          </div>
          <span className="holo-label">frames / s</span>
        </div>
        <div className="pb-1">
          <div className="font-display text-lg text-holo-100">
            <LiveValue read={readFrameMs} hz={4} /> ms
          </div>
          <span className="holo-label">frame time</span>
        </div>
      </div>
      <FrameSparkline width={320} height={48} className="mt-3 w-full" />
      <div className="mt-2">
        <Readout label="Quality">
          {setting === 'auto' ? `auto → ${quality}` : quality} · DPR ≤ {preset.dpr[1]}
        </Readout>
        <Readout label="Bloom">{preset.bloom ? `on · ×${preset.bloomIntensity}` : 'off'}</Readout>
        <Readout label="WebGL">{webgl.webgl2 ? 'WebGL 2' : 'unavailable'}</Readout>
        <Readout label="GPU" title={webgl.renderer ?? undefined}>
          {shortRendererName(webgl.renderer)}
        </Readout>
        <Readout label="Max texture">
          {webgl.maxTextureSize ? `${webgl.maxTextureSize}px` : '—'}
        </Readout>
        <Readout label="Renderer type" tone={webgl.software ? 'amber' : undefined}>
          {webgl.software ? 'software (slow)' : 'hardware accelerated'}
        </Readout>
      </div>
    </HolographicPanel>
  );
}

function ServicesPanel() {
  const backend = useConnection((state) => state.backend);
  const agent = useConnection((state) => state.agent);
  const [probing, setProbing] = useState(false);
  const env = getEnvironmentSnapshot();

  const probe = async () => {
    setProbing(true);
    await Promise.all([agentProbe.probe(), backendLink.measureLatency()]);
    setProbing(false);
  };

  return (
    <HolographicPanel
      title="Services"
      icon={<Server size={12} className="text-holo-300" />}
      code="NET"
      actions={
        <HolographicButton
          size="xs"
          variant="ghost"
          icon={<RefreshCw size={11} />}
          loading={probing}
          onClick={() => void probe()}
        >
          Probe
        </HolographicButton>
      }
    >
      <p className="holo-label mb-1">Backend · 127.0.0.1</p>
      <Readout label="Status" tone={backend.status === 'online' ? 'ok' : 'amber'}>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone={backend.status === 'online' ? 'ok' : 'amber'} />
          {backend.status}
        </span>
      </Readout>
      <Readout label="Round trip">{formatMs(backend.latencyMs)}</Readout>
      <Readout label="Version">{backend.version ?? '—'}</Readout>
      <Readout label="Uptime">
        {backend.uptimeSec != null ? formatDuration(backend.uptimeSec * 1000) : '—'}
      </Readout>
      <Readout label="Clients">{backend.clients ?? '—'}</Readout>

      <p className="holo-label mb-1 mt-3">Local agent · {AGENT_URL.replace(/^https?:\/\//, '')}</p>
      <Readout label="Status" tone={agent.status === 'online' ? 'ok' : 'amber'}>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone={agent.status === 'online' ? 'ok' : 'amber'} />
          {agent.status}
        </span>
      </Readout>
      <Readout label="Pairing">
        {agent.status === 'online' ? (agent.paired ? 'paired' : 'not paired · M8') : '—'}
      </Readout>
      <Readout label="Platform">{agent.platform ?? '—'}</Readout>
      <Readout label="Checked">{agent.checkedAt ? formatRelative(agent.checkedAt) : '—'}</Readout>

      {env.jsHeap && (
        <>
          <p className="holo-label mb-1 mt-3">This tab</p>
          <Readout label="JS heap" title="Chromium-only measurement of this page's JavaScript heap">
            {formatBytes(env.jsHeap.usedBytes)} / {formatBytes(env.jsHeap.limitBytes)}
          </Readout>
        </>
      )}
    </HolographicPanel>
  );
}

const HOST_METRICS = [
  'CPU usage per core',
  'Memory and swap',
  'Disk usage',
  'Network interfaces',
  'System uptime',
  'Running processes',
  'Approved application launcher',
];

function HostMetricsPanel() {
  const agent = useConnection((state) => state.agent);
  return (
    <HolographicPanel
      title="Host metrics"
      icon={<HardDrive size={12} className="text-holo-300" />}
      code="AGENT"
      tone="amber"
    >
      <p className="text-[14px] leading-snug text-holo-100">
        {agent.status === 'online'
          ? 'Local agent detected. Pairing and metric streaming arrive in Milestone 8.'
          : 'Waiting for the local agent. Start it with `pnpm dev:agent`; pairing and metrics arrive in Milestone 8.'}
      </p>
      <ul className="mt-3 space-y-1">
        {HOST_METRICS.map((metric) => (
          <li key={metric} className="flex items-center justify-between gap-3">
            <span className="text-[13.5px] text-holo-200/80">{metric}</span>
            <span className="font-mono text-[10px] text-amber-hud/80">awaiting agent</span>
          </li>
        ))}
      </ul>
    </HolographicPanel>
  );
}
