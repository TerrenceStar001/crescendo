---
phase: 10-auto-generation-reliability-quality
plan: 02
type: execute
completed_date: 2026-07-03
duration: 25m
task_count: 2
commit_count: 2
requirements:
  - COURSE-02
  - COURSE-04
key_decisions:
  - "CourseGenerationProvider wraps inside CrescendoApp (not App) because autoGenerateCourseFn and callAI are hook-defined at that level"
  - "Navigation guard modal uses internal showNavGuard state triggered on generation start rather than React Router navigation interception, since the app uses state-based routing"
  - "4th argument { simplerContent } passed to autoGenerateCourseFn as forward-compatible; current impl ignores extra args"
key_files:
  created:
    - src/context/CourseGenerationContext.jsx
  modified:
    - src/App.css
    - src/App.jsx
  summary:
    - "CourseGenerationContext.jsx: 323 lines — full provider + hook with progress engine, lifecycle, beforeunload, nav guard, floating panel"
    - "App.css: +185 lines — BEM-style course__gen-panel, course__gen-nav-guard, course__gen-progress-bar, etc."
    - "App.jsx: +19/−10 lines — provider wrapping, seed flow fix, logging improvements"
---

# Phase 10 Plan 02: Course Generation Loading State System

One-liner: Global course generation loading state with floating progress panel (pseudo-progress), navigation guard modal, beforeunload handling, success/error UI, and fixed seed flow passing real completedCourseIds.

## Tasks Completed

| #  | Name                      | Type | Commit    | Files Modified                                 |
|----|---------------------------|------|-----------|------------------------------------------------|
| 1  | Create CourseGenerationContext | auto | `061a6a9` | `src/context/CourseGenerationContext.jsx`, `src/App.css` |
| 2  | Modify App.jsx            | auto | `053c3fa` | `src/App.jsx`                                  |

## Files Created

### `src/context/CourseGenerationContext.jsx`

- **CourseGenerationProvider** — React context provider accepting `autoGenerateCourseFn` and `callAI` as props
- **State shape**: `{ isGenerating, progress, status, error, courseId, courseTitle }`
- **Pseudo-progress engine**: `setInterval` at 500ms with 4-phase schedule:
  - Phase 1 (0-30s): 0→45% — `min(45, elapsed/30000 * 45)`
  - Phase 2 (31-90s): 45→85% — `45 + (elapsed-30000)/60000 * 40`
  - Phase 3 (91-115s): 85→95% — `85 + (elapsed-90000)/25000 * 10`
  - Phase 4: On success → 100%
- **Lifecycle methods**: `startGeneration`, `cancelGeneration`, `retryGeneration`, `retrySimpler`, `dismiss`
- **beforeunload**: `useEffect` attaches handler when `isGenerating`, stores pending in `sessionStorage('crescendo-gen-pending')` for tab-close recovery
- **Navigation guard modal**: Full-screen overlay with "Your course is generating in the background." + "Browse Site" / "Stay on Page" buttons
- **Floating panel** (z-index 1000, bottom-right, 320px):
  - **Generating**: Blue left-border, spinning icon, progress bar, cancel button
  - **Success**: Green left-border, checkmark, "View Course" button, dismiss link
  - **Error**: Red left-border, warning icon, error message, "Retry" + "Try Simpler Content" buttons, dismiss link
- **Recovery**: On mount, checks `sessionStorage` for pending generation marker and auto-shows success toast

### CSS Additions (end of `src/App.css`)

| Class                      | Description                              |
|----------------------------|------------------------------------------|
| `.course__gen-panel`       | Fixed bottom-right container (z-index 1000) |
| `.course__gen-panel--generating` | Blue left-border accent           |
| `.course__gen-panel--success`    | Green left-border accent           |
| `.course__gen-panel--error`      | Red left-border accent             |
| `.course__gen-progress-track`    | Thin background bar (6px)          |
| `.course__gen-progress-bar`      | Animated fill bar (0.5s ease)      |
| `.course__gen-nav-guard`         | Full-screen modal overlay (z-index 9999) |

## Files Modified

### `src/App.jsx`

| Change | Detail |
|--------|--------|
| Import | Added `import { CourseGenerationProvider } from './context/CourseGenerationContext.jsx'` |
| Provider wrap | Both JSX return paths (empty state + main) wrapped with `<CourseGenerationProvider autoGenerateCourseFn={...} callAI={...}>` |
| Seed flow fix | Changed `autoGenerateCourseFn(tagsArray, [], callAI)` to fetch `getCompletedCoursesFn()` and pass `completedIds` |
| Logging upgrade | 7x `console.warn('[course-seed]...` → `console.log('[course-seed]...` |
| Catch block fix | 1x `console.warn('[course-seed] error:')` → `console.error('[course-seed] error:')` |
| Silent catch fix | 1x `catch { /* silent */ }` → `catch (e) { console.error('[course-regeneration] error:', e.message) }` |

## Deviations from Plan

No deviations — plan executed exactly as written. Both tasks committed atomically with verification.

## Decisions Made

1. **Provider placement**: `CourseGenerationProvider` wraps inside `CrescendoApp` (not the outer `App()` function) because `autoGenerateCourseFn` and `callAI` are hook-defined at the `CrescendoApp` level. Placing the provider outside `ViewProvider` would require restructuring where these values originate.
2. **Navigation guard trigger**: Since the app uses React-state-based routing (no React Router), the navigation guard modal is triggered via an internal `showNavGuard` state that is set `true` when `startGeneration` begins, rather than intercepting route changes. Both "Browse Site" and "Stay on Page" dismiss the guard.
3. **`simplerContent` forward compatibility**: The 4th argument `{ simplerContent }` is passed to `autoGenerateCourseFn` but the current implementation doesn't use it. The flag is available for future prompt-scope reduction logic.

## Self-Check: PASSED

- [x] `src/context/CourseGenerationContext.jsx` exists (323 lines, ≥160 minimum)
- [x] `CourseGenerationProvider` and `useCourseGeneration` exported
- [x] CSS classes `course__gen-panel`, `course__gen-nav-guard`, `course__gen-progress-bar` present in `App.css`
- [x] `CourseGenerationProvider` appears in `src/App.jsx` wrapping both return paths
- [x] Seed flow passes `completedIds` via `getCompletedCoursesFn()` (not `[]`)
- [x] All 7 seed events use `console.log`, 1 uses `console.error`
- [x] Silent catch in regeneration useEffect now logs errors
- [x] Task 1 commit `061a6a9` exists
- [x] Task 2 commit `053c3fa` exists
