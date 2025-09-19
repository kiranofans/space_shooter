import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path'; // Node ESM

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    // vite.config.js
    resolve: {
      alias: {
        '@': resolve(__dirname, './'), // root alias
      },
    },

  },
});
