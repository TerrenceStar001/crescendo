# Coding Conventions

**Analysis Date:** 2026-06-23

## Language & Runtime

**Language:** Plain JavaScript (`.jsx`, `.js`) — no TypeScript anywhere in the project.

**React Version:** 18.x (shipped in `package.json` as `^18.2.0`)

**No linter or formatter is configured.** No `.eslintrc`, `.prettierrc`, `biome.json`, or similar config files exist at the project root. The `package.json` has no `eslint`, `prettier`, or `biome` dependencies. No lint or format npm scripts.

## Naming Patterns

**Files:**
- Components: `PascalCase.jsx` — e.g., `ReadingModule.jsx`, `NoteCard.jsx`, `ErrorBoundary.jsx`
- Hooks: `camelCase.js` with `use` prefix — e.g., `useNotes.js`, `useAI.js`, `useLocalStorage.js`
- Utilities: `camelCase.js` — e.g., `dseGrading.js`, `noteParser.js`, `corpusIndex.js`
- Context: `PascalCase.jsx` — e.g., `ViewContext.jsx`
- Entry point: `main.jsx`, `App.jsx` (lowercase)
- CSS: `App.css` (single file, at root of `src/`)

**Functions:**
- `camelCase` for all function names — e.g., `generateId()`, `stripHtml()`, `handleCreateNote()`
- Event handlers use `handle` prefix — e.g., `handleDeleteNote`, `handleContentChange`, `handleKey`
- Component functions are named (not anonymous) when wrapped with `React.memo` — e.g., `React.memo(function Canvas({...})`, `React.memo(function NoteList({...}))`
- Callbacks wrapped in `useCallback` use the same naming as regular functions

**Variables:**
- `camelCase` for all variables — e.g., `activeNote`, `filteredNotes`, `debounceRef`
- Boolean prefixes: `is`, `show`, `has` — e.g., `isActive`, `showVoid`, `hasSavedSession`
- `UPPER_SNAKE_CASE` for module-level constants — e.g., `DEFAULT_CONFIG`, `INITIAL_STATE`, `STOP_WORDS`, `TTS_PREF_KEY`
- React refs use `Ref` suffix — e.g., `debounceRef`, `canvasRef`, `innerRef`
- State setters use `set` prefix — e.g., `setActive`, `setQuery`, `setFocusMode`

**Types/Classes:**
- Not applicable — no TypeScript, no PropTypes, no class components except `ErrorBoundary`

## Code Style

**Formatting:** No formatter configured. Inconsistencies exist (e.g., 2-space indent in some files, mixed spacing around braces). The codebase relies on manual formatting.

**Semicolons:** Used consistently throughout all `.jsx` and `.js` files.

**Quotes:** Single quotes preferred (`import React from 'react'`). Template literals used for string interpolation.

**Commas:** Trailing commas used in multiline arrays/objects consistently.

## Import Organization

**Order (consistent across all files):**

1. **React imports** — `import React, { useState, useCallback } from 'react'`
2. **Third-party library imports** — `import { defineConfig } from 'vite'`
3. **Custom hooks** — `import useNotes from './hooks/useNotes'`
4. **Component imports** — `import SidebarNav from './components/SidebarNav'`
5. **Utility imports** — `import { KINDS } from '../utils/corpusIndex'`
6. **Context imports** — `import { useView } from '../context/ViewContext'`
7. **Asset imports** — `import bundledContent from '../assets/bundled-content.json'`
8. **CSS imports** — `import './App.css'`

**Path Aliases:** None. All imports use relative paths (`./`, `../`). No `@/` or other path aliases.

## Error Handling

**Patterns:**

- **Empty catch blocks (`catch {}`)** — Used extensively to silently handle recoverable errors like localStorage read failures, JSON parse failures, or optional backend calls. Example:
  ```js
  try { return JSON.parse(raw); } catch { return null; }
  ```

- **Guard clauses / early returns** — Functions return early for null/empty inputs:
  ```js
  function extractTitle(html) {
    const text = stripHtml(html).trim();
    if (!text) return 'Untitled';
    // ...
  }
  ```

- **ErrorBoundary class component** — `src/components/ErrorBoundary.jsx` wraps lazy-loaded views (CanvasView, ConstellationGraph) with a "Something went wrong" fallback + "Try again" button.

- **Network error handling** — AI fetch calls in `useAI.js` wrap HTTP calls in try/catch with descriptive error messages:
  ```js
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${endpoint}: ${detail}`);
  }
  ```

- **AbortController with timeout** — AI requests use `AbortController` + `setTimeout` for 30-second timeouts:
  ```js
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  ```

- **Optional chaining and nullish coalescing** — Used throughout:
  ```js
  data.choices?.[0]?.message?.content?.trim() || '';
  activeNote?.content || ''
  opts.temperature ?? 0.3
  ```

## Logging

**Framework:** `console.warn` and `console.error` only. No structured logging library.

**Patterns:**
- AI errors logged via `console.error('AI proxy error:', err.message)` in `vite.config.js`
- Index rebuild failures logged via `console.warn('Index rebuild:', e.message)` in `App.jsx`
- Most failures are silently caught (`catch {}`) without logging

## Comments

**When to Comment:**
- Section headers in CSS: `/* ===== Design Tokens ===== */`, `/* ===== Layout ===== */`
- Brief inline comments for non-obvious logic: `// Weekly trend: compare this week's average to last week's`
- JSDoc/TSDoc: Not used. No commented function signatures or type annotations.

## Function Design

**Size:** Functions range from small helpers (5-15 lines) to large orchestration functions (100+ lines in `App.jsx`). No explicit size guideline is enforced.

**Parameters:** Single `options` object pattern used for components and hooks with many parameters:
```js
export default function NoteCard({ note, isActive, onSelect, onDelete, searchSnippet, searchQuery, health })
```

**Return Values:**
- Components return JSX or `null` for empty/loading states
- Hooks return objects or arrays
- Utility functions return primitives, objects, or arrays

## Module Design

**Exports:**
- Components: `export default function ComponentName(...)` — always default export
- Hooks: `export default function useHook(...)` — always default export, except `useSpeech` which uses `export function useSpeech()`
- Utility functions: `export function funcName(...)` — named exports. `corpusIndex` exports a single default object with methods.
- Context: `export function ViewProvider(...)` and `export function useView()`

**Barrel Files:** None. No `index.js` files re-exporting modules.

**File Boundaries:**
- One component or hook per file
- Utility files can contain multiple related functions

## Component Patterns

**Structure:**
- All components use function declarations with default export
- Consistent destructuring of props in the function signature
- State near the top of the component, then effects, then handlers, then render

**React.memo usage (4 components):** `Canvas`, `FloatingToolbar`, `NoteList`, `SettingsPage` — wrapped in `React.memo` for render optimization.

**Lazy loading:** `CanvasView` and `ConstellationGraph` loaded via `React.lazy(() => import(...))` in `App.jsx`, wrapped in `<Suspense>` and `<ErrorBoundary>`.

**forwardRef:** `Canvas.jsx` uses `forwardRef` with `useImperativeHandle` to expose `focus()` and `getElement()` methods.

## Hook Patterns

**State management:**
- All hooks use `useCallback` for returned functions to maintain referential stability
- `useRef` used extensively for mutable values that shouldn't trigger re-renders (timers, abort controllers, DOM refs)
- `useMemo` used for derived/computed data

**Custom hooks:**
- `useLocalStorage(key, defaultValue)` — wraps localStorage with state synchronization and error handling. Returns `[value, setter, error]`.
- All storage keys use `crescendo-*` prefix. Migration from old `nodemind-*` prefix in `main.jsx:migrateStorageKeys()`.

**Debouncing pattern:**
```js
clearTimeout(debounceRef.current);
debounceRef.current = setTimeout(() => setSaveStatus('Saved'), 1000);
```

## CSS Conventions

**Location:** Single file `src/App.css` (5,736 lines)

**Naming:** BEM-like convention:
- Block: `.app`, `.skill-ring`, `.mcq`, `.canvas`
- Element: `.app__nav`, `.app__panel`, `.app__main`, `.mcq__stem`, `.mcq__option`
- Modifier: `.app--focus`, `.mcq__option--selected`, `.mcq__option--correct`, `.note-card--active`

**Design Tokens:**
- CSS custom properties in `:root` and `html[data-theme="dark"]`
- Pattern: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--transition-*`
- Used throughout via `var(--color-text)` rather than raw values

**Dark theme:**
- Toggled via `data-theme` attribute on `<html>` element
- `ViewContext.jsx` manages theme state with `useLocalStorage`
- Dark theme overrides the same `--color-*` custom properties

## Architecture Conventions

**No TypeScript:** Entire codebase uses plain JavaScript. No `.d.ts` files, no `tsconfig.json`, no type annotations.

**No global state library** (Redux, Zustand, etc.). State managed via:
- `useLocalStorage` for persistent state
- `ViewContext` (React Context) for view-related state
- Component-local state with `useState`
- Props drilling for data flow

**All CSS in a single file:** No CSS modules, CSS-in-JS, or component-scoped styles.

## File Sizes

- `src/App.jsx`: 1,071 lines — largest file, contains main application logic
- `src/App.css`: 5,736 lines — single CSS file
- `src/hooks/useDSEPapers.js`: 1,392 lines — largest hook
- `src/utils/corpusIndex.js`: 632 lines
- Most other files: 40-200 lines

---

*Convention analysis: 2026-06-23*
