import { ModuleStandby } from '../../components/ModuleStandby';
import { READINESS } from '../../components/readiness';
import { getMode } from '../modes';

const CHECKS = [
  READINESS.getUserMedia,
  READINESS.cameraHardware,
  READINESS.webgl2,
  READINESS.workers,
];

/** MODE D — Live Vision (Milestone 6). The camera is never opened here. */
export function LiveVisionMode() {
  return <ModuleStandby mode={getMode('live-vision')} checks={CHECKS} />;
}
