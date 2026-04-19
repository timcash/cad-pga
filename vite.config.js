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
        codex: resolve(rootDir, 'codex/index.html'),
        legion: resolve(rootDir, 'legion/index.html'),
        'mesh-cleanup': resolve(rootDir, 'mesh-cleanup/index.html'),
        'cnc-kernel-simulator': resolve(rootDir, 'cnc-kernel-simulator/index.html'),
        'look-ma-no-matrices': resolve(rootDir, 'look-ma-no-matrices/index.html'),
        'gear-rotation-linkage': resolve(rootDir, 'gear-rotation-linkage/index.html'),
        'meshless-fea-wos': resolve(rootDir, 'meshless-fea-wos/index.html')
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api/codex': {
        target: 'http://127.0.0.1:4186',
        changeOrigin: false
      },
      '/api/ws-lab': {
        target: 'http://127.0.0.1:4196',
        changeOrigin: false
      },
      '/codex-bridge': {
        target: 'ws://127.0.0.1:4186',
        ws: true
      },
      '/ws-lab': {
        target: 'ws://127.0.0.1:4196',
        ws: true
      }
    }
  },
  preview: {
    port: 5174
  }
});
