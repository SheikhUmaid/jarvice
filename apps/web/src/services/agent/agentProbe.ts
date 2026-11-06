import { AgentHealthSchema } from '@jarvis/schemas';
import { DEFAULT_PORTS } from '@jarvis/shared';
import { logActivity } from '../../store/activity';
import { useConnection, type AgentStatus } from '../../store/connection';

export const AGENT_URL =
  import.meta.env.VITE_JARVIS_AGENT_URL ?? `http://127.0.0.1:${DEFAULT_PORTS.agent}`;

const ONLINE_INTERVAL_MS = 15000;
const MAX_OFFLINE_INTERVAL_MS = 60000;

/**
 * Polls the local agent's /health endpoint. Only reachability is checked until pairing and
 * approved operations ship in Milestone 8. Backs off while the agent is not running.
 */
class AgentProbe {
  private users = 0;
  private timer = 0;
  private failures = 0;
  private last: AgentStatus = 'unknown';

  acquire(): () => void {
    this.users++;
    if (this.users === 1) void this.probe().then(() => this.schedule());
    return () => {
      this.users = Math.max(0, this.users - 1);
      if (this.users === 0) window.clearTimeout(this.timer);
    };
  }

  async probe(): Promise<AgentStatus> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);
    const store = useConnection.getState();
    try {
      const response = await fetch(`${AGENT_URL}/health`, {
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
      });
      const parsed = AgentHealthSchema.safeParse(await response.json());
      if (!response.ok || !parsed.success) throw new Error('Unexpected health response');
      store.setAgent({
        status: 'online',
        version: parsed.data.version,
        platform: parsed.data.platform,
        paired: parsed.data.paired,
        checkedAt: Date.now(),
      });
      if (this.last !== 'online') {
        logActivity('link', 'Local agent detected', {
          level: 'success',
          detail: `${parsed.data.platform} · ${parsed.data.paired ? 'paired' : 'not paired'}`,
        });
      }
      this.failures = 0;
      this.last = 'online';
    } catch {
      store.setAgent({ status: 'offline', checkedAt: Date.now() });
      if (this.last === 'online')
        logActivity('link', 'Local agent went offline', { level: 'warn' });
      this.failures++;
      this.last = 'offline';
    } finally {
      window.clearTimeout(timeout);
    }
    return this.last;
  }

  private schedule(): void {
    window.clearTimeout(this.timer);
    if (this.users === 0) return;
    const delay =
      this.last === 'online'
        ? ONLINE_INTERVAL_MS
        : Math.min(
            MAX_OFFLINE_INTERVAL_MS,
            ONLINE_INTERVAL_MS * 2 ** Math.max(0, this.failures - 1),
          );
    this.timer = window.setTimeout(() => void this.probe().then(() => this.schedule()), delay);
  }
}

export const agentProbe = new AgentProbe();
