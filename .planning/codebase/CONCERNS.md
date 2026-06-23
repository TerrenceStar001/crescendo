# Codebase Concerns

**Analysis Date:** 2026-06-23

## Tech Debt

### Monolithic Hook — `useDSEPapers.js` (1,392 lines)

**Issue:** Single file handles JSON parsing/fixing, AI generation with retries, paper caching, passage reconstruction, question generation, writing prompts, reading history, and notes generation. It is the largest file in the project and violates single-responsibility.

**Files:** `src/hooks/useDSEPapers.js` (entire file)

**Impact:** Hard to test, reason about, or modify. Any change risks cascading breakage across the entire paper lifecycle. The JSON repair logic (`fixAIJSON`, `tryParseJSON`, `parseJSONArray`) alone spans ~120 lines of brittle regex heuristics.

**Fix approach:** Decompose into smaller modules:
- `src/utils/aiJsonParser.js` — extract JSON repair utilities
- `src/utils/paperGenerator.js` — AI-based paper/question generation logic
- `src/utils/passageReconstructor.js` — passage reconstruction from RAG chunks
- `src/hooks/useDSEPapers.js` — keep only orchestration/state

### Monolithic Component — `App.jsx` (1,071 lines)

**Issue:** Root component holds all global state, all callbacks, and renders every view. 20+ `useState` calls, 15+ `useRef` calls, dozens of `useMemo`/`useCallback` chains, and all the JSX branching for every mode.

**Files:** `src/App.jsx`

**Impact:** Any global state change causes widespread re-renders. The component is impossible to unit test. Adding new features requires editing this single file.

**Fix approach:** Split into smaller layout components. Move modal/overlay state into dedicated hooks or context slices. Extract the view-dispatch logic into a router-like pattern.

### Monolithic Component — `ReadingModule.jsx` (840 lines)

**Issue:** Combines session management, timer, passage rendering, question navigation, answer tracking, grading, review mode, notes generation, and session persistence in one component.

**Files:** `src/components/ReadingModule.jsx`

**Impact:** Similar to above — hard to maintain, test, or extend.

**Fix approach:** Separate timer logic, session persistence, and results/review into custom hooks.

### Silent Error Handling via Empty Catch Blocks

**Issue:** 15+ empty `catch {}` blocks throughout the codebase that swallow exceptions silently. Common pattern:

```javascript
try { parsed = JSON.parse(fixed); } catch {}
```

**Files:**
- `src/hooks/useDSEPapers.js` (lines 16, 21, 27, 29, 121, 123)
- `src/components/ReadingModule.jsx` (lines 30, 34, 42, 66, 90)
- `src/components/SpeakingModule.jsx` (line 168)
- `src/components/ActionBar.jsx` (line 150)
- `src/utils/dseGrading.js` (line 79)
- `server/routes/content.js` (lines 8, 9)
- `server/index.js` (line 377)
- `server/db/schema.js` (line 86)
- `src/hooks/useIndexedDB.js` (lines 43, 64, 88)

**Impact:** Debugging is nearly impossible. Errors in production are invisible. Users see "nothing happened" with no indication of what went wrong.

**Fix approach:** At minimum, log warnings for expected failures (`console.warn`). For unexpected errors, use `console.error` and surface user-visible feedback where appropriate.

### Hardcoded Config in Source Code

**Issue:** Server-side default AI endpoint hardcoded to Nvidia and model to `meta/llama-3.1-8b-instruct` in `server/routes/analyze.js`. Bundled content seed data (5 full reading passages) embedded inline in `server/index.js` lines 44-118.

**Files:**
- `server/routes/analyze.js` (line 7)
- `server/index.js` (lines 44-118)

**Impact:** Changing AI provider requires modifying source code. Bundled passages inflate server entry point and make content updates require code deploys.

**Fix approach:** Move bundled content to `server/data/bundled.json`. Read AI endpoint from `process.env` with sensible defaults only.

### `localStorage` as Primary Data Store

**Issue:** All user notes, AI config, corpus index, study sessions, and app settings are stored in `localStorage`. Notes serialized as a single JSON blob on every change.

**Files:** `src/hooks/useLocalStorage.js`, `src/hooks/useNotes.js`

**Impact:**
- ~5-10MB storage limit (notes with rich HTML content can approach this rapidly)
- No data sync across devices
- No conflict resolution
- Full serialization on every keystroke (`localStorage.setItem` called on each note update)
- Blocking I/O on the main thread

**Fix approach:** Migrate to IndexedDB for notes storage with incremental saves. Add export reminder at storage thresholds >70%.

### Corpus Index Rebuild on Every Note Change

**Issue:** `App.jsx` line 153-159 triggers a corpus index rebuild 3 seconds after any note change:

```javascript
useEffect(() => {
  clearTimeout(indexTimeoutRef.current);
  indexTimeoutRef.current = setTimeout(() => {
    try { corpusIndex.rebuild(notes); } catch (e) { console.warn('Index rebuild:', e.message); }
  }, 3000);
  return () => clearTimeout(indexTimeoutRef.current);
}, [JSON.stringify(notes.map(n => ({ id: n.id, tags: n.tags })))]);
```

The dependency array creates a new stringified array on every render, and `rebuild` iterates the entire note list.

**Files:** `src/App.jsx` (lines 153-159), `src/utils/corpusIndex.js`

**Impact:** CPU spike after every keystroke. Debounce of 3s mitigates slightly but the full rebuild is wasteful.

**Fix approach:** Incremental index update on specific note changes instead of full rebuild. Use a more targeted dependency comparison.

### CSS Monolith — Single File

**Issue:** All styles in `src/App.css` — no CSS modules, no component-level styles.

**Files:** `src/App.css`

**Impact:** As the app grows, CSS conflicts increase. No scoping. Painful to modify without breaking unrelated components. File is already very large.

**Fix approach:** Adopt CSS modules or CSS-in-JS per component. Extract the existing BEM-style blocks as a first step.

---

## Known Bugs

### `speakingScore` Used Before Definition

**Issue:** In `SpeakingModule.jsx`, the variable `speakingScore` is used on line 181 (`const speakingScore = Math.round(...)`) but is referenced earlier in the same scope before its declaration.

**Files:** `src/components/SpeakingModule.jsx` (lines 171-181)

```javascript
// line 177 — uses speakingScore
overall: { score: speakingScore, dseLevel: scoreToDseLevel(speakingScore, 'speaking').level },
// ...
// line 181 — defines speakingScore
const speakingScore = Math.round((fluencyScore + vocabScore + grammarScore) / 3);
```

**Trigger:** The fallback analysis path (no AI key): `speakingScore` is in the temporal dead zone when used. This will throw a `ReferenceError` at runtime.

**Workaround:** Works only when AI analysis succeeds (which is the happy path), so the bug is latent but real.

### Audio Stream Not Released on Stop

**Issue:** `useAudioRecorder.js` calls `navigator.mediaDevices.getUserMedia` on start but never stops the stream tracks on stop/cleanup. The `AudioContext` is closed, but the microphone stream remains active.

**Files:** `src/hooks/useAudioRecorder.js` (lines 52-69, 76-84)

**Trigger:** After recording stops, the browser continues showing microphone usage indicator. Multiple start/stop cycles leak media streams.

### JSON Parsing Heuristics Produce False Positives

**Issue:** `fixAIJSON()` in `useDSEPapers.js` aggressively repairs malformed AI output using regex. The function replaces single quotes with double quotes globally (including inside strings), adds missing commas, and unquotes property names. This can produce valid JSON that does not match the expected schema.

**Files:** `src/hooks/useDSEPapers.js` (lines 33-80)

**Trigger:** AI returns output with text content containing single quotes or special characters that are incorrectly transformed.

### Session Recovery Can Restore Stale Data

**Issue:** `ReadingModule.jsx` saves session state to `sessionStorage` on every answer change, but doesn't validate the data on restore. A browser crash could leave partial/inconsistent state.

**Files:** `src/components/ReadingModule.jsx` (lines 52-67)

**Trigger:** Restoring from `sessionStorage` after an incomplete save could load a paper without passages, or questions without a paper.

---

## Security Considerations

### XSS via `dangerouslySetInnerHTML`

**Issue:** AI-generated passage content is rendered directly into the DOM via `dangerouslySetInnerHTML` without any sanitization. The AI could (inadvertently or through prompt injection) generate `<script>` tags or event handlers.

**Files:**
- `src/components/ReadingModule.jsx` (lines 415, 781)
- `src/components/ListeningModule.jsx` (line 180)

**Current mitigation:** None. Content is rendered as-is.

**Recommendations:**
- Use DOMPurify (`npm install dompurify`) to sanitize HTML before rendering.
- Strip `<script>`, `<iframe>`, `<object>`, `<embed>`, `on*` event handlers.

### XSS via `contentEditable` + `innerHTML`

**Issue:** Note content is stored and rendered as innerHTML. The `Canvas.jsx` component sets content via `innerRef.current.innerHTML = v`. A pasted note or imported note could contain malicious HTML.

**Files:**
- `src/components/Canvas.jsx` (lines 28, 139)
- `src/components/WritingModule.jsx` (line 222)
- `src/App.jsx` (line 487)

**Current mitigation:** The paste handler strips rich text formatting by reading `text/plain` from clipboard. However, imported notes (via import) are not sanitized.

**Recommendations:** Sanitize on import and on write. Strip script tags and event handlers from note content at rest.

### API Key Stored in Plaintext localStorage

**Issue:** AI API key is stored unencrypted in `localStorage` under `crescendo-ai-config`. Any browser extension or XSS vulnerability can exfiltrate it.

**Files:** `src/hooks/useAI.js` (line 90: `useLocalStorage('crescendo-ai-config', DEFAULT_CONFIG)`)

**Current mitigation:** None.

**Recommendations:** At minimum, display a warning. Consider using a Web Crypto API derived key or session-only storage.

### SQL Injection via `LIKE` Interpolation

**Issue:** Backend routes use string interpolation to build `LIKE` clauses for topic filtering:

```javascript
if (topic) { sql += ' AND topics LIKE ?'; params.push(`%"${topic}"%`); }
```

While parameterized for the `LIKE` value, the unescaped `%` wrapping and direct inclusion of user input in the SQL pattern could enable unexpected query expansion. More critically, `req.params.id` (route params used in `articles/:id`) is directly concatenated into `WHERE id = ?` — this is parameterized correctly, but the route itself uses `req.params` without type validation.

**Files:** `server/routes/content.js` (lines 20, 41, 61, 100, 110)

**Current mitigation:** Routes use prepared statements with `?` placeholders for values.

**Recommendations:** Validate `req.params.id` is alphanumeric before querying. Add length limits to all query parameters.

### No Rate Limiting or DoS Protection

**Issue:** The Express server has no rate limiting, no request size limits (beyond the 5mb body limit), no helmet for security headers, and no CORS origin restriction (`app.use(cors())` allows all origins).

**Files:** `server/index.js` (lines 22-23)

**Current mitigation:** Only the 5mb body size limit.

**Recommendations:**
- Add `express-rate-limit` to limit requests per IP.
- Add `helmet` for security headers.
- Restrict CORS to specific origins in production.

### No Request Input Validation

**Issue:** Backend routes accept arbitrary request bodies without schema validation. The `topic` query parameter is used in SQL without character-set restrictions. The `limit` parameter is cast with `parseInt` but never clamped to a maximum.

**Files:** `server/routes/content.js`, `server/routes/analyze.js`, `server/routes/crawl.js`

**Recommendations:** Add a validation library (e.g., `zod`) to validate all request inputs. Clamp `limit` to a sane maximum (e.g., 100).

---

## Performance Bottlenecks

### Full Note Serialization on Every Keystroke

**Issue:** `useNotes` calls `setState` on every note update, which triggers `useLocalStorage` to serialize the entire notes array to `localStorage`. For 100+ notes with rich HTML content, this can take 10-50ms on the main thread.

**Files:** `src/hooks/useNotes.js` (line 88-95), `src/hooks/useLocalStorage.js` (line 32)

**Improvement path:** Debounce localStorage writes (already partially done via note auto-save debounce in App.jsx). Or migrate to IndexedDB with incremental key-value updates.

### RAG Vector Store Is Keyword Matching, Not Embeddings

**Issue:** `VectorStore.search()` uses simple TF-IDF keyword overlap scoring. The "vector store" has no actual vectors — it's a bag-of-words search. The embedding column in SQLite is always `NULL`.

**Files:**
- `server/rag/vectorStore.js` (lines 27-36)
- `server/rag/engine.js` (line 15: `INSERT ... embedding) VALUES (..., NULL)`)

**Cause:** The schema and RAG pipeline were designed for embedding-based retrieval but no embedding model was integrated. The system performs keyword matching only.

**Improvement path:** Either integrate an embedding model (e.g., `sentence-transformers` or an embeddings API) or rename the "vector store" to "keyword index" to avoid confusion. Consider using SQLite FTS5 for better keyword search.

### No Component Virtualization for Note List

**Issue:** `NoteList.jsx` renders all notes as DOM elements. With 500+ notes, the browser will experience significant layout/paint cost.

**Files:** `src/components/NoteList.jsx`

**Improvement path:** Use `react-window` or `react-virtuoso` to virtualize the list.

### `useEffect` with Inline Object Dependency

**Issue:** App.jsx lines 153-159 use `JSON.stringify(notes.map(...))` as a `useEffect` dependency. This creates a new stringified value on every render (since `.map()` returns a new array), but the `JSON.stringify` output only changes when note IDs or tags change. Despite the intent, React still recomputes the string on every render.

**Files:** `src/App.jsx` (line 159)

**Improvement path:** Use a memoized dependency that tracks a checksum of `id + tag count + tag names` or listen to a specific event.

---

## Fragile Areas

### AI JSON Response Parsing — `useDSEPapers.js`

**Files:** `src/hooks/useDSEPapers.js` (lines 6-31, 33-80, and scattered throughout)

**Why fragile:** The AI response parser uses 6+ layers of attempted JSON parsing with regex-based "fixing":
1. Remove markdown code fences
2. Try `JSON.parse` directly
3. Extract `[...]` or `{...}` block via regex
4. Strip `//` line comments
5. Remove trailing commas
6. Replace single quotes with double quotes (outside strings)
7. Quote unquoted property names
8. Insert missing commas between adjacent values

Each heuristic assumes a specific failure mode. The single-quote replacement will corrupt strings that legitimately contain single quotes (e.g., "It's"). The comma insertion can create invalid structure.

**Safe modification:** When changing this code, test against real AI outputs that exercise each heuristic branch. Always add regression test cases for known edge cases.

### Note Data Integrity — HTML Content

**Files:** `src/components/Canvas.jsx`, `src/hooks/useNotes.js`

**Why fragile:** Note content is arbitrary HTML stored in localStorage. There is no schema validation, no HTML sanitization, and no cleanup of broken markup. A paste of malformed HTML could corrupt the entire note. The export creates JSON but there is no import validation beyond checking `notes` is an array.

**Safe modification:** Ensure all note content flows through a sanitization function. Add a migration path for existing broken content.

### Auto-Crawl Dependencies

**Files:** `server/index.js` (lines 150-273)

**Why fragile:** The auto-crawl system:
- Depends on external RSS feeds (SCMP, BBC, TED) that may change URL structure or disappear
- Has no retry strategy with exponential backoff
- All feeds fetched sequentially with 1-1.5s delays — the full crawl can take minutes
- DSE OCR uses Tesseract.js which is CPU-intensive and may not work in all server environments
- No timeout on RSS feed fetches

**Safe modification:** Add `AbortController` with timeouts to RSS fetches. Wrap each feed fetch in individual try-catch (currently all feeds in a single try block). Skip auto-crawl entirely if no network available.

### Storage Key Migration

**Files:** `src/main.jsx` (lines 8-49)

**Why fragile:** The migration code iterates all localStorage keys. If a key has a stored value of `"undefined"` or `"null"` (as strings, not JSON), the code removes it. This is destructive — if a user has a note titled "undefined", the `nodemind-notes` or `crescendo-notes` entry is deleted. The fix for `nodemind-notes` also checks `!Array.isArray(parsed.notes)` — a corrupted notes entry destroys all data.

**Test coverage:** Not tested. No error reporting on data loss.

### IndexedDB Version Management

**Files:** `src/hooks/useIndexedDB.js` (line 4: `const DB_VERSION = 1`)

**Why fragile:** The IndexedDB schema version is hardcoded. Schema migrations (adding/removing stores) would require manual version management with `onupgradeneeded` handlers. Currently only one store exists, but any future migration that increments the version must handle all intermediate versions — if a user skips from v1 to v3, the v2 upgrade path must still exist.

---

## Scaling Limits

**localStorage Capacity:**
- Current limit: ~5-10MB per origin
- Notes with rich HTML content: ~2-5KB per note → 1000-2000 notes max before quota errors
- Session data, corpus index, kind profiles add overhead
- `QuotaExceededError` is caught in `useLocalStorage.js` but there is no recovery path beyond exporting

**In-Memory RAG Vector Store:**
- All embeddings/text loaded into memory on server start
- For 10,000+ chunks, memory usage becomes significant
- No pagination in search — entire vector store iterated on every query

**No Multi-Device or Multi-User Support:**
- Zero-user architecture — data lives only in browser localStorage
- No authentication
- No backend persistence for frontend data

---

## Dependencies at Risk

**`react-force-graph-3d` ^1.29.1**
- **Risk:** Niche library with small maintenance team. Depends on `three.js` and `kapsule`. Breaking changes in `three` (currently ^0.184.0) could break the graph.
- **Impact:** ConstellationGraph component would fail entirely.
- **Migration plan:** Consider standard 2D graph visualization as fallback. The 3D force graph is a display-only feature.

**`@xyflow/react` ^12.11.0**
- **Risk:** Relatively new React-only version of React Flow (migrated from `reactflow`). API stability is evolving.
- **Impact:** CanvasView component would fail.
- **Migration plan:** Pin exact version. Watch changelog for breaking changes before upgrading.

**`vite-plugin-pwa` ^1.3.0**
- **Risk:** Uses Workbox `generateSW` strategy. The generated service worker (`dist/sw.js`) is opaque and caching bugs are hard to debug.
- **Impact:** Cached stale content served to users after updates. PWA install may fail.
- **Migration plan:** Consider `injectManifest` strategy for more control, or test SW behavior thoroughly after each deploy.

**Web Speech API (TTS/STT)**
- **Risk:** Only fully supported in Chrome/Edge. Firefox has partial/no support. Safari requires user gesture for every synthesis call.
- **Impact:** Listening and Speaking modules broken on non-Chrome browsers.
- **Current fallback:** None in `useSpeech.js` or `useAudioRecorder.js`. The `isSupported` flag is checked but no graceful degradation.

---

## Test Coverage Gaps

**Entire codebase — no tests exist.**
- No unit tests for any hook, utility, or component
- No integration tests for API routes
- No E2E tests for critical user flows

**Highest-risk untested areas:**
| Area | Risk | Priority |
|------|------|----------|
| `dseGrading.js` — grade boundary logic | Incorrect DSE level calculations affect all modules | High |
| `useDSEPapers.js` — JSON repair | Malformed AI responses cause silent failures | High |
| `corpusIndex.js` — content type detection | Wrong kind classifications cascade to analytics | Medium |
| `useKnowledgeHealth.js` — forgetting curve | Wrong half-life calculations mislead study recommendations | Medium |
| `server/routes/content.js` — API endpoints | SQL injection, broken queries affect all backend data | High |
| `useAI.js` — AI proxy calls | Silent failures, wrong provider config break all AI features | High |

---

## Missing Critical Features

**Automatic data backup:**
- No auto-export or backup of notes
- No data recovery from corrupted `localStorage`
- The migration code in `main.jsx` silently deletes data it can't parse

**User-visible error state:**
- Most errors are swallowed in empty `catch {}` blocks
- AI failures return `null` silently — user sees nothing happened
- No toast/notification system for operational feedback

**Graceful degradation for API failures:**
- When OpenCode serve is not running, AI features fail silently
- No connectivity check or helpful error message
- User has to know to run `opencode serve --port 4010` manually

---

*Concerns audit: 2026-06-23*
