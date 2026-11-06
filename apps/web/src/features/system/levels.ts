import type { Tone } from '@jarvis/ui';
import type { ActivityLevel } from '../../store/activity';

export const LEVEL_TONE: Record<ActivityLevel, Tone> = {
  info: 'cyan',
  success: 'ok',
  warn: 'amber',
  error: 'alert',
};
