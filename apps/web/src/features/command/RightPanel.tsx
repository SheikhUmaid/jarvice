import { REACTOR_STATES, REACTOR_STATE_LABELS } from '@jarvis/shared';
import { HolographicButton, HolographicPanel, cx } from '@jarvis/ui';
import { Gauge, SlidersHorizontal } from 'lucide-react';
import { Readout, StatusDot } from '../../components/Atoms';
import { FrameSparkline, LiveValue } from '../../components/Live';
import { readFps, readFrameMs } from '../../utils/signal';
import { getWebGLInfo, shortRendererName } from '../../services/telemetry/webgl';
import { logActivity } from '../../store/activity';
import { useConnection } from '../../store/connection';
import { useCore } from '../../store/core';
import { useDevices } from '../../store/devices';
import {
  useSettings,
  useQualityLevel,
  type MotionSetting,
  type QualitySetting,
} from '../../store/settings';
import { formatMs } from '../../utils/format';
import { ActivityPanel, EnvironmentPanel, ToolRunsPanel } from '../system/sharedPanels';

/** Right column of the command centre: system status, tools, activity, environment, diagnostics. */
export function RightPanel({ className }: { className?: string }) {
  return (
    <aside
      aria-label="System status and activity"
      className={cx('flex min-h-0 w-full flex-col gap-3 overflow-y-auto [&>*]:shrink-0', className)}
    >
      <SystemStatusPanel />
      <ToolRunsPanel />
      <ActivityPanel limit={30} className="max-h-[22rem] shrink-0" />
      <EnvironmentPanel />
      <CoreDiagnosticsPanel />
    </aside>
  );
}

function SystemStatusPanel() {
  const backend = useConnection((state) => state.backend);
  const agent = useConnection((state) => state.agent);
  const mic = useDevices((state) => state.mic);
  const quality = useQualityLevel();
  const webgl = getWebGLInfo();
  const ai = backend.ai;

  return (
    <HolographicPanel
      title="System status"
      icon={<Gauge size={12} className="text-holo-300" />}
      code="SYS"
    >
      <Readout label="Backend" tone={backend.status === 'online' ? undefined : 'amber'}>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot
            tone={backend.status === 'online' ? 'ok' : 'amber'}
            pulse={backend.status !== 'online'}
          />
          {backend.status === 'online'
            ? `Online · ${formatMs(backend.latencyMs)}`
            : backend.status === 'connecting'
              ? 'Connecting…'
              : 'Offline'}
        </span>
      </Readout>
      <Readout label="Reasoning core" tone="amber" title="Claude integration ships in Milestone 4">
        {ai ? `${ai.keyConfigured ? 'Key set' : 'No key'} · M4` : 'Pending · M4'}
      </Readout>
      <Readout label="Local agent" tone={agent.status === 'online' ? undefined : 'amber'}>
        {agent.status === 'online'
          ? `Online · ${agent.paired ? 'paired' : 'unpaired'}`
          : agent.status === 'unknown'
            ? 'Checking…'
            : 'Offline'}
      </Readout>
      <Readout label="Microphone" tone={mic === 'live' ? 'alert' : undefined}>
        {mic === 'live' ? 'Live' : mic}
      </Readout>
      <Readout label="Camera" title="The camera is never used before Live Vision (Milestone 6)">
        Off · M6
      </Readout>
      <Readout label="Render">
        <LiveValue read={readFps} /> fps · <LiveValue read={readFrameMs} /> ms · {quality}
      </Readout>
      <Readout label="GPU" title={webgl.renderer ?? undefined}>
        {webgl.webgl2 ? shortRendererName(webgl.renderer) : 'WebGL 2 unavailable'}
      </Readout>
      <FrameSparkline width={250} height={34} className="mt-2 w-full" />
    </HolographicPanel>
  );
}

const QUALITY_OPTIONS: readonly QualitySetting[] = ['auto', 'low', 'medium', 'high'];
const MOTION_OPTIONS: readonly MotionSetting[] = ['system', 'reduced', 'full'];

/** Real controls: reactor state preview (visual only), quality, motion and form of address. */
function CoreDiagnosticsPanel() {
  const override = useCore((state) => state.override);
  const quality = useSettings((state) => state.quality);
  const motion = useSettings((state) => state.motion);
  const honorific = useSettings((state) => state.honorific);

  const preview = (state: (typeof REACTOR_STATES)[number] | null) => {
    useCore.getState().setOverride(state);
    logActivity('settings', state ? `Reactor preview: ${state}` : 'Reactor preview off');
  };

  return (
    <HolographicPanel
      title="Core diagnostics"
      icon={<SlidersHorizontal size={12} className="text-holo-300" />}
      code="DIAG"
      collapsible
    >
      <p className="holo-label mb-1.5">Reactor preview</p>
      <div className="flex flex-wrap gap-1">
        <HolographicButton size="xs" active={override === null} onClick={() => preview(null)}>
          Live
        </HolographicButton>
        {REACTOR_STATES.map((state) => (
          <HolographicButton
            key={state}
            size="xs"
            tone={state === 'executing' ? 'amber' : 'cyan'}
            active={override === state}
            onClick={() => preview(state)}
            title={`Preview the ${REACTOR_STATE_LABELS[state]} visuals`}
          >
            {state}
          </HolographicButton>
        ))}
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-holo-300/55">
        Preview changes the visuals only; the HUD flags it while active.
      </p>

      <p className="holo-label mb-1.5 mt-3">Visual quality</p>
      <div className="flex flex-wrap gap-1">
        {QUALITY_OPTIONS.map((option) => (
          <HolographicButton
            key={option}
            size="xs"
            active={quality === option}
            onClick={() => {
              useSettings.getState().setQuality(option);
              logActivity('settings', `Quality → ${option}`);
            }}
          >
            {option}
          </HolographicButton>
        ))}
      </div>

      <p className="holo-label mb-1.5 mt-3">Motion</p>
      <div className="flex flex-wrap gap-1">
        {MOTION_OPTIONS.map((option) => (
          <HolographicButton
            key={option}
            size="xs"
            active={motion === option}
            onClick={() => {
              useSettings.getState().setMotion(option);
              logActivity('settings', `Motion → ${option}`);
            }}
          >
            {option}
          </HolographicButton>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="holo-label">Form of address (optional)</span>
        <input
          value={honorific}
          onChange={(event) => useSettings.getState().setHonorific(event.target.value)}
          placeholder="e.g. your name"
          maxLength={40}
          className="mt-1 h-8 w-full rounded-[2px] border border-holo-400/20 bg-navy-950/60 px-2 text-[13.5px] text-holo-50 outline-none placeholder:text-holo-300/35 focus:border-holo-400/60"
        />
      </label>
    </HolographicPanel>
  );
}
