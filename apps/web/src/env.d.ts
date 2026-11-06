interface ImportMetaEnv {
  /** Local agent base URL (public; no secrets). */
  readonly VITE_JARVIS_AGENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
