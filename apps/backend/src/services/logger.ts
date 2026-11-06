import type { LogLevel } from '../config';

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Minimal structured logger. Never pass secrets in `meta`. */
export function createLogger(scope: string, level: LogLevel): Logger {
  const write = (lineLevel: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (RANK[lineLevel] < RANK[level]) return;
    const line = `${new Date().toISOString()} ${lineLevel.toUpperCase().padEnd(5)} [${scope}] ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;
    if (lineLevel === 'error') console.error(line);
    else if (lineLevel === 'warn') console.warn(line);
    else console.log(line);
  };
  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  };
}
