import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isMock = mode === 'mock' || process.env.VITE_MOCK === 'true';
  const backendTarget = process.env.BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [react(), tailwindcss()],
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      proxy: isMock
        ? undefined
        : {
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
  };
});
