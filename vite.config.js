import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TELC Vocabulary App',
        short_name: 'TELC',
        description: 'German vocabulary study app for Telc A2 and B1 exams',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/telc-vocab-app/',
        start_url: '/telc-vocab-app/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        runtimeCaching: [{
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
          handler: 'CacheFirst',
          options: { cacheName: 'cdn-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 } }
        }]
      }
    })
  ],
  base: '/telc-vocab-app/',
})
