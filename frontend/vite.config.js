import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'booking.html'),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/ical': { target: 'http://localhost:8787', changeOrigin: true },
    },
    fs: {
      allow: ['..'],
    },
  },
})
