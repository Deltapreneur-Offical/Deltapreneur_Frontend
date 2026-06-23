import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBackendTarget(target) {
  try {
    const url = new URL(target)
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) {
      url.port = '8000'
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return target
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredBackendTarget =
    env.VITE_DEV_PROXY_TARGET ||
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_URL ||
    'http://127.0.0.1:8000'
  const backendTarget = normalizeBackendTarget(configuredBackendTarget)

  console.info(`[vite] API proxy target: ${backendTarget}`)

  return {
    plugins: [react()],

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      clearMocks: true,
      restoreMocks: true,
      css: true,
    },

    define: {
      global: 'window',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Keep React in one chunk — splitting `react` into separate vendor chunks
            // created circular imports and broke production (`useState` of undefined).
            if (id.includes('node_modules')) {
              if (
                id.includes('/react-dom/') ||
                id.includes('/react/') ||
                id.includes('/scheduler/') ||
                id.includes('/react-is/')
              ) {
                return 'vendor-react';
              }
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('i18next')) return 'vendor-i18n';
              if (id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('@stomp') || id.includes('sockjs-client')) return 'vendor-websocket';
              if (id.includes('axios')) return 'vendor-http';
              return 'vendor';
            }
            if (id.includes('/src/components/analytics/')) return 'shared-analytics';
            if (id.includes('/src/pages/PlatformAnalytics')) return 'route-platform-analytics';
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
      headers: {
        'Permissions-Policy': 'unload=*',
      },
      // Local API (matches VITE_API_URL / run_dev). Production builds do not use this proxy.
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/oauth2': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/ready': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/health': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
