---
phase: 07-pdf-ingestion-pipeline-fix
plan: 03
subsystem: frontend/integration
tags: react, indexeddb, sync, courses, catalog

requires:
  - phase: 07-01
    provides: POST /api/courses/sync endpoint
provides:
  - syncCourses and getCachedCourses in useIndexedDB hook
  - Refresh Courses button in CatalogView with offline detection
  - App.jsx wiring for manual course sync
affects: []

tech-stack:
  added: []
  patterns:
    - "Manual sync pattern: button → fetch → IndexedDB write → local re-read"
    - "Offline detection via navigator.onLine"
    - "Toast notification for sync feedback"

key-files:
  created: []
  modified:
    - src/hooks/useIndexedDB.js — +29 lines: added syncCourses and getCachedCourses methods
    - src/components/CatalogView.jsx — +66 lines: added Refresh Courses button, sync state, success toast
    - src/App.jsx — +14 lines: added handleSyncCourses callback, wired onRefreshCourses prop

key-decisions:
  - "Manual sync only (D-12): no auto-sync on page load"
  - "Toast via existing DOM pattern (showToast from plan 07-02)"

requirements-completed: [COURSE-06]

duration: 2min
completed: 2026-07-01
---

# Phase 07 Plan 03: IndexedDB Sync & Refresh Courses — Summary

**SyncCourses method in useIndexedDB hook and Refresh Courses button in CatalogView with offline detection, spinner, and success toast**

## Performance

- **Duration:** 2 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `syncCourses(fetchFn)` to useIndexedDB — calls POST /api/courses/sync, stores result in IndexedDB under `crescendo-course-definitions`
- Added `getCachedCourses()` to useIndexedDB — reads courses from IndexedDB with empty array fallback
- Added "Refresh Courses" button in CatalogView search bar area with sync icon SVG
- Button disabled when offline (`!navigator.onLine`) with helpful tooltip
- Loading spinner + "Syncing..." text during sync
- Success toast: "Courses synced from server (N courses)" with 4s auto-dismiss
- Error display on sync failure
- App.jsx: `handleSyncCourses` callback wired as `onRefreshCourses` prop to CatalogView
- No automatic sync — manual only (D-12)

## Task Commits

1. **Task 1: Add syncCourses/getCachedCourses to useIndexedDB** - `8efe7a3` (feat)
2. **Task 2: Refresh Courses button + App.jsx wiring** (committed with this summary)

## Files Created/Modified

- `src/hooks/useIndexedDB.js` — +2 methods: `syncCourses` (POST /api/courses/sync → setItem), `getCachedCourses` (getItem with fallback)
- `src/components/CatalogView.jsx` — Added `onRefreshCourses` prop, `syncing`/`syncError` state, `handleSync` callback, Refresh Courses button with SVG icon + spinner + offline detection, sync error display
- `src/App.jsx` — Imported `useIndexedDB`, destructured `syncCourses`, created `handleSyncCourses` callback, passed `onRefreshCourses={handleSyncCourses}` to CatalogView

## Decisions Made

- **Manual sync only**: Following D-12, no auto-sync on component mount or page load. User must click "Refresh Courses" to trigger sync.
- **Toast pattern**: Reuses the DOM-based showToast pattern from Plan 07-02 for consistent UX.
- **fetch as fetchFn**: syncCourses receives `fetch` as a parameter to avoid tight coupling with the global fetch API.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — uses the existing /api/courses/sync endpoint from backend.

## Self-Check: PASSED

All features verified:
- useIndexedDB.js exports syncCourses and getCachedCourses ✓
- CatalogView.jsx has Refresh Courses button with offline detection ✓
- App.jsx has handleSyncCourses callback ✓
- onRefreshCourses prop wired to CatalogView ✓

---

*Phase: 07-pdf-ingestion-pipeline-fix*
*Completed: 2026-07-01*
