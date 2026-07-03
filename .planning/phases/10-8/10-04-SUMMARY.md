---
phase: 10-auto-generation-reliability-quality
plan: 04
type: execute
completed_date: 2026-07-03
duration: 5m
task_count: 2
commit_count: 2
requirements:
  - COURSE-02
  - COURSE-04
key_decisions:
  - "AbortController with 120s timeout prevents indefinite hang on PDF generation — user sees timed-out message instead of frozen UI"
  - "PostTaskSuggestion keeps backward-compatible onEnroll fallback for callers that haven't migrated to onGenerate yet"
  - "Loading and error states in PostTaskSuggestion are self-contained (no external toast) — inline error keeps user in context"
key_files:
  modified:
    - src/components/CourseIngestion.jsx
    - src/components/PostTaskSuggestion.jsx
    - src/App.css
  summary:
    - "src/components/CourseIngestion.jsx: +12/−1 lines — added AbortController with 120s timeout to handleProceedToGeneration, AbortError-specific user message, and console.error logging in upload and publish catch blocks"
    - "src/components/PostTaskSuggestion.jsx: +136/−4 lines — added onGenerate/onSuccess/onError props, generation state machine (idle→generating→error/success), loading UI with tag-specific spinner, inline error banner with retry, backward-compatible onEnroll fallback"
    - "src/App.css: +35 lines — added 5 new CSS classes for generation loading and error states"
---

# Phase 10 Plan 04: Wire Frontend Components — AbortController, Catch Blocks, PostTaskSuggestion Generation

**Add AbortController timeout to PDF generation in CourseIngestion, fix silent catch blocks with explicit error states, and change PostTaskSuggestion enrollment to trigger course generation with full loading/success/error UI.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-03T03:40:50Z
- **Completed:** 2026-07-03T03:45:XXZ
- **Tasks:** 2
- **Files modified:** 3

## Task Commits

Each task was committed atomically:

| # | Task | Commit | Description |
|---|------|--------|-------------|
| 1 | Add AbortController timeout + fix catch blocks in CourseIngestion | `da56d14` | AbortController with 120s timeout, AbortError handling, console.error in upload/publish catch blocks |
| 2 | Change PostTaskSuggestion enrollment to trigger course generation | `7c25d18` | onGenerate/onSuccess/onError props, generation state machine, loading spinner, error banner with retry, CSS classes |

## Files Modified

### `src/components/CourseIngestion.jsx` (+12/−1 lines)

**Task 1 — AbortController & catch block fixes:**

- **`handleProceedToGeneration`** (line 125): Now creates an `AbortController` with a 120s timeout (`setTimeout(() => controller.abort(), 120000)`). The signal is passed to the `fetch` call. On success, `clearTimeout(timeoutId)` prevents the timeout from firing.
- **Catch block** (line 153): Calls `clearTimeout(timeoutId)` before handling errors. If `e.name === 'AbortError'`, sets a specific user-facing timeout message. Otherwise, shows the previous network error message.
- **Upload catch block** (line 115): Added `console.error('[CourseIngestion] Upload failed:', e.message)` before setting error state.
- **Publish catch block** (line 233): Added `console.error('[CourseIngestion] Publish failed:', e.message)` before setting error state.

### `src/components/PostTaskSuggestion.jsx` (+136/−4 lines)

**Task 2 — Generation flow:**

- **New props**: `onGenerate`, `onSuccess`, `onError` — replaces `onEnroll` as primary enrollment mechanism. `onEnroll` kept as backward-compatible fallback.
- **New state**: `generating` (boolean) and `generationError` (string|null) for the generation state machine.
- **`handleEnroll`** (line 74): If `onGenerate` is provided, calls `await onGenerate(tags)` and routes to `onSuccess`/`onError` and `setGenerationError`. Falls back to `onEnroll?(tags)` for legacy callers.
- **`handleRetry`** (line 53): Re-triggers generation with the same tags, clearing previous error first.
- **Loading UI** (line 107): When `generating` is true, replaces the action area with a compact spinner and "Tailoring your remedial course for [tags]..." text.
- **Error UI** (line 135): When `generationError` is set, renders an inline error banner with "Try Again" and "Dismiss" buttons.
- **`handleDismiss`** update (line 45): Now also clears `generationError` and `generating` state.

### `src/App.css` (+35 lines)

Added 5 new CSS classes under `/* --- Post-Task Generation States --- */`:

- `.course__post-task-generating` — flex row with gap for spinner + text
- `.course__post-task-gen-text` — secondary-color text for the loading message
- `.course__gen-inline-error` — error-colored border/background banner
- `.course__gen-inline-error-text` — block error message text
- `.course__gen-inline-actions` — flex row for retry/dismiss buttons

## Deviations from Plan

### Backward Compatibility for PostTaskSuggestion Props

The plan specified removing `onEnroll` entirely from the props. However, the existing callers (`ReadingModule.jsx`, `WritingModule.jsx`) still pass `onEnroll`, and updating them was outside the listed files. To prevent a breaking change:

- **Change**: Kept `onEnroll` as an optional legacy prop. When `onGenerate` is provided, the new generation flow is used. When only `onEnroll` is provided (existing callers), the old catalog-filter behavior applies.
- **Rationale**: Prevents silent breakage of PostTaskSuggestion in ReadingModule and WritingModule outputs without requiring changes to those files in this plan.
- **Rule**: Rule 3 (auto-fix blocking issue) — changing the prop without updating callers would silently break the component.

### Spinner Styling in PostTaskSuggestion Loading State

The plan's example code uses `<div className="course__spinner" />` (40×40). In practice, a 20×20 inline spinner fits better in the horizontal flex layout alongside the text:

- **Change**: Used existing `course__spinner` class with inline `style={{ width: 20, height: 20, borderWidth: 2 }}` instead of adding a new `.course__spinner--small` variant.
- **Rationale**: Avoids redundant CSS — the 40×40 spinner is designed for centered loading pages, not inline use. Single-use override via style attribute keeps the CSS footprint minimal.

## Decisions Made

1. **AbortController scope**: Declared inside `handleProceedToGeneration` (not module-level) so each invocation gets a fresh controller. The timeout is automatically cleaned up on both success and error paths via `clearTimeout(timeoutId)`.
2. **Error types preserved**: All catch blocks use `setErrorType('network')` — consistent with existing CourseIngestion error handling pattern. No new error types introduced for timeout-specific display; the existing `EnhancedErrorBanner` with `type='network'` renders the correct UI.
3. **Retry vs full reset**: The error state's "Try Again" re-calls `onGenerate(tags)` without resetting the PostTaskSuggestion component state (no dismiss, no re-fetch of recommendations). The "Dismiss" button resets everything and hides the suggestion.

## Threat Surface

| Threat ID | Category | Component | Status |
|-----------|----------|-----------|--------|
| T-10-08 | Denial of Service | AbortController 120s timeout | mitigated — prevents indefinite hang |
| T-10-09 | Tampering | PostTaskSuggestion generation trigger | accepted — user-initiated action only |

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Verification Results

| Criterion | Status |
|-----------|--------|
| CourseIngestion handleProceedToGeneration uses AbortController | ✅ PASS (line 128) |
| AbortError produces specific user-facing message | ✅ PASS (line 155) |
| Upload catch block logs with console.error | ✅ PASS (line 115) |
| Publish catch block logs with console.error | ✅ PASS (line 233) |
| PostTaskSuggestion accepts onGenerate prop | ✅ PASS (lines 11, 20) |
| PostTaskSuggestion shows generating state | ✅ PASS (lines 28, 107, 114) |
| PostTaskSuggestion shows error state with retry | ✅ PASS (generationError at line 135) |
| New CSS classes exist (5 classes) | ✅ PASS (lines 9067, 9074, 9080, 9088, 9096) |

## Known Stubs

None — all three modified files have fully wired implementations.

## Self-Check: PASSED

- [x] `src/components/CourseIngestion.jsx` exists (737 lines, AbortController at line 128)
- [x] `src/components/PostTaskSuggestion.jsx` exists (177 lines, onGenerate at line 20)
- [x] `src/App.css` exists (course__post-task-generating at line 9067)
- [x] `AbortController` referenced in CourseIngestion.jsx
- [x] `AbortError` referenced in CourseIngestion.jsx
- [x] `console.error('[CourseIngestion] Upload failed:'` exists (line 115)
- [x] `console.error('[CourseIngestion] Publish failed:'` exists (line 233)
- [x] `onGenerate` prop referenced in PostTaskSuggestion.jsx
- [x] `generating` state referenced in PostTaskSuggestion.jsx
- [x] `course__post-task-generating` exists in App.css
- [x] `course__gen-inline-error` exists in App.css
- [x] Task 1 commit `da56d14` exists
- [x] Task 2 commit `7c25d18` exists

---

*Phase: 10-auto-generation-reliability-quality*
*Completed: 2026-07-03*
