# Phase 7: PDF Ingestion Pipeline Fix — Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 7 new/modified
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/crawlers/pdfParser.js` | crawler/utility | transform | itself (extant pattern) | exact |
| `server/crawlers/dseOcr.js` | crawler/utility | transform | itself (extant pattern) | exact |
| `server/index.js` | config/entry | N/A | itself (config pattern) | exact |
| `server/routes/courses.js` | controller/route | request-response | itself (extant) + `analyze.js` | exact |
| `server/db/schema.js` | model/schema | CRUD | itself (extant pattern) | exact |
| `src/components/CourseIngestion.jsx` | component | request-response | itself + `DrillGenerator.jsx` | exact |
| `src/hooks/useIndexedDB.js` | hook | CRUD | itself (extant pattern) | exact |

## Pattern Assignments

### `server/crawlers/pdfParser.js` (crawler/utility, transform)

**Analog:** `server/crawlers/pdfParser.js` itself (existing pattern)

**Imports pattern** (lines 1-9):
```javascript
import * as cheerio from 'cheerio';
```

PDF text extraction uses dynamic imports for heavy dependencies. Keep this pattern for any new dependencies (pdf2md):

```javascript
const pdf2md = await import('@opendocsg/pdf2md');
```

**Current core extraction pattern** (lines 15-31) — THIS IS WHAT NEEDS POSITIONAL SORT FIX:
```javascript
export async function extractPdfText(fileBuffer) {
  try {
    const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.js');
    const getDocument = pdfjsMod.default?.getDocument || pdfjsMod.getDocument;
    const data = new Uint8Array(fileBuffer);
    const doc = await getDocument({ data, disableFontFace: true }).promise;

    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      const pageText = tc.items
        .map(item => item.str || '')
        .join(' ');                  // <-- BUG: no positional sorting, PDF-internal order
      pages.push(pageText);
    }

    let text = pages.join('\n\n');
    // HTML entity cleanup...
    text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<')...;
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  } catch (e) {
    console.warn('[pdfParser] extractPdfText failed:', e.message);
    return null;
  }
}
```

**Positional sort pattern to apply** (insert between `tc` fetch and `.map()` at line 27):
Items in `getTextContent()` have `transform[4]` (X) and `transform[5]` (Y). Sort by Y descending (top-to-bottom), then X ascending (left-to-right), inserting `\n` when Y changes significantly:

```javascript
// From CONTEXT.md D-01 + research finding:
const sortedItems = [...tc.items].sort((a, b) => {
  const yDiff = (b.transform[5] || 0) - (a.transform[5] || 0);
  if (Math.abs(yDiff) > 5) return yDiff;   // Different line → Y sort
  return (a.transform[4] || 0) - (b.transform[4] || 0); // Same line → X sort
});

let pageText = '';
let lastY = null;
for (const item of sortedItems) {
  const y = item.transform[5] || 0;
  if (lastY !== null && Math.abs(y - lastY) > 5) {
    pageText += '\n';   // Line break when Y position changes
  }
  pageText += (item.str || '');
  lastY = y;
}
```

**Error handling pattern** (lines 47-50):
```javascript
catch (e) {
  console.warn('[pdfParser] extractPdfText failed:', e.message);
  return null;
}
```

**Fallback chain pattern** in `parsePdf()` (lines 102-120) — add pdf2md between text and OCR:
```javascript
export async function parsePdf(fileBuffer) {
  // Try text extraction first...
  const textResult = await extractPdfText(fileBuffer);
  if (textResult && textResult.length >= 50) {
    return { text: textResult, method: 'text' };
  }

  // NEW: Try pdf2md fallback when quality is low (D-02)
  // Triggered when <500 chars OR <70% English content

  // Fall back to OCR
  const ocrResult = await extractPdfWithOCR(fileBuffer);
  if (ocrResult && ocrResult.length >= 50) {
    return { text: ocrResult, method: 'ocr' };
  }

  return { text: null, method: 'failed' };
}
```

**English content detection pattern** (new utility, inspired by `src/utils/questionValidator.js` line 27-29 normalizeText):
```javascript
// Pure function — follows project convention of pure utility functions
export function isEnglishContent(text, threshold = 0.7) {
  if (!text || text.length < 10) return false;
  const clean = text.replace(/[^a-zA-Z\s]/g, '').trim();
  if (clean.length === 0) return false;
  const alpha = clean.replace(/\s+/g, '').length;
  return alpha / text.length >= threshold;
}
```

---

### `server/crawlers/dseOcr.js` (crawler/utility, transform)

**Analog:** `server/crawlers/dseOcr.js` itself (existing pattern)

**Current renderPageToPNG pattern** (lines 18-23) — target for image preprocessing improvements:
```javascript
function renderPageToPNG(page) {
  const viewport = page.getViewport({ scale: RENDER_SCALE });  // RENDER_SCALE = 1.5
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  return page.render({ canvasContext: ctx, viewport }).promise.then(() => canvas.toBuffer('image/png'));
}
```

**Improvement pattern** — add preprocessing before OCR. Pattern: canvas manipulation with sharpening/denoising:
```javascript
// Image preprocessing improvements (D-03):
// 1. Increase render scale for higher DPI before OCR
// 2. Apply grayscale conversion
// 3. Apply binarization (threshold)
// 4. Optional: deskew via canvas rotation detection

function preprocessImage(canvas, ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // Grayscale + binarization
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const binary = gray > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = binary;
  }
  ctx.putImageData(imageData, 0, 0);
}
```

**OCR workflow pattern** (lines 91-139 in `ocrPDF()`) — the pipeline structure to follow:
```javascript
async function ocrPDF(pdfUrl, onProgress) {
  // Suppress pdfjs font warnings
  const origWarn = console.warn;
  console.warn = (...args) => { ... };
  try {
    // Load PDF
    // Render pages to images
    // Run OCR via tesseract worker
    // Return concatenated text
  } finally {
    console.warn = origWarn;
  }
}
```

---

### `server/index.js` (config/entry, N/A)

**Analog:** `server/index.js` itself (line 24)

**Body size limit pattern** — single line change:
```javascript
// Line 24 — EXISTING (change from '5mb' to '10mb'):
app.use(express.json({ limit: '5mb' }));

// AFTER:
app.use(express.json({ limit: '10mb' }));
```

**Routes registration pattern** (lines 285-288) — no change needed, but shows the pattern:
```javascript
app.use('/api', contentRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/crawl', crawlRoutes);
app.use('/api/courses', coursesRoutes);
```

**Unified error handler** (lines 525-528):
```javascript
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});
```

---

### `server/routes/courses.js` (controller/route, CRUD + request-response)

**Analog:** `server/routes/courses.js` itself + `server/routes/analyze.js` (async AI pattern)

**Existing route setup pattern** (lines 10-13):
```javascript
import { Router } from 'express';
import { getDB } from '../db/connection.js';
import { parsePdf } from '../crawlers/pdfParser.js';

const router = Router();
```

**AI call with retry pattern** (lines 156-220 in `callAICourse()`):
```javascript
async function callAICourse(promptText, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const fetchRes = await fetch('http://127.0.0.1:4010/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'opencode/deepseek-v4-flash-free',
          messages: [...],
          max_tokens: 4000,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      // ... parse response, validate, retry on failure
    } catch (e) {
      clearTimeout(timeout);
      if (attempt < retries) continue;
      return { error: `AI structuring failed: ${e.message}` };
    }
  }
}
```

**JSON parse pattern** (lines 91-101) — extracted from `callAICourse()`, used for all AI JSON responses:
```javascript
function parseJSONResponse(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }
  try { return JSON.parse(trimmed); } catch { return null; }
}
```

**Validation pattern** (lines 21-84) — server-side course structure validator that returns `{ valid, errors }`:
```javascript
function validateCourseDraft(courseObj) {
  const errors = [];
  if (!courseObj || typeof courseObj !== 'object') {
    return { valid: false, errors: ['Course must be an object'] };
  }
  // ... nested validation of topics, lessons, exercises
  return { valid: errors.length === 0, errors };
}
```

**Existing quality gate pattern** (from POST /ingest, lines 229-321) — shows where to add new gates:
```javascript
router.post('/ingest', async (req, res) => {
  try {
    // 1. Validate file type + size
    // 2. Decode base64
    // 3. Parse PDF → get text
    const { text, method } = await parsePdf(fileBuffer);
    if (!text) {
      return res.status(422).json({ error: 'Could not extract text...' });
    }
    // === ADD QUALITY GATE HERE ===
    // Return quality metrics instead of sending directly to AI
    // 4. Call AI to structure
    // 5. Save to SQLite
  } catch (e) {
    console.error('[courses] Error:', e.message);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});
```

**New quality gate pattern** (to insert between parsePdf and AI call):
```javascript
// Quality assessment — per-page character count + English % (D-05, D-06)
function assessExtractionQuality(text) {
  if (!text || typeof text !== 'string') {
    return { pass: false, chars: 0, englishPct: 0, perPage: [], reason: 'No text extracted' };
  }

  const pages = text.split('\n\n');
  const perPage = pages.map((pageText, i) => {
    const chars = pageText.length;
    const alphaChars = (pageText.match(/[a-zA-Z]/g) || []).length;
    const englishPct = chars > 0 ? Math.round((alphaChars / chars) * 100) : 0;
    return { page: i + 1, chars, englishPct, status: chars >= 100 ? 'ok' : 'low' };
  });

  const totalChars = text.length;
  const totalAlpha = (text.match(/[a-zA-Z]/g) || []).length;
  const totalEnglishPct = totalChars > 0 ? Math.round((totalAlpha / totalChars) * 100) : 0;
  const pass = totalChars >= 500 && totalEnglishPct >= 70;

  return { pass, chars: totalChars, englishPct: totalEnglishPct, perPage };
}
```

**Heading detection chunking pattern** (D-08, D-09, D-10):
```javascript
// Detect headings via font size/weight from pdfjs text items
function detectHeadings(textItems) {
  return textItems.filter(item => {
    const fontSize = item.transform?.[0] || 0;
    const fontName = item.fontName || '';
    // Heuristic: larger font or bold font name → likely heading
    return fontSize > 14 || /bold|heavy|black/i.test(fontName);
  }).map(item => item.str);
}
```

**Sync endpoint pattern** (new, for D-11/D-12/D-13 — follows `content.js` route pattern):
```javascript
// POST /api/courses/sync — Returns all published courses for IndexedDB sync
// Pattern: simple read query, JSON response, error propagation (no silent catch)
router.post('/sync', (req, res) => {
  try {
    const db = getDB();
    const courses = db.prepare(`
      SELECT id, title, description, content, tags, difficulty, source, published, created_at, updated_at
      FROM courses WHERE published = 1
      ORDER BY updated_at DESC
    `).all();

    const parsed = courses.map(c => ({
      ...c,
      content: (() => { try { return JSON.parse(c.content); } catch { return null; } })(),
      tags: (() => { try { return JSON.parse(c.tags); } catch { return []; } })(),
    }));

    res.json({ courses: parsed, count: parsed.length });
  } catch (e) {
    console.error('[courses] Sync error:', e.message);
    res.status(500).json({ error: 'Failed to sync courses' });
  }
});
```

**Error propagation pattern** — replace existing `catch {}` with `catch (e) { console.error(...) }` throughout. All route handlers follow this convention from `analyze.js` lines 66-68:
```javascript
catch (e) {
  res.status(500).json({ error: e.message });
}
```

---

### `server/db/schema.js` (model/schema, CRUD)

**Analog:** `server/db/schema.js` itself (existing DDL pattern)

**Table creation pattern** (lines 1-86):
```javascript
export function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles ( ... );
    CREATE TABLE IF NOT EXISTS courses ( ... );
    -- etc.
  `);
```

**New table for extraction quality** — to store per-page quality metrics linked to a course draft:
```javascript
// Add to existing db.exec() block:
CREATE TABLE IF NOT EXISTS course_extractions (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  total_chars INTEGER,
  english_pct INTEGER,
  quality_score TEXT,  -- 'pass', 'marginal', 'fail'
  per_page_data TEXT,  -- JSON array of per-page stats
  extraction_method TEXT,  -- 'text', 'pdf2md', 'ocr'
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Index pattern** (lines 89-98):
```javascript
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_course_extractions_course ON course_extractions(course_id)',
  // ...existing indexes...
];
for (const idx of indexes) {
  try { db.exec(idx); } catch {}
}
```

---

### `src/components/CourseIngestion.jsx` (component, request-response)

**Analog:** Itself + `DrillGenerator.jsx` (state machine + error/failed states)

**Current state machine pattern** (lines 469-531):
```javascript
switch (phase) {
  case 'idle':     return renderIdle();
  case 'uploading': return renderLoading('Reading file...');
  case 'parsing':  return renderLoading('Extracting text from PDF...');
  case 'generating': return renderLoading('AI is structuring your course...');
  case 'review':   return renderReview();
  case 'saving':   return renderLoading('Saving course...');
  case 'done':     return renderDone();
  default:         return null;
}
```

**Pattern to add** — insert `'quality'` phase between `'parsing'` and `'generating'`:
```javascript
// Updated state machine:
case 'quality':   return renderQuality();
```

**Existing error display pattern** (lines 231-245) — currently simple, replace with EnhancedErrorBanner:
```javascript
{error && (
  <div className="course__error-msg">
    <span>⚠</span> {error}
  </div>
)}
{error && (
  <div className="course__error-actions" style={{ display: 'flex', gap: 8 }}>
    <button className="course__btn course__btn--primary" onClick={...}>Try Again</button>
    <button className="course__btn course__btn--secondary" onClick={handleDiscard}>Cancel</button>
  </div>
)}
```

**EnhancedErrorBanner pattern** (new, per UI-SPEC):
```jsx
function EnhancedErrorBanner({ title, message, actionLabel, onAction, type = 'error' }) {
  return (
    <div className={`course__error-banner course__error-banner--${type}`} role="alert">
      <div className="course__error-banner-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div className="course__error-banner-content">
        <div className="course__error-banner-title">{title}</div>
        <div className="course__error-banner-body">{message}</div>
      </div>
      {actionLabel && (
        <div className="course__error-banner-action">
          <button className="course__btn course__btn--primary" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
```

**DrillGenerator state machine pattern** (DrillGenerator.jsx lines 53-67) — shows loading → error → retry pattern:
```javascript
const handleGenerate = useCallback(async () => {
  setPhase('generating');
  try {
    const generated = await generateDrills(...);
    if (generated?.length) {
      setDrills(generated);
      setPhase('ready');
    } else {
      setPhase('failed');
    }
  } catch {
    setPhase('failed');
  }
}, [...]);
```

**DrillGenerator failed state pattern** (DrillGenerator.jsx lines 114-126) — for error + retry UI:
```jsx
{phase === 'failed' && (
  <div className="drill-generator__card">
    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
      Practice questions could not be generated. Try again or start a new session.
    </p>
    <button className="drill-generator__cta" onClick={handleGenerate}>
      Try Again
    </button>
  </div>
)}
```

**QualityPreviewScreen pattern** (new, per UI-SPEC, renders in `'quality'` phase):
```jsx
function renderQuality() {
  if (!qualityData) return null;
  const { pass, chars, englishPct, perPage } = qualityData;
  const scoreClass = pass ? 'pass' : 'fail';

  return (
    <div className="course__ingestion">
      <div className="course__quality-preview">
        <div className="course__quality-header">
          <div className={`course__quality-score course__quality-score--${scoreClass}`}>
            {pass ? '✓' : '✗'}
          </div>
          <div>
            <h2>Extraction Quality</h2>
            <p>Review the extracted text quality before AI structuring.</p>
          </div>
        </div>

        {!pass && (
          <div className="course__quality-block" role="alert">
            <div className="course__quality-block-heading">Insufficient Content</div>
            <div className="course__quality-block-body">
              This PDF has {chars} characters ({englishPct}% English).
              At least 500 characters with 70% English content is needed.
            </div>
            <button className="course__btn course__btn--primary" onClick={handleDiscard}>
              Try a Different File
            </button>
          </div>
        )}

        <table className="course__quality-table" role="table" aria-label="Page extraction quality">
          <thead>
            <tr className="course__quality-table-header">
              <th>Page</th>
              <th>Characters</th>
              <th>English %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {perPage.map(p => (
              <tr key={p.page} className="course__quality-table-row">
                <td>{p.page}</td>
                <td>{p.chars}</td>
                <td>{p.englishPct}%</td>
                <td>
                  <div className="course__quality-bar" style={{ width: `${Math.min(100, (p.chars / 500) * 100)}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="course__quality-actions">
          <button className="course__btn course__btn--secondary" onClick={handleDiscard}>
            Cancel
          </button>
          {pass && (
            <button className="course__btn course__btn--primary" onClick={() => setPhase('generating')}>
              Proceed to Course Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Toast notification pattern** (reuses `.undo-toast` CSS pattern from App.css line 1459):
```jsx
function showToast(message, type = 'warning') {
  const toast = document.createElement('div');
  toast.className = `course__toast course__toast--${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}
```

**Upload handler pattern** (lines 35-92) — the flow to modify for quality gate integration:
```javascript
const handleFile = useCallback(async (file) => {
  // 1. Validate file type + size
  // 2. Read as base64
  // 3. POST to /api/courses/ingest
  // 4. Check response — if quality data returned, show quality screen
  //    (Currently goes directly to review — need to check for quality response)
  // 5. If quality passes → AI structuring
  // 6. On fail → show error banner with retry
}, []);
```

---

### `src/hooks/useIndexedDB.js` (hook, CRUD)

**Analog:** `src/hooks/useIndexedDB.js` itself (existing CRUD pattern)

**Existing CRUD pattern** (lines 22-44):
```javascript
const getItem = useCallback(async (key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => { resolve(req.result || null); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  } catch { return null; }
}, []);

const setItem = useCallback(async (key, value) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(value, key);
      req.onsuccess = () => { resolve(); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  } catch { /* silent */ }
}, []);
```

**DSE_KEYS map** (lines 100-112) — add course sync key if needed:
```javascript
const DSE_KEYS = {
  // ... existing keys ...
  COURSES: 'crescendo-course-definitions',
  COURSE_PROGRESS: 'crescendo-course-progress',
  COURSE_INGESTION: 'crescendo-course-ingestion',
};
```

**New sync pattern** (for D-11/D-12 Course sync with retry):
```javascript
// New method to add to useIndexedDB return:
const syncCourses = useCallback(async (fetchFn) => {
  try {
    const res = await fetchFn('/api/courses/sync', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { courses } = await res.json();
    if (courses && courses.length > 0) {
      await setItem(DSE_KEYS.COURSES, courses);
    }
    return courses;
  } catch (e) {
    console.warn('[IndexedDB] Course sync failed:', e.message);
    return null;
  }
}, [setItem]);

const getCourses = useCallback(async () => {
  return getItem(DSE_KEYS.COURSES);
}, [getItem]);
```

---

## Shared Patterns

### Server Route Error Handling
**Source:** `server/routes/analyze.js` lines 66-68, `server/routes/crawl.js` lines 89-92
**Apply to:** `server/routes/courses.js` (all routes)
```javascript
catch (e) {
  console.error('[courses] Error in POST /ingest:', e.message);
  res.status(500).json({ error: e.message || 'Internal server error' });
}
```

### Server-side Validation Return Pattern
**Source:** `server/routes/courses.js` lines 21-84, `src/utils/questionValidator.js`
**Apply to:** Quality gate validation, heading detection
```javascript
// Always return { valid: boolean, errors: string[] } or { pass: boolean, ... }
// Pure functions, no side effects
```

### AI Call with AbortController + Retry
**Source:** `server/routes/courses.js` lines 156-220 (callAICourse)
**Apply to:** Any new AI endpoints in courses routes
```javascript
// Retry loop with abort timeout
for (let attempt = 0; attempt <= retries; attempt++) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    // ... AI call ...
    clearTimeout(timeout);
    return { courseDraft };
  } catch (e) {
    clearTimeout(timeout);
    if (attempt < retries) continue;
    return { error: `AI structuring failed: ${e.message}` };
  }
}
```

### SQLite Transaction Pattern
**Source:** `server/index.js` lines 124-133, `server/routes/crawl.js` lines 41-56
**Apply to:** Multi-step course save operations
```javascript
const tx = db.transaction(() => {
  insert.run(...);
  indexInsert.run(...);
});
tx();
```

### Frontend State Machine Pattern
**Source:** `DrillGenerator.jsx` (idle → generating → ready/answered/failed), `CourseIngestion.jsx`
**Apply to:** All phase-based UI flows in CourseIngestion.jsx
```javascript
// Pattern: useState for phase, useCallback handlers per phase transition
const [phase, setPhase] = useState('idle');

const handleAction = useCallback(async () => {
  setPhase('loading');
  try {
    const result = await doWork();
    result ? setPhase('success') : setPhase('failed');
  } catch {
    setPhase('failed');
  }
}, [...]);
```

### SQLite Prepared Statement Pattern
**Source:** `server/routes/courses.js` lines 296-310, `server/routes/crawl.js` lines 27-38
**Apply to:** All new SQL queries
```javascript
const stmt = db.prepare(`
  INSERT INTO courses (id, title, description, content, tags, difficulty, source, published, draft_content, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
stmt.run(draftId, title, description, JSON.stringify(content), ...);
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/crawlers/pdfParser.js` — positional sort | crawler/utility | transform | No existing file does positional sorting; pattern is unique to pdfjs-dist getTextContent items |
| `server/crawlers/dseOcr.js` — image preprocessing | crawler/utility | transform | No existing file does canvas-based image preprocessing |
| `src/components/CourseIngestion.jsx` — quality preview | component | request-response | No existing component shows extraction quality metrics with per-page breakdowns |

All files listed have existing analogs in themselves (the file being modified) or in sibling files with the same role. The new UI elements (quality preview, enhanced error banner, toast) are new additions without direct prior art, but follow established BEM/CSS conventions from the existing `.course__*` classes and `.undo-toast` pattern.

## Metadata

**Analog search scope:** `server/routes/`, `server/crawlers/`, `server/db/`, `src/components/`, `src/hooks/`, `src/utils/`
**Files scanned:** 15
**Pattern extraction date:** 2026-07-01
