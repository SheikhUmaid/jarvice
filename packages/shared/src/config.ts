export const APP_NAME = 'JARVIS';
export const APP_VERSION = '0.1.0';
export const CURRENT_MILESTONE = 1;

export const DEFAULT_PORTS = { web: 5173, backend: 8787, agent: 8788 } as const;

export const QUALITY_LEVELS = ['low', 'medium', 'high'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

/** Default Claude model; overridable with JARVIS_CLAUDE_MODEL (backend) and the AI Laboratory. */
export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';
