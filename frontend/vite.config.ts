import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// En développement, le site (port 5173) et l'API (port 3000) paraissent être le même site grâce à ce relais.
// Résultat : le cookie de session fonctionne sans réglage supplémentaire.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts', css: false },
});
