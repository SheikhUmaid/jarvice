import type { AgentHealth } from '@jarvis/schemas';
import { APP_VERSION } from '@jarvis/shared';
import { createServer, type ServerResponse } from 'node:http';
import { loadConfig } from './config';
import { createRateLimiter, guardRequest } from './security/requestGuard';

/*
 * JARVIS local agent — Milestone 1 scope: a hardened, loopback-only health endpoint.
 * Pairing, allowlisted operations (apps, directories, scripts), system metrics and the audit log
 * arrive in Milestone 8. There is deliberately no command execution of any kind here.
 */

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
} catch (error) {
  console.error(`[agent] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const log = (message: string, meta?: Record<string, unknown>) =>
  console.log(
    `${new Date().toISOString()} INFO  [agent] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`,
  );

const allowRequest = createRateLimiter(120, 60_000);

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  const verdict = guardRequest(request, config.port, config.allowedOrigins);
  if (!verdict.ok) {
    log('Request refused', { status: verdict.status, reason: verdict.reason });
    send(response, verdict.status, { error: verdict.reason });
    return;
  }
  if (!allowRequest(request.socket.remoteAddress ?? 'unknown')) {
    send(response, 429, { error: 'rate-limited' });
    return;
  }

  const origin = request.headers.origin;
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    response.end();
    return;
  }

  const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host}`);
  if (request.method === 'GET' && pathname === '/health') {
    const body: AgentHealth = {
      status: 'ok',
      service: 'jarvis-local-agent',
      version: APP_VERSION,
      platform: process.platform,
      paired: false,
      capabilities: [],
    };
    send(response, 200, body);
    return;
  }
  send(response, 404, { error: 'not-found' });
});

server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.keepAliveTimeout = 5000;

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(
    `[agent] ${error.code === 'EADDRINUSE' ? `Port ${config.port} is already in use — is the agent already running?` : error.message}`,
  );
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  log(`JARVIS local agent listening on http://${config.host}:${config.port} (loopback only)`, {
    env: config.envFile ?? 'defaults (no .env)',
    origins: [...config.allowedOrigins],
    platform: process.platform,
    capabilities: 'none until pairing (Milestone 8)',
  });
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
