---
phase: 07-pdf-ingestion-pipeline-fix
plan: 02
subsystem: frontend/pdf-ingestion
tags: react, bem, css, quality-preview, error-handling, toast-notifications

requires:
  - phase: 07-01
    provides: POST /api/courses/ingest quality response, PUT /api/courses/ingest/generate/:extractionId
provides:
  - Quality preview screen between PDF upload and AI structuring
  - Per-page character counts and English % table
  - Green/pass and red/fail quality score badges
  - EnhancedErrorBanner with icon + title + body + action button
  - Fixed toast notification system for warnings/success
  - Two-step upload flow (ingest → quality → generate)
  - Typed error routing (size/network/extract/quality errors)
affects: [08-auto-generation-quality, 09-seed-catalog]

tech-stack:
  added: []
  patterns:
    - "Two-step upload: POST /ingest returns quality → user reviews → PUT /ingest/generate/:extractionId"
    - "Typed error banners with errorConfigs map for per-type title/body/action"
    - "DOM-based toast utility for lightweight non-blocking notifications"
    - "Module-level DOM helper pattern (showToast outside React component tree)"

key-files:
  created: []
  modified:
    - src/components/CourseIngestion.jsx — 531→713 lines: added quality phase, renderQuality, EnhancedErrorBanner, showToast, handleProceedToGeneration
    - src/App.css — Added 281 lines of new BEM CSS classes for quality UI, error banners, toasts, refresh button

key-decisions:
  - "showToast implemented as module-level DOM utility (outside React) for simplicity — no state management needed"
  - "EnhancedErrorBanner is an inline component matching existing BEM conventions — no separate file needed"
  - "Error configs mapped by errorType key for clean per-type title/body/action routing"

requirements-completed: [COURSE-01, COURSE-05]

duration: 2min
completed: 2026-07-01
---

# Phase 07 Plan 02: Frontend Quality Preview & Enhanced Error Handling — Summary

**Quality preview screen with per-page character counts and English % table, EnhancedErrorBanner replacing simple error text, and DOM-based toast notifications for the two-step PDF ingestion flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-01T08:06:04Z
- **Completed:** 2026-07-01T08:08:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Inserted `quality` phase between `parsing` and `generating` in the state machine (flow: idle → uploading → parsing → **quality** → generating → review → saving → done)
- Rewrote `handleFile` for two-step upload: POST /ingest returns quality data → user reviews → Proceed triggers PUT /ingest/generate/:extractionId
- Added `renderQuality()` with per-page stats table (Page, Characters, English %, Status bar)
- Green score badge (pass) and red quality block (fail) with "Try a Different File" action
- "Proceed to Course Draft" button visible only when quality passes
- `EnhancedErrorBanner` component with icon + title + body + action button, replacing simple `<span>⚠</span> {error}` display
- Error type routing: size → "File Too Large", network → "Upload Failed", extract → "Extraction Failed", quality → "Insufficient Content"
- `showToast()` DOM utility for non-blocking warnings and success notifications (4s auto-dismiss)
- `handleProceedToGeneration` calls PUT /ingest/generate/:extractionId with error handling
- All new BEM CSS classes for quality preview, error banners, toasts, and refresh button

## Task Commits

Each task was committed atomically:

1. **Task 1: Quality preview screen + state machine + error handling** - `6321a27` (feat)
2. **Task 2: CSS for quality UI, error banners, toasts, refresh button** - `b676772` (style)

**Plan metadata:** (committed as part of this summary)

## Files Created/Modified

- `src/components/CourseIngestion.jsx` — 531→713 lines (+182 lines): Added `quality` phase case, `renderQuality()`, `EnhancedErrorBanner`, `handleProceedToGeneration`, `showToast()` module-level helper, `qualityData`/`extractionId`/`errorType` state variables, updated `handleDiscard` and `handleFile` for two-step flow
- `src/App.css` — +281 lines: Section `/* ===== Phase 7: PDF Ingestion Quality UI ===== */` with all new BEM CSS classes (quality-preview, quality-score, quality-table, quality-bar, quality-block, error-banner, toast, btn--refresh)

## Decisions Made

- **showToast as DOM utility**: Implemented as module-level DOM helper (not React state) to avoid re-render overhead for transient notifications. Auto-removes after 4 seconds. Follows existing `.undo-toast` pattern from App.css.
- **EnhancedErrorBanner inline**: Kept inside CourseIngestion.jsx as an internal component since it's only used in one component. Matches existing BEM conventions.
- **Error configs by type**: Error banners use a config map keyed by `errorType` ('size', 'network', 'extract', 'quality', '') for clean routing to title/body/action. Existing `.course__error-msg` kept for backward compatibility (used in review phase).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Frontend ready for downstream Plan 03 (CatalogView sync + IndexedDB refresh)
- The `extractionId` from quality response enables the generate flow
- Quality preview screen gives users visibility before AI structuring cost
- Error banners provide clear guidance for all failure types

## Self-Check: PASSED

All claims verified:
- CourseIngestion.jsx: 713 lines (≥650), all features present (quality case, renderQuality, EnhancedErrorBanner, handleProceedToGeneration, showToast, course__quality-preview)
- App.css: Phase 7 section with all new BEM classes (quality-preview, quality-score--pass, error-banner, toast--warning, btn--refresh)
- 2 commits confirmed (feat + style)
- Existing `.course__error-msg` preserved (backward compatibility)
- All verification commands pass

---

*Phase: 07-pdf-ingestion-pipeline-fix*
*Completed: 2026-07-01*
