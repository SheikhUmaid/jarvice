import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_PORTS,
  expandLoopbackOrigins,
  isLoopbackHost,
  splitList,
} from '@jarvis/shared';
import { z } from 'zod';
import { blankToUndefined, loadRootEnv } from './env';

const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema);

const EnvSchema = z.object({
  JARVIS_BACKEND_HOST: optional(z.string().default('127.0.0.1')),
  JARVIS_BACKEND_PORT: optional(
    z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORTS.backend),
  ),
  /** Explicit opt-in to listen on a non-loopback interface (not recommended). */
  JARVIS_BACKEND_ALLOW_LAN: optional(z.enum(['true', 'false']).default('false')),
  JARVIS_WEB_ORIGIN: optional(
    z.string().default(`http://localhost:${DEFAULT_PORTS.web},http://localhost:4173`),
  ),
  JARVIS_LOG_LEVEL: optional(z.enum(['debug', 'info', 'warn', 'error']).default('info')),
  ANTHROPIC_API_KEY: optional(z.string().optional()),
  JARVIS_CLAUDE_MODEL: optional(z.string().min(1).default(DEFAULT_CLAUDE_MODEL)),
  JARVIS_CLAUDE_EFFORT: optional(
    z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('medium'),
  ),
});

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface BackendConfig {
  host: string;
  port: number;
  allowedOrigins: Set<string>;
  logLevel: LogLevel;
  envFile: string | null;
  claude: {
    model: string;
    effort: string;
    /** Never logged or sent anywhere — only its presence is reported. */
    apiKey: string | undefined;
  };
}

/** Reads and validates configuration. Throws with a readable message on invalid values. */
export function loadConfig(): BackendConfig {
  const envFile = loadRootEnv();
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid backend configuration:\n${details}`);
  }
  const env = parsed.data;

  if (!isLoopbackHost(env.JARVIS_BACKEND_HOST) && env.JARVIS_BACKEND_ALLOW_LAN !== 'true') {
    throw new Error(
      `Refusing to listen on ${env.JARVIS_BACKEND_HOST}: the backend is loopback-only by default. ` +
        'Set JARVIS_BACKEND_ALLOW_LAN=true to override (exposes JARVIS to your network).',
    );
  }

  let allowedOrigins: Set<string>;
  try {
    allowedOrigins = expandLoopbackOrigins(splitList(env.JARVIS_WEB_ORIGIN));
  } catch {
    throw new Error(
      `JARVIS_WEB_ORIGIN must be a comma-separated list of origins, got "${env.JARVIS_WEB_ORIGIN}"`,
    );
  }

  return {
    host: env.JARVIS_BACKEND_HOST,
    port: env.JARVIS_BACKEND_PORT,
    allowedOrigins,
    logLevel: env.JARVIS_LOG_LEVEL,
    envFile,
    claude: {
      model: env.JARVIS_CLAUDE_MODEL,
      effort: env.JARVIS_CLAUDE_EFFORT,
      apiKey: env.ANTHROPIC_API_KEY,
    },
  };
}
