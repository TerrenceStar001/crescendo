---
phase: 07-pdf-ingestion-pipeline-fix
plan: 01
subsystem: backend/pdf-ingestion
tags: pdf, express, sqlite, pdfjs-dist, tesseract, ocr, courses

requires: []
provides:
  - Unified 10MB body limit between client and server
  - Positional-sorted PDF text extraction for correct reading order
  - Quality-first ingestion flow (extraction quality check before AI structuring)
  - Separate AI structuring endpoint (PUT /ingest/generate/:extractionId)
  - Published course sync endpoint (POST /sync)
  - OCR image preprocessing (grayscale + binarization) for scanned PDFs
  - pdf2md fallback between text extraction and OCR
  - Typed error responses with proper logging (no silent catch blocks)
affects: [08-auto-generation-quality, 09-seed-catalog]

tech-stack:
  added: ["@opendocsg/pdf2md"]
  patterns:
    - "Quality-first ingestion: extract → quality gate → store → return metrics (no AI call in ingest)"
    - "Typed error responses: { error, errorType } with categorizeError helper"
    - "Positional sort: PDF text items sorted Y-descending then X-ascending"

key-files:
  created: []
  modified:
    - server/index.js — Express body limit changed to 10MB
    - server/db/schema.js — Added course_extractions table + index
    - server/crawlers/pdfParser.js — Full rewrite: positional sort, quality metrics, pdf2md fallback, heading detection, chunking
    - server/crawlers/dseOcr.js — Added preprocessImage with grayscale + binarization, render scale 2.0
    - server/routes/courses.js — Quality gate, generate endpoint, sync endpoint, typed error propagation
    - package.json / package-lock.json — Added @opendocsg/pdf2md

key-decisions:
  - "Quality-first flow: POST /ingest returns quality + extractionId only; PUT /ingest/generate/:extractionId triggers AI structuring"
  - "Positional sort by Y descending then X ascending (5px threshold for line breaks) as primary extraction method"
  - "pdf2md fallback between text extraction and OCR when text quality <500 chars or <70% English"
  - "Heading detection via font size > 14 or bold/black font names for course topic chunking"
  - "Fallback chunking merges adjacent low-content pages, splits pages >3000 chars"
  - "All route handlers use typed catch blocks with console.error + res.status(500).json with errorType"

patterns-established:
  - "Quality-first ingestion: extract → quality gate → store → return metrics"
  - "Typed error responses for frontend routing: { error, errorType }"
  - "catch (e) with console.error for all route handlers (no silent catch {})"

requirements-completed: [COURSE-01, COURSE-05, COURSE-06]

duration: 3min
completed: 2026-07-01
---

# Phase 07 Plan 01: PDF Ingestion Pipeline Fix — Summary

**Positional-sorted PDF extraction with quality metrics, pdf2md/OCR fallback chain, preprocessing, and quality-first ingest flow (no AI call at upload)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-01T08:00:42Z
- **Completed:** 2026-07-01T08:03:49Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Unified server body limit to 10MB (matches client)
- PDF text extraction now uses positional sorting (Y descending / X ascending) for correct reading order
- Extraction quality metrics: per-page character counts and English content percentage
- pdf2md fallback between text extraction and OCR for low-quality results
- Heading detection (font size/weight heuristics) + chunking for course topic segmentation
- OCR image preprocessing (grayscale + binarization) at 2.0x render scale
- Quality-first ingestion: POST /ingest returns quality metrics + extractionId (never calls AI)
- Separate AI structuring endpoint: PUT /ingest/generate/:extractionId
- Course sync endpoint: POST /sync returns all published courses
- All route handlers have proper error logging and typed error responses (no silent `catch {}`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump server upload limit + add course_extractions schema** - `c4ed3e9` (chore)
2. **Task 2: PDF extraction overhaul** — positional sort, quality metrics, pdf2md fallback, heading detection, OCR preprocessing - `d849f50` (feat)
3. **Task 3: Quality gate, generate endpoint, sync endpoint, error propagation** - `f41783e` (feat)

**Plan metadata:** (committed as part of this summary)

## Files Created/Modified

- `server/index.js` - Line 24: `limit: '5mb'` → `limit: '10mb'`
- `server/db/schema.js` - Added `course_extractions` table + index on `course_id`
- `server/crawlers/pdfParser.js` (389 lines) — Full rewrite: positional sort, `extractPdfTextWithQuality`, `isEnglishContent`, `detectHeadings`, `chunkByHeadings`, `chunkFallback`, `extractPdfWithOCR` with per-page metrics, `parsePdf` with text→pdf2md→OCR fallback chain
- `server/crawlers/dseOcr.js` (208 lines) — `RENDER_SCALE` 1.5→2.0, added `preprocessImage` (grayscale + binarization), called in `renderPageToPNG`
- `server/routes/courses.js` (638 lines) — Added `assessExtractionQuality`, `categorizeError`, split POST /ingest into quality-first flow, added PUT /ingest/generate/:extractionId, added POST /sync, replaced all silent catch blocks with proper error logging
- `package.json` / `package-lock.json` — Added `@opendocsg/pdf2md`

## Decisions Made

- **Quality-first flow**: POST /ingest never calls AI — returns quality metrics so user can decide whether to proceed. AI structuring is a separate POST call.
- **Positional sort threshold**: 5px Y-delta threshold for line breaks (tuned for typical DSE PDF layouts)
- **Quality threshold**: ≥500 characters AND ≥70% English characters to pass
- **OCR scaling**: 2.0x render scale + grayscale + binarization preprocessing for better tesseract recognition

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- PDF ingestion pipeline fixed end-to-end with quality gates
- Server ready for Phase 8 (auto-generation quality / timeout fixes)
- Frontend Plan 02 (CourseIngestion.jsx + useIndexedDB.js) can now consume the typed quality responses and sync endpoint
- The `extractionId` pattern allows frontend to show quality preview before AI structuring

---

*Phase: 07-pdf-ingestion-pipeline-fix*
*Completed: 2026-07-01*
