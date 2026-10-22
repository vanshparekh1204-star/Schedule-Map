/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// The app's data lives in IndexedDB for http://localhost:4517.
// Changing this port means starting with an empty database.
const PORT = 4517

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Daily Schedule Mapper',
        short_name: 'Day Dial',
        description: 'Routines, tasks and rewards on one dial.',
        theme_color: '#1B3A6B',
        background_color: '#E6E9F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  // One bundle is fine here: the service worker caches it and it loads from disk.
  build: { chunkSizeWarningLimit: 1000 },
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  test: { environment: 'node' },
})
