import express from 'express';
import { createServer } from 'node:http';
import { healthRouter } from './api/health';
import { loadConfig } from './config';
import {
  corsAllowlist,
  errorHandler,
  notFound,
  rateLimit,
  securityHeaders,
} from './middleware/security';
import { getAiStatus } from './services/aiStatus';
import { createLogger } from './services/logger';
import { attachWebSocketHub } from './websocket/hub';

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
} catch (error) {
  console.error(`[backend] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const logger = createLogger('backend', config.logLevel);
const startedAt = Date.now();

const app = express();
app.disable('x-powered-by');
app.use(securityHeaders());
app.use(corsAllowlist(config.allowedOrigins));
app.use(express.json({ limit: '64kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 240 }), healthRouter({ config, startedAt }));
app.use(notFound);
app.use(errorHandler(logger));

const server = createServer(app);
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;

const hub = attachWebSocketHub(server, {
  allowedOrigins: config.allowedOrigins,
  startedAt,
  ai: () => getAiStatus(config),
  logger,
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE')
    logger.error(`Port ${config.port} is already in use — is the backend already running?`);
  else logger.error('Server error', { message: error.message });
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  const ai = getAiStatus(config);
  logger.info(`JARVIS backend listening on http://${config.host}:${config.port}`, {
    env: config.envFile ?? 'defaults (no .env)',
    origins: [...config.allowedOrigins],
    claude: { model: ai.model, keyConfigured: ai.keyConfigured, integrated: ai.integrated },
  });
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down`);
  hub.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
