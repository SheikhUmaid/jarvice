import { DEFAULT_PORTS, expandLoopbackOrigins, isLoopbackHost, splitList } from '@jarvis/shared';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const blank = (value: unknown) => (value === '' ? undefined : value);

const EnvSchema = z.object({
  JARVIS_AGENT_HOST: z.preprocess(blank, z.string().default('127.0.0.1')),
  JARVIS_AGENT_PORT: z.preprocess(
    blank,
    z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORTS.agent),
  ),
  JARVIS_AGENT_ALLOWED_ORIGINS: z.preprocess(
    blank,
    z.string().default(`http://localhost:${DEFAULT_PORTS.web},http://localhost:4173`),
  ),
});

export interface AgentConfig {
  host: string;
  port: number;
  allowedOrigins: Set<string>;
  envFile: string | null;
}

function loadRootEnv(): string | null {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(directory, 'pnpm-workspace.yaml'))) break;
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
  const file = join(directory, '.env');
  if (!existsSync(file)) return null;
  process.loadEnvFile(file);
  return file;
}

/** Validated agent configuration. Binding to anything but loopback is refused — there is no override. */
export function loadConfig(): AgentConfig {
  const envFile = loadRootEnv();
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid local agent configuration:\n${details}`);
  }
  const env = parsed.data;
  if (!isLoopbackHost(env.JARVIS_AGENT_HOST)) {
    throw new Error(
      `Refusing to bind the local agent to "${env.JARVIS_AGENT_HOST}": it may only listen on loopback.`,
    );
  }
  return {
    host: env.JARVIS_AGENT_HOST,
    port: env.JARVIS_AGENT_PORT,
    allowedOrigins: expandLoopbackOrigins(splitList(env.JARVIS_AGENT_ALLOWED_ORIGINS)),
    envFile,
  };
}
