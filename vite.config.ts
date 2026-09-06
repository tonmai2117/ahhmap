import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // leaflet-routing-machine must NOT be split into this chunk: it reads
          // the global `L` at evaluation time, and a separate chunk evaluates
          // before the main chunk's leafletGlobal shim can set window.L.
          if (id.includes('/node_modules/leaflet/')) return 'leaflet'
          if (id.includes('/node_modules/three/')) return 'three'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
