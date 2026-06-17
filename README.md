# CoBrother Frontend

React + Vite single-page application for the CoBrother marketplace — domains, ventures, technology listings, auctions, and creator communities.

**Production:** https://co-brother-frontend.vercel.app  
**Backend API:** https://cobrother-backend.onrender.com

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Build tool | Vite 5 |
| Routing | React Router 6 |
| Styling | Tailwind CSS 3 |
| HTTP | Axios |
| Realtime | SockJS + STOMP (`@stomp/stompjs`) |
| i18n | i18next / react-i18next |
| Charts | Recharts |
| Animation | Framer Motion |
| Deploy | Vercel |

---

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **npm** (or pnpm/yarn)
- **Backend** running locally for full functionality — see `cobrother_backend` (FastAPI on port `8000`)

---

## Quick start (local)

```bash
cd CoBrother_Frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:5173

The Vite dev server proxies `/api`, `/oauth2`, and `/ws` to the backend (default `http://127.0.0.1:8000`).

---

## Environment variables

Copy `.env.example` to `.env.local` (or `.env`). All frontend env vars use the `VITE_` prefix.

| Variable | Local | Production |
|----------|-------|------------|
| `VITE_API_URL` | `http://127.0.0.1:8000` | `https://cobrother-backend.onrender.com` (optional on Vercel) |
| `VITE_APP_URL` | `http://127.0.0.1:5173` | `https://co-brother-frontend.vercel.app` |
| `VITE_DEV_PROXY_TARGET` | `http://127.0.0.1:8000` | — (dev only) |

**Important**

- Local backend is **HTTP only** — use `http://127.0.0.1:8000`, not `https://`.
- Never set `VITE_API_URL` to the Vercel frontend URL; OAuth and WebSockets must point at the backend host.
- URL resolution lives in `src/config/urls.js`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |

---

## How API routing works

### Local development

- Axios uses an empty `baseURL` when pointing at a local backend.
- Vite proxies API traffic to the backend (`vite.config.js`).
- OAuth and WebSocket connections use `API_ORIGIN` from `src/config/urls.js`.

### Production (Vercel)

- `vercel.json` rewrites `/api/*` to the Render backend.
- The SPA fallback serves `index.html` for client-side routes.
- Set `VITE_API_URL` on Vercel if you need direct backend calls (e.g. to avoid proxy redirect issues on POST).

---

## Project structure

```
CoBrother_Frontend/
├── public/              # Static assets
├── src/
│   ├── api/             # Axios client and API service modules
│   ├── components/      # UI components (home, listings, auth, layout, …)
│   ├── config/          # URLs, feature flags, contact links
│   ├── context/         # React context (auth, currency, language, cookies)
│   ├── hooks/           # Custom hooks (auctions, AI domains, likes, …)
│   ├── locales/         # i18n translation files
│   ├── pages/           # Route-level page components
│   ├── styles/          # Global and component CSS
│   └── utils/           # Shared helpers
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## Main features

- **Home** — hero search with AI brand names, new domain checks, premium listings, and auctions
- **Domains** — browse, buy, enquire, verify, and auction domain listings
- **Ventures** — startup listings, pitches, and deal flow
- **Technology / Co-creation** — software listings and technology auctions
- **Creator community** — community listings and creator auctions
- **Auth** — email/password, Google OAuth, profile completion
- **Dashboards** — user, admin, and CoBrother operator views
- **Realtime** — live auction and notification updates via WebSocket
- **i18n & currency** — multi-language UI and currency formatting

---

## Key routes

| Path | Page |
|------|------|
| `/` | Home |
| `/domains` | Domain marketplace |
| `/ventures` | Venture marketplace |
| `/technology` | Technology / co-creation listings |
| `/creator` | Creator community |
| `/auctions` | Auction hub |
| `/storefront` | Domain registration storefront |
| `/dashboard` | User dashboard (protected) |
| `/admin` | Admin dashboard (protected) |
| `/auth/callback` | OAuth callback |

---

## Deployment (Vercel)

1. Connect the repo to Vercel.
2. Set environment variables (`VITE_APP_URL`, optionally `VITE_API_URL`).
3. Build command: `npm run build`
4. Output directory: `dist`
5. `vercel.json` handles API rewrites and SPA routing.

---

## Related repos

- **Backend:** `cobrother_backend` (FastAPI) — required for API, auth, auctions, and AI domain generation.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ERR_SSL_PROTOCOL_ERROR` on API calls | Use `http://` for local backend, not `https://` |
| Google login fails | Ensure `VITE_API_URL` points to backend, not frontend |
| API 404 in dev | Start backend on port 8000; check `VITE_DEV_PROXY_TARGET` |
| WebSocket disconnects | Confirm backend `/ws` is reachable; check `API_ORIGIN` in `urls.js` |

---

## License

Private — CoBrother.
