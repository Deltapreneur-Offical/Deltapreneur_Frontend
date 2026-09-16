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
    plugins: [
      react(),
      {
        name: 'bot-preview-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const userAgent = req.headers['user-agent'] || '';
            const acceptHeader = req.headers['accept'] || '';
            const isCrawler = /facebookexternalhit|WhatsApp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot|opengraph|OpenGraphXYZBot/i.test(userAgent) || !acceptHeader.includes('html');
            
            if (isCrawler) {
              const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const pathname = url.pathname;
              
              let listingType = null;
              let listingId = null;

              // Tokenized domain shares (/s/{token}) — mirrors the nginx
              // bot-rewrite so crawlers get the rich OG page locally too.
              const shareTokenMatch = pathname.match(/^\/s\/([A-Za-z0-9_-]+)$/);
              if (shareTokenMatch) {
                try {
                  const targetUrl = `${backendTarget}/api/v1/public/share-preview/s/${shareTokenMatch[1]}`;
                  const response = await fetch(targetUrl);
                  if (response.ok) {
                    const html = await response.text();
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.statusCode = 200;
                    res.end(html);
                    return;
                  }
                } catch (err) {
                  console.error('[vite-bot-preview] /s/ error:', err);
                }
              }

              if (pathname.startsWith('/ventures/deals/')) {
                listingType = 'deals';
                listingId = pathname.split('/').pop();
              } else if (pathname.startsWith('/ventures/')) {
                listingType = 'ventures';
                listingId = pathname.split('/').pop();
              } else if (pathname.startsWith('/domains/')) {
                listingType = 'domains';
                listingId = pathname.split('/').pop();
              } else if (pathname === '/domains') {
                listingId = url.searchParams.get('id') || url.searchParams.get('highlight');
                if (listingId) listingType = 'domains';
              } else if (pathname.startsWith('/technology/auction/')) {
                listingType = 'technology-auction';
                listingId = pathname.split('/').pop();
              } else if (pathname.startsWith('/technology/')) {
                listingType = 'technology';
                listingId = pathname.split('/').pop();
              } else if (pathname === '/technology') {
                listingId = url.searchParams.get('id');
                if (listingId) listingType = 'technology';
              } else if (pathname.startsWith('/auction/')) {
                listingType = 'auction';
                listingId = pathname.split('/').pop();
              } else if (pathname === '/auctions') {
                listingId = url.searchParams.get('id');
                if (listingId) listingType = 'auction';
              } else if (pathname.startsWith('/creator-auction/')) {
                listingType = 'creator-auction';
                listingId = pathname.split('/').pop();
              } else if (pathname.startsWith('/software-auction/')) {
                listingType = 'technology-auction';
                listingId = pathname.split('/').pop();
              }
              
              if (listingType && listingId && /^[0-9a-fA-F-]{36}$/.test(listingId)) {
                try {
                  const targetUrl = `${backendTarget}/api/v1/public/share-preview/${listingType}/${listingId}`;
                  const response = await fetch(targetUrl);
                  if (response.ok) {
                    const html = await response.text();
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.statusCode = 200;
                    res.end(html);
                    return;
                  }
                } catch (err) {
                  console.error('[vite-bot-preview] error:', err);
                }
              }
            }
            next();
          });
        }
      }
    ],

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
      modulePreload: {
        resolveDependencies(filename, deps) {
          const isHomepageEntry = /(^|\/)index[-.]/.test(filename);
          if (!isHomepageEntry) return deps;
          return deps.filter(
            (dep) =>
              !/vendor-charts|recharts/.test(dep),
          );
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Keep React in one chunk — splitting `react` into separate vendor chunks
            // created circular imports and broke production (`useState` of undefined).
            // Do not force /src/pages/* into named chunks: that pulled admin/domains
            // CSS+JS into the homepage HTML as render-blocking preloads.
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
              if (id.includes('@stomp')) return 'vendor-websocket';
              if (id.includes('axios')) return 'vendor-http';
              return 'vendor';
            }
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
