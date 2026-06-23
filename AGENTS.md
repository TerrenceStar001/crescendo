# Crescendo — Agent Guide

**Crescendo** (formerly NodeMind) — build your English mastery to a 5** peak with AI-powered DSE practice and smart notes.

## Dev commands
- `npm run dev` — Vite dev server (proxy: `/api/ai` → local OpenCode `localhost:4010`, `/api/*` → backend `localhost:3001`)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build
- `npm run backend` — start backend Express server — runs `node server/index.js`
- `cd server && npm run dev` — start backend with `--watch` for development
- `opencode serve --port 4010` — **must be running** for AI to work (proxies AI requests through OpenCode Zen)
- No test/lint/typecheck scripts exist

## Architecture
- **Stack**: React 18 + Vite 5 + custom CSS. No TypeScript — plain `.jsx`.
- **Entry**: `index.html` → `src/main.jsx` → `src/App.jsx`
- **Note shape** (`useNotes.js`): `{ id, title, content, tags, color, pinned, position, kind, kindOverridden, kindLastContentLength, createdAt, updatedAt, userEditedTitle, userEditedTags, aiGeneratedOnce }`
- **AI**: Built-in topic scoring (`scoreTopics`, 200+ prototypes) + local OpenCode proxy by default, optional external API override.
  - `src/hooks/useAI.js` — external API calls via `/api/ai/chat/completions` proxy (OpenCode serve → `localhost:4010`)
  - AI generates title + tags **once per note** on first write. After that, user edits are never overwritten.
  - No API key needed — OpenCode serve handles auth via the current CLI session.
- **Offline**: PWA via `vite-plugin-pwa` (Workbox generateSW) caches HTML, JS, CSS, and icons. Installable via "Add to Home Screen".

## DSE Learning Platform
Four modules matching HKDSE English Paper 1–4:
- **ReadingModule.jsx** — passage + MCQ with weighted scoring, timer, DSE level calculation
- **WritingModule.jsx** — prompt + contentEditable editor + timer + AI correction (rubric scores, error list, vocab suggestions)
- **ListeningModule.jsx** — TTS playback (Web Speech API) + MCQ + results
- **SpeakingModule.jsx** — 64 topics across 8 categories, prep timer, record with STT + audio level, local (filler/lexical/WPM) or AI feedback

### DSE Grading (`dseGrading.js`)
- Grade boundaries stored in `crescendo-dse-boundaries` (localStorage), configurable via Settings → DSE tab
- `scoreToDseLevel`, `scoreToDseValue`, `computeOverallDseLevel` all respect custom boundaries
- Defaults: 5** ≥90%, 5* ≥82%, 5 ≥73%, 4 ≥62%, 3 ≥50%, 2 ≥38%
- `getStoredBoundaries()` / `storeBoundaries()` for persistence
- Skill weights: reading 30%, writing 25%, listening 20%, speaking 15%

### Speech & Voice
- `useSpeech.js` — TTS via `SpeechSynthesisUtterance`, auto-applies voice from `crescendo-tts-pref`
- `useAudioRecorder.js` — STT via `SpeechRecognition`, reads `crescendo-stt-lang`
- Voice, speed, and STT language configurable in Settings → General
- Web Speech API requires Chrome/Edge; SpeechRecognition needs user gesture to start

### AI Backend (OpenCode Serve)
- `opencode serve --port 4010` starts a headless OpenAI-compatible server that routes through the user's authenticated OpenCode session
- Default model: `opencode/deepseek-v4-flash-free` (free tier)
- No API key needed — OpenCode serve handles auth automatically via the current session
- User-configured API keys (in Settings → AI) take priority when set
- Vite proxy rewrites `/api/ai/*` → `/v1/*` at `http://127.0.0.1:4010`

### Bundled Content
- `src/assets/bundled-content.json` — 5 offline reading passages with MCQs for when backend/AI unavailable

## Backend (Express + SQLite)
- `server/index.js` — Express entry with health, RAG, analyze, crawl routes
- `server/db/` — SQLite (`better-sqlite3`, WAL mode) at `server/data/crescendo.db`
- `server/crawlers/` — SCMP topic scraper, Young Post scraper, HKEAA DSE paper finder, BBC/TED RSS podcast fetcher
- `server/rag/` — RAGEngine with vectorStore (cosine similarity + TF-IDF keyword fallback), paragraph chunker, search & generate-reading endpoints
- Backend is **optional** — frontend works fully offline with bundled content

## Components
- `Dashboard.jsx` — 4 skill rings (reading/writing/listening/speaking), recommendations, grade chart, gap analysis
- `ReadingModule.jsx` — passage + MCQ with weighted scoring, timer, DSE level
- `WritingModule.jsx` — prompt + editor + timer + AI correction (rubric, errors, vocab)
- `ListeningModule.jsx` — difficulty → TTS playback → MCQ → results
- `SpeakingModule.jsx` — topic grid → prep timer → record with STT → local/AI analysis
- `MCQQuestion.jsx` — reusable MCQ with selection highlighting, correct/wrong display, explanations
- `WaveformDisplay.jsx` — canvas waveform + live transcript
- `SidebarNav.jsx` — 8 DSE-focused navigation items
- `SkillRing.jsx` — SVG DSE skill ring
- `PerformanceChart.jsx` — grade trend chart
- `SettingsPage.jsx` — tabs: General, DSE, AI, Data, About
- `NoteList.jsx` — sidebar search, pinned sorting, multi-select, batch actions, kind chips
- `NoteCard.jsx` — compact card with health badge + kind icon badge
- `NoteHeader.jsx` — inline title/tag editing, kind dropdown, AI generate, brand header
- `Canvas.jsx` — contentEditable editor with paste stripping
- `ActionBar.jsx` — Extract Concepts, Flashcards, Quiz Me, AI Summary, word count, outline, focus mode
- `TheVoid.jsx` — cloze deletion (no API) or AI Socratic Q&A (with API key)
- `CanvasView.jsx` — React Flow infinite canvas + Synthesis suggestions overlay
- `ConstellationGraph.jsx` — 3D ForceGraph3D with bloom, labels, starfield
- `FloatingToolbar.jsx` — selection-based format bar (B/I/U/lists/headings/code/quote)

## Hooks
- `useKnowledgeHealth.js` — forgetting curve calculation (30d half-life). Returns `{ healthMap, decayingNotes, overallHealth, tagHealth, trend }`.
- `useStudyMode.js` — quiz session manager. Cloze (no API) or AI questions (with API key).
- `useSynthesis.js` — IDF-weighted cosine similarity for concept suggestions.
- `useSkillAnalytics.js` — 4-skill analytics engine (aggregates IndexedDB sessions into skill profiles)
- `useDSEPapers.js` — paper retrieval from IndexedDB + bundled cache + AI generation
- `useSpeech.js` — TTS via Web Speech API with voice preference from `crescendo-tts-pref`
- `useAudioRecorder.js` — STT via SpeechRecognition + audio level for waveform
- `useIndexedDB.js` — IndexedDB wrapper for DSE session storage (DB: `CrescendoDSE`)

## Kind system (`corpusIndex.js`)
- 12 predefined kinds detected from content keywords: youtube, threads, project, knowledge, research, essay, journal, meeting, recipe, book, random-thoughts, general
- `KINDS` config (exported): `{ slug, label, icon, color }` for all kinds + Auto
- `KIND_PATTERNS` detection rules: each pattern has `test` (regex), `score`, optional `minSentences`, `conjunct`, `minMatches` + `cluster`
- `detectContentType(text, html, sentences)` → ranked `[{ slug, label, score }]`
- Naive Bayes learning (`kindProfiles`) stored in `crescendo-kind-profiles`

## Storage Keys (localStorage)
All use `crescendo-*` prefix. Migration from old `nodemind-*` keys happens automatically in `main.jsx:migrateStorageKeys()`. Old keys are preserved as fallback.

Key storage keys:
- `crescendo-notes` — all user notes
- `crescendo-ai-config` — AI provider/endpoint/key/model
- `crescendo-corpus-index` — content type analysis cache
- `crescendo-kind-profiles` — Naive Bayes kind profiles
- `crescendo-study-sessions` — quiz session history
- `crescendo-knowledge-half-life` — forgetting curve half-life
- `crescendo-dashboard-sections` — dashboard visibility config
- `crescendo-saved-filters` — saved NoteList search filters
- `crescendo-view` — current view mode (list/canvas/constellation)
- `crescendo-theme` — light/dark
- `crescendo-dse-tab` — active DSE sub-tab
- `crescendo-panel-width` — sidebar panel width
- `crescendo-canvas-edges` — manual canvas connections
- `crescendo-tts-pref` — TTS voice/rate preference `{ voiceName, lang, rate }`
- `crescendo-stt-lang` — Speech Recognition language (e.g. 'en-US')
- `crescendo-dse-boundaries` — custom DSE grade thresholds
- `crescendo-tag-colors` — per-tag color map
- `crescendo-dse-papers` — IndexedDB store for DSE practice sessions

## Style & conventions
- All CSS in `src/App.css` using BEM-like naming: `.block__element--modifier`.
- CSS custom properties (design tokens) for theming: `--color-*` tokens in `:root` and `html[data-theme="dark"]`.
- No imports beyond React 18, `@xyflow/react`, `react-force-graph-3d`, and `three`.
- All hooks use `useCallback` and `useRef` heavily for debounced saves and AI generation.
- Title and tags are user-editable inline — editing sets `userEditedTitle`/`userEditedTags` flags that block future AI overwrites.
- `React.memo` applied to: Canvas, NoteList, FloatingToolbar, SettingsPage, NoteNode.

## Behavioral guidelines

These Karpathy-derived rules apply to any agent writing or refactoring code in this repo:

### 1. Think before coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity first
- No features beyond what was asked. No abstractions for single-use code.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical changes
- Touch only what you must. Match existing style.
- Don't "improve" adjacent code or refactor things that aren't broken.
- When your changes create orphans, remove imports/variables/functions YOUR changes made unused. Don't remove pre-existing dead code unless asked.
- Every changed line should trace directly to the user's request.

### 4. Goal-driven execution
- Transform tasks into verifiable goals.
- For multi-step tasks: state a brief plan with step → verify check.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Crescendo**

Crescendo (formerly NodeMind) is a DSE English learning platform that helps Hong Kong students prepare for the HKDSE English examination through AI-powered practice across all four papers: Reading, Writing, Listening, and Speaking. It combines AI-generated exam materials, smart note-taking with content type detection, and performance analytics to provide a complete self-study solution.

**Core Value:** Students can practice authentic DSE-style English exam papers with AI-generated passages and questions, get immediate feedback with detailed analysis, and track their progress across all four skills — all from a single offline-capable web app.

### Constraints

- **Tech Stack**: React 18 + Vite 5 + custom CSS (`.jsx` only — no TypeScript). Backend: Express + SQLite. No state management library.
- **AI**: OpenCode serve proxy default. AI model is `opencode/deepseek-v4-flash-free` (free tier). No guaranteed quality on AI-generated content — need validation pipeline.
- **Storage**: localStorage (5MB limit) for notes + config. IndexedDB for DSE session data. No backend dependency for core functionality.
- **Offline-First**: Core features must work without internet. Only AI features require connectivity.
- **DSE Fidelity**: All generated content must match HKDSE standards — users are practicing for a real exam and will reject content that doesn't feel authentic.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES modules) - Entire frontend and backend codebase. No TypeScript — all `.jsx` and `.js`.
- CSS - Custom stylesheet in `src/App.css` using BEM-like naming and CSS custom properties for theming.
- HTML - Entry point via `index.html` and PWA manifest in `public/manifest.json`.
## Runtime
- Node.js (version not pinned; needs `--experimental-global-webcrypto` flag for Vite dev/build)
- Browser runtime for frontend (React SPA, Web Speech API, IndexedDB)
- npm
- Lockfile: `package-lock.json` (v3 lockfileVersion) — present
- Workspaces: Not used (separate `package.json` for frontend and `server/package.json` for backend)
## Frameworks
- React 18 (`^18.2.0`) - UI framework. Plain JSX, no TypeScript.
- Vite 5 (`^5.0.0`) - Build tool and dev server.
- Express 4 (`^4.18.2`) - Backend HTTP server in `server/index.js`.
- None detected. No test framework, no test files.
- `@vitejs/plugin-react` (`^4.0.0`) - Vite React plugin with Fast Refresh.
- `vite-plugin-pwa` (`^1.3.0`) - PWA support with Workbox generateSW.
- `NODE_OPTIONS="--experimental-global-webcrypto"` required for all Vite commands.
## Key Dependencies
- `react` (`^18.2.0`) - Core UI framework.
- `react-dom` (`^18.2.0`) - DOM rendering.
- `@xyflow/react` (`^12.11.0`) - React Flow library for infinite canvas (`CanvasView.jsx`).
- `react-force-graph-3d` (`^1.29.1`) - 3D force-directed graph for concept visualization (`ConstellationGraph.jsx`).
- `three` (`^0.184.0`) - 3D rendering engine used by react-force-graph-3d.
- `vite-plugin-pwa` (`^1.3.0`) - PWA/offline support via Workbox.
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
- Workbox (generateSW strategy) via `vite-plugin-pwa` - caches HTML, JS, CSS, wasm, SVG, PNG.
- Service Worker auto-registered with `registerType: 'autoUpdate'`.
- Offline-capable: 5 bundled reading passages in `src/assets/bundled-content.json`.
- `localStorage` - All user notes, AI config, theme, preferences, kind profiles, study sessions, DSE boundaries, tag colors, dashboard config, canvas edges. All keys use `crescendo-*` prefix.
- IndexedDB (`CrescendoDSE`, version 1, single object store `store`) - DSE skill profile, session history, papers, writing drafts, speech recordings.
- SQLite via `better-sqlite3` at `server/data/crescendo.db` (WAL mode, foreign keys ON).
- Tables: `articles`, `papers`, `podcast_channels`, `podcasts`, `embeddings`, `crawl_log`.
## Configuration
- Frontend: No env vars needed. AI proxy configured via Vite dev server proxy.
- Backend: `.env` file at `server/.env` (not committed, example at `server/.env.example`).
- `vite.config.js` - Vite configuration with React plugin, PWA plugin, proxy config, and React alias resolution.
- No Babel config, ESLint config, Prettier config, or Jest/Vitest config detected.
## Platform Requirements
- Node.js 18+ (Web Crypto API required via `--experimental-global-webcrypto` flag).
- `opencode serve --port 4010` must be running for AI features to work (proxies AI requests through authenticated OpenCode session).
- `npm install` in root (frontend) and `server/` (backend).
- Frontend: Static files served from `dist/` after `npm run build`.
- Backend: Node.js process running `node server/index.js`.
- Deployment target: Not specified (no Dockerfile, no hosting config detected).
- PWA installable via "Add to Home Screen".
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language & Runtime
## Naming Patterns
- Components: `PascalCase.jsx` — e.g., `ReadingModule.jsx`, `NoteCard.jsx`, `ErrorBoundary.jsx`
- Hooks: `camelCase.js` with `use` prefix — e.g., `useNotes.js`, `useAI.js`, `useLocalStorage.js`
- Utilities: `camelCase.js` — e.g., `dseGrading.js`, `noteParser.js`, `corpusIndex.js`
- Context: `PascalCase.jsx` — e.g., `ViewContext.jsx`
- Entry point: `main.jsx`, `App.jsx` (lowercase)
- CSS: `App.css` (single file, at root of `src/`)
- `camelCase` for all function names — e.g., `generateId()`, `stripHtml()`, `handleCreateNote()`
- Event handlers use `handle` prefix — e.g., `handleDeleteNote`, `handleContentChange`, `handleKey`
- Component functions are named (not anonymous) when wrapped with `React.memo` — e.g., `React.memo(function Canvas({...})`, `React.memo(function NoteList({...}))`
- Callbacks wrapped in `useCallback` use the same naming as regular functions
- `camelCase` for all variables — e.g., `activeNote`, `filteredNotes`, `debounceRef`
- Boolean prefixes: `is`, `show`, `has` — e.g., `isActive`, `showVoid`, `hasSavedSession`
- `UPPER_SNAKE_CASE` for module-level constants — e.g., `DEFAULT_CONFIG`, `INITIAL_STATE`, `STOP_WORDS`, `TTS_PREF_KEY`
- React refs use `Ref` suffix — e.g., `debounceRef`, `canvasRef`, `innerRef`
- State setters use `set` prefix — e.g., `setActive`, `setQuery`, `setFocusMode`
- Not applicable — no TypeScript, no PropTypes, no class components except `ErrorBoundary`
## Code Style
## Import Organization
## Error Handling
- **Empty catch blocks (`catch {}`)** — Used extensively to silently handle recoverable errors like localStorage read failures, JSON parse failures, or optional backend calls. Example:
- **Guard clauses / early returns** — Functions return early for null/empty inputs:
- **ErrorBoundary class component** — `src/components/ErrorBoundary.jsx` wraps lazy-loaded views (CanvasView, ConstellationGraph) with a "Something went wrong" fallback + "Try again" button.
- **Network error handling** — AI fetch calls in `useAI.js` wrap HTTP calls in try/catch with descriptive error messages:
- **AbortController with timeout** — AI requests use `AbortController` + `setTimeout` for 30-second timeouts:
- **Optional chaining and nullish coalescing** — Used throughout:
## Logging
- AI errors logged via `console.error('AI proxy error:', err.message)` in `vite.config.js`
- Index rebuild failures logged via `console.warn('Index rebuild:', e.message)` in `App.jsx`
- Most failures are silently caught (`catch {}`) without logging
## Comments
- Section headers in CSS: `/* ===== Design Tokens ===== */`, `/* ===== Layout ===== */`
- Brief inline comments for non-obvious logic: `// Weekly trend: compare this week's average to last week's`
- JSDoc/TSDoc: Not used. No commented function signatures or type annotations.
## Function Design
- Components return JSX or `null` for empty/loading states
- Hooks return objects or arrays
- Utility functions return primitives, objects, or arrays
## Module Design
- Components: `export default function ComponentName(...)` — always default export
- Hooks: `export default function useHook(...)` — always default export, except `useSpeech` which uses `export function useSpeech()`
- Utility functions: `export function funcName(...)` — named exports. `corpusIndex` exports a single default object with methods.
- Context: `export function ViewProvider(...)` and `export function useView()`
- One component or hook per file
- Utility files can contain multiple related functions
## Component Patterns
- All components use function declarations with default export
- Consistent destructuring of props in the function signature
- State near the top of the component, then effects, then handlers, then render
## Hook Patterns
- All hooks use `useCallback` for returned functions to maintain referential stability
- `useRef` used extensively for mutable values that shouldn't trigger re-renders (timers, abort controllers, DOM refs)
- `useMemo` used for derived/computed data
- `useLocalStorage(key, defaultValue)` — wraps localStorage with state synchronization and error handling. Returns `[value, setter, error]`.
- All storage keys use `crescendo-*` prefix. Migration from old `nodemind-*` prefix in `main.jsx:migrateStorageKeys()`.
## CSS Conventions
- Block: `.app`, `.skill-ring`, `.mcq`, `.canvas`
- Element: `.app__nav`, `.app__panel`, `.app__main`, `.mcq__stem`, `.mcq__option`
- Modifier: `.app--focus`, `.mcq__option--selected`, `.mcq__option--correct`, `.note-card--active`
- CSS custom properties in `:root` and `html[data-theme="dark"]`
- Pattern: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--transition-*`
- Used throughout via `var(--color-text)` rather than raw values
- Toggled via `data-theme` attribute on `<html>` element
- `ViewContext.jsx` manages theme state with `useLocalStorage`
- Dark theme overrides the same `--color-*` custom properties
## Architecture Conventions
- `useLocalStorage` for persistent state
- `ViewContext` (React Context) for view-related state
- Component-local state with `useState`
- Props drilling for data flow
## File Sizes
- `src/App.jsx`: 1,071 lines — largest file, contains main application logic
- `src/App.css`: 5,736 lines — single CSS file
- `src/hooks/useDSEPapers.js`: 1,392 lines — largest hook
- `src/utils/corpusIndex.js`: 632 lines
- Most other files: 40-200 lines
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| App.jsx | Top-level orchestrator: owns all state, routes between note editing / DSE modules / settings / views | `src/App.jsx` |
| ViewProvider | Context provider for view mode, nav tab, DSE tab, theme, panel width, focus mode | `src/context/ViewContext.jsx` |
| SidebarNav | 8-item sidebar: Notes, Reading, Writing, Listening, Speaking, Graph, Progress, Settings | `src/components/SidebarNav.jsx` |
| ContextPanel | Left panel — renders NoteList, TagsPanel, TasksPanel, or TrashPanel based on navTab | `src/components/ContextPanel.jsx` |
| NoteList | Sidebar search, pinned sorting, multi-select, batch actions, kind chips | `src/components/NoteList.jsx` |
| NoteHeader | Inline title/tag editing, kind dropdown, AI generate button, backlinks count | `src/components/NoteHeader.jsx` |
| Canvas | contentEditable rich-text editor with markdown shortcuts, paste stripping | `src/components/Canvas.jsx` |
| ActionBar | Extract Concepts, Flashcards, Quiz Me, AI Summary, word count, focus mode | `src/components/ActionBar.jsx` |
| FloatingToolbar | Selection-based format bar (B/I/U/lists/headings/code/quote) | `src/components/FloatingToolbar.jsx` |
| Dashboard | Welcome screen + 4 skill rings, grade history, recommendations, weak areas | `src/components/Dashboard.jsx` |
| ReadingModule | Passage + MCQ/TFNG with weighted scoring, timer, DSE level calculation | `src/components/ReadingModule.jsx` |
| WritingModule | Prompt + contentEditable editor + timer + AI correction (rubric, errors, vocab) | `src/components/WritingModule.jsx` |
| ListeningModule | Difficulty → TTS playback via Web Speech API → MCQ → results | `src/components/ListeningModule.jsx` |
| SpeakingModule | 64 topics across 8 categories → prep timer → record with STT + audio level → local/AI analysis | `src/components/SpeakingModule.jsx` |
| TheVoid | Cloze deletion (local, no API) or AI Socratic Q&A (with API key) modal | `src/components/TheVoid.jsx` |
| CanvasView | React Flow infinite canvas + synthesis suggestions overlay | `src/components/CanvasView.jsx` |
| ConstellationGraph | 3D ForceGraph3D with bloom, labels, starfield (lazy loaded) | `src/components/ConstellationGraph.jsx` |
| NoteNode | Custom React Flow node component for canvas view | `src/components/NoteNode.jsx` |
| MCQQuestion | Reusable MCQ with selection highlighting, correct/wrong display, explanations | `src/components/MCQQuestion.jsx` |
| QuestionRenderer | Unified question renderer for ReadingModule | `src/components/QuestionRenderer.jsx` |
| SkillRing | SVG DSE skill ring display | `src/components/SkillRing.jsx` |
| PerformanceChart | Grade trend chart | `src/components/PerformanceChart.jsx` |
| SettingsPage | Settings modal with tabs: General, DSE, AI, Data, About | `src/components/SettingsPage.jsx` |
| AISettings | AI configuration sub-component within SettingsPage | `src/components/AISettings.jsx` |
| WaveformDisplay | Canvas waveform + live transcript for SpeakingModule | `src/components/WaveformDisplay.jsx` |
| CommandPalette | Quick command launcher (Ctrl+K) | `src/components/CommandPalette.jsx` |
| ErrorBoundary | React error boundary wrapping canvas and graph views | `src/components/ErrorBoundary.jsx` |
## Pattern Overview
- **No TypeScript** — plain `.jsx` throughout, no prop types or interfaces
- **No routing library** — view modes and DSE tabs are `useState`/`useLocalStorage` flags, rendered via conditional logic in `App.jsx`
- **Stored state in localStorage** — notes, AI config, kind profiles, theme, panel widths, study sessions, all persisted via `useLocalStorage` hook
- **IndexedDB for DSE session analytics** — `useIndexedDB` wrapper around raw IndexedDB (DB: `CrescendoDSE`, single object store `store`)
- **Lazy-loaded views** — `CanvasView` and `ConstellationGraph` use `React.lazy` + `Suspense`
- **React.memo on performance-critical components** — `Canvas`, `NoteList`, `FloatingToolbar`, `SettingsPage`, `NoteNode`
- **Open/closed pattern** — DSE modules (`ReadingModule`, `WritingModule`, `ListeningModule`, `SpeakingModule`) share no common interface; each manages its own phase state machine internally
## Layers
- Purpose: Bootstraps the app, runs migration, mounts React root
- Location: `index.html` → `src/main.jsx`
- Contains: `main.jsx` — storage key migration (`nodemind-` → `crescendo-`), corrupted storage cleanup, `ReactDOM.createRoot`
- Depends on: `src/App.jsx`
- Used by: Browser (HTML script tag)
- Purpose: Provides global view state to all components
- Location: `src/context/ViewContext.jsx`
- Contains: `ViewProvider` wrapping `App`, exposes `viewMode`, `navTab`, `dseTab`, `theme`, `panelWidth`, `focusMode`
- Depends on: `src/hooks/useLocalStorage.js`
- Used by: `App.jsx`, `SidebarNav.jsx`, `ContextPanel.jsx`, `NoteList.jsx`
- Purpose: Central command hub — owns all app state, routes between features, manages keyboard shortcuts
- Location: `src/App.jsx` (1071 lines)
- Contains: Note CRUD operations, AI generation orchestration, view/dse tab routing, study mode bridging, keyboard shortcut handler
- Depends on: All hooks (`useNotes`, `useAI`, `useLocalStorage`, `useKnowledgeHealth`, `useStudyMode`, `useSynthesis`, `useSkillAnalytics`, `useDSEPapers`), all components, `ViewContext`, `corpusIndex`
- Used by: `main.jsx`
- Purpose: Rendering and user interaction
- Location: `src/components/`
- Contains: 27 component files
- Depends on: Hooks (primarily `useView` from context), utilities, some sibling components
- Used by: `App.jsx`
- Purpose: Encapsulated state logic and side effects
- Location: `src/hooks/`
- Contains: 12 custom hooks
- Depends on: `src/utils/` (some hooks), `useLocalStorage` (cross-hook dependency)
- Used by: `App.jsx`, components
- Purpose: Pure computation, data analysis, algorithms, topic data
- Location: `src/utils/`
- Contains: 7 utility modules
- Depends on: Nothing (pure JS functions)
- Used by: Hooks and components
- Purpose: Server-side content fetching, RAG, DSE paper storage
- Location: `server/`
- Contains: Express entry, SQLite DB, RAG engine, crawlers (SCMP, Young Post, HKEAA OCR, BBC/TED RSS), route handlers
- Depends on: `better-sqlite3`, `express`, `dotenv`, `rss-parser`, node built-ins
- Used by: Vite dev proxy forwards requests from frontend
## Data Flow
### Primary Request Path — Note Editing Flow
### DSE Module Flow (Reading as example)
### AI Inference Flow
- Notes state: `useLocalStorage('crescendo-notes')` — stores entire `{ notes, activeId, trash }` blob
- AI config: `useLocalStorage('crescendo-ai-config')` — provider, apiKey, endpoint, model
- View state: `ViewContext` (React context) — view mode, nav tab, theme, panel width, focus mode
- DSE analytics: `useIndexedDB` wrapper — profile + sessions stored in IndexedDB `CrescendoDSE` DB
- DSE papers: IndexedDB cache + bundled JSON (`src/assets/bundled-content.json`)
- Session recovery: `sessionStorage` for active reading sessions
- Web Speech: TTS voice preference in `crescendo-tts-pref` (localStorage), STT language in `crescendo-stt-lang`
- Kind profiles: Naive Bayes training data in `crescendo-kind-profiles` (localStorage)
- Canvas edges: Manual connections stored in `crescendo-canvas-edges` (localStorage)
- Custom DSE boundaries: Stored in `crescendo-dse-boundaries` (localStorage)
## Key Abstractions
- Purpose: Central note CRUD, export, import, trash management
- File: `src/hooks/useNotes.js`
- Pattern: Thin wrapper around `useLocalStorage`. Notes stored as single JSON blob under `crescendo-notes` key.
- Note shape: `{ id, title, content, tags, color, pinned, position, kind, kindOverridden, kindLastContentLength, createdAt, updatedAt, userEditedTitle, userEditedTags, aiGeneratedOnce }`
- Purpose: AI endpoint normalization, title/tag generation, connection testing
- File: `src/hooks/useAI.js`
- Pattern: Abstracted AI calls. Defaults to `/api/ai/chat/completions` proxy. Provider-aware endpoint normalization for nvidia/openai.
- Key method: `generateBoth(content)` runs `generateTitle` and `generateTags` in parallel via `Promise.all`
- Purpose: Persistent state with JSON serialization, error handling for quota exceeded
- File: `src/hooks/useLocalStorage.js`
- Pattern: `useState` backed by localStorage, with safe parsing and `QuotaExceededError` handling
- Returns: `[value, setter, error]` tuple
- Purpose: Async key-value persistence layer for DSE session data
- File: `src/hooks/useIndexedDB.js`
- Pattern: Wraps raw IndexedDB with `getItem`/`setItem`/`updateItem`/`deleteItem`/`getKeys`/`clearAll`. Single DB `CrescendoDSE` with single object store `store`.
- Key constants: `DSE_KEYS` map for profile, sessions, papers, drafts, recordings
- Purpose: ML-based content type classification (12 kinds)
- File: `src/utils/corpusIndex.js`
- Pattern: Keyword pattern matching + Naive Bayes training. `detectContentType(text)` returns ranked kind candidates. `trainKind(slug, content)` updates kind profiles.
- Purpose: DSE grade computation, boundary management, sub-score calculation
- File: `src/utils/dseGrading.js`
- Pattern: Pure functions. Custom grade boundaries in localStorage `crescendo-dse-boundaries`. Defaults: 5** ≥90%, 5* ≥82%, 5 ≥73%, 4 ≥62%, 3 ≥50%, 2 ≥38%.
## Entry Points
- Location: `index.html` (line 29: `<script type="module" src="/src/main.jsx">`)
- Triggers: Page load
- Responsibilities: storage migration, corrupted data cleanup, React root mount
- Location: `src/main.jsx`
- Triggers: Module execution
- Responsibilities: Render `<App />` wrapped in `<React.StrictMode>`
- Location: `src/App.jsx`
- Triggers: `main.jsx` render
- Responsibilities: All application orchestration — state management, feature routing, event handling, keyboard shortcuts
- Location: built by `vite-plugin-pwa` / Workbox, registered in build output
- Triggers: After app load (auto-update)
- Responsibilities: Cache `**/*.{js,css,html,wasm,svg,png}` for offline access
- Location: `server/index.js`
- Triggers: `npm run backend` or `node server/index.js`
- Responsibilities: Express server startup, DB initialization, RAG engine init, bundled content seeding, background crawling (SCMP, podcasts, DSE OCR)
## Architectural Constraints
- **Threading:** Single-threaded (browser main thread + Web Speech API callbacks). No Web Workers.
- **Global state:** `idCounter` module-level variable in `useNotes.js:7` (monotonic ID generation). `configRef` in `useAI.js:91`.
- **Circular imports:** None detected. Deps flow: components → hooks → utils (no cycles).
- **localStorage is the primary DB:** All notes data stored in a single localStorage key (`crescendo-notes`). 5MB localStorage limit is a hard scaling constraint. Storage quota warning shown when `QuotaExceededError` fires.
- **No backend dependency:** Frontend works fully offline with bundled content (`src/assets/bundled-content.json`). Backend is optional — adds AI paper generation, article crawling, RAG search.
- **State colocation:** Each DSE module manages its own internal state (phases, timer, answers) — no shared DSE session state at App level.
## Anti-Patterns
### Monolithic App component
### Layered CSS without component scoping
## Error Handling
- `try { ... } catch { /* silent */ }` — used extensively for IndexedDB, localStorage, AI calls, and JSON parsing
- `try { ... } catch (e) { return null; }` — AI generation methods, storage operations
- Storage errors surfaced via `useLocalStorage` error state → "Storage is full" banner in App.jsx
- AI parse errors caught with recursive retry + fallback (`useDSEPapers.js:966`)
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
