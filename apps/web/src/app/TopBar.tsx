import { APP_VERSION, CURRENT_MILESTONE } from '@jarvis/shared';
import { HolographicButton, HolographicText, cx, toneStyle } from '@jarvis/ui';
import { Maximize2, Minimize2, PanelLeft, PanelRight } from 'lucide-react';
import { StatusDot } from '../components/Atoms';
import { AudioMeter } from '../components/Live';
import { ReactorGlyph } from '../components/ReactorGlyph';
import { STATUS_TONE, getMode, statusLabel } from '../features/modes';
import { fullscreenSupported, toggleFullscreen, useIsFullscreen } from '../hooks/useFullscreen';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNow } from '../hooks/useNow';
import { micMonitor } from '../services/audio/micMonitor';
import { logActivity } from '../store/activity';
import { useConnection } from '../store/connection';
import { selectReactorState, useCore } from '../store/core';
import { useDevices } from '../store/devices';
import { selectQualityLevel, useSettings, type QualitySetting } from '../store/settings';
import { useUi } from '../store/ui';
import { formatClock, formatMs } from '../utils/format';

const QUALITY_CYCLE: Record<QualitySetting, QualitySetting> = {
  auto: 'low',
  low: 'medium',
  medium: 'high',
  high: 'auto',
};

export function TopBar() {
  const mode = getMode(useUi((state) => state.mode));
  const reactorState = useCore(selectReactorState);
  const isCommand = mode.id === 'command';
  const xl = useMediaQuery('(min-width: 1280px)');
  const lg = useMediaQuery('(min-width: 1024px)');

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex h-[var(--chrome-top)] items-center gap-3 border-b border-holo-400/10 bg-gradient-to-b from-void/95 to-void/55 px-3 backdrop-blur-md md:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <ReactorGlyph state={reactorState} size={30} />
        <div className="leading-none">
          <div className="holo-text-glow font-display text-[13px] font-bold tracking-[0.42em] text-holo-50">
            JARVIS
          </div>
          <div className="mt-1 hidden font-mono text-[9px] tracking-[0.16em] text-holo-400/55 sm:block">
            v{APP_VERSION} · MILESTONE {CURRENT_MILESTONE}
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-w-0 items-center gap-2.5">
        <span className="holo-chip">Mode {mode.code}</span>
        <HolographicText
          key={mode.id}
          text={mode.title.toUpperCase()}
          className="hidden truncate font-display text-[11px] tracking-[0.3em] text-holo-100 sm:inline"
        />
        <span
          className="holo-chip hidden lg:inline-flex"
          style={toneStyle(STATUS_TONE[mode.status])}
        >
          {statusLabel(mode)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2.5">
        <MicIndicator />
        <LinkIndicator />
        <Clock />
        <QualityButton />
        {fullscreenSupported() && <FullscreenButton />}
        {isCommand && !xl && (
          <HolographicButton
            size="sm"
            iconOnly
            variant="ghost"
            aria-label="Conversations and memories ([)"
            icon={<PanelLeft size={15} />}
            onClick={() => useUi.getState().toggleLeft()}
          />
        )}
        {isCommand && !lg && (
          <HolographicButton
            size="sm"
            iconOnly
            variant="ghost"
            aria-label="System status and activity (])"
            icon={<PanelRight size={15} />}
            onClick={() => useUi.getState().toggleRight()}
          />
        )}
      </div>
    </header>
  );
}

/** Visible whenever the microphone is live; click to stop. */
function MicIndicator() {
  const mic = useDevices((state) => state.mic);
  if (mic !== 'live' && mic !== 'requesting') return null;
  return (
    <button
      type="button"
      onClick={() => micMonitor.stop()}
      title="Microphone is live — click to stop"
      className="holo-chip gap-2"
      style={toneStyle('alert')}
    >
      <StatusDot tone="alert" pulse />
      {mic === 'live' ? 'Mic live' : 'Mic…'}
      {mic === 'live' && <AudioMeter bars={6} className="hidden h-3 md:flex" />}
    </button>
  );
}

function LinkIndicator() {
  const backend = useConnection((state) => state.backend);
  const tone =
    backend.status === 'online' ? 'cyan' : backend.status === 'connecting' ? 'ice' : 'amber';
  const label =
    backend.status === 'online'
      ? formatMs(backend.latencyMs)
      : backend.status === 'connecting'
        ? 'linking'
        : 'offline';
  return (
    <span
      className="holo-chip"
      style={toneStyle(tone)}
      title={`Backend link: ${backend.status}${backend.version ? ` (v${backend.version})` : ''}`}
    >
      <StatusDot tone={tone} pulse={backend.status !== 'online'} />
      <span className="hidden md:inline">Link</span> {label}
    </span>
  );
}

function Clock() {
  const now = useNow(1000);
  return (
    <span
      className="hidden font-mono text-[11px] tracking-[0.12em] text-holo-200/80 tabular-nums sm:inline"
      title="Local time"
    >
      {formatClock(new Date(now))}
    </span>
  );
}

function QualityButton() {
  const quality = useSettings((state) => state.quality);
  const effective = useSettings(selectQualityLevel);
  const override = useSettings((state) => state.qualityOverride);
  const next = QUALITY_CYCLE[quality];
  return (
    <HolographicButton
      size="sm"
      variant="ghost"
      className="hidden md:inline-flex"
      title={`Visual quality: ${quality}${override ? ` (URL override: ${override})` : ''} — click for ${next}`}
      onClick={() => {
        useSettings.getState().setQuality(next);
        logActivity('settings', `Quality → ${next}`);
      }}
    >
      Q·{quality === 'auto' ? `Auto ${effective.slice(0, 3)}` : quality}
    </HolographicButton>
  );
}

function FullscreenButton() {
  const fullscreen = useIsFullscreen();
  return (
    <HolographicButton
      size="sm"
      iconOnly
      variant="ghost"
      aria-label={fullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
      icon={fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      className={cx(!fullscreen && 'hidden sm:inline-flex')}
      onClick={() =>
        toggleFullscreen().catch((error: unknown) =>
          logActivity('system', 'Fullscreen refused', {
            level: 'warn',
            detail: error instanceof Error ? error.message : undefined,
          }),
        )
      }
    />
  );
}
