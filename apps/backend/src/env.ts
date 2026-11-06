import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Walks up from this file to the directory holding pnpm-workspace.yaml (works from src/ and dist/). */
export function findRepoRoot(start = dirname(fileURLToPath(import.meta.url))): string {
  let directory = start;
  for (;;) {
    if (existsSync(join(directory, 'pnpm-workspace.yaml'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return resolve(start, '../../..');
    directory = parent;
  }
}

/** Loads the repository-root .env into process.env (existing variables win). */
export function loadRootEnv(): string | null {
  const file = join(findRepoRoot(), '.env');
  if (!existsSync(file)) return null;
  process.loadEnvFile(file);
  return file;
}

/** Treats empty strings (e.g. `ANTHROPIC_API_KEY=`) as unset. */
export const blankToUndefined = (value: unknown) => (value === '' ? undefined : value);
