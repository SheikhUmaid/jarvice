import { formatUtcOffset } from '../../utils/format';

/** Browser-observable facts only. Hardware utilisation (CPU %, disk…) needs the local agent. */
export interface EnvironmentSnapshot {
  timezone: string;
  utcOffset: string;
  locale: string;
  online: boolean;
  browser: string;
  platform: string;
  cores: number | null;
  /** Approximate, rounded and capped by the browser (Chromium only). */
  deviceMemoryGb: number | null;
  screen: string;
  viewport: string;
  dpr: number;
  colorDepth: number;
  colorScheme: 'dark' | 'light';
  reducedMotion: boolean;
  connection: {
    effectiveType: string | null;
    rttMs: number | null;
    downlinkMbps: number | null;
  } | null;
  /** JS heap of this tab (Chromium only). */
  jsHeap: { usedBytes: number; limitBytes: number } | null;
  webgpu: boolean;
}

interface UserAgentData {
  brands?: Array<{ brand: string; version: string }>;
  platform?: string;
}
interface NetworkInformation {
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
}
interface ExtendedNavigator extends Navigator {
  userAgentData?: UserAgentData;
  deviceMemory?: number;
  connection?: NetworkInformation;
}
interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function browserName(nav: ExtendedNavigator): string {
  const brands = nav.userAgentData?.brands;
  if (brands?.length) {
    const brand = brands.find((b) => !/Not.?A.?Brand|Chromium/i.test(b.brand)) ?? brands[0];
    if (brand) return `${brand.brand} ${brand.version}`;
  }
  const match = /(Firefox|Edg|OPR|Chrome|Version)\/(\d+)/.exec(nav.userAgent);
  if (!match) return 'Unknown browser';
  const names: Record<string, string> = { Edg: 'Edge', OPR: 'Opera', Version: 'Safari' };
  return `${names[match[1] ?? ''] ?? match[1]} ${match[2]}`;
}

export function getEnvironmentSnapshot(): EnvironmentSnapshot {
  const nav = navigator as ExtendedNavigator;
  const memory = (performance as Performance & { memory?: PerformanceMemory }).memory;
  const connection = nav.connection;
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffset: formatUtcOffset(),
    locale: nav.language,
    online: nav.onLine,
    browser: browserName(nav),
    platform: nav.userAgentData?.platform || nav.platform || 'Unknown',
    cores: nav.hardwareConcurrency || null,
    deviceMemoryGb: nav.deviceMemory ?? null,
    screen: `${window.screen.width}×${window.screen.height}`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    dpr: Math.round(window.devicePixelRatio * 100) / 100,
    colorDepth: window.screen.colorDepth,
    colorScheme: window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    connection: connection
      ? {
          effectiveType: connection.effectiveType ?? null,
          rttMs: connection.rtt ?? null,
          downlinkMbps: connection.downlink ?? null,
        }
      : null,
    jsHeap: memory
      ? { usedBytes: memory.usedJSHeapSize, limitBytes: memory.jsHeapSizeLimit }
      : null,
    // Typed as always present, but undefined in browsers without WebGPU.
    webgpu: (nav.gpu as GPU | undefined) != null,
  };
}
