<!-- refreshed: 2026-06-23 -->
# Architecture

**Analysis Date:** 2026-06-23

## System Overview

```text
┌───────────────────────────────────────────────────────────────────┐
│                      CLIENT (React 18 SPA)                        │
├────────────────────────────────┬──────────────────┬───────────────┤
│   View Layer (Components)      │  State Layer      │  Utility      │
│   `src/components/`            │  `src/hooks/`     │  `src/utils/` │
│   27 components                │  12 hooks         │  7 utilities  │
├────────────────────────────────┴──────────────────┴───────────────┤
│                        App.jsx (Orchestrator)                      │
│                        ViewContext (View state)                    │
├───────────────────────────────────────────────────────────────────┤
│                   PERSISTENCE LAYER                                │
│   localStorage (notes, config, sessions, preferences)              │
│   IndexedDB (DSE profiles, session history, papers)                │
│   sessionStorage (active reading session save/recovery)            │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│              VITE DEV PROXY (vite.config.js)                       │
│   /api/ai/*       → http://127.0.0.1:4010/v1/*  (AI inference)   │
│   /api/health     → http://localhost:3001                         │
│   /api/papers     → http://localhost:3001                         │
│   /api/content    → http://localhost:3001                         │
│   /api/analyze    → http://localhost:3001                         │
│   /api/crawl      → http://localhost:3001                         │
│   /api/rag/*      → http://localhost:3001                         │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                  BACKEND (Express + SQLite)                        │
│   `server/index.js`  — entry + health + RAG search routes          │
│   `server/routes/`   — content, analyze, crawl endpoints           │
│   `server/db/`       — SQLite (better-sqlite3, WAL mode)           │
│   `server/rag/`      — RAG engine: vectorStore + TF-IDF fallback   │
│   `server/crawlers/` — SCMP, Young Post, HKEAA, BBC/TED RSS       │
└───────────────────────────────────────────────────────────────────┘
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

**Overall:** Monolithic SPA with hook-based state management (no external state library). Components are function components using React hooks. A single top-level `App.jsx` component orchestrates all state and passes callbacks down as props.

**Key Characteristics:**
- **No TypeScript** — plain `.jsx` throughout, no prop types or interfaces
- **No routing library** — view modes and DSE tabs are `useState`/`useLocalStorage` flags, rendered via conditional logic in `App.jsx`
- **Stored state in localStorage** — notes, AI config, kind profiles, theme, panel widths, study sessions, all persisted via `useLocalStorage` hook
- **IndexedDB for DSE session analytics** — `useIndexedDB` wrapper around raw IndexedDB (DB: `CrescendoDSE`, single object store `store`)
- **Lazy-loaded views** — `CanvasView` and `ConstellationGraph` use `React.lazy` + `Suspense`
- **React.memo on performance-critical components** — `Canvas`, `NoteList`, `FloatingToolbar`, `SettingsPage`, `NoteNode`
- **Open/closed pattern** — DSE modules (`ReadingModule`, `WritingModule`, `ListeningModule`, `SpeakingModule`) share no common interface; each manages its own phase state machine internally

## Layers

**Entry Layer:**
- Purpose: Bootstraps the app, runs migration, mounts React root
- Location: `index.html` → `src/main.jsx`
- Contains: `main.jsx` — storage key migration (`nodemind-` → `crescendo-`), corrupted storage cleanup, `ReactDOM.createRoot`
- Depends on: `src/App.jsx`
- Used by: Browser (HTML script tag)

**Context Layer:**
- Purpose: Provides global view state to all components
- Location: `src/context/ViewContext.jsx`
- Contains: `ViewProvider` wrapping `App`, exposes `viewMode`, `navTab`, `dseTab`, `theme`, `panelWidth`, `focusMode`
- Depends on: `src/hooks/useLocalStorage.js`
- Used by: `App.jsx`, `SidebarNav.jsx`, `ContextPanel.jsx`, `NoteList.jsx`

**Orchestrator Layer (App.jsx):**
- Purpose: Central command hub — owns all app state, routes between features, manages keyboard shortcuts
- Location: `src/App.jsx` (1071 lines)
- Contains: Note CRUD operations, AI generation orchestration, view/dse tab routing, study mode bridging, keyboard shortcut handler
- Depends on: All hooks (`useNotes`, `useAI`, `useLocalStorage`, `useKnowledgeHealth`, `useStudyMode`, `useSynthesis`, `useSkillAnalytics`, `useDSEPapers`), all components, `ViewContext`, `corpusIndex`
- Used by: `main.jsx`

**Component Layer:**
- Purpose: Rendering and user interaction
- Location: `src/components/`
- Contains: 27 component files
- Depends on: Hooks (primarily `useView` from context), utilities, some sibling components
- Used by: `App.jsx`

**Hook Layer:**
- Purpose: Encapsulated state logic and side effects
- Location: `src/hooks/`
- Contains: 12 custom hooks
- Depends on: `src/utils/` (some hooks), `useLocalStorage` (cross-hook dependency)
- Used by: `App.jsx`, components

**Utility Layer:**
- Purpose: Pure computation, data analysis, algorithms, topic data
- Location: `src/utils/`
- Contains: 7 utility modules
- Depends on: Nothing (pure JS functions)
- Used by: Hooks and components

**Backend Layer (optional):**
- Purpose: Server-side content fetching, RAG, DSE paper storage
- Location: `server/`
- Contains: Express entry, SQLite DB, RAG engine, crawlers (SCMP, Young Post, HKEAA OCR, BBC/TED RSS), route handlers
- Depends on: `better-sqlite3`, `express`, `dotenv`, `rss-parser`, node built-ins
- Used by: Vite dev proxy forwards requests from frontend

## Data Flow

### Primary Request Path — Note Editing Flow

1. User clicks "New Note" (sidebar button, command palette, or `Ctrl+N`) (`App.jsx:226`)
2. `handleCreateNote()` calls `createNote()` from `useNotes` hook, which prepends a new blank note to the notes array in localStorage (`src/hooks/useNotes.js:46`)
3. `setActive(id)` sets `activeId` in localStorage state
4. `App.jsx` re-renders. `NoteHeader` displays the note's title/tags. `Canvas` displays the contentEditable editor pre-filled with note content.
5. User types — `handleContentChange(html)` calls `updateNote(id, { content: html })` which updates the notes array in localStorage (`App.jsx:284`)
6. Debounced save indicator shows "Saved" after 1s (`App.jsx:289`)
7. On first write, AI generation triggers after content change: `handleAIGenerate()` calls `generateBoth()` via `useAI`, sets title + tags on the note (`App.jsx:319`)

### DSE Module Flow (Reading as example)

1. User clicks "Reading" in sidebar → `setDseTab('reading')` (`SidebarNav.jsx:41`)
2. `App.jsx` renders `<ReadingModule>` with props (`dsePapers`, `skillAnalytics`, `callAI`, `notes`, `createNote`, `onBack`) (`App.jsx:801`)
3. `ReadingModule` manages its own phase state machine (`start` → `difficulty-select` → `generating` → `passage-view` → `results`) (`src/components/ReadingModule.jsx:6`)
4. Paper selection: tries IndexedDB cached papers first, then bundled content (`src/assets/bundled-content.json`), then AI generation fallback via `callAI` (`src/hooks/useDSEPapers.js:758`)
5. AI generates passages from OCR reference + original questions with retry and validation pipeline (`useDSEPapers.js:808`)
6. Session state persisted to sessionStorage for crash recovery (`ReadingModule.jsx:29`)
7. Results logged to `skillAnalytics.recordSession()` → IndexedDB (`src/hooks/useSkillAnalytics.js:54`)

### AI Inference Flow

1. `useAI` hook provides `callAI` function that POSTs to configured endpoint (`src/hooks/useAI.js:43`)
2. Default endpoint: `/api/ai/chat/completions` → Vite proxy → `http://127.0.0.1:4010/v1/chat/completions` (OpenCode serve)
3. If user configures custom API key + endpoint in Settings → AI, uses that instead
4. Auth header: `Authorization: Bearer ${config.apiKey}` (empty if using OpenCode proxy; OpenCode serve handles auth via CLI session)
5. Default model: `opencode/deepseek-v4-flash-free`
6. Timeout: 30s default, configurable per call (DSE paper generation uses 180-300s)

**State Management:**
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

**`useNotes`:**
- Purpose: Central note CRUD, export, import, trash management
- File: `src/hooks/useNotes.js`
- Pattern: Thin wrapper around `useLocalStorage`. Notes stored as single JSON blob under `crescendo-notes` key.
- Note shape: `{ id, title, content, tags, color, pinned, position, kind, kindOverridden, kindLastContentLength, createdAt, updatedAt, userEditedTitle, userEditedTags, aiGeneratedOnce }`

**`useAI`:**
- Purpose: AI endpoint normalization, title/tag generation, connection testing
- File: `src/hooks/useAI.js`
- Pattern: Abstracted AI calls. Defaults to `/api/ai/chat/completions` proxy. Provider-aware endpoint normalization for nvidia/openai.
- Key method: `generateBoth(content)` runs `generateTitle` and `generateTags` in parallel via `Promise.all`

**`useLocalStorage`:**
- Purpose: Persistent state with JSON serialization, error handling for quota exceeded
- File: `src/hooks/useLocalStorage.js`
- Pattern: `useState` backed by localStorage, with safe parsing and `QuotaExceededError` handling
- Returns: `[value, setter, error]` tuple

**`useIndexedDB`:**
- Purpose: Async key-value persistence layer for DSE session data
- File: `src/hooks/useIndexedDB.js`
- Pattern: Wraps raw IndexedDB with `getItem`/`setItem`/`updateItem`/`deleteItem`/`getKeys`/`clearAll`. Single DB `CrescendoDSE` with single object store `store`.
- Key constants: `DSE_KEYS` map for profile, sessions, papers, drafts, recordings

**`corpusIndex` (Kind detection):**
- Purpose: ML-based content type classification (12 kinds)
- File: `src/utils/corpusIndex.js`
- Pattern: Keyword pattern matching + Naive Bayes training. `detectContentType(text)` returns ranked kind candidates. `trainKind(slug, content)` updates kind profiles.

**`dseGrading`:**
- Purpose: DSE grade computation, boundary management, sub-score calculation
- File: `src/utils/dseGrading.js`
- Pattern: Pure functions. Custom grade boundaries in localStorage `crescendo-dse-boundaries`. Defaults: 5** ≥90%, 5* ≥82%, 5 ≥73%, 4 ≥62%, 3 ≥50%, 2 ≥38%.

## Entry Points

**Browser Entry:**
- Location: `index.html` (line 29: `<script type="module" src="/src/main.jsx">`)
- Triggers: Page load
- Responsibilities: storage migration, corrupted data cleanup, React root mount

**React Root:**
- Location: `src/main.jsx`
- Triggers: Module execution
- Responsibilities: Render `<App />` wrapped in `<React.StrictMode>`

**App Component:**
- Location: `src/App.jsx`
- Triggers: `main.jsx` render
- Responsibilities: All application orchestration — state management, feature routing, event handling, keyboard shortcuts

**Service Worker (PWA):**
- Location: built by `vite-plugin-pwa` / Workbox, registered in build output
- Triggers: After app load (auto-update)
- Responsibilities: Cache `**/*.{js,css,html,wasm,svg,png}` for offline access

**Backend Entry:**
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

**What happens:** `src/App.jsx` is 1071 lines of a single function component containing all app state, all keyboard event handlers, all feature-level routing logic, and the full JSX tree. State for different concerns (note editing, AI generation, DSE modules, quick capture, color picker, resize handling) lives in the same flat scope with 80+ `useState`/`useCallback`/`useEffect`/`useRef` declarations.

**Why it's wrong:** Makes the component impossible to test in isolation, creates merge conflicts, and increases cognitive load. Adding a new feature requires modifying this single file.

**Do this instead:** Refactor into smaller composable hooks per feature domain. See `src/hooks/useReadingSession.js` pattern (doesn't exist yet — create it). Each DSE module already handles its own internal state — the App-level state (notes, activeId, view routing) should be the only thing in App.jsx.

### Layered CSS without component scoping

**What happens:** All CSS is in a single 5700+ line file (`src/App.css`). Classes use BEM-like naming (`.block__element--modifier`) but there's no CSS Modules, CSS-in-JS, or scoping mechanism.

**Why it's wrong:** Style conflicts are possible. Dead CSS accumulates. Refactoring components requires checking the entire CSS file.

**Do this instead:** Use CSS Modules (`*.module.css`) co-located with components for view-specific styles, keeping only design tokens and global resets in `App.css`.

## Error Handling

**Strategy:** Try/catch with silent fallbacks. Most recoverable errors log to `console.warn` and return null/defaults. Unhandled promise rejections logged by backend. `ErrorBoundary` wraps `CanvasView` and `ConstellationGraph`.

**Patterns:**
- `try { ... } catch { /* silent */ }` — used extensively for IndexedDB, localStorage, AI calls, and JSON parsing
- `try { ... } catch (e) { return null; }` — AI generation methods, storage operations
- Storage errors surfaced via `useLocalStorage` error state → "Storage is full" banner in App.jsx
- AI parse errors caught with recursive retry + fallback (`useDSEPapers.js:966`)

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` throughout. No structured logging library. Backend logs DSE paper selection and RAG query details.

**Validation:** No prop type validation (no TypeScript, no PropTypes). DSE paper generation has extensive question validation pipeline (`validateQuestions`, `validateQuestionAnswer`, `fixQuestionTypes` in `useDSEPapers.js`).

**Authentication:** None for frontend (local-only app). Backend has no auth middleware. OpenCode serve authenticates AI requests via CLI session token.

---

*Architecture analysis: 2026-06-23*
