import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  define: {
    global: 'window',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('i18next')) return 'vendor-i18n';
            return 'vendor';
          }
          if (id.includes('/src/pages/Admin')) return 'route-admin';
          if (id.includes('/src/pages/Domains')) return 'route-domains';
          if (id.includes('/src/pages/Ventures')) return 'route-ventures';
          if (id.includes('/src/pages/Auctions')) return 'route-auctions';
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Local API (matches VITE_API_URL / run_dev). Production builds do not use this proxy.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})