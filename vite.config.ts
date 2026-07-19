import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages project sites are served from /<repo>/. Relative base keeps
// asset URLs working regardless of the final repo name.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/**/*'],
      manifest: {
        name: 'Feel 2026 Lineup',
        short_name: 'Feel 2026',
        start_url: './',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
      },
      workbox: {
        // Precache the app shell, the lineup data and every artist image so the
        // whole experience works with zero network at the festival grounds.
        globPatterns: ['**/*.{js,css,html,json,png,jpg,jpeg,webp,svg,ico}'],
        // Artist images can be large; lift the default 2 MiB precache limit.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
});
