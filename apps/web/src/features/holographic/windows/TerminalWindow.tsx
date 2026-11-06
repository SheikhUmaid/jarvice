import { APP_VERSION, CURRENT_MILESTONE, MODE_IDS, getModeMeta, type ModeId } from '@jarvis/shared';
import { HolographicTerminal, type TerminalLine, type TerminalLineKind } from '@jarvis/ui';
import { useRef, useState } from 'react';
import { MODE_REGISTRY } from '../../modes';
import { executeTool } from '../../../services/assistant/tools';
import { backendLink } from '../../../services/backend/backendLink';
import { getEnvironmentSnapshot } from '../../../services/telemetry/environment';
import { getWebGLInfo, shortRendererName } from '../../../services/telemetry/webgl';
import { useConnection } from '../../../store/connection';
import { frameSignal } from '../../../utils/signal';
import { HOLO_WINDOWS, useWorkspace, type AmbientSettings, type HoloWindowId } from '../workspace';

const HELP = `commands:
  help                         this list
  time | date                  local clock (get_current_time tool)
  diag                         full diagnostics (run_diagnostics tool)
  fps | gpu | env | link       render, GPU, environment, backend link
  modes                        list the eight modes
  mode <1-8|A-H|id>            switch mode
  windows                      list workspace windows
  open|close <window>          e.g. "close stream", "open globe"
  ambient <effect> on|off      particles, grid, panels, scanlines, drift
  ambient intensity <0-100>
  quality auto|low|medium|high
  echo <text> · about · clear`;

const AMBIENT_KEYS = ['particles', 'grid', 'panels', 'scanlines', 'drift'] as const;

function resolveMode(token: string): ModeId | null {
  const value = token.toLowerCase();
  const byNumber = MODE_REGISTRY[Number(value) - 1];
  if (/^[1-8]$/.test(value) && byNumber) return byNumber.id;
  const byCode = MODE_REGISTRY.find((mode) => mode.code.toLowerCase() === value);
  if (byCode) return byCode.id;
  return (MODE_IDS as readonly string[]).includes(value) ? (value as ModeId) : null;
}

function resolveWindow(token: string | undefined): HoloWindowId | null {
  if (!token) return null;
  const value = token.toLowerCase();
  const found = HOLO_WINDOWS.find(
    (definition) =>
      definition.id === value ||
      definition.code.toLowerCase() === value ||
      definition.title.toLowerCase().includes(value),
  );
  return found?.id ?? null;
}

/** Local holo-terminal. Every command does real work; nothing is simulated. */
export function TerminalWindow() {
  const nextId = useRef(1);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    {
      id: 0,
      kind: 'system',
      text: `JARVIS holo-terminal ${APP_VERSION} · local commands · type "help"`,
    },
  ]);

  const print = (kind: TerminalLineKind, text: string) => {
    const id = nextId.current++;
    setLines((previous) => [...previous.slice(-250), { id, kind, text }]);
  };

  const run = async (command: string) => {
    print('input', command);
    const [name = '', ...args] = command.split(/\s+/);
    const signal = new AbortController().signal;
    const workspace = useWorkspace.getState();
    switch (name.toLowerCase()) {
      case 'help':
        print('output', HELP);
        break;
      case 'clear':
        setLines([]);
        break;
      case 'time':
      case 'date': {
        const result = await executeTool('get_current_time', {}, { signal });
        if (result.ok)
          print(
            'output',
            `${result.output.date} · ${result.output.time} · ${result.output.timezone} (${result.output.utcOffset})`,
          );
        else print('error', result.error);
        break;
      }
      case 'diag': {
        setBusy(true);
        const result = await executeTool('run_diagnostics', {}, { signal });
        setBusy(false);
        if (!result.ok) {
          print('error', result.error);
          break;
        }
        const r = result.output;
        print(
          'success',
          `render ${r.fps} fps (${r.frameMs} ms) · ${r.gpu} · ${r.quality}\nbackend ${r.backendLatencyMs == null ? 'offline' : `${r.backendLatencyMs} ms`} · agent ${r.agent} · mic ${r.mic}${r.jsHeapMb != null ? ` · heap ${r.jsHeapMb} MB` : ''}`,
        );
        break;
      }
      case 'fps':
        print(
          'output',
          `${frameSignal.fps.toFixed(1)} fps · ${frameSignal.frameMs.toFixed(2)} ms/frame`,
        );
        break;
      case 'gpu': {
        const webgl = getWebGLInfo();
        print(
          'output',
          webgl.webgl2
            ? `${shortRendererName(webgl.renderer)} · max texture ${webgl.maxTextureSize}px`
            : 'WebGL 2 unavailable',
        );
        break;
      }
      case 'env': {
        const env = getEnvironmentSnapshot();
        print(
          'output',
          `${env.browser} · ${env.platform} · ${env.locale}\n${env.timezone} ${env.utcOffset} · screen ${env.screen} @${env.dpr}x · ${env.online ? 'online' : 'offline'}`,
        );
        break;
      }
      case 'link': {
        setBusy(true);
        const latency = await backendLink.measureLatency(1500);
        setBusy(false);
        const backend = useConnection.getState().backend;
        if (latency == null)
          print('error', `backend ${backend.status} — start it with "pnpm dev:backend"`);
        else
          print(
            'success',
            `backend v${backend.version ?? '?'} · round trip ${latency.toFixed(1)} ms · ${backend.clients ?? '?'} client(s)`,
          );
        break;
      }
      case 'modes':
        print(
          'output',
          MODE_REGISTRY.map(
            (mode) => `${mode.hotkey}  ${mode.code}  ${mode.id.padEnd(20)} ${mode.status}`,
          ).join('\n'),
        );
        break;
      case 'mode': {
        const mode = args[0] ? resolveMode(args[0]) : null;
        if (!mode) {
          print('error', 'usage: mode <1-8|A-H|id>');
          break;
        }
        print('success', `switching to ${getModeMeta(mode).title}…`);
        await executeTool('switch_mode', { mode }, { signal });
        break;
      }
      case 'windows':
        print(
          'output',
          HOLO_WINDOWS.map(
            (definition) =>
              `${definition.code}  ${definition.id.padEnd(9)} ${workspace.open[definition.id] ? 'open' : 'closed'}`,
          ).join('\n'),
        );
        break;
      case 'open':
      case 'close': {
        const id = resolveWindow(args[0]);
        if (!id) {
          print(
            'error',
            `usage: ${name} <${HOLO_WINDOWS.map((definition) => definition.id).join('|')}>`,
          );
          break;
        }
        workspace.setOpen(id, name === 'open');
        print('success', `${id} ${name === 'open' ? 'opened' : 'closed'}`);
        break;
      }
      case 'ambient': {
        const [key, value] = args;
        if (key === 'intensity' && value != null && Number.isFinite(Number(value))) {
          const intensity = Math.min(100, Math.max(0, Number(value))) / 100;
          workspace.setAmbient({ intensity });
          print('success', `ambient intensity ${Math.round(intensity * 100)}%`);
        } else if (
          key &&
          (AMBIENT_KEYS as readonly string[]).includes(key) &&
          (value === 'on' || value === 'off')
        ) {
          workspace.setAmbient({
            [key as keyof AmbientSettings]: value === 'on',
          } as Partial<AmbientSettings>);
          print('success', `${key} ${value}`);
        } else {
          print(
            'error',
            `usage: ambient <${AMBIENT_KEYS.join('|')}> on|off · ambient intensity <0-100>`,
          );
        }
        break;
      }
      case 'quality': {
        const level = args[0];
        if (level !== 'auto' && level !== 'low' && level !== 'medium' && level !== 'high') {
          print('error', 'usage: quality auto|low|medium|high');
          break;
        }
        const result = await executeTool('set_quality', { quality: level }, { signal });
        print(
          result.ok ? 'success' : 'error',
          result.ok ? `quality ${level} → rendering at ${result.output.effective}` : result.error,
        );
        break;
      }
      case 'echo':
        print('output', args.join(' '));
        break;
      case 'about':
        print(
          'output',
          `JARVIS ${APP_VERSION} · milestone ${CURRENT_MILESTONE} · holographic environment preview`,
        );
        break;
      default:
        print('error', `command not found: ${name} — type "help"`);
    }
  };

  return (
    <HolographicTerminal
      lines={lines}
      onSubmit={(command) => void run(command)}
      prompt="jarvis@holo:~$"
      busy={busy}
      placeholder="type help"
    />
  );
}
