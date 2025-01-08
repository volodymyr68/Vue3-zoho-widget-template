import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  base: './', // Ensure relative paths for assets
  build: {
    outDir: resolve(__dirname, 'dist/widget/app'), // Keep output path
    assetsDir: '', // Disable assets directory
    rollupOptions: {
      output: {
        entryFileNames: 'index.js', // Rename the JS file
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]', // Remove hash for assets
      },
    },
  },
})
