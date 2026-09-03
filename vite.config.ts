import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.webmanifest',
        // Precache every static media asset shipped from /public.
        includeAssets: ['**/*.{png,jpg,jpeg,svg,lottie,mp3}'],
        manifest: {
          id: '/',
          name: 'นิพนธ์ฟาร์ม (Nipon Farm)',
          short_name: 'นิพนธ์ฟาร์ม',
          description: 'ระบบบริหารจัดการฟาร์มสุกรอัจฉริยะ นิพนธ์ฟาร์ม',
          lang: 'th',
          start_url: '/',
          scope: '/',
          theme_color: '#f8fafc',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-192x192-v2.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'pwa-512x512-v2.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          runtimeCaching: [
            {
              // Covers media loaded dynamically or hosted outside the precache list.
              urlPattern: /\.(?:png|jpe?g|svg|lottie|mp3)(?:\?.*)?$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nipponfarm-media',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          // Keep the development server free from stale service-worker caches.
          enabled: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled in constrained remote development environments.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
