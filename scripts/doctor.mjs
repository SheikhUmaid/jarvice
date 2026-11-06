#!/usr/bin/env node
// Checks the local development environment for JARVIS. Never prints secret values.
// usage: pnpm preflight   (not "pnpm doctor" — that name is a built-in pnpm command)
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statfsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rows = [];
const add = (name, level, detail) => rows.push({ name, level, detail });

// Node.js
const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk = major > 22 || (major === 22 && minor >= 12);
add('Node.js', nodeOk ? 'ok' : 'fail', `v${process.versions.node} (requires ≥ 22.12)`);

// pnpm
try {
  add('pnpm', 'ok', `v${execSync('pnpm --version', { encoding: 'utf8' }).trim()}`);
} catch {
  add('pnpm', 'fail', 'not found — run `corepack enable pnpm`');
}

// Dependencies
add(
  'Dependencies',
  existsSync(join(root, 'node_modules')) ? 'ok' : 'fail',
  existsSync(join(root, 'node_modules')) ? 'installed' : 'missing — run `pnpm install`',
);

// .env
const envPath = join(root, '.env');
let env = {};
if (existsSync(envPath)) {
  env = parseEnv(readFileSync(envPath, 'utf8'));
  add('.env', 'ok', 'present');
} else {
  add('.env', 'warn', 'missing — `cp .env.example .env` (defaults work without it)');
}
add(
  'ANTHROPIC_API_KEY',
  env.ANTHROPIC_API_KEY ? 'ok' : 'warn',
  env.ANTHROPIC_API_KEY ? 'set (value hidden)' : 'not set — required from Milestone 4',
);
for (const key of Object.keys(env)) {
  if (key.startsWith('VITE_') && /KEY|SECRET|TOKEN|PASSWORD/i.test(key)) {
    add(key, 'fail', 'VITE_* variables are bundled into the browser — never store secrets in them');
  }
}

// Disk space
try {
  const stats = statfsSync(root);
  const freeGb = (stats.bavail * stats.bsize) / 1e9;
  add(
    'Disk space',
    freeGb > 5 ? 'ok' : freeGb > 2 ? 'warn' : 'fail',
    `${freeGb.toFixed(1)} GB free`,
  );
} catch {
  add('Disk space', 'warn', 'could not be determined');
}

// Ports
const ports = [
  ['web', 5173],
  ['backend', Number(env.JARVIS_BACKEND_PORT ?? 8787)],
  ['local agent', Number(env.JARVIS_AGENT_PORT ?? 8788)],
];
for (const [name, port] of ports) {
  const free = await isPortFree(port);
  add(
    `Port ${port}`,
    free ? 'ok' : 'warn',
    `${name}: ${free ? 'free' : 'in use (fine if JARVIS is running)'}`,
  );
}

const icon = { ok: '\x1b[36m✔\x1b[0m', warn: '\x1b[33m!\x1b[0m', fail: '\x1b[31m✖\x1b[0m' };
const width = Math.max(...rows.map((row) => row.name.length));
console.log('\nJARVIS environment check\n');
for (const row of rows) console.log(` ${icon[row.level]} ${row.name.padEnd(width)}  ${row.detail}`);
console.log('');
process.exitCode = rows.some((row) => row.level === 'fail') ? 1 : 0;

function isPortFree(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => server.close(() => resolvePort(true)));
    server.listen(port, '127.0.0.1');
  });
}
