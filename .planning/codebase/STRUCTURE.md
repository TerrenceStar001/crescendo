# Codebase Structure

**Analysis Date:** 2026-06-23

## Directory Layout

```
crescendo/
├── index.html                 # HTML entry point — mounts #root + loads main.jsx
├── package.json               # Vite 5, React 18, deps for frontend build
├── vite.config.js             # Vite config: proxy, PWA, react aliases
├── AGENTS.md                  # Agent guide — overview of architecture, components, hooks, storage keys
├── DESIGN.md                  # Design philosophy doc
├── GUIDE.md                   # User guide
├── HKDSE_TRANSFORMATION_PLAN.md
│
├── public/                    # Static assets (PWA icons, manifest)
│   ├── favicon.svg
│   ├── icon-192.png / .svg
│   ├── icon-512.png / .svg
│   └── manifest.json
│
├── src/                       # === FRONTEND SOURCE ===
│   ├── main.jsx               # Entry: migration, cleanup, React root render
│   ├── App.jsx                # Orchestrator component (1071 lines)
│   ├── App.css                # All styles (5736 lines, BEM naming, CSS custom properties)
│   │
│   ├── context/               # React context providers
│   │   └── ViewContext.jsx    # View mode, theme, nav/dse tab, panel width, focus mode
│   │
│   ├── hooks/                 # Custom React hooks (encapsulated state logic)
│   │   ├── useLocalStorage.js     # Persistent state hook (JSON + error handling)
│   │   ├── useNotes.js            # Note CRUD + export/import/trash
│   │   ├── useAI.js               # AI endpoint management + title/tag generation
│   │   ├── useKnowledgeHealth.js  # Forgetting curve (30d half-life) per note
│   │   ├── useSynthesis.js        # IDF-weighted cosine similarity concept suggestions
│   │   ├── useStudyMode.js        # Quiz session manager (cloze/AI questions)
│   │   ├── useSkillAnalytics.js   # DSE 4-skill analytics engine (IndexedDB)
│   │   ├── useDSEPapers.js        # DSE paper retrieval + AI generation pipeline
│   │   ├── useIndexedDB.js        # IndexedDB wrapper for DSE storage
│   │   ├── useGraphData.js        # Note→tag graph data for constellation view
│   │   ├── useSpeech.js           # TTS via Web Speech API
│   │   └── useAudioRecorder.js    # STT via SpeechRecognition + audio level
│   │
│   ├── components/            # React components
│   │   ├── SidebarNav.jsx         # 8-item sidebar navigation
│   │   ├── ContextPanel.jsx       # Left panel: renders NoteList/Tags/Tasks/Trash
│   │   ├── NoteList.jsx           # Note list with search, multi-select, batch ops
│   │   ├── NoteCard.jsx           # Compact note card with health badge + kind icon
│   │   ├── NoteHeader.jsx         # Inline title/tag editing, kind dropdown, AI gen
│   │   ├── Canvas.jsx             # contentEditable rich-text editor (React.memo)
│   │   ├── ActionBar.jsx          # Extract, Flashcards, Quiz, Summary, word count
│   │   ├── FloatingToolbar.jsx    # Selection format bar (React.memo)
│   │   ├── CommandPalette.jsx     # Ctrl+K command palette
│   │   ├── Dashboard.jsx          # Welcome + skill rings + grade chart
│   │   ├── SkillRing.jsx          # SVG DSE skill ring
│   │   ├── PerformanceChart.jsx   # Grade trend chart
│   │   ├── TheVoid.jsx            # Cloze/AI quiz modal overlay
│   │   ├── SettingsPage.jsx       # Settings modal (React.memo)
│   │   ├── AISettings.jsx         # AI config sub-component
│   │   ├── ReadingModule.jsx      # DSE Paper 1 (passage + MCQ)
│   │   ├── WritingModule.jsx      # DSE Paper 2 (prompt + editor + AI correction)
│   │   ├── ListeningModule.jsx    # DSE Paper 3 (TTS + MCQ)
│   │   ├── SpeakingModule.jsx     # DSE Paper 4 (STT + analysis)
│   │   ├── MCQQuestion.jsx        # Reusable MCQ component
│   │   ├── QuestionRenderer.jsx   # Unified question display for ReadingModule
│   │   ├── WaveformDisplay.jsx    # Canvas waveform + transcript
│   │   ├── CanvasView.jsx         # React Flow infinite canvas (lazy)
│   │   ├── NoteNode.jsx           # Custom React Flow node (React.memo)
│   │   ├── ConstellationGraph.jsx # 3D ForceGraph3D (lazy)
│   │   └── ErrorBoundary.jsx      # React error boundary
│   │
│   ├── utils/                 # Pure utility functions
│   │   ├── dseGrading.js          # Grade boundary computation
│   │   ├── dseSpeakingTopics.js   # 64 speaking topics across 8 categories
│   │   ├── structuralConstraints.js # DSE passage writing rules
│   │   ├── corpusIndex.js         # Kind detection (12 types, Naive Bayes)
│   │   ├── topics.js              # Topic scoring (200+ topic prototypes)
│   │   ├── extractKeyphrases.js   # Keyword extraction for synthesis
│   │   └── noteParser.js          # Note content parsing utilities
│   │
│   └── assets/
│       └── bundled-content.json   # 5 offline reading passages with MCQs
│
├── server/                    # === BACKEND (Express + SQLite) ===
│   ├── package.json           # Backend dependencies
│   ├── .env.example           # Environment variable template
│   ├── index.js               # Express entry: routes, RAG, background crawling
│   ├── eng.traineddata        # Tesseract OCR language data
│   │
│   ├── db/
│   │   ├── connection.js      # better-sqlite3 connection (WAL mode)
│   │   └── schema.js          # Table creation SQL
│   │
│   ├── data/                  # SQLite database files (gitignored)
│   │   └── crescendo.db       # Created at runtime
│   │
│   ├── routes/
│   │   ├── content.js         # Article listing, podcast channels
│   │   ├── analyze.js         # Text analysis endpoints
│   │   └── crawl.js           # Manual crawl trigger endpoints
│   │
│   ├── rag/
│   │   ├── engine.js          # RAGEngine: search + generate-reading
│   │   ├── chunker.js         # Paragraph-level text chunker
│   │   └── vectorStore.js     # Cosine similarity + TF-IDF fallback
│   │
│   └── crawlers/
│       ├── index.js           # Crawler registry
│       ├── scmp.js            # SCMP RSS scraper
│       ├── youthPost.js       # Young Post scraper
│       ├── dsePapers.js       # HKEAA DSE paper finder
│       ├── dseOcr.js          # DSE past paper OCR pipeline
│       └── podcast.js         # BBC/TED RSS podcast fetcher
│
├── dist/                      # Vite production build output
├── .vite/                     # Vite cache
├── node_modules/
└── .planning/                 # Codebase mapping documents
    └── codebase/
        ├── ARCHITECTURE.md
        ├── STRUCTURE.md
        ├── STACK.md
        ├── INTEGRATIONS.md
        ├── CONVENTIONS.md
        ├── TESTING.md
        └── CONCERNS.md
```

## Directory Purposes

**`src/` (frontend source):**
- Purpose: React SPA — note taking + DSE English practice platform
- Contains: Entry point, app component, hooks, components, utilities, assets
- Key files: `main.jsx` (entry), `App.jsx` (orchestrator), `App.css` (all styles)

**`src/context/`:**
- Purpose: React Context providers for global state
- Contains: Single `ViewContext.jsx` — view mode, theme, nav/dse tab, panel width, focus mode
- Key files: `ViewContext.jsx`

**`src/hooks/`:**
- Purpose: Custom React hooks — each encapsulates a distinct concern
- Contains: 12 hooks — storage, notes, AI, analytics, speech, graph data
- Key files: `useNotes.js` (core data model), `useAI.js` (AI inference), `useLocalStorage.js` (persistence foundation)

**`src/components/`:**
- Purpose: UI rendering components
- Contains: 27 components — navigation, note editing, DSE modules, visualizations
- Pattern: One component per file. No shared component library. Reusable pieces are `MCQQuestion.jsx`, `QuestionRenderer.jsx`, `SkillRing.jsx`, `ErrorBoundary.jsx`.

**`src/utils/`:**
- Purpose: Pure computation, no React dependencies
- Contains: 7 modules — grading, topic data, keyword extraction, kind detection, parsing
- Pattern: Exported functions only. `corpusIndex.js` has a singleton-like module-level cache (`kindProfiles`).

**`server/` (backend):**
- Purpose: Optional backend — content crawling, RAG search, AI orchestration
- Contains: Express server, SQLite DB layer, RAG engine, web crawlers
- Key files: `index.js` (entry), `rag/engine.js` (search core)

**`server/db/`:**
- Purpose: Database connection and schema management
- Contains: `connection.js` (better-sqlite3 singleton, WAL mode), `schema.js` (CREATE TABLE statements)

**`server/rag/`:**
- Purpose: Retrieval-Augmented Generation engine
- Contains: `engine.js` (query + document indexing), `chunker.js` (paragraph splitter), `vectorStore.js` (cosine similarity + TF-IDF hybrid)

**`server/crawlers/`:**
- Purpose: External content ingestion
- Contains: SCMP RSS, Young Post, HKEAA paper finder + OCR, BBC/TED RSS podcast fetcher

**`public/`:**
- Purpose: Static files served by Vite
- Contains: PWA manifest, icons, favicon

## Key File Locations

**Entry Points:**
- `index.html`: HTML entry with `<div id="root">` and module script tag
- `src/main.jsx`: React root mount, storage key migration (`nodemind-` → `crescendo-`), corrupted data cleanup
- `server/index.js`: Express server entry, DB/RAG init, background crawling

**Configuration:**
- `package.json`: Frontend deps (React 18, Vite 5, @xyflow/react, react-force-graph-3d, drei)
- `vite.config.js`: Vite plugins (React, PWA), path aliases for React, proxy list (7 routes → backend/OpenCode)
- `server/package.json`: Backend deps (express, better-sqlite3, cors, dotenv, rss-parser, pdfjs-dist)
- `server/.env.example`: Env template for backend configuration

**Core Logic:**
- `src/App.jsx`: Central orchestration — state routing, event handling, keyboard shortcuts
- `src/hooks/useNotes.js`: Note CRUD + localStorage persistence (primary data store)
- `src/hooks/useAI.js`: AI inference abstraction with provider-aware endpoint normalization
- `src/hooks/useDSEPapers.js`: DSE paper retrieval, AI generation (1800+ lines, most complex hook)
- `src/utils/dseGrading.js`: Grade boundary computation
- `src/utils/corpusIndex.js`: Content type detection (12 kinds, Naive Bayes)

**Testing:**
- No test files or test config detected anywhere in the project

**Documentation:**
- `AGENTS.md`: Agent development guide — full architecture overview (primary reference)
- `DESIGN.md`: Design philosophy
- `GUIDE.md`: User guide
- `README.md`: Basic project readme (rename notice)

## Naming Conventions

**Files:**
- Component files: `PascalCase.jsx` — e.g., `ReadingModule.jsx`, `SidebarNav.jsx`, `MCQQuestion.jsx`
- Hook files: `useCamelCase.js` — e.g., `useNotes.js`, `useLocalStorage.js`, `useKnowledgeHealth.js`
- Utility files: `camelCase.js` — e.g., `dseGrading.js`, `corpusIndex.js`, `noteParser.js`
- Context files: `PascalCase.jsx` — e.g., `ViewContext.jsx`
- Config files: `kebab-case.*` — e.g., `vite.config.js`, `package-lock.json`
- CSS: `App.css` only (single file, no module CSS)

**Directories:**
- All lowercase: `hooks/`, `components/`, `utils/`, `context/`, `assets/`, `server/`, `routes/`, `rag/`, `crawlers/`, `db/`
- Within `src/components/`: flat (no subdirectories) with 27 component files

**Types (not applicable — no TypeScript):**
- Plain `.jsx` throughout. No `.ts`, `.tsx`, prop types, or interfaces.

**Functions:**
- Component functions: PascalCase (exported default) — `export default function ReadingModule()`
- Hook functions: camelCase — `export default function useNotes()`
- Utility functions: camelCase — `scoreToDseLevel()`, `computeWeightedScore()`
- Event handlers: `handle*` prefix — `handleCreateNote`, `handleAIGenerate`, `handleContentChange`
- Internal helpers: camelCase — `stripHtml()`, `generateCloze()`, `passesQualityFilter()`

**Variables:**
- `camelCase` throughout
- Constants: `UPPER_SNAKE_CASE` — `DEFAULT_CONFIG`, `INITIAL_STATE`, `WEEK_MS`, `KINDS`, `STOP_WORDS`
- Ref variables: `*Ref` suffix — `timerRef`, `canvasRef`, `aiAbortRef`
- Boolean state: `is*` / `show*` / `has*` prefix — `isRecording`, `showVoid`, `hasSavedSession`

## Where to Add New Code

**New Feature (e.g., a new DSE module):**
- Primary code: `src/components/NewModuleName.jsx` — component with internal phase state machine
- Hook (if shared state needed): `src/hooks/useNewFeature.js`
- Utilities: `src/utils/newFeatureUtils.js`
- Registration: Add import + conditional render in `src/App.jsx`
- Sidebar: Add nav item to `src/components/SidebarNav.jsx`

**New Component:**
- Implementation: `src/components/PascalCaseName.jsx`
- If lazy-loaded: Add to `App.jsx` with `React.lazy(() => import('./components/...'))` and wrap in `<Suspense>`

**New Hook:**
- Implementation: `src/hooks/useCamelCaseName.js`
- If it needs persistent state: use `useLocalStorage` from `src/hooks/useLocalStorage.js`

**New Utility:**
- Implementation: `src/utils/kebab-case-name.js`
- Pattern: Export pure functions only. No React imports.

**New Backend Route:**
- Route handler: `server/routes/name.js`
- Registration: Add `app.use('/api/name', nameRoutes)` in `server/index.js`
- Vite proxy: Add proxy entry in `vite.config.js` if needed for dev

**New Crawler:**
- Implementation: `server/crawlers/newSource.js`
- Registration: Add crawl logic in `server/index.js` `autoCrawl()` function

**New Integration/AI Provider:**
- Add provider-specific endpoint normalization in `src/hooks/useAI.js` `normalizeEndpoint()`
- Add UI in `src/components/AISettings.jsx`

## Special Directories

**`dist/`:**
- Purpose: Production build output (Vite)
- Generated: Yes (by `npm run build`)
- Committed: No (in `.gitignore`)

**`.vite/`:**
- Purpose: Vite cache / pre-bundled dependencies
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No (in `.gitignore`)

**`server/data/`:**
- Purpose: SQLite database files (created at runtime)
- Generated: Yes
- Committed: No (in `.gitignore`)

**`server/node_modules/`:**
- Purpose: Backend npm dependencies
- Generated: Yes
- Committed: No (in `.gitignore`)

**`.planning/`:**
- Purpose: GSD codebase mapping documents
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes (persistent documentation)

---

*Structure analysis: 2026-06-23*
