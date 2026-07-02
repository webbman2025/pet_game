import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isVercel = Boolean(process.env.VERCEL)
const assetBase = isVercel ? '' : '/3Care/chi/gamify/pet_game'

// https://vite.dev/config/
export default defineConfig({
  base: isVercel ? '/' : '/3Care/chi/gamify/pet_game/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `$asset-base: '${assetBase}';\n`,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
