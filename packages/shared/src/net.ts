/** Loopback hostnames/addresses (IPv4, IPv6 and the IPv4-mapped IPv6 form). */
export function isLoopbackHost(host: string): boolean {
  const value = host.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    value === 'localhost' ||
    value === '::1' ||
    value.startsWith('127.') ||
    value.startsWith('::ffff:127.')
  );
}

// scheme://host[:port] with an optional trailing slash — the exact shape of a browser Origin header.
// (Parsed by hand so this package needs neither DOM nor Node type definitions.)
const ORIGIN_PATTERN = /^(https?):\/\/(\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::(\d{1,5}))?\/?$/i;

/**
 * Normalises an origin list and makes `localhost` and `127.0.0.1` interchangeable — browsers send
 * whichever the user typed, and both refer to this machine. Throws on malformed entries.
 */
export function expandLoopbackOrigins(origins: readonly string[]): Set<string> {
  const result = new Set<string>();
  for (const origin of origins) {
    const match = ORIGIN_PATTERN.exec(origin.trim());
    if (!match) throw new Error(`Invalid origin: "${origin}"`);
    const scheme = (match[1] ?? 'http').toLowerCase();
    const host = (match[2] ?? '').toLowerCase();
    const port = match[3] ? `:${match[3]}` : '';
    result.add(`${scheme}://${host}${port}`);
    if (host === 'localhost') result.add(`${scheme}://127.0.0.1${port}`);
    if (host === '127.0.0.1') result.add(`${scheme}://localhost${port}`);
  }
  return result;
}

/** Splits a comma-separated env value into trimmed, non-empty entries. */
export function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
