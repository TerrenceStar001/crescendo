import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactDir = path.resolve(__dirname, 'node_modules/react');
const reactDomDir = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Crescendo',
        short_name: 'Crescendo',
        description: 'Build your English mastery to a 5** peak with AI-powered DSE practice.',
        theme_color: '#1a1a2e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,svg,png}'],
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
      '/api/health': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/papers': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/content': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/analyze': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/crawl': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/rag': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
