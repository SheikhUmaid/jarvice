import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

// One .env at the repository root serves every app. Only VITE_* values reach the browser.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, 'JARVIS_');
  const backendHost = env.JARVIS_BACKEND_HOST || '127.0.0.1';
  const backendPort = Number(env.JARVIS_BACKEND_PORT || 8787);

  return {
    envDir: repoRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      // Workspace packages import these too; make sure there is exactly one copy of each.
      dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', 'motion'],
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: `http://${backendHost}:${backendPort}` },
        '/ws': { target: `ws://${backendHost}:${backendPort}`, ws: true },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target: `http://${backendHost}:${backendPort}` },
        '/ws': { target: `ws://${backendHost}:${backendPort}`, ws: true },
      },
    },
    build: {
      target: 'es2023',
      sourcemap: true,
      chunkSizeWarningLimit: 1400,
    },
  };
});
