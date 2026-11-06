import { z } from 'zod';

/** What the backend reports about its Claude integration. Never includes key material. */
export const AiStatusSchema = z.object({
  provider: z.literal('anthropic'),
  model: z.string(),
  keyConfigured: z.boolean(),
  /** True once the AI orchestrator ships (Milestone 4). */
  integrated: z.boolean(),
});
export type AiStatus = z.infer<typeof AiStatusSchema>;

export const BackendHealthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('jarvis-backend'),
  version: z.string(),
  startedAt: z.number(),
  uptimeSec: z.number(),
  serverTime: z.number(),
  ai: AiStatusSchema,
});
export type BackendHealth = z.infer<typeof BackendHealthSchema>;

export const AgentHealthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('jarvis-local-agent'),
  version: z.string(),
  platform: z.string(),
  paired: z.boolean(),
  /** Operations the agent can perform for a paired browser (empty until Milestone 8). */
  capabilities: z.array(z.string()),
});
export type AgentHealth = z.infer<typeof AgentHealthSchema>;
