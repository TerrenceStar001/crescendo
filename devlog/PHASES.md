# NodeMind — Full Dev Log

> **Project**: Visual smart notes app with Canvas view (ReactFlow), 3D Constellation (ForceGraph3D), AI-powered tagging, PWA offline support.
> **Stack**: React 18 + Vite 5 + Hand-written BEM CSS. No TypeScript, no Tailwind.
> **Key constraint**: Must work offline via PWA. No 600MB HuggingFace model downloads.

---

## Phase 0 — Foundation & Tooling

### Goal
Establish project skeleton, dependencies, build tooling, and localStorage note CRUD.

### Decisions & Changes
- **Dependencies removed**: `@huggingface/transformers` (600MB model), `typescript`, `tailwindcss`, `autoprefixer`, `postcss`, `@types/*` — 30MB+ node_modules savings
- **Dependencies installed**: `@xyflow/react`, `react-force-graph-3d`, `three`, `vite-plugin-pwa`
- **Node.js 18 compat**: All npm scripts include `NODE_OPTIONS="--experimental-global-webcrypto"` for Workbox (serialize-javascript uses `crypto.randomUUID`)
- **React dedup fix**: `resolve.alias` with absolute paths to `node_modules/react` + `node_modules/react-dom` prevents duplicate React instances crashing `react-force-graph-3d` and `@xyflow/react`
- **PWA**: `vite-plugin-pwa` (Workbox generateSW, autoUpdate, 17 precached entries). Manual `sw.js` deleted.
- **LocalStorage**: Custom `useLocalStorage` hook with QuotaExceededError catch, `main.jsx` cleans corrupted entries on load.

### Files created
- `vite.config.js` — React plugin, PWA, alias dedup, API proxy (`/api/ai` → NVIDIA NIM)
- `src/hooks/useLocalStorage.js` — Returns `[item, setValue, error]` with lazy init
- `src/hooks/useNotes.js` — CRUD with localStorage, undoDelete, export/import JSON
- `src/main.jsx` — Entry with corrupted-storage cleanup

### Key Files
| File | Purpose |
|------|---------|
| `vite.config.js` | Build config, PWA, proxy, React dedup alias |
| `package.json` | Scripts with `NODE_OPTIONS`, 6 deps |
| `src/hooks/useLocalStorage.js` | Persistent state + QuotaExceededError |
| `src/hooks/useNotes.js` | Note CRUD, export, import, undo |

---

## Phase 1 — AI & Tag Generation

### Goal
Add dual-path AI (local topics engine + external API), title/tag extraction, inline editing.

### Decisions & Changes
- **Scrapped HuggingFace zero-shot**: Returns 401 for `Xenova/distilbart-mnli-12-3`. Replaced with `scoreTopics()` (200+ prototypes, instant, no network)
- **Dual AI pipeline**: External API (OpenAI/NVIDIA) > `scoreTopics()` (200+ topic prototypes) > `extractTags()` (25 abstract overview tags + bigram/keyword fallback)
- **AI generation**: Single `aiTimerRef` + `AbortController`. 4-second quiet-time debounce. 80-char delta threshold. Not triggered on tiny edits.
- **Title extraction**: Word-boundary logic (14 words max, no mid-word truncation)
- **Tags**: Abstract conceptual labels only (2-4 words). `scoreTopics()` threshold filter (score < 0.3 × max score is dropped). `extractTags()` overview cap at ceil(maxTags/3) for short content (<200 chars)
- **Inline editing**: `userEditedTitle`/`userEditedTags` flags block AI overwrites. Title and tags are click-to-edit.

### Files created
- `src/utils/topics.js` — 200+ topic prototypes with multi-word signal dictionaries, `scoreTopics()` with threshold filter
- `src/utils/noteParser.js` — `extractTitle()` (word-boundary), `extractTags()` (25 overview + bigram/keyword), `getMaxTags()`
- `src/hooks/useAI.js` — `generateTitle`, `generateTags` (abstract prompt), `generateBoth`, `testConnection`, `normalizeEndpoint`

### Key decisions
- `scoreTopics()` uses 3-tier scoring: signal hits (×2.5), sentence coverage (×3), multi-word bonus (×2), coverage ratio bonus. Threshold at 0.3× max score.
- `extractTags()` Phase 1: 25 abstract meta-categories (e.g. "Development & Design", "Knowledge & Education"). Phase 2: frequency-sorted bigrams + keywords.
- External API prompt explicitly demands abstract conceptual tags, not raw keywords.

---

## Phase 2 — Views & UX

### Goal
Deliver three view modes (List, Canvas, Graph), dark mode, keyboard shortcuts, storage warnings, note export/import.

### Decisions & Changes
- **ViewContext**: `useView()` provides `viewMode`, `focusTag`, `theme` + `toggleTheme`. `data-theme` set on `<html>`. Dark mode persisted in localStorage, OS dark mode respected on first visit.
- **CanvasView (ReactFlow)**: Auto-layout (3-column grid), tag-filter edges with animated lines, dimmed unfocused nodes (opacity 0.25), focus banner, synthetic tag nodes positioned above connected notes, empty state.
- **ConstellationGraph (ForceGraph3D)**: Tag-circle nodes + note-dot nodes. Focus tag zooms camera, unfocused nodes at 15% opacity. Responsive via ResizeObserver. Empty state with "Open a Note" button.
- **NoteNode**: Custom ReactFlow node with `isConnectable` handles, tag badges that set focus tag, 400ms hover tooltip (200-char preview + tags).
- **Keyboard shortcuts**: Ctrl+N/S/B/I/U/K/Shift+F/1/2/3/Escape/?. Shortcut modal.
- **Storage warning**: Banner triggers on QuotaExceededError, shows Export button.
- **Duplicate note**: `handleDuplicateNote` creates copy with "(copy)" suffix, `aiGeneratedOnce: true`.
- **Undo delete**: 5-second toast with Undo button, App.jsx owns timeout (not useNotes).

### Files created
- `src/context/ViewContext.jsx` — viewMode, focusTag, theme, toggleTheme
- `src/components/CanvasView.jsx` — ReactFlow infinite canvas
- `src/components/ConstellationGraph.jsx` — ForceGraph3D
- `src/components/NoteNode.jsx` — Custom flow node with tooltip
- `src/components/NoteCard.jsx` — List item with preview, tags, relative time
- `src/components/NoteList.jsx` — Search, scrollable list
- `src/components/Canvas.jsx` — contentEditable div with paste stripping
- `src/components/AISettings.jsx` — External API config modal
- `src/components/ErrorBoundary.jsx` — Catches lazy-load crashes
- `src/hooks/useGraphData.js` — Derives nodes/links from notes
- `src/App.css` — 1500+ lines BEM CSS with [data-theme="dark"] overrides
- `src/App.jsx` — All keyboard shortcuts, AI pipeline, export/import, view routing

### Key states / edge cases
- Empty: Welcome screen with "Start your first note" CTA
- Empty (Canvas): "No notes on the canvas — Switch to List view"
- Empty (Graph): "No tags to visualize yet — Open a Note"
- Error: ErrorBoundary catches view crashes, shows "Try again" button
- Loading: lazy-loaded views show "Loading canvas/constellation..."
- Generating: pulsing "Generating title..." / "Generating tags..." placeholders
- Storage full: Warning banner with Export button
- Import: Status message "X notes imported" / error message

---

## Phase 3 P1 — Polish & Bugfixing

### Goal
Fix critical bugs, eliminate crashes, reduce bundle size, handle edge cases.

### Changes
1. **`scoreTopics` threshold not applied** — Added `if (score < threshold) break` in result loop.
2. **`extractTags` overview tags dominate short notes** — `overviewLimit` capped at `ceil(maxTags/3)` for <200 chars.
3. **Undo timeout dual-management** — Removed `undoRef`/`setTimeout` from `useNotes`. App.jsx owns the single `undoTimeoutRef`.
4. **`clearFocusTag is not defined` crash** — Added destructuring from `useView()` in `MainContent` + `useMemo` deps.
5. **`extractTitle` mid-word truncation** — Word-boundary logic: up to 14 words, trim at word boundary, drop trailing comma.
6. **Duplicate React (Invalid hook call)** — `resolve.alias` with absolute `node_modules/react` paths + `optimizeDeps.include`. All chunks share single `react.js` instance (verified by same v= hash).
7. **Browser stale cache** — Service worker rewritten to network-first for HTML/Vite assets via vite-plugin-pwa. Old `nodemind-v1` SW unregistered on page load.
8. **Remaining unused `useEffect` import** — Cleaned up after removing `useEffect` from `ViewContext.jsx`.

### Build status
- `npm run build` passes cleanly. Largest chunk: `ConstellationGraph-D2eeTxmk.js` (1.33MB, includes three.js).
- `npm run preview` serves PWA-cached content offline.

---

## Phase 3 P2 — SEO, Accessibility, Persistence & Polish

### Goal
SEO meta tags, full accessibility (aria-label, focus trapping, keyboard nav), viewMode persistence, CSS dedup, CanvasView double-render fix, prefers-color-scheme/reduced-motion, Ctrl+D shortcut, AISettings focus trap, ErrorBoundary focus handling.

### Changes

1. **SEO meta tags** (`index.html`):
   - Added `<meta name="description">`, OG tags (title, description, url, type, image), Twitter card, canonical link, robots, color-scheme
   - Kept existing apple-mobile-web-app / theme-color tags

2. **viewMode persistence** (`ViewContext.jsx`):
   - `useState('list')` → `useLocalStorage('nodemind-view', 'list')`
   - Removed unused `useState` import

3. **CanvasView double-render fix** (`CanvasView.jsx`):
   - Removed `useEffect` that redundantly called `setNodes(allNodes)` / `setEdges(flowEdges)` after initialization
   - Added `key={rfKey}` on `<ReactFlow>` that increments on `notes` change, causing proper re-init
   - `keyCounter` module-level variable tracks unique render keys

4. **CSS dedup `.main__icon-btn`** (`App.css`):
   - Merged two duplicate definitions (lines 447-462 and 1270-1284) into one canonical set
   - Kept px-based padding (4px 6px), both transitions (`background 0.15s, color 0.15s`)
   - Deleted dead block

5. **aria-label on all icon buttons** (App.jsx, CanvasView.jsx, ConstellationGraph.jsx, ErrorBoundary.jsx):
   - 18 buttons: AI generate, pin toggle, duplicate, tag remove, add tag, B/I/U/•/1. format bar, export, import label, theme toggle, shortcuts, AI settings, focus clear (×2), ErrorBoundary retry

6. **prefers-color-scheme** (`ViewContext.jsx`, `useLocalStorage.js`):
   - `useLocalStorage` now supports lazy `defaultValue` functions (calls `defaultValue()` on first mount)
   - Theme default: `() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`
   - Added `<meta name="color-scheme" content="light dark">` to `index.html`

7. **prefers-reduced-motion** (`App.css`):
   - Added `@media (prefers-reduced-motion: reduce)` block disabling all 4 animation rules (pulse on `.main__generating`/`.main__tag--generating`, toast-in on `.undo-toast`, tooltip-in on `.flow-node__tooltip`)

8. **Ctrl+D duplicate shortcut** (`App.jsx`):
   - Added `case 'd':` in keyboard handler calling `handleDuplicateNote()`
   - Added "Ctrl+D Duplicate note" row in shortcut modal

9. **AISettings focus trap** (`AISettings.jsx`):
   - Custom ~30-line implementation (no library):
     - Saves `document.activeElement` (trigger ref) before opening
     - Queries first/last focusable elements, auto-focuses first on open
     - Traps Tab: Shift+Tab from first → last, Tab from last → first
     - Returns focus to trigger on close

10. **ErrorBoundary focus + aria** (`ErrorBoundary.jsx`):
    - Added `React.createRef()` + `componentDidUpdate` auto-focuses retry button on error
    - Added `role="alert"` and `aria-live="assertive"` to error container

### Build status
- `npm run build` passes cleanly after all changes.

---

## Phase 3 P3 — Data Integrity, Performance & UX Hardening

### Goal
Eliminate data race conditions, improve canvas/graph performance, add polish for a11y and print, fix NVIDIA endpoint bug, curate tag color palette.

### Changes

1. **CanvasView reactive sync (`CanvasView.jsx`)**:
   - Added `useEffect` to call `setNodes(allNodes)`/`setEdges(flowEdges)` when nodes/edges change
   - Removed destructive `rfKey` remount hack — ReactFlow no longer fully remounts on every keystroke, preserving zoom/pan state

2. **Stale AI race condition (`App.jsx`)**:
   - Added `activeIdRef` (parallel to `activeNoteRef`) to capture the active note ID at the time the timeout fires
   - AI callback now writes to `updateNote(currentActiveId, ...)` instead of `updateNote(activeId, ...)`, preventing note A's AI output from overwriting note B when user rapidly switches notes
   - Added `useEffect` cleanup that clears `aiTimerRef` and aborts `aiAbortRef` on component unmount

3. **Undo queue — prevent data loss on rapid deletes (`App.jsx`)**:
   - Switched from single `undoInfo` to `undoQueueRef` (array stored in ref)
   - Each new deletion appends to the queue; undo restores all queued notes
   - Toast text changes to "{N} notes deleted" when multiple notes are queued
   - The 5-second window resets on each new deletion

4. **Duplicate note AI generation (`App.jsx`)**:
   - Removed `userEditedTitle: true`, `userEditedTags: true`, and `aiGeneratedOnce: true` from duplicate notes
   - Duplicates now get fresh AI-generated title/tags like any new note

5. **NVIDIA normalizeEndpoint bug fix (`useAI.js`)**:
   - `normalizeEndpoint` now strips trailing `/v1` if present, then appends `/v1/chat/completions`
   - Previously, a base URL like `https://integrate.api.nvidia.com` would become `/chat/completions` (missing `/v1/`)

6. **handleAIGenerate concurrency guard (`App.jsx`)**:
   - Added `aiAbortRef.current?.abort()` on entry, `aiRunningRef` check, and `AbortController` creation
   - Rapid Ctrl+S calls cancel previous requests; early return guards cleaned up properly

7. **callAI fetch timeout (`useAI.js`)**:
   - Added internal `AbortController` with 30-second timeout
   - Returns clear "Request timed out after 30 seconds" error on timeout

8. **Dark mode root selector fix (`App.css`)**:
   - Fixed `[data-theme="dark"] html` → `html[data-theme="dark"]` (removed erroneous space)
   - Corrected selectors: `html[data-theme="dark"]` with descendant `body`/`#root` selectors

9. **`:focus-visible` keyboard navigation styles (`App.css`)**:
   - Added global `:focus-visible` rule with 2px `#4a90d9` outline
   - Explicit `:focus-visible` overrides for 16+ interactive element classes (icon buttons, format buttons, toggle buttons, cards, modals, etc.)
   - View mode toggle active state uses white focus outline

10. **`@media print` styles (`App.css`)**:
    - Hides sidebar, toolbar, format bar, color picker, title actions, view toggle, storage warning, undo toast
    - Canvas gets borderless full-width treatment

11. **`prefers-reduced-motion` expansion (`App.css`)**:
    - Extended from 4 selectors to also include `.canvas`, `.main__icon-btn`, `.note-card`, `.note-list` sidebar slide, and all remaining transitions via `transition: none`

12. **ConstellationGraph performance (`useGraphData.js`)**:
    - `useGraphData` now computes a `stableKey` derived from note IDs, tags, and titles (not content)
    - `useMemo` depends on `stableKey` instead of `notes` — graph data no longer recomputes on every keystroke, only when tags/titles change

13. **NoteNode `React.memo` optimization (`NoteNode.jsx`)**:
    - Added custom `areEqual` comparison that checks `data.note.id` and `data.isActive`
    - Prevents unnecessary re-renders when other CanvasView state changes

14. **`updateNote` selective timestamp (`useNotes.js`)**:
    - `updatedAt` is now only stamped when `content`, `title`, or `tags` change
    - Pin toggles, color changes, and position saves no longer bump the note to the top of the sorted list

15. **`stringToColor` curated palette (`useGraphData.js`)**:
    - Replaced hash-to-hue (collisions possible) with a 25-color curated palette using djb2 hash
    - Each color has unique hue, distinct saturation, and balanced lightness (visually beautiful, perceptually distinct)
    - Palette ranges across red, blue, pink, amber, teal, purple, orange, cyan, green, rose, etc.

### Build status
- `npm run build` passes cleanly. No chunk size regressions.

---

## Phase 3 P4 — Final Polish & Canvas Features

### Goal
Fix remaining critical bugs (AI race on note switch, graph filter visibility), add unique canvas-view features (manual edges, smart layouts, tag-group headers, drag-to-group), and clean up dead code.

### Changes

1. **Fix AI stale race on note switch (`App.jsx`)**:
   - Reverted `activeIdRef.current` → captured `scheduledId = activeId` at timer-creation time
   - The closure's `activeId` is the correct value because it's captured when `handleContentChange` was created for the specific note being edited
   - Prevents a stale timer from generating AI for the wrong note after user switches notes

2. **Graph filter dim opacity (`ConstellationGraph.jsx`)**:
   - Changed dimmed node opacity from 0.15 → 0.4 (was effectively invisible on dark background)
   - Lightened dimmed text colors: `#555` → `#999` (tag nodes), `#333` → `#eee` (note nodes)

3. **Canvas: Manual edges (`CanvasView.jsx`)**:
   - Added "⊕ Connect" toggle button in canvas toolbar
   - When active, clicking two notes creates a manual edge (persisted in `nodemind-canvas-edges` localStorage key)
   - Manual edges shown as orange dashed lines with arrow markers (distinct from tag auto-edges)
   - Connect-mode hint banner shows which note is selected as source
   - "✕ Clear Edges" button appears when edges exist
   - Uses `useLocalStorage` inside CanvasView for persistence

4. **Canvas: Smart auto-layouts (`CanvasView.jsx`)**:
   - Three layout buttons in toolbar: "⊞ By Tag", "⊟ By Date", "◎ Radial"
   - **By Tag**: Groups notes by their tags in column clusters. Each unique tag gets a column with notes arranged below.
   - **By Date**: Chronological left-to-right, 4-column grid sorted by `updatedAt`
   - **Radial**: Notes arranged in a circle around the active note's current position
   - Clicking a layout button toggles it; clicking again returns to free placement
   - Layouts modify note positions (which persist through the existing position-saving mechanism)

5. **Canvas: Tag-group header nodes (`CanvasView.jsx`)**:
   - When "By Tag" layout is active, tag-group header nodes appear above each group
   - These are styled similarly to existing focus-tag nodes (blue pill with `#tag` label)
   - Non-draggable, positioned to center above their group of notes
   - Untagged notes grouped under `_untagged` header

6. **Canvas: Drag-to-group behavior (`CanvasView.jsx`)**:
   - When dragging a note within 50px of another note, both receive the same `group` ID
   - Groups are stored in the note's `group` field via `updateNote`
   - Future layout enhancements could use groups for clustering

7. **Dead code cleanup**:
   - Removed `showFormatBar` unused state variable (`App.jsx`)
   - Removed `importRef` unused export from `useNotes.js` (including `useRef` import)
   - Removed `handleContentChange` from keyboard `useEffect` deps (not used in handler body)
   - `handleExport` wire-up: export button now shows "Exported" status feedback for 2s

8. **`importNotes` fragile `setTimeout` fix (`useNotes.js`)**:
   - Replaced `setTimeout(() => resolve(stateRef), 50)` with synchronous read of `importedCount` from `setState` updater closure
   - `setState` updater runs synchronously, so the ref value is available immediately after

9. **Unmount leak fixes (`App.jsx`)**:
   - Added `clearTimeout(debounceRef.current)` to unmount cleanup alongside existing `aiTimerRef`/`aiAbortRef` cleanup

10. **AISettings dark mode `h2` fix (`App.css`)**:
    - Changed `[data-theme="dark"] .ai-settings-modal h3` → `h2` to match JSX (`ai-settings-modal h2`)

11. **`isConnectable` boolean fix (`NoteNode.jsx`)**:
    - Changed `isConnectable={1}` → `isConnectable={true}` (React Flow expects boolean)

### Build status
- `npm run build` passes cleanly. CanvasView chunk +3.9KB (due to layout algorithms).

---

## Architecture Summary

```
index.html → src/main.jsx → src/App.jsx
  ├── ViewProvider (ViewContext)
  │   ├── viewMode (localStorage)
  │   ├── theme (localStorage, OS-detect on first visit)
  │   └── focusTag (in-memory)
  ├── useNotes (localStorage CRUD)
  ├── useAI (external API)
  ├── localStorage: 'nodemind-notes', 'nodemind-ai-config', 'nodemind-view', 'nodemind-theme'
  │
  ├── List view: NoteList > NoteCard
  ├── Canvas view: CanvasView > ReactFlow > NoteNode
  ├── Graph view: ConstellationGraph > ForceGraph3D
  └── Editor: Canvas (contentEditable) + format bar
```

## Tag Generation Pipeline

```
User types >= 80 chars → 4s debounce → cancel previous AbortController
  ├─ External API configured? → generateBoth() (title + tags)
  │   └─ Success? Use AI result
  ├─ scoreTopics() → 200+ prototype matching → threshold filtered
  │   └─ Has results? Use them
  └─ extractTags() → 25 abstract overview tags + bigrams/keywords
      └─ Always produces at least something
```

---

## Phase 4 — Full Send (Final Phase)

### Scope
Complete the entire app. Every view fully themed, every missing feature built, every hardcoded color migrated, performance hardened, documented, and accessible.

### A. Tag Manager
- Global tag list: see all tags with note count, search/filter
- Rename tag → update across all notes
- Merge tag A → B (reassign all notes)
- Delete tag → remove from all notes
- Per-tag color override (overrides `stringToColor`)
- **~350 lines — new component + hook + CSS**

### B. Settings Page
- Replace AI modal with full settings panel with tabs:
  - **General**: default view, theme, keyboard shortcuts reference
  - **AI**: existing provider/endpoint/key/model fields
  - **Data**: export, import, clear all, storage usage meter
  - **About**: version, open source credits
- Proper tab navigation within settings
- **~330 lines — new component + CSS**

### C. CanvasView Dark Mode
- Layout functions + JSX: migrate all hardcoded colors → CSS vars
  - Tag headers: `#4a90d9` → `var(--color-accent)`, `rgba(232,240,254,0.92)` → `var(--color-surface-card)`
  - Manual edges: `#e67e22` → `var(--color-warm)`
  - MiniMap, background → use CSS vars
  - NoteNode tooltip: `#fff` → `var(--color-ink)`, `#aaa` → `var(--color-mute)`, `#666` → `var(--color-ash)`
- **~200 lines across CanvasView.jsx, NoteNode.jsx, App.css**

### D. Graph Polish
- Re-add node labels as 3D text sprites in ForceGraph3D
- Legend: glass background `rgba(0,0,0,0.35)` → `var(--color-surface-card)` + `var(--color-hairline)`
- Legend dot colors → match actual node types (periwinkle for notes, varied for tags)
- Focus banner hover `#fff` → `var(--color-danger)`
- Verify `nodeThreeObject` sphere size + glow distinction works
- `role="img" aria-label` on graph container
- Node search/highlight
- **~150 lines in ConstellationGraph.jsx + App.css**

### E. CSS Variable Migration
Replace all hardcoded colors in App.css with `var(--color-*)` tokens:

| Location | Hardcoded | Target |
|---|---|---|
| `.canvas-loading` | `#888` | `var(--color-ash)` |
| `.constellation-empty` | `#888` | `var(--color-ash)` |
| `.canvas-view__empty-title` | `#555` | `var(--color-mute)` |
| `.canvas-view__empty` | `#888` | `var(--color-ash)` |
| `.flow-node__tooltip-title` | `#fff` | `var(--color-ink)` |
| `.flow-node__tooltip-preview` | `#aaa` | `var(--color-mute)` |
| `.ai-settings-field select/input` | `rgba(0,0,0,0.2)` | `var(--color-surface-soft)` |
| Welcome page | `🧠` emoji | remove |
| `.canvas-view__focus-clear:hover` | `#fff` | `var(--color-danger)` |

**~70 lines in App.css**

### F. Performance & Architecture
- `React.memo` on Canvas, NoteList, AISettings, FloatingToolbar
- Clean orphaned CanvasView edges when notes are deleted
- Fix `useAI.js` `generateBoth` race when user switches notes mid-generation
- Debounce search input
- **~100 lines across 6 files**

### G. Documentation
- README.md: feature overview, architecture diagram, keyboard shortcuts, tech stack, how to run
- Update AGENTS.md: remove `useLocalAI.js` reference, add new components
- Fix PWA manifest.json theme_color (currently `#1a1a2e` — wrong for light mode)
- **~150 lines — 3 files**

### H. Accessibility
- `aria-label` on search input, graph container, ForceGraph3D elements, color picker dots
- CanvasView connect/layout keyboard navigation
- `aria-live="polite"` on AI generation status + save status
- Note card delete button visible on `:focus-visible` (not just hover)
- **~60 lines across 5 files**

### I. Editor Enhancement
- Add heading (H2/H3), code block, blockquote buttons to floating toolbar
- Better paste: preserve line breaks, strip all other formatting
- Word/char count display in editor
- **~80 lines in FloatingToolbar.jsx + Canvas.jsx + App.css**

---

**Total estimate: ~1,490 lines across ~15 files.**

### Critical notes for implementer
- **CanvasView has NEVER been touched** — its dark mode is 0% complete, uses hardcoded `#4a90d9` and `#e67e22` throughout
- **CSS has 20+ hardcoded colors** that should use `var(--color-*)` design tokens
- **`useLocalAI.js` does NOT exist** — remove reference from AGENTS.md
- **Tag Manager and Settings Page are entirely new features** requiring new components
- **Previous phases (0-3)** focused on: project skeleton, AI/tag pipeline, view modes, graph visual overhaul (stars, bloom, node 3D sprites, sidebar), and data integrity fixes
- **Build passes cleanly** on current code — verify after Phase 4 changes

---

## Known Constraints
- `react-force-graph-3d` chunk is 1.33MB (includes three.js) — cannot reduce without library change
- localStorage ~5MB limit — export/import is only backup
- `contentEditable` uses `innerHTML` — paste strips formatting via `execCommand('insertText')`
- Node.js 18 requires `--experimental-global-webcrypto` for `serialize-javascript` in Workbox
- No test/lint/typecheck scripts configured
- AI external API proxy hardcoded to NVIDIA NIM at `/api/ai` → `https://integrate.api.nvidia.com/v1`