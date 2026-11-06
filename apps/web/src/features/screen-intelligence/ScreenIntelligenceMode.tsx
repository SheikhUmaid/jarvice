import { ModuleStandby } from '../../components/ModuleStandby';
import { READINESS } from '../../components/readiness';
import { getMode } from '../modes';

const CHECKS = [READINESS.displayMedia, READINESS.wasm, READINESS.workers, READINESS.backend];

/** MODE E — Screen Intelligence (Milestone 7). */
export function ScreenIntelligenceMode() {
  return <ModuleStandby mode={getMode('screen-intelligence')} checks={CHECKS} />;
}
