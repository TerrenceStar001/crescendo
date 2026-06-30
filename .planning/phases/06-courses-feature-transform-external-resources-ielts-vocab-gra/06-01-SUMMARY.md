---
phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra
plan: 01
subsystem: courses
tags: indexeddB, pdfjs-dist, express, react
requires: []
provides:
  - "Course data model (Course → Topic → Lesson → Exercise) per D-24 through D-27"
  - "IndexedDB storage keys for course definitions, progress, and ingestion (D-32)"
  - "Backend POST /api/courses/ingest route with PDF validation and AI structuring"
  - "Frontend navigation: Courses tab between Speaking and Graph (D-06)"
  - "Empty CatalogView with search bar, tag filter chips, and three sections (D-07, D-08)"
  - "useCourses hook: 10 exported functions (getCourses, saveCourse, deleteCourse, getProgress, saveProgress, enrollCourse, unenrollCourse, getEnrolledCourses, getInProgressCourseId, setActiveLesson)"
affects: ["Phase 6 subsequent plans (PDF ingestion, CoursePlayer, recommendations)"]
tech-stack:
  added: []
  patterns:
    - "useIndexedDB single-store pattern with DSE_KEYS extension"
    - "PDF magic byte (%PDF) and extension validation for upload security"
    - "pdfjs-dist text extraction with tesseract.js OCR fallback"
    - "Express router pattern following crawl.js (async handlers, getDB(), error handling)"
    - "BEM CSS naming convention: .course__* prefix (D-39)"
key-files:
  created:
    - "src/utils/courseSchema.js"
    - "src/hooks/useCourses.js"
    - "server/crawlers/pdfParser.js"
    - "server/routes/courses.js"
    - "src/components/CatalogView.jsx"
  modified:
    - "src/hooks/useIndexedDB.js"
    - "src/components/SidebarNav.jsx"
    - "server/index.js"
    - "server/db/schema.js"
    - "src/App.jsx"
key-decisions:
  - "Accept base64-encoded PDF in JSON body (no multer dependency added)"
  - "Single course type model — imported and auto-generated courses share same structure (D-01)"
  - "Enrollment state in localStorage (lightweight config), course definitions in IndexedDB (D-32)"
  - "Courses table in SQLite with minimal columns (reuses existing DB pattern)"
requirements-completed: []
duration: 5min
completed: 2026-06-30
---

# Phase 6: Courses Feature — Plan 01 Summary

**Foundation scaffolding: course data model, IndexedDB keys, backend course routes, SidebarNav Courses tab, and CatalogView shell**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-30T02:34:40Z
- **Completed:** 2026-06-30T02:39:11Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Course data model (Course → Topic → Lesson → Exercise) with validators in `courseSchema.js` — implements D-24 through D-27
- IndexedDB storage: `DSE_KEYS` extended with `COURSES`, `COURSE_PROGRESS`, `COURSE_INGESTION` keys (D-32)
- `useCourses` hook with 10 exported functions following the `useIndexedDB` pattern (silent try/catch, useCallback wrappers)
- Backend `server/routes/courses.js` with 5 endpoints: POST /ingest, GET /, GET /:id, PUT /:id/publish, POST /auto-generate
- PDF parser (`server/crawlers/pdfParser.js`) with pdfjs-dist text extraction + tesseract.js OCR fallback
- Courses table in SQLite schema with all required columns
- `SidebarNav.jsx` — Courses tab positioned between Speaking and Graph with 📚 icon (D-06)
- `CatalogView.jsx` — empty catalog shell with search bar, tag filter chips (grammar/vocabulary/sentence-structure), and three sections (Recommended for You / In Progress / Completed) using `.course__*` BEM prefix (D-07, D-08, D-39)
- `App.jsx` — routing for `dseTab === 'courses'` with `useCourses` integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Course data model + IndexedDB keys + useCourses hook** - `19ca9ac` (feat)
2. **Task 2: Backend — PDF parser utility + courses route skeleton** - `20b7177` (feat)
3. **Task 3: Frontend — SidebarNav Courses tab + CatalogView shell + App.jsx routing** - `3f5ce41` (feat)

**Plan metadata:** (committed below with STATE.md/ROADMAP.md)

## Files Created/Modified

- `src/utils/courseSchema.js` — Course data model (COURSE_SCHEMA, EXERCISE_TYPES, TAG_TAXONOMY, validateCourse, validateExercise)
- `src/hooks/useIndexedDB.js` — Extended DSE_KEYS with COURSES, COURSE_PROGRESS, COURSE_INGESTION
- `src/hooks/useCourses.js` — Course CRUD hook (getCourses, saveCourse, deleteCourse, getProgress, saveProgress, enrollCourse, unenrollCourse, getEnrolledCourses, getInProgressCourseId, setActiveLesson)
- `server/crawlers/pdfParser.js` — PDF text extraction (extractPdfText, extractPdfWithOCR, parsePdf)
- `server/routes/courses.js` — 5 Express endpoints for course management
- `server/index.js` — Courses router import and mount at /api/courses
- `server/db/schema.js` — Courses table with id, title, description, content, tags, difficulty, source, etc.
- `src/components/SidebarNav.jsx` — Courses tab added between Speaking and Graph
- `src/components/CatalogView.jsx` — Course catalog shell with search, tag filters, three sections
- `src/App.jsx` — Courses routing, useCourses integration, CatalogView import

## Decisions Made

- **Base64 PDF upload instead of multipart/form-data**: Avoids adding multer dependency. The ingest endpoint accepts `{ pdfBase64, fileName }` in JSON body with 10MB limit. Magic byte validation (`%PDF` at offset 0) and file extension check prevent non-PDF uploads (T-06-01).
- **Single course type model (D-01)**: Imported and auto-generated courses share the same data model, differentiated only by `source`, `sourceTaskId`, `weaknessPattern`, and `generationDate` metadata fields.
- **Enrollment in localStorage (D-32)**: Lightweight config (enrollment flags, active lesson tracking) in localStorage to avoid IndexedDB overhead for simple state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Threat Mitigation Summary

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-06-01 (Tampering — PDF upload) | mitigate | Magic byte check (`%PDF` at offset 0), extension validation (`.pdf`), and 10MB size limit in POST /ingest |
| T-06-02 (Manipulation — AI prompt injection) | mitigate | PDF text sanitized: control characters stripped, text length limited to 50K chars before AI injection |
| T-06-03 (Denial of Service — Large PDF) | mitigate | 10MB upload limit via express.json and explicit buffer size check |
| T-06-04 (Information Disclosure — IndexedDB) | accept | Course data is user-local only, single-store IndexedDB pattern prevents cross-user exposure |
| T-06-05 (Tampering — IndexedDB data) | mitigate | validateCourse() from courseSchema.js runs on every course load |
| T-06-SC (Tampering — npm installs) | mitigate | No new packages added |

## Next Phase Readiness

- Foundation scaffolding is in place for Phase 6 Plan 02 (PDF Ingestion pipeline, draft review UI, catalog with published courses)
- PDF ingestion endpoint accepts base64-encoded PDFs, validates them, and calls AI for structuring
- CatalogView is rendered when users click the Courses tab (currently empty)
- Subsequent plans can build CoursePlayer, CourseOverview, and recommendation system on top of this foundation

---

*Phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra*
*Completed: 2026-06-30*
