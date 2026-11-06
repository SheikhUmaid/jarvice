import { HolographicPanel } from '@jarvis/ui';
import { BrainCircuit } from 'lucide-react';
import { Readout, StatusDot } from '../../components/Atoms';
import { ModuleStandby } from '../../components/ModuleStandby';
import { READINESS } from '../../components/readiness';
import { useConnection } from '../../store/connection';
import { formatMs } from '../../utils/format';
import { getMode } from '../modes';

const CHECKS = [READINESS.backend, READINESS.claudeKey];

/** MODE H — AI Laboratory (Milestone 4). Shows the backend's real Claude configuration today. */
export function LaboratoryMode() {
  return (
    <ModuleStandby mode={getMode('laboratory')} checks={CHECKS}>
      <ClaudeLinkPanel />
    </ModuleStandby>
  );
}

function ClaudeLinkPanel() {
  const backend = useConnection((state) => state.backend);
  const ai = backend.ai;
  return (
    <HolographicPanel
      title="Claude link (backend)"
      icon={<BrainCircuit size={12} className="text-holo-300" />}
      code="AI"
    >
      <Readout label="Backend">
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone={backend.status === 'online' ? 'ok' : 'amber'} />
          {backend.status === 'online' ? `online · ${formatMs(backend.latencyMs)}` : backend.status}
        </span>
      </Readout>
      <Readout label="Provider">{ai ? 'Anthropic' : '—'}</Readout>
      <Readout label="Model" title="Set JARVIS_CLAUDE_MODEL in .env">
        {ai?.model ?? '—'}
      </Readout>
      <Readout
        label="API key"
        tone={ai?.keyConfigured ? 'ok' : 'amber'}
        title="Only presence is reported; the key never leaves the backend"
      >
        {ai ? (ai.keyConfigured ? 'configured' : 'not set — add ANTHROPIC_API_KEY to .env') : '—'}
      </Readout>
      <Readout label="Integration" tone="amber">
        {ai?.integrated ? 'online' : 'Milestone 4'}
      </Readout>
    </HolographicPanel>
  );
}
