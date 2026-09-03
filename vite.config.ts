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
        includeAssets: ['icon.png', 'pwa-192x192-v2.png', 'pwa-512x512-v2.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'นิพนธ์ฟาร์ม (Nipon Farm)',
          short_name: 'NiponFarm',
          description: 'แอปพลิเคชันจัดการฟาร์มหมู',
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
              purpose: 'any maskable'
            },
            {
              src: 'pwa-192x192-v2.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512-v2.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000
        },
        devOptions: {
          enabled: true
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
