import { APP_VERSION } from '@jarvis/shared';
import { useEffect } from 'react';
import { AppShell } from './app/AppShell';
import { agentProbe } from './services/agent/agentProbe';
import { micMonitor } from './services/audio/micMonitor';
import { bindCoreToDevices, greetOnBoot } from './services/assistant/runner';
import { backendLink } from './services/backend/backendLink';
import { startFrameMonitor } from './services/telemetry/frameMonitor';
import { getWebGLInfo, shortRendererName } from './services/telemetry/webgl';
import { logActivity } from './store/activity';
import { selectQualityLevel, useSettings } from './store/settings';
import { bindModeToHistory } from './store/ui';

let bootLogged = false;

function logBoot() {
  if (bootLogged) return;
  bootLogged = true;
  const webgl = getWebGLInfo();
  logActivity('system', 'JARVIS interface online', { level: 'success', detail: `v${APP_VERSION}` });
  logActivity(
    'system',
    webgl.webgl2 ? `GPU: ${shortRendererName(webgl.renderer)}` : 'WebGL 2 unavailable — 2D reactor',
    {
      level: webgl.webgl2 && !webgl.software ? 'info' : 'warn',
      detail: `quality ${selectQualityLevel(useSettings.getState())}`,
    },
  );
}

/** Starts the app-wide services (each returns its own cleanup) and renders the shell. */
export function App() {
  useEffect(() => {
    logBoot();
    const releases = [
      bindModeToHistory(),
      startFrameMonitor(),
      backendLink.acquire(),
      agentProbe.acquire(),
      bindCoreToDevices(),
      greetOnBoot(),
    ];
    const onOnline = () => logActivity('link', 'Network online', { level: 'success' });
    const onOffline = () => logActivity('link', 'Network offline', { level: 'warn' });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      releases.forEach((release) => release());
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (micMonitor.active) micMonitor.stop();
    };
  }, []);

  return <AppShell />;
}
