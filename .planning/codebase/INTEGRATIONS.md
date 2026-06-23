# External Integrations

**Analysis Date:** 2026-06-23

## APIs & External Services

**AI / LLM Provider (Default — OpenCode Proxy):**
- Service: Local OpenAI-compatible proxy via `opencode serve --port 4010`
- Endpoint (Vite dev proxy): `/api/ai/*` → `/v1/*` at `http://127.0.0.1:4010`
- Default model: `opencode/deepseek-v4-flash-free` (free tier)
- Auth: None needed — authenticated via current OpenCode CLI session
- Implementation: `src/hooks/useAI.js` (frontend), `server/routes/analyze.js` (backend)
- Vite proxy configuration in `vite.config.js` (lines 47-55)

**AI / LLM Provider (External — Optional Override):**
- Service: OpenAI-compatible API (NVIDIA NIM, OpenAI, or custom/local LLM)
- Configurable in Settings → AI tab (`src/components/AISettings.jsx`)
- Provider options: "Disabled (use local OpenCode proxy)", "NVIDIA NIM", "OpenAI", "Custom / Local LLM"
- Endpoint: Configurable, defaults `https://integrate.api.nvidia.com/v1`
- Auth: Bearer token via configurable `apiKey`
- Model: Configurable, defaults `meta/llama-3.1-8b-instruct` (backend) or `opencode/deepseek-v4-flash-free` (frontend)
- Config stored in localStorage key `crescendo-ai-config`
- Backend also uses env vars `AI_API_KEY`, `AI_ENDPOINT`, `AI_MODEL` from `server/.env`

**AI Uses (Frontend - `useAI.js`):**
- Title generation for notes (`generateTitle`)
- Tag generation for notes (`generateTags`)
- Connection testing (`testConnection`)
- Direct generic AI call via `App.jsx:callAI`
  - DSE paper question generation (`useDSEPapers.js`)
  - Writing correction (via backend `/api/analyze/writing`)
  - Speaking analysis (via backend `/api/analyze/speaking`)
  - TheVoid AI Socratic Q&A
  - Quiz mode AI questions (`useStudyMode.js`)
  - Reading passage generation

**AI Uses (Backend - `server/routes/analyze.js`):**
- `POST /api/analyze/writing` - HKDSE writing evaluation (rubric scores, error list, vocab suggestions)
- `POST /api/analyze/speaking` - HKDSE speaking analysis (pronunciation, fluency, grammar, vocabulary, structure)

## Data Storage

**Databases:**
- SQLite (`better-sqlite3`)
  - Connection: `server/data/crescendo.db` (auto-created with WAL mode)
  - Client: `better-sqlite3` (synchronous API)
  - Schema: `server/db/schema.js` — 6 tables:
    - `articles` - SCMP/Youth Post/DSE OCR content for reading practice
    - `papers` - DSE past paper metadata
    - `podcast_channels` - RSS podcast feed configurations
    - `podcasts` - Individual podcast episodes
    - `embeddings` - RAG chunks for vector search
    - `crawl_log` - Crawl operation audit trail
  - Indexed: by source, difficulty, topics, date, paper type/year, embeddings source, crawl status
  - Default podcast channels seeded: BBC 6 Minute English, TED Talks Daily, Luke's English Podcast

**Client-side Storage:**
- `localStorage` (all keys use `crescendo-*` prefix):
  - `crescendo-notes` - All user notes
  - `crescendo-ai-config` - AI provider/endpoint/key/model
  - `crescendo-corpus-index` - Content type analysis cache
  - `crescendo-kind-profiles` - Naive Bayes kind profiles
  - `crescendo-study-sessions` - Quiz session history
  - `crescendo-knowledge-half-life` - Forgetting curve half-life (default 30 days)
  - `crescendo-dashboard-sections` - Dashboard visibility config
  - `crescendo-saved-filters` - Search filter presets
  - `crescendo-view` - Current view mode (list/canvas/constellation)
  - `crescendo-theme` - Light/dark theme
  - `crescendo-dse-tab` - Active DSE sub-tab
  - `crescendo-panel-width` - Sidebar panel width
  - `crescendo-canvas-edges` - Manual canvas connections
  - `crescendo-tts-pref` - TTS voice preference `{ voiceName, lang, rate }`
  - `crescendo-stt-lang` - Speech recognition language (e.g. 'en-US')
  - `crescendo-dse-boundaries` - Custom DSE grade thresholds
  - `crescendo-tag-colors` - Per-tag color map
- IndexedDB (`CrescendoDSE`, version 1):
  - Single object store `store`
  - Keys: `crescendo-skill-profile`, `crescendo-skill-sessions`, `crescendo-dse-papers`, `crescendo-dse-content`, `crescendo-writing-drafts`, `crescendo-speech-recordings`, `crescendo-session-answers`
- Migration from old `nodemind-*` keys to `crescendo-*` keys runs automatically in `src/main.jsx:migrateStorageKeys()`

**File Storage:**
- Local filesystem only (for bundled content and OCR pipeline).
- `src/assets/bundled-content.json` - 5 offline reading passages with MCQs.

**Caching:**
- RAG engine (`server/rag/vectorStore.js`) - In-memory TF-IDF keyword-based vector store (cosine similarity via keyword scoring).
- DSE paper cache in IndexedDB (`crescendo-dse-papers`).
- Application shell cached via Workbox service worker (PWA).

## Authentication & Identity

**Auth Provider:**
- None. No authentication system, no user accounts, no login.
- AI auth handled via OpenCode CLI session (local proxy) or user-provided API key.

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, no external monitoring.
- Console logging only (`console.log`, `console.warn`, `console.error`).
- Backend has `unhandledRejection` and `uncaughtException` handlers in `server/index.js`.

**Logs:**
- No structured logging. `console.*` throughout.
- Backend `crawl_log` table tracks content crawling operations.
- No log rotation or persistence mechanism.

## CI/CD & Deployment

**Hosting:**
- Not configured. No Dockerfile, no cloud provider config.
- Static frontend (`dist/`) + Node.js backend (`server/index.js`) architecture.

**CI Pipeline:**
- None detected. No GitHub Actions, no test/lint/typecheck scripts.

## Network Services (Outbound)

**RSS Feeds (Backend Crawlers):**
- **SCMP RSS:** `https://www.scmp.com/rss/91/feed` (education), `https://www.scmp.com/rss/4/feed` (hong-kong), `https://www.scmp.com/rss/5/feed` (china), `https://www.scmp.com/rss/11/feed` (tech) — `server/crawlers/scmp.js`
- **Youth Post:** `https://www.scmp.com/rss/yp/feed` — `server/crawlers/youthPost.js`
- **BBC 6 Minute English:** `https://podcasts.files.bbci.co.uk/p02pc9qc.rss` — seeded in `server/db/schema.js`
- **TED Talks Daily:** `https://feeds.feedburner.com/tedtalks_audio` — seeded in `server/db/schema.js`
- **Luke's English Podcast:** `https://feeds.libsyn.com/108160/rss` — seeded in `server/db/schema.js`
- User-configurable podcast feeds via `/api/channels` endpoints.

**DSE Past Paper Sources:**
- **PDF index:** `https://passpaper-unstoppable.github.io/dse.life/ppindex/eng/eng.html`
- **PDF storage:** `https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng`
- Scraped by `server/crawlers/dsePapers.js` and OCR-processed by `server/crawlers/dseOcr.js`

## Environment Configuration

**Required env vars (backend):**
- None strictly required. Optional: `AI_API_KEY`, `AI_ENDPOINT`, `AI_MODEL`, `PORT`, `NODE_ENV`.

**Secrets location:**
- `server/.env` (not committed, gitignored)
- User-provided API keys stored in `localStorage` (`crescendo-ai-config`)

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

## Third-Party SDKs

- `tesseract.js` (`^7.0.0`) - OCR engine (runs locally via WASM, no external service)
- `pdfjs-dist` (`^3.11.174`) - PDF parsing (runs locally)
- `canvas` (`^3.2.3`) - Node.js canvas for PDF page rendering (native module, requires build tools)

---

*Integration audit: 2026-06-23*
