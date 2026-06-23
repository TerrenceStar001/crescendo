# Technology Stack

**Analysis Date:** 2026-06-23

## Languages

**Primary:**
- JavaScript (ES modules) - Entire frontend and backend codebase. No TypeScript — all `.jsx` and `.js`.
- CSS - Custom stylesheet in `src/App.css` using BEM-like naming and CSS custom properties for theming.

**Secondary:**
- HTML - Entry point via `index.html` and PWA manifest in `public/manifest.json`.

## Runtime

**Environment:**
- Node.js (version not pinned; needs `--experimental-global-webcrypto` flag for Vite dev/build)
- Browser runtime for frontend (React SPA, Web Speech API, IndexedDB)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (v3 lockfileVersion) — present
- Workspaces: Not used (separate `package.json` for frontend and `server/package.json` for backend)

## Frameworks

**Core:**
- React 18 (`^18.2.0`) - UI framework. Plain JSX, no TypeScript.
- Vite 5 (`^5.0.0`) - Build tool and dev server.
- Express 4 (`^4.18.2`) - Backend HTTP server in `server/index.js`.

**Testing:**
- None detected. No test framework, no test files.

**Build/Dev:**
- `@vitejs/plugin-react` (`^4.0.0`) - Vite React plugin with Fast Refresh.
- `vite-plugin-pwa` (`^1.3.0`) - PWA support with Workbox generateSW.
- `NODE_OPTIONS="--experimental-global-webcrypto"` required for all Vite commands.

## Key Dependencies

**Frontend Critical:**
- `react` (`^18.2.0`) - Core UI framework.
- `react-dom` (`^18.2.0`) - DOM rendering.
- `@xyflow/react` (`^12.11.0`) - React Flow library for infinite canvas (`CanvasView.jsx`).
- `react-force-graph-3d` (`^1.29.1`) - 3D force-directed graph for concept visualization (`ConstellationGraph.jsx`).
- `three` (`^0.184.0`) - 3D rendering engine used by react-force-graph-3d.
- `vite-plugin-pwa` (`^1.3.0`) - PWA/offline support via Workbox.

**Backend Critical:**
- `express` (`^4.18.2`) - HTTP server and routing.
- `better-sqlite3` (`^11.0.0`) - SQLite3 with WAL mode. Synchronous, zero-config. Database at `server/data/crescendo.db`.
- `cheerio` (`^1.0.0-rc.12`) - Server-side HTML parsing for web crawlers.
- `rss-parser` (`^3.13.0`) - RSS/Atom feed parsing for SCMP and podcast feeds.
- `canvas` (`^3.2.3`) - Node.js canvas for PDF page rendering (OCR pipeline).
- `pdfjs-dist` (`^3.11.174`) - PDF.js for parsing DSE past paper PDFs.
- `tesseract.js` (`^7.0.0`) - OCR engine for extracting text from DSE paper images.
- `cors` (`^2.8.5`) - CORS middleware for Express.
- `dotenv` (`^16.3.1`) - Loads `.env` from server root.

## Infrastructure

**PWA:**
- Workbox (generateSW strategy) via `vite-plugin-pwa` - caches HTML, JS, CSS, wasm, SVG, PNG.
- Service Worker auto-registered with `registerType: 'autoUpdate'`.
- Offline-capable: 5 bundled reading passages in `src/assets/bundled-content.json`.

**Client-side Storage:**
- `localStorage` - All user notes, AI config, theme, preferences, kind profiles, study sessions, DSE boundaries, tag colors, dashboard config, canvas edges. All keys use `crescendo-*` prefix.
- IndexedDB (`CrescendoDSE`, version 1, single object store `store`) - DSE skill profile, session history, papers, writing drafts, speech recordings.

**Backend Storage:**
- SQLite via `better-sqlite3` at `server/data/crescendo.db` (WAL mode, foreign keys ON).
- Tables: `articles`, `papers`, `podcast_channels`, `podcasts`, `embeddings`, `crawl_log`.

## Configuration

**Environment:**
- Frontend: No env vars needed. AI proxy configured via Vite dev server proxy.
- Backend: `.env` file at `server/.env` (not committed, example at `server/.env.example`).
  - `AI_API_KEY` - For NVIDIA NIM or OpenAI-compatible external AI (optional).
  - `AI_ENDPOINT` - AI API base URL (default: `https://integrate.api.nvidia.com/v1`).
  - `AI_MODEL` - Model name (default: `meta/llama-3.1-8b-instruct`).
  - `PORT` - Backend server port (default: `3001`).
  - `NODE_ENV` - Environment mode.

**Build:**
- `vite.config.js` - Vite configuration with React plugin, PWA plugin, proxy config, and React alias resolution.
- No Babel config, ESLint config, Prettier config, or Jest/Vitest config detected.

## Platform Requirements

**Development:**
- Node.js 18+ (Web Crypto API required via `--experimental-global-webcrypto` flag).
- `opencode serve --port 4010` must be running for AI features to work (proxies AI requests through authenticated OpenCode session).
- `npm install` in root (frontend) and `server/` (backend).

**Production:**
- Frontend: Static files served from `dist/` after `npm run build`.
- Backend: Node.js process running `node server/index.js`.
- Deployment target: Not specified (no Dockerfile, no hosting config detected).
- PWA installable via "Add to Home Screen".

---

*Stack analysis: 2026-06-23*
