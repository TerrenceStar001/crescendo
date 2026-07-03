---
phase: 10-auto-generation-reliability-quality
plan: 03
type: execute
completed_date: 2026-07-03
duration: 3m
task_count: 3
commit_count: 3
requirements:
  - COURSE-02
  - COURSE-04
key_decisions:
  - "generateOfflineCourse() removed entirely — no template courses saved on failure"
  - "autoGenerateCourse returns { course, error } instead of null — callers handle structured result"
  - "simplerContent flag added as 4th options param — reduces AI generation scope to 1 topic, 2 exercises"
  - "extractJSON() with 3 strategies replaces naive brace extraction for frontend JSON parsing"
  - "Catch blocks in generation flow now log errors explicitly — silent catches kept for non-generation read operations"
key_files:
  modified:
    - src/hooks/useCourses.js
  summary:
    - "src/hooks/useCourses.js: +69/−111 lines — removed 77 lines of offline template generator, restructured 3-tier fallback to 2-tier with explicit failure, added simplerContent prompt modifier, added extractJSON multi-strategy parser, replaced silent catch blocks"
---

# Phase 10 Plan 03: Course Generation Reliability & Quality — Remove Hollow Template Fallbacks

**Remove generateOfflineCourse(), replace silent catch blocks with explicit error states, add simplerContent option, and improve frontend JSON parsing robustness**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-03T03:35:27Z
- **Completed:** 2026-07-03T03:37:53Z
- **Tasks:** 3
- **Files modified:** 1

## Task Commits

Each task was committed atomically:

| # | Task | Commit | Description |
|---|------|--------|-------------|
| 1 | Remove generateOfflineCourse, restructure autoGenerateCourse | `f4e5240` | Deleted offline template generator (77 lines), added simplerContent param, removed 3-tier fallback, return structured {course, error} |
| 2 | Replace silent catch blocks | `656c1fe` | Added console.error to saveCourse and checkAndRegenerateCourse catch blocks |
| 3 | Multi-strategy JSON parsing | `e5126f3` | Added extractJSON() with 3 strategies, replaced naive brace extraction |

## Files Modified

### `src/hooks/useCourses.js` (+69/−111 lines)

#### Task 1 — Restructure (30 insertions, 105 deletions)
- **Removed**: `AREA_LABELS` (7-line constant), `capitalize()` (3-line function), `generateOfflineCourse()` (63-line function — hollow template generator)
- **New signature**: `autoGenerateCourse(weaknessTags, completedCourseIds, callAI, options = {})` with `const { simplerContent = false } = options`
- **Prompt modification**: When `simplerContent` is true, structure becomes "1 topic, 2 exercises per lesson" instead of "3-5 topics, 2-4 lessons, 3-5 exercises"; appends `CRITICAL: Generate highly concise...` modifier
- **Removed offline fallback tier**: Structure is now Backend API → Frontend AI → explicit error (no template fallback)
- **Return values**: Success returns `{ course: savedCourse, error: null }`, failure returns `{ course: null, error: 'message' }`
- **checkAndRegenerateCourse update**: Handles new `{ course, error }` return shape with `if (result.course) return result.course`

#### Task 2 — Catch blocks (4 insertions, 2 deletions)
- `saveCourse` catch (line 58): `console.error('[useCourses] saveCourse failed:', e.message)` before `return false`
- `checkAndRegenerateCourse` catch (line 514): `console.error('[useCourses] checkAndRegenerateCourse failed:', e.message)` before `return null`
- Backend + frontend AI catches inside `autoGenerateCourse` were already updated during Task 1 restructure

#### Task 3 — JSON parsing (35 insertions, 4 deletions)
- **New `extractJSON(text)` function** with 3 strategies:
  1. **Brace match**: Find first `{` and last `}`, slice and parse
  2. **Depth tracking**: Walk from first `{`, track brace depth until depth=0
  3. **Full parse**: Try parsing the entire trimmed string
- **Usage**: `const courseDraft = extractJSON(text)` with null check returning structured error

## Deviations from Plan

None — plan executed exactly as written. All three tasks committed atomically with verification.

## Decisions Made

1. **`extractJSON` function placement**: Defined inline inside the frontend AI try block rather than as a module-level function, keeping scope confined to where it's used and avoiding namespace pollution.
2. **Catch block granularity**: Only generation-related catch blocks (saveCourse, checkAndRegenerateCourse, backend AI, frontend AI) were given explicit logging. Non-generation read operations (getCourses, getCompletedCourses, etc.) keep silent `catch { return [] }` as the correct pattern for read fallbacks, per D-36.

## Threat Flags

None — structured error messages are user-facing and do not leak internal paths (accepted per T-10-07).

## Verification Results

| Criterion | Status |
|-----------|--------|
| `generateOfflineCourse()` removed | ✅ PASS |
| No offline fallback tier | ✅ PASS |
| Returns `{ course, error }` (not null, 5 occurrences) | ✅ PASS |
| `simplerContent` option modifies prompt (3 references) | ✅ PASS |
| No courses saved on failure (saveCourse only after validation) | ✅ PASS |
| `extractJSON` with >= 3 strategies | ✅ PASS |
| Silent catch blocks replaced in generation flow | ✅ PASS |

## Self-Check: PASSED

- [x] `src/hooks/useCourses.js` exists (637 lines, ≥600 minimum)
- [x] `simplerContent` referenced 3 times in file
- [x] `generateOfflineCourse` no longer exists in file
- [x] `return { course:` appears 5 times (structured results)
- [x] `extractJSON` function defined and used
- [x] 3 JSON extraction strategies documented
- [x] Task 1 commit `f4e5240` exists
- [x] Task 2 commit `656c1fe` exists
- [x] Task 3 commit `e5126f3` exists

---

*Phase: 10-auto-generation-reliability-quality*
*Completed: 2026-07-03*
