import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const raizWeb = path.dirname(fileURLToPath(import.meta.url));
const typesSrc = path.resolve(raizWeb, '../../packages/types/src/index.ts');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    // Em dev, o dist CJS do workspace só exporta default no pre-bundle do Vite;
    // apontar para o source TS preserva os named exports (schemas Zod).
    alias: {
      '@sindprf/types': typesSrc,
    },
  },
  optimizeDeps: {
    exclude: ['@sindprf/types'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages\/types/],
    },
  },
});
