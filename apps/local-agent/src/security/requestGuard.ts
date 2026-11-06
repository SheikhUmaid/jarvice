import { isLoopbackHost } from '@jarvis/shared';
import type { IncomingMessage } from 'node:http';

export type GuardResult = { ok: true } | { ok: false; status: number; reason: string };

/**
 * Checks every request before routing:
 * 1. the TCP peer is loopback (defence in depth on top of the loopback bind);
 * 2. the Host header names this agent — blocks DNS-rebinding attacks from web pages;
 * 3. a browser Origin, when present, is on the allowlist.
 */
export function guardRequest(
  request: IncomingMessage,
  port: number,
  allowedOrigins: Set<string>,
): GuardResult {
  if (!isLoopbackHost(request.socket.remoteAddress ?? '')) {
    return { ok: false, status: 403, reason: 'loopback clients only' };
  }
  const host = (request.headers.host ?? '').toLowerCase();
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
  if (!allowedHosts.includes(host)) {
    return { ok: false, status: 421, reason: 'unexpected Host header' };
  }
  const origin = request.headers.origin;
  if (origin != null && !allowedOrigins.has(origin)) {
    return { ok: false, status: 403, reason: 'origin not allowed' };
  }
  return { ok: true };
}

/** Fixed-window limiter keyed by peer address. */
export function createRateLimiter(max: number, windowMs: number) {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    const entry = windows.get(key);
    if (!entry || entry.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= max;
  };
}
