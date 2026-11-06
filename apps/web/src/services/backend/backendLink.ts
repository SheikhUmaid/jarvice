import { ServerMessageSchema, WS_PATH, decodeMessage, type ClientMessage } from '@jarvis/schemas';
import { logActivity } from '../../store/activity';
import { useConnection } from '../../store/connection';
import { createId } from '../../utils/id';

const PING_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 15000;

/**
 * WebSocket link to the backend (proxied through Vite in development): typed messages, latency
 * from ping/pong round-trips, exponential-backoff reconnects. Reference counted via `acquire()`.
 */
class BackendLink {
  private socket: WebSocket | null = null;
  private users = 0;
  private retries = 0;
  private retryTimer = 0;
  private pingTimer = 0;
  private releaseTimer = 0;
  private everOnline = false;
  private pendingPings = new Map<string, number>();
  private latencyWaiters: Array<(latency: number) => void> = [];

  acquire(): () => void {
    this.users++;
    window.clearTimeout(this.releaseTimer);
    if (this.users === 1 && !this.socket) this.connect();
    return () => {
      this.users = Math.max(0, this.users - 1);
      // Deferred so an immediate re-acquire (React StrictMode remount) keeps the socket open
      // instead of closing it mid-handshake.
      if (this.users === 0) {
        this.releaseTimer = window.setTimeout(() => {
          if (this.users === 0) this.disconnect();
        }, 250);
      }
    };
  }

  /** Fresh round-trip measurement; resolves null when offline or after `timeoutMs`. */
  measureLatency(timeoutMs = 1500): Promise<number | null> {
    if (this.socket?.readyState !== WebSocket.OPEN) return Promise.resolve(null);
    return new Promise((resolve) => {
      const done = (latency: number) => {
        window.clearTimeout(timer);
        resolve(latency);
      };
      const timer = window.setTimeout(() => {
        this.latencyWaiters = this.latencyWaiters.filter((waiter) => waiter !== done);
        resolve(null);
      }, timeoutMs);
      this.latencyWaiters.push(done);
      this.ping();
    });
  }

  private connect(): void {
    window.clearTimeout(this.retryTimer);
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let socket: WebSocket;
    try {
      socket = new WebSocket(`${protocol}://${window.location.host}${WS_PATH}`);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.retries = 0;
      this.ping();
      this.pingTimer = window.setInterval(() => this.ping(), PING_INTERVAL_MS);
    };
    socket.onmessage = (event) => this.handle(event.data);
    socket.onclose = () => {
      this.release();
      if (this.users > 0) this.scheduleReconnect();
    };
  }

  private handle(raw: unknown): void {
    if (typeof raw !== 'string') return;
    const decoded = decodeMessage(ServerMessageSchema, raw);
    if (!decoded.ok) {
      console.warn('[backend] ignored invalid message:', decoded.error);
      return;
    }
    const message = decoded.value;
    const store = useConnection.getState();
    switch (message.type) {
      case 'welcome':
        store.setBackend({
          status: 'online',
          version: message.server.version,
          startedAt: message.server.startedAt,
          uptimeSec: Math.round((message.serverTime - message.server.startedAt) / 1000),
          ai: message.ai,
        });
        logActivity(
          'link',
          this.everOnline ? 'Backend link restored' : 'Backend link established',
          {
            level: 'success',
            detail: `backend v${message.server.version}`,
          },
        );
        this.everOnline = true;
        break;
      case 'pong': {
        const sentAt = this.pendingPings.get(message.id);
        if (sentAt == null) break;
        this.pendingPings.delete(message.id);
        const latency = performance.now() - sentAt;
        store.setBackend({ latencyMs: latency });
        this.latencyWaiters.splice(0).forEach((waiter) => waiter(latency));
        break;
      }
      case 'heartbeat':
        store.setBackend({ uptimeSec: message.uptimeSec, clients: message.clients });
        break;
      case 'error':
        logActivity('link', `Backend rejected a message: ${message.message}`, {
          level: 'warn',
          detail: message.code,
        });
        break;
    }
  }

  private ping(): void {
    const socket = this.socket;
    if (socket?.readyState !== WebSocket.OPEN) return;
    const id = createId('ping');
    this.pendingPings.set(id, performance.now());
    if (this.pendingPings.size > 16) {
      const oldest = this.pendingPings.keys().next().value;
      if (oldest) this.pendingPings.delete(oldest);
    }
    const message: ClientMessage = { type: 'ping', id, sentAt: Date.now() };
    socket.send(JSON.stringify(message));
  }

  /** Detaches the current socket and marks the link offline. */
  private release(): void {
    window.clearInterval(this.pingTimer);
    this.pendingPings.clear();
    const socket = this.socket;
    if (socket) socket.onopen = socket.onmessage = socket.onclose = null;
    this.socket = null;
    const store = useConnection.getState();
    if (store.backend.status === 'online')
      logActivity('link', 'Backend link lost', { level: 'warn' });
    store.setBackend({ status: 'offline', latencyMs: null });
  }

  private scheduleReconnect(): void {
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.retries) * (0.75 + Math.random() * 0.5);
    this.retries++;
    this.retryTimer = window.setTimeout(() => {
      if (this.users > 0) this.connect();
    }, delay);
  }

  private disconnect(): void {
    window.clearTimeout(this.retryTimer);
    const socket = this.socket;
    this.release();
    socket?.close(1000, 'client closed');
  }
}

export const backendLink = new BackendLink();
