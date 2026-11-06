import type { BackendHealth } from '@jarvis/schemas';
import { APP_VERSION } from '@jarvis/shared';
import { Router } from 'express';
import type { BackendConfig } from '../config';
import { getAiStatus } from '../services/aiStatus';

export function healthRouter({
  config,
  startedAt,
}: {
  config: BackendConfig;
  startedAt: number;
}): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    const now = Date.now();
    const body: BackendHealth = {
      status: 'ok',
      service: 'jarvis-backend',
      version: APP_VERSION,
      startedAt,
      uptimeSec: Math.round((now - startedAt) / 1000),
      serverTime: now,
      ai: getAiStatus(config),
    };
    res.json(body);
  });
  return router;
}
