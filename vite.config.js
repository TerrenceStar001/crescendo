import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactDir = path.resolve(__dirname, 'node_modules/react');
const reactDomDir = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  base: '/crescendo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Crescendo',
        short_name: 'Crescendo',
        description: 'Build your English mastery to a 5** peak with AI-powered DSE practice.',
        theme_color: '#1a1a2e',
        start_url: '/crescendo/',
        scope: '/crescendo/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,svg,png}'],
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['sw-cleanup.js'],
        runtimeCaching: [{
          urlPattern: /^\/api\//,
          handler: 'NetworkOnly',
          method: 'GET',
        }],
      },
      minify: false,
    }),
  ],
  resolve: {
    alias: [
      { find: 'react-dom/client', replacement: path.join(reactDomDir, 'client.js') },
      { find: 'react-dom', replacement: reactDomDir },
      { find: 'react/jsx-runtime', replacement: path.join(reactDir, 'jsx-runtime.js') },
      { find: 'react/jsx-dev-runtime', replacement: path.join(reactDir, 'jsx-dev-runtime.js') },
      { find: 'react', replacement: reactDir },
    ],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@xyflow/react', 'react-force-graph-3d'],
  },
  server: {
    proxy: {
      '/api/ai': {
        target: 'http://127.0.0.1:4010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1'),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('AI proxy error:', err.message);
          });
        },
      },
    },
  },
});
