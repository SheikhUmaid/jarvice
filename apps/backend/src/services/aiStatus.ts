import type { AiStatus } from '@jarvis/schemas';
import type { BackendConfig } from '../config';

/** Claude integration status for clients. Reports whether a key exists — never the key itself. */
export function getAiStatus(config: BackendConfig): AiStatus {
  return {
    provider: 'anthropic',
    model: config.claude.model,
    keyConfigured: Boolean(config.claude.apiKey),
    integrated: false, // The AI orchestrator ships in Milestone 4.
  };
}
