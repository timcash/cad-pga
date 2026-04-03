import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: process.env.VITE_SITE_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        'mesh-cleanup': resolve(rootDir, 'mesh-cleanup/index.html'),
        'cnc-kernel-simulator': resolve(rootDir, 'cnc-kernel-simulator/index.html')
      }
    }
  },
  server: {
    port: 5174
  },
  preview: {
    port: 5174
  }
});
