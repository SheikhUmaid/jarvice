import { z } from 'zod';
import { AiStatusSchema } from './health';

export const WS_PATH = '/ws';
export const MAX_WS_MESSAGE_BYTES = 64 * 1024;

// ── Client → server ───────────────────────────────────────────────────────────

export const PingMessageSchema = z.object({
  type: z.literal('ping'),
  id: z.string().min(1).max(64),
  sentAt: z.number(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [PingMessageSchema]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ── Server → client ───────────────────────────────────────────────────────────

export const WelcomeMessageSchema = z.object({
  type: z.literal('welcome'),
  server: z.object({ version: z.string(), startedAt: z.number() }),
  ai: AiStatusSchema,
  serverTime: z.number(),
});

export const PongMessageSchema = z.object({
  type: z.literal('pong'),
  id: z.string(),
  sentAt: z.number(),
  serverTime: z.number(),
});

export const HeartbeatMessageSchema = z.object({
  type: z.literal('heartbeat'),
  serverTime: z.number(),
  uptimeSec: z.number(),
  clients: z.number().int().nonnegative(),
});

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  WelcomeMessageSchema,
  PongMessageSchema,
  HeartbeatMessageSchema,
  ErrorMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// ── Decoding ──────────────────────────────────────────────────────────────────

export type DecodeResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Parses JSON (when given a string) and validates it against `schema`. Never throws. */
export function decodeMessage<T>(schema: z.ZodType<T>, raw: unknown): DecodeResult<T> {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'Message is not valid JSON' };
    }
  }
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  const issue = result.error.issues[0];
  return {
    ok: false,
    error: issue ? `${issue.path.join('.') || 'message'}: ${issue.message}` : 'Invalid message',
  };
}
