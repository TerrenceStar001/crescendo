# Phase 7: PDF Ingestion Pipeline Fix — Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken PDF upload → text extraction → AI structuring pipeline so users get usable courses from uploaded PDFs. Includes:

- Reliable PDF text extraction (positional sorting + pdf2md fallback)
- Quality gates between extraction and AI (char count + English content detection)
- Clear error messages for failures (no silent `catch {}`)
- Upload infrastructure fixes (10MB unified body limit)
- OCR improvement for scanned PDFs (image preprocessing)

Out of scope: course player changes, auto-generation quality (Phase 8), seed catalog (Phase 9), recommendations engine.

</domain>

<decisions>
## Implementation Decisions

### PDF Extraction Approach
- **D-01:** Positional sort as primary, pdf2md as fallback. Fix pdfjs-dist in-place with Y/X coordinate sorting (~20 lines). Fall back to `@opendocsg/pdf2md` when positional sort output quality is insufficient.
- **D-02:** Fallback trigger uses BOTH character count threshold (<500 chars) AND English content detection (<70% alpha). If either fails, try pdf2md fallback before failing.
- **D-03:** OCR improvement is in scope. Improve image preprocessing (deskew, binarize, denoise, DPI normalize) in `dseOcr.js` for scanned PDFs.
- **D-04:** OCR routing is automatic. If pdfjs-dist returns no text or very little, auto-route to OCR pipeline without user action.

### Quality Check UX
- **D-05:** Show a dedicated quality preview screen before AI structuring. Per-page character counts, English content percentage, and overall quality score displayed. User decides to proceed or cancel.
- **D-06:** Block with clear error when quality is bad (<500 chars or gibberish). Show why it failed (char count, English %, per-page breakdown) and suggest fixes. No "force proceed" for low quality.
- **D-07:** Error surfacing: dedicated error state in upload form for upload/extraction failures (red banner with error message + retry button). Toast notifications for minor issues (e.g., partial page extraction).

### Chunking Strategy
- **D-08:** Use heading detection as primary chunking strategy. Detect headings via font size/weight heuristics from pdfjs-dist `getTextContent()` items.
- **D-09:** Fallback when no headings detected: merge adjacent low-content pages, split long pages — not raw page boundaries.
- **D-10:** One detected section = one course lesson. Each heading group becomes a lesson in the course structure.

### Dual Storage Fix
- **D-11:** SQLite is source of truth for course data. IndexedDB is read-only cache synced from SQLite on explicit user action.
- **D-12:** IndexedDB sync is manual only — "Refresh courses" button. No automatic sync on load.
- **D-13:** Offline: serve from IndexedDB if available. No "offline mode" badge. Refresh button disabled when offline.
- **D-14:** Unified upload body size limit: 10MB across both client and server. Raise server `express.json({ limit })` from 5MB to 10MB.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Milestone Context
- `.planning/REQUIREMENTS.md` — COURSE-01 (reliable pipeline), COURSE-05 (error visibility), COURSE-06 (infra fixes)
- `.planning/ROADMAP.md` §Phase 7 — Phase goal and success criteria
- `.planning/research/SUMMARY.md` — Research findings: root causes, fix approaches, phase recommendations

### Code Files to Modify (Read Before Planning)
- `server/crawlers/pdfParser.js` — PDF text extraction logic (positional sort fix)
- `server/crawlers/dseOcr.js` — OCR pipeline (image preprocessing improvements)
- `server/index.js` — Express middleware config (body size limit)
- `server/routes/courses.js` — Course CRUD pipeline (quality gates, error handling)
- `server/db/schema.js` — SQLite schema for courses
- `src/components/CourseIngestion.jsx` — PDF upload UI (quality preview, error states)
- `src/hooks/useIndexedDB.js` — IndexedDB wrapper (sync logic for courses)

### Reference Patterns
- `src/utils/questionValidator.js` — Existing validation pattern that inspired course quality validation
- `src/utils/answerChecking.js` — Answer validation patterns reusable for course exercise validation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/crawlers/dseOcr.js:tesseractOCR()` — Existing OCR function for scanned DSE papers. Needs image preprocessing improvements but the pipeline exists.
- `server/crawlers/pdfParser.js:parsePdfText()` — The existing PDF parser that needs positional sorting fix.
- `src/components/CourseIngestion.jsx:handleUpload()` — Existing upload handler. Needs silent catch blocks replaced with proper error handling.
- `src/hooks/useIndexedDB.js:getItem()/setItem()` — Existing IndexedDB wrapper used for course data persistence.

### Established Patterns
- **Backend file organization:** Express routes in `server/routes/`, crawlers in `server/crawlers/`. Fixes follow the same layout.
- **AI integration:** Backend calls AI via OpenCode proxy. Course AI structuring already uses this pattern. No new AI infra needed.
- **Validation:** Pure-function validators in `src/utils/` (e.g., `questionValidator.js`). Course quality validation should follow the same pattern.
- **Error handling currently broken:** `catch {}` everywhere in courses pipeline. Must replace with proper error propagation.

### Integration Points
- `server/index.js` line ~35 — `express.json({ limit: '5mb' })` must change to 10MB
- `server/routes/courses.js` — Main pipeline: upload → parse → structure → save. All quality gates insert between steps.
- `src/components/CourseIngestion.jsx` — Upload form UI. Quality preview screen added here.
- `src/hooks/useIndexedDB.js` — `DSE_KEYS` or new course-specific keys for IndexedDB cache.

</code_context>

<specifics>
## Specific Ideas

- **Research finding confirmed:** Root cause of garbled PDF output is pdfjs-dist returning text items in PDF-internal operator order, not reading order. Fix is sorting by `transform[5]` (Y) then `transform[4]` (X) + inserting line breaks at Y position changes.
- **No new npm packages required** for the primary fix (positional sort). pdf2md fallback adds one optional dependency.
- Users specifically want to upload DSE past papers, examiner reports, IELTS prep materials, and English textbooks.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 7-PDF Ingestion Pipeline Fix*
*Context gathered: 2026-07-01*
