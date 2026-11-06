import {
  ClientMessageSchema,
  MAX_WS_MESSAGE_BYTES,
  WS_PATH,
  decodeMessage,
  type AiStatus,
  type ServerMessage,
} from '@jarvis/schemas';
import { APP_VERSION } from '@jarvis/shared';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import type { Logger } from '../services/logger';

const HEARTBEAT_MS = 10_000;
/** Per-connection message budget (token bucket). */
const BURST = 30;
const REFILL_PER_SECOND = 15;

interface HubOptions {
  allowedOrigins: Set<string>;
  startedAt: number;
  ai: () => AiStatus;
  logger: Logger;
}

interface ClientState {
  alive: boolean;
  tokens: number;
  lastRefill: number;
}

function reject(socket: Duplex, status: string) {
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

/**
 * Typed WebSocket hub on /ws. Upgrades are accepted only from allowlisted browser origins
 * (prevents cross-site WebSocket hijacking); every message is schema-validated and rate-limited.
 */
export function attachWebSocketHub(server: Server, options: HubOptions) {
  const { allowedOrigins, startedAt, ai, logger } = options;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_MESSAGE_BYTES });
  const clients = new Map<WebSocket, ClientState>();

  const send = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    if (pathname !== WS_PATH) return reject(socket, '404 Not Found');
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.has(origin)) {
      logger.warn('WebSocket upgrade refused: origin not allowed', { origin: origin ?? null });
      return reject(socket, '403 Forbidden');
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    clients.set(socket, { alive: true, tokens: BURST, lastRefill: Date.now() });
    logger.info('Client connected', { origin: request.headers.origin, clients: clients.size });
    send(socket, {
      type: 'welcome',
      server: { version: APP_VERSION, startedAt },
      ai: ai(),
      serverTime: Date.now(),
    });

    socket.on('pong', () => {
      const state = clients.get(socket);
      if (state) state.alive = true;
    });

    socket.on('message', (data, isBinary) => {
      const state = clients.get(socket);
      if (!state) return;
      const now = Date.now();
      state.tokens = Math.min(
        BURST,
        state.tokens + ((now - state.lastRefill) / 1000) * REFILL_PER_SECOND,
      );
      state.lastRefill = now;
      if (state.tokens < 1) {
        logger.warn('Client exceeded message rate; closing');
        socket.close(1008, 'rate limit exceeded');
        return;
      }
      state.tokens -= 1;

      if (isBinary) {
        send(socket, {
          type: 'error',
          code: 'unsupported',
          message: 'Binary frames are not accepted',
        });
        return;
      }
      const decoded = decodeMessage(ClientMessageSchema, data.toString());
      if (!decoded.ok) {
        send(socket, { type: 'error', code: 'invalid-message', message: decoded.error });
        return;
      }
      const message = decoded.value;
      switch (message.type) {
        case 'ping':
          send(socket, {
            type: 'pong',
            id: message.id,
            sentAt: message.sentAt,
            serverTime: Date.now(),
          });
          break;
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
      logger.info('Client disconnected', { clients: clients.size });
    });
    socket.on('error', (error) => logger.warn('Socket error', { message: error.message }));
  });

  const heartbeat = setInterval(() => {
    for (const [socket, state] of clients) {
      if (!state.alive) {
        socket.terminate();
        clients.delete(socket);
        continue;
      }
      state.alive = false;
      socket.ping();
      send(socket, {
        type: 'heartbeat',
        serverTime: Date.now(),
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        clients: clients.size,
      });
    }
  }, HEARTBEAT_MS);

  return {
    clientCount: () => clients.size,
    close() {
      clearInterval(heartbeat);
      for (const socket of clients.keys()) socket.close(1001, 'server shutting down');
      wss.close();
    },
  };
}
