import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_SITE_BASE_PATH || '/',
  server: {
    port: 5174
  },
  preview: {
    port: 5174
  }
});

