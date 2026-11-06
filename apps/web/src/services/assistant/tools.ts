import { MODE_IDS, getModeMeta } from '@jarvis/shared';
import { z } from 'zod';
import { fullscreenSupported, toggleFullscreen } from '../../hooks/useFullscreen';
import { logActivity } from '../../store/activity';
import { useConversation } from '../../store/conversation';
import { useDevices } from '../../store/devices';
import { selectQualityLevel, useSettings } from '../../store/settings';
import { useToolRuns } from '../../store/tools';
import { useUi } from '../../store/ui';
import { formatUtcOffset } from '../../utils/format';
import { isAbortError } from '../../utils/id';
import { agentProbe } from '../agent/agentProbe';
import { micMonitor } from '../audio/micMonitor';
import { backendLink } from '../backend/backendLink';
import { getEnvironmentSnapshot } from '../telemetry/environment';
import { sampleFps } from '../telemetry/frameMonitor';
import { getWebGLInfo, shortRendererName } from '../telemetry/webgl';

/**
 * Who must approve a call. Milestone 1 tools are only ever invoked by the user's own command, so
 * the tier is informational; from Milestone 4 the permission gate enforces it for model-initiated
 * calls (`confirm`/`sensitive` → confirmation UI).
 */
export type PermissionTier = 'safe' | 'confirm' | 'sensitive';

export interface ToolContext {
  signal: AbortSignal;
}

/** Every tool: name, description, validated input schema, permission, handler, structured output. */
export interface ClientTool<Input, Output> {
  name: string;
  description: string;
  permission: PermissionTier;
  input: z.ZodType<Input>;
  run(input: Input, context: ToolContext): Promise<Output>;
  /** One-line summary for the activity timeline and the tools panel. */
  summarize(output: Output): string;
}

const defineTool = <Input, Output>(tool: ClientTool<Input, Output>) => tool;

export const tools = {
  get_current_time: defineTool({
    name: 'get_current_time',
    description: 'Current local date, time and time zone.',
    permission: 'safe',
    input: z.object({}).strict(),
    async run() {
      const now = new Date();
      return {
        iso: now.toISOString(),
        time: now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcOffset: formatUtcOffset(now),
      };
    },
    summarize: (output) => `${output.time} · ${output.timezone}`,
  }),

  switch_mode: defineTool({
    name: 'switch_mode',
    description: 'Open one of the eight interface modes.',
    permission: 'safe',
    input: z.object({ mode: z.enum(MODE_IDS) }).strict(),
    async run({ mode }) {
      useUi.getState().setMode(mode, 'command');
      const meta = getModeMeta(mode);
      return { mode, code: meta.code, title: meta.title, milestone: meta.milestone };
    },
    summarize: (output) => `Mode ${output.code} · ${output.title}`,
  }),

  set_quality: defineTool({
    name: 'set_quality',
    description: 'Set the visual quality tier (auto, low, medium or high).',
    permission: 'safe',
    input: z.object({ quality: z.enum(['auto', 'low', 'medium', 'high']) }).strict(),
    async run({ quality }) {
      useSettings.getState().setQuality(quality);
      const effective = selectQualityLevel(useSettings.getState());
      logActivity('settings', `Quality → ${quality}`, { detail: `rendering at ${effective}` });
      return { quality, effective };
    },
    summarize: (output) => `${output.quality} (${output.effective})`,
  }),

  toggle_fullscreen: defineTool({
    name: 'toggle_fullscreen',
    description: 'Enter or leave fullscreen.',
    permission: 'safe',
    input: z.object({ enabled: z.boolean().optional() }).strict(),
    async run({ enabled }) {
      if (!fullscreenSupported()) throw new Error('Fullscreen is not available in this browser');
      return { fullscreen: await toggleFullscreen(enabled) };
    },
    summarize: (output) => (output.fullscreen ? 'fullscreen on' : 'fullscreen off'),
  }),

  set_microphone: defineTool({
    name: 'set_microphone',
    description: 'Start or stop the microphone level monitor (no recording, no recognition yet).',
    permission: 'confirm',
    input: z.object({ enabled: z.boolean() }).strict(),
    async run({ enabled }) {
      if (enabled) await micMonitor.start();
      else micMonitor.stop();
      const { mic, micError } = useDevices.getState();
      return { status: mic, error: micError };
    },
    summarize: (output) => output.error ?? `microphone ${output.status}`,
  }),

  run_diagnostics: defineTool({
    name: 'run_diagnostics',
    description: 'Measure render rate, backend latency and local agent reachability.',
    permission: 'safe',
    input: z.object({}).strict(),
    async run(_input, { signal }) {
      const [render, latencyMs, agent] = await Promise.all([
        sampleFps(1000, signal),
        backendLink.measureLatency(1500),
        agentProbe.probe(),
      ]);
      const webgl = getWebGLInfo();
      const environment = getEnvironmentSnapshot();
      return {
        fps: Math.round(render.fps),
        frameMs: Math.round(render.frameMs * 10) / 10,
        gpu: webgl.webgl2 ? shortRendererName(webgl.renderer) : 'WebGL 2 unavailable',
        quality: selectQualityLevel(useSettings.getState()),
        backendLatencyMs: latencyMs == null ? null : Math.round(latencyMs),
        agent,
        mic: useDevices.getState().mic,
        online: environment.online,
        jsHeapMb: environment.jsHeap ? Math.round(environment.jsHeap.usedBytes / 1048576) : null,
      };
    },
    summarize: (output) =>
      `${output.fps} fps · backend ${output.backendLatencyMs == null ? 'offline' : `${output.backendLatencyMs} ms`} · agent ${output.agent}`,
  }),

  clear_conversation: defineTool({
    name: 'clear_conversation',
    description: 'Clear the current conversation transcript.',
    permission: 'confirm',
    input: z.object({}).strict(),
    async run() {
      const count = useConversation.getState().messages.length;
      useConversation.getState().clear();
      return { cleared: count };
    },
    summarize: (output) => `${output.cleared} messages cleared`,
  }),
};

type Tools = typeof tools;
export type ToolName = keyof Tools;
export type ToolInput<N extends ToolName> =
  Tools[N] extends ClientTool<infer I, infer _O> ? I : never;
export type ToolOutput<N extends ToolName> =
  Tools[N] extends ClientTool<infer _I, infer O> ? O : never;
export type ToolResult<Output> = { ok: true; output: Output } | { ok: false; error: string };

/**
 * Validates the input, records the run (tools panel + timeline) and executes the handler.
 * Errors become structured results; cancellation propagates as an AbortError.
 */
export async function executeTool<N extends ToolName>(
  name: N,
  input: ToolInput<N>,
  context: ToolContext,
): Promise<ToolResult<ToolOutput<N>>> {
  const tool = tools[name] as unknown as ClientTool<ToolInput<N>, ToolOutput<N>>;
  const parsed = tool.input.safeParse(input);
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? 'invalid input';
    logActivity('tool', `${name} rejected`, { level: 'error', detail: error });
    return { ok: false, error };
  }
  const runs = useToolRuns.getState();
  const runId = runs.start(name);
  try {
    const output = await tool.run(parsed.data, context);
    const summary = tool.summarize(output);
    runs.finish(runId, 'success', summary);
    logActivity('tool', name, { level: 'success', detail: summary });
    return { ok: true, output };
  } catch (error) {
    if (isAbortError(error)) {
      runs.finish(runId, 'cancelled', 'interrupted');
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    runs.finish(runId, 'error', message);
    logActivity('tool', `${name} failed`, { level: 'error', detail: message });
    return { ok: false, error: message };
  }
}
