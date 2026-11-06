import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from '../services/logger';

/** Conservative headers for a JSON-only API. */
export function securityHeaders(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    next();
  };
}

/** CORS for the configured web origins only. Cross-origin requests from anywhere else are refused. */
export function corsAllowlist(allowed: Set<string>): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    const permitted = origin != null && allowed.has(origin);
    if (permitted) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.status(permitted ? 204 : 403).end();
      return;
    }
    if (origin != null && !permitted) {
      res.status(403).json({ error: 'origin-not-allowed' });
      return;
    }
    next();
  };
}

/** Fixed-window rate limit per client address. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const key = req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 1000)
        for (const [address, value] of hits) if (value.resetAt <= now) hits.delete(address);
      next();
      return;
    }
    entry.count++;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: 'rate-limited' });
      return;
    }
    next();
  };
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'not-found' });
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 500;
    if (status >= 500)
      logger.error('Unhandled request error', {
        message: error instanceof Error ? error.message : String(error),
      });
    res.status(status).json({ error: status >= 500 ? 'internal-error' : 'bad-request' });
  };
}
