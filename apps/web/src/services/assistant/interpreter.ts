import { CURRENT_MILESTONE, getModeMeta, type ModeId } from '@jarvis/shared';
import { useConnection } from '../../store/connection';
import { useDevices } from '../../store/devices';
import { REASONING_OFFLINE, address, greetingForTime, vary } from './persona';
import { executeTool, type ToolContext, type ToolName } from './tools';

/**
 * Local command layer: deterministic intents for UI and system commands. It answers instantly
 * and stays as the fast path once Claude handles open-ended requests (Milestone 4).
 */
export interface Intent {
  name: string;
  /** Tool shown while executing (drives the EXECUTING reactor state). */
  tool?: ToolName;
  execute(context: ToolContext): Promise<string>;
}

/** Lower-case, strip a leading "jarvis", punctuation and politeness. */
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[“”"'’`]/g, '')
    .replace(/^\s*(hey|ok|okay)?\s*jarvis[\s,:-]*/, '')
    .replace(/\b(please|could you|can you|would you|kindly)\b/g, ' ')
    .replace(/[?!.,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ordered: more specific phrases first ("live vision" before "vision", "vision lab" before "lab"). */
const MODE_PATTERNS: ReadonlyArray<[ModeId, RegExp]> = [
  ['live-vision', /\b(live vision|live camera|camera|webcam)\b/],
  ['screen-intelligence', /\b(screen( intelligence| intel)?|my screen)\b/],
  ['vision', /\b(vision( lab(oratory)?)?|image (lab|processing))\b/],
  ['holographic', /\b(holo(graphic|gram)?s?|hologram)\b/],
  ['spatial', /\b(spatial|globe|earth|world map|map)\b/],
  ['laboratory', /\b(ai lab(oratory)?|lab(oratory)?|model settings)\b/],
  ['system', /\b(system( mode| monitor)?|hardware|processes)\b/],
  ['command', /\b(command( cent(er|re))?|home|main screen|reactor)\b/],
];

const NAVIGATION_VERB =
  /\b(open|go to|goto|switch to|show( me)?|launch|enter|take me to|bring up|navigate to|load|activate)\b/;

function findMode(text: string): ModeId | null {
  for (const [mode, pattern] of MODE_PATTERNS) if (pattern.test(text)) return mode;
  return null;
}

const reply = (name: string, text: string | (() => string)): Intent => ({
  name,
  execute: async () => (typeof text === 'string' ? text : text()),
});

const HELP = [
  'My local command layer handles:',
  '• “open the vision lab” — or any of the eight modes (keys 1–8, M for the mode wheel)',
  '• “what time is it?” · “run diagnostics” · “status”',
  '• “set quality to high / medium / low / auto” · “fullscreen”',
  '• “start listening” — live microphone visualiser (speech recognition: Milestone 3)',
  '• “clear” · “stop” (or Esc) to interrupt',
  'Open-ended questions need my reasoning core: Claude connects in Milestone 4.',
].join('\n');

type Rule = (text: string) => Intent | null;

const RULES: readonly Rule[] = [
  (text) =>
    /^(help|commands|what can you do|capabilities)\b/.test(text) ? reply('help', HELP) : null,

  (text) =>
    /^(clear|reset)( the)?( conversation| chat| transcript| screen| history)?$/.test(text)
      ? {
          name: 'clear',
          tool: 'clear_conversation',
          execute: async (context) => {
            const result = await executeTool('clear_conversation', {}, context);
            return result.ok ? 'Transcript cleared.' : `I couldn't clear it: ${result.error}.`;
          },
        }
      : null,

  (text) => {
    const on =
      /\b(start listening|listen( to me)?|mic(rophone)? on|turn on( the)? mic(rophone)?|enable( the)? mic(rophone)?)\b/.test(
        text,
      );
    const off =
      /\b(stop listening|mic(rophone)? off|turn off( the)? mic(rophone)?|disable( the)? mic(rophone)?|mute)\b/.test(
        text,
      );
    if (!on && !off) return null;
    return {
      name: 'microphone',
      tool: 'set_microphone',
      execute: async (context) => {
        const result = await executeTool('set_microphone', { enabled: on && !off }, context);
        if (!result.ok) return `The microphone didn't cooperate: ${result.error}.`;
        const { status, error } = result.output;
        if (status === 'live') {
          return 'Microphone live — the reactor is following your voice. Nothing is recorded or sent anywhere; speech recognition arrives in Milestone 3.';
        }
        if (status === 'off') return 'Microphone off.';
        if (status === 'denied')
          return 'Microphone access was denied. You can allow it from the site settings in your browser.';
        return error ? `Microphone unavailable: ${error}` : 'The microphone is unavailable.';
      },
    };
  },

  (text) => {
    if (!/\bfull ?screen\b/.test(text)) return null;
    const exit = /\b(exit|leave|close|off|stop)\b/.test(text);
    return {
      name: 'fullscreen',
      tool: 'toggle_fullscreen',
      execute: async (context) => {
        const result = await executeTool(
          'toggle_fullscreen',
          exit ? { enabled: false } : {},
          context,
        );
        if (!result.ok) return `Fullscreen was refused: ${result.error}. The F key works too.`;
        return result.output.fullscreen ? 'Fullscreen engaged.' : 'Back to windowed mode.';
      },
    };
  },

  (text) => {
    const match =
      /\b(quality|graphics|visuals?)\b.*\b(auto|low|medium|high)\b|\b(auto|low|medium|high)\b.*\b(quality|graphics)\b/.exec(
        text,
      );
    if (!match) return null;
    const level = (match[2] ?? match[3]) as 'auto' | 'low' | 'medium' | 'high';
    return {
      name: 'quality',
      tool: 'set_quality',
      execute: async (context) => {
        const result = await executeTool('set_quality', { quality: level }, context);
        if (!result.ok) return `Quality change failed: ${result.error}.`;
        return level === 'auto'
          ? `Automatic quality — currently ${result.output.effective}. I'll adapt to the frame rate.`
          : `Visual quality set to ${level}.`;
      },
    };
  },

  (text) =>
    /\b(diagnostics?|system(s)? check|status( report)?|health check|how are you)\b/.test(text)
      ? {
          name: 'diagnostics',
          tool: 'run_diagnostics',
          execute: async (context) => {
            const result = await executeTool('run_diagnostics', {}, context);
            if (!result.ok) return `Diagnostics failed: ${result.error}.`;
            const r = result.output;
            const opener = /how are you/.test(text)
              ? 'Running smoothly, thank you.'
              : 'Diagnostics complete.';
            const backend =
              r.backendLatencyMs == null
                ? 'The backend link is down — start it with `pnpm dev:backend`.'
                : `Backend link nominal at ${r.backendLatencyMs} ms.`;
            const agent =
              r.agent === 'online'
                ? 'Local agent reachable, awaiting pairing (Milestone 8).'
                : 'Local agent not running.';
            const mic = r.mic === 'live' ? 'Microphone live.' : 'Microphone idle.';
            return `${opener} Rendering at ${r.fps} fps (${r.frameMs} ms a frame) on ${r.gpu}, ${r.quality} quality. ${backend} ${agent} ${mic}`;
          },
        }
      : null,

  (text) =>
    /\b(what time|the time|time is it|current time|what day|the date|date today|todays date|what is today)\b/.test(
      text,
    )
      ? {
          name: 'time',
          tool: 'get_current_time',
          execute: async (context) => {
            const result = await executeTool('get_current_time', {}, context);
            if (!result.ok) return `My clock failed: ${result.error}.`;
            const { time, date, timezone, utcOffset } = result.output;
            return `It's ${time} on ${date}. Clock zone ${timezone}, ${utcOffset}.`;
          },
        }
      : null,

  (text) => {
    const mode = findMode(text);
    if (!mode) return null;
    const explicit =
      NAVIGATION_VERB.test(text) || /\bmode\b/.test(text) || text.split(' ').length <= 3;
    if (!explicit) return null;
    return {
      name: 'navigate',
      tool: 'switch_mode',
      execute: async (context) => {
        const result = await executeTool('switch_mode', { mode }, context);
        if (!result.ok) return `I couldn't open that: ${result.error}.`;
        const meta = getModeMeta(mode);
        if (meta.milestone <= CURRENT_MILESTONE) return `${meta.title}${address()}.`;
        if (mode === 'holographic' || mode === 'spatial' || mode === 'system') {
          return `${meta.title} — preview build. The full module lands in Milestone ${meta.milestone}.`;
        }
        return `${meta.title}. It comes online in Milestone ${meta.milestone}; the module shows what's planned.`;
      },
    };
  },

  (text) =>
    /^(hi|hello|hey|good (morning|afternoon|evening)|greetings|yo|sup)\b/.test(text) || text === ''
      ? reply(
          'greeting',
          () =>
            `${greetingForTime()}${address()}. ${vary(['All systems are online.', 'Systems nominal.', 'Standing by.'])} What do you need?`,
        )
      : null,

  (text) =>
    /\b(who are you|what are you|your name|introduce yourself)\b/.test(text)
      ? reply(
          'identity',
          'JARVIS — your personal operating environment. I am running Milestone 1 today: the interface, the reactor and a local command layer. My reasoning core joins in Milestone 4.',
        )
      : null,

  (text) =>
    /\b(thanks|thank you|cheers|nice work|good job)\b/.test(text)
      ? reply('thanks', () => `${vary(['You’re welcome', 'Anytime', 'My pleasure'])}${address()}.`)
      : null,
];

export function interpret(raw: string): Intent {
  const text = normalize(raw);
  for (const rule of RULES) {
    const intent = rule(text);
    if (intent) return intent;
  }
  return reply('reasoning-offline', () => {
    const keyConfigured = useConnection.getState().backend.ai?.keyConfigured;
    const micLive = useDevices.getState().mic === 'live';
    let text = REASONING_OFFLINE;
    if (keyConfigured) text += ' Your API key is already configured on the backend.';
    if (micLive) text += ' (The microphone is live, but I can’t transcribe yet.)';
    return text;
  });
}
