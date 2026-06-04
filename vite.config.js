import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ['react', 'react-dom'],
  },

  define: {
    global: 'window',
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only split app routes — do not split React into separate vendor chunks
          // (caused circular vendor ↔ vendor-react and broke useState in production).
          if (id.includes('/src/pages/Admin')) return 'route-admin'
          if (id.includes('/src/pages/Domains')) return 'route-domains'
          if (id.includes('/src/pages/Ventures')) return 'route-ventures'
          if (id.includes('/src/pages/Auctions')) return 'route-auctions'
        },
      },
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
