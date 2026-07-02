import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // @sindprf/types é um workspace linkado compilado em CommonJS;
  // sem isso o Vite/Rollup não resolve os named exports do pacote.
  optimizeDeps: {
    include: ['@sindprf/types'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages\/types/],
    },
  },
});
