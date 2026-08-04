import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Build identity — Netlify injects COMMIT_REF; local builds say 'local'.
  // Surfaced as a stamp in the shell footer AND written to dist/build.json
  // (npm run build) for the E2E deploy preflight.
  define: {
    __BUILD_INFO__: JSON.stringify({
      sha: (process.env.COMMIT_REF || 'local').slice(0, 7),
      at: new Date().toISOString(),
    }),
  },
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
