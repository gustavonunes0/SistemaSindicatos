import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const raizWeb = path.dirname(fileURLToPath(import.meta.url));
const typesSrc = path.resolve(raizWeb, '../../packages/types/src/index.ts');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo-sindicato.png', 'icons/*.png'],
      manifest: {
        name: 'SINDPRF-CE — Sindicato PRF Ceará',
        short_name: 'SINDPRF-CE',
        description:
          'Portal do Sindicato dos Policiais Rodoviários Federais no Estado do Ceará.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0b3d6b',
        background_color: '#e9ebee',
        icons: [
          {
            src: 'icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/uploads\//],
        importScripts: ['/sw-push.js'],
      },
      // Push precisa de SW; em localhost o navegador aceita sem HTTPS.
      // Sem `type: 'module'` para o importScripts de /sw-push.js funcionar.
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
  },
  resolve: {
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
