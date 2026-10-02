import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import { defineConfig } from 'vite';

const backendTarget = process.env.BACKEND_URL || 'http://localhost:8080';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': backendTarget,
      '/qbittorrent': backendTarget,
      '/webdav': backendTarget,
      '/debug': backendTarget,
      '/stream': backendTarget,
      '/version': backendTarget,
      '/login': {
        target: backendTarget,
        bypass: (req) => (req.method === 'GET' ? '/index.html' : undefined),
      },
      '/logout': backendTarget,
      '/register': {
        target: backendTarget,
        bypass: (req) => (req.method === 'GET' ? '/index.html' : undefined),
      },
      '/setup': {
        target: backendTarget,
        bypass: (req) => (req.method === 'GET' ? '/index.html' : undefined),
      },
    },
  },
});
