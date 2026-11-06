import { logActivity } from '../../store/activity';
import { useConversation, type MessageSource } from '../../store/conversation';
import { useCore } from '../../store/core';
import { useDevices } from '../../store/devices';
import { truncate } from '../../utils/format';
import { isAbortError, sleep } from '../../utils/id';
import { feedSpeech, silenceSpeech } from '../audio/speechEnvelope';
import { interpret, normalize } from './interpreter';
import { greetingForTime, address } from './persona';

/*
 * Assistant pipeline: user input → THINKING (interpret) → EXECUTING (tool) → SPEAKING (stream the
 * reply) → IDLE, or LISTENING while the microphone is live. Interrupt returns to rest from any
 * state. Local intents resolve in microseconds, so THINKING/EXECUTING are held for a short
 * perceptual minimum to stay legible; any real work (e.g. diagnostics) simply takes longer.
 */

const MIN_THINKING_MS = 420;
const MIN_EXECUTING_MS = 600;
const STREAM_CHUNK = 3;
const STREAM_TICK_MS = 24;
const STOP_WORDS = /^(stop|cancel|abort|interrupt|never mind|nevermind|be quiet|silence|enough)$/;

let active: AbortController | null = null;

function restingState() {
  silenceSpeech();
  useCore.getState().setStatus(useDevices.getState().mic === 'live' ? 'listening' : 'idle');
}

async function holdAtLeast(since: number, minimumMs: number, signal: AbortSignal) {
  const remaining = minimumMs - (performance.now() - since);
  if (remaining > 0) await sleep(remaining, signal);
}

/** Streams a reply into the transcript while the reactor is SPEAKING. */
async function speak(text: string, signal: AbortSignal): Promise<void> {
  useCore.getState().setStatus('speaking');
  const conversation = useConversation.getState();
  const id = conversation.add({
    role: 'assistant',
    text: '',
    status: 'streaming',
    source: 'local',
  });
  for (let index = 0; index < text.length; index += STREAM_CHUNK) {
    const chunk = text.slice(index, index + STREAM_CHUNK);
    useConversation.getState().append(id, chunk);
    feedSpeech(chunk);
    await sleep(STREAM_TICK_MS, signal);
  }
  useConversation.getState().finish(id, 'done');
}

/** Runs one command end to end. A new command supersedes the one in progress. */
export async function submitCommand(raw: string, source: MessageSource = 'text'): Promise<void> {
  const text = raw.trim();
  if (!text) return;
  if (STOP_WORDS.test(normalize(text))) {
    interrupt('voice command');
    return;
  }

  interrupt();
  const controller = new AbortController();
  active = controller;
  const { signal } = controller;

  useConversation.getState().add({ role: 'user', text, status: 'done', source });
  logActivity('command', truncate(text, 64), { detail: source === 'text' ? undefined : source });

  try {
    useCore.getState().setStatus('thinking');
    const thinkingSince = performance.now();
    const intent = interpret(text);
    await holdAtLeast(thinkingSince, MIN_THINKING_MS, signal);

    let reply: string;
    if (intent.tool) {
      useCore.getState().setStatus('executing', intent.tool);
      const executingSince = performance.now();
      reply = await intent.execute({ signal });
      await holdAtLeast(executingSince, MIN_EXECUTING_MS, signal);
    } else {
      reply = await intent.execute({ signal });
    }
    await speak(reply, signal);
  } catch (error) {
    if (!isAbortError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      logActivity('command', 'Command failed', { level: 'error', detail: message });
      useConversation.getState().add({
        role: 'assistant',
        text: `Something went wrong while handling that: ${message}`,
        status: 'error',
        source: 'local',
      });
    }
  } finally {
    if (active === controller) {
      active = null;
      restingState();
    }
  }
}

/** Stops the response in progress. Returns false when there was nothing to interrupt. */
export function interrupt(reason?: string): boolean {
  const controller = active;
  if (!controller) return false;
  active = null;
  controller.abort();
  const { messages, finish } = useConversation.getState();
  messages
    .filter((message) => message.status === 'streaming')
    .forEach((message) => finish(message.id, 'interrupted'));
  restingState();
  if (reason) logActivity('command', 'Response interrupted', { level: 'warn', detail: reason });
  return true;
}

export function isResponding(): boolean {
  return active != null;
}

/** Keeps LISTENING in step with the microphone while nothing else is happening. */
export function bindCoreToDevices(): () => void {
  return useDevices.subscribe((state, previous) => {
    if (state.mic === previous.mic) return;
    const core = useCore.getState();
    if (state.mic === 'live' && core.status === 'idle') core.setStatus('listening');
    if (state.mic !== 'live' && core.status === 'listening') core.setStatus('idle');
  });
}

/** Boot greeting, delivered through the normal speaking pipeline once the interface is up. */
export function greetOnBoot(): () => void {
  const controller = new AbortController();
  const timer = window.setTimeout(async () => {
    if (active || useConversation.getState().messages.length > 0) return;
    active = controller;
    try {
      await speak(
        `${greetingForTime()}${address()}. Interface online — reactor, all eight modes and the local command layer are ready. My reasoning core links to Claude in Milestone 4; until then, say “help”.`,
        controller.signal,
      );
    } catch {
      // Interrupted by the user — fine.
    } finally {
      if (active === controller) {
        active = null;
        restingState();
      }
    }
  }, 1100);
  return () => {
    window.clearTimeout(timer);
    if (active === controller) interrupt();
  };
}
