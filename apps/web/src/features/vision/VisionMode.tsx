import { ModuleStandby } from '../../components/ModuleStandby';
import { READINESS } from '../../components/readiness';
import { getMode } from '../modes';

const CHECKS = [
  READINESS.wasm,
  READINESS.workers,
  READINESS.offscreen,
  READINESS.webgl2,
  READINESS.backend,
];

/** MODE C — Vision Laboratory (Milestone 5). */
export function VisionMode() {
  return <ModuleStandby mode={getMode('vision')} checks={CHECKS} />;
}
