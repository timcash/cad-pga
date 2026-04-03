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
        'mesh-cleanup-readme': resolve(rootDir, 'mesh-cleanup/readme/index.html'),
        'cnc-kernel-simulator': resolve(rootDir, 'cnc-kernel-simulator/index.html'),
        'cnc-kernel-simulator-readme': resolve(rootDir, 'cnc-kernel-simulator/readme/index.html'),
        'gear-rotation-linkage': resolve(rootDir, 'gear-rotation-linkage/index.html'),
        'gear-rotation-linkage-readme': resolve(rootDir, 'gear-rotation-linkage/readme/index.html'),
        'meshless-fea-wos': resolve(rootDir, 'meshless-fea-wos/index.html'),
        'meshless-fea-wos-readme': resolve(rootDir, 'meshless-fea-wos/readme/index.html')
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
