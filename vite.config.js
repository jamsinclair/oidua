import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ja: resolve(__dirname, 'ja/index.html'),
        ko: resolve(__dirname, 'ko/index.html'),
        zh: resolve(__dirname, 'zh/index.html'),
      },
    },
  },
})
