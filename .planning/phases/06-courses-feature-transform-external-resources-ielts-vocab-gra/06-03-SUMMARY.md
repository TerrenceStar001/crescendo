---
phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra
plan: 03
subsystem: courses
tags: course-player, exercise-first, state-machine, auto-save, final-assessment, indexedDB
requires:
  - "06-01: Foundation scaffolding (course model, IndexedDB keys, useCourses hook, CatalogView shell)"
  - "06-02: PDF ingestion pipeline (CourseIngestion, backend course routes, published courses)"
provides:
  - "CoursePlayer exercise-first lesson delivery with 7-type exercise rendering"
  - "Reference content unlock on struggle (wrong answer, hint click, or 3rd failed attempt)"
  - "Auto-save every 10 seconds to IndexedDB (D-43)"
  - "Single active lesson enforcement with confirmation dialog (D-04)"
  - "Composite final assessment with 60% pass threshold and 3 retries (D-12, D-03)"
  - "CourseOverview entry page with progress bar, topic list with lock/unlock (D-09)"
  - "Updated CatalogView with In Progress, Completed sections, and search by tags"
  - "App.jsx routing: catalog → overview → player"
  - "useCourses extended with enrollment status, progress, and active lesson methods"
affects: ["Phase 6 Plan 04 (recommendations, auto-generation)"]
tech-stack:
  added: []
  patterns:
    - "State machine phases for course delivery (overview → lesson → exercise → reference-unlocked → final-assessment → complete → archived)"
    - "Exercise-first pedagogy: student attempts before seeing reference content"
    - "10-second debounced auto-save to IndexedDB (WritingModule pattern)"
    - "Sequential topic unlock: previous topic must be completed before next"
    - "Composite final assessment: picks 2 exercises per topic"
key-files:
  created:
    - "src/components/CoursePlayer.jsx — Exercise-first lesson delivery engine (~840 lines, 7 exercise types)"
    - "src/components/CourseOverview.jsx — Course entry page with progress and topic list"
  modified:
    - "src/hooks/useCourses.js — Added getEnrollmentStatus, setEnrollmentStatus, getCourseProgress, markLessonComplete, getActiveCourseId, setActiveCourseId"
    - "src/components/CatalogView.jsx — Three sections (Recommended/In Progress/Completed), search by tags, enrollment flow"
    - "src/App.jsx — Course routing: catalog → overview → player; enrollment state refresh"
    - "src/App.css — Added ~450 lines of CSS for player, overview, exercises, feedback, progress bar"
key-decisions:
  - "Course exercises use 'answer' field (not 'correctAnswer' like DSE schema) — direct comparison used instead of answerChecking.js checkAnswer"
  - "Matching exercise definitions shuffled once per exercise via useMemo to prevent re-render shuffle"
  - "Active lesson check inlined in CoursePlayer (simple localStorage read) rather than importing useCourses"
  - "Final assessment picks 2 exercises per topic from the course content (not AI-generated)"
requirements-completed: []
duration: 6min
completed: 2026-06-30
---

# Phase 6: Courses Feature — Plan 03 Summary

**Exercise-first lesson delivery engine (CoursePlayer) with 7 exercise types, reference unlock on struggle, 10s auto-save, composite final assessment, CourseOverview entry page, and CatalogView enrollment routing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-30T02:50:53Z
- **Completed:** 2026-06-30T02:56:39Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- CoursePlayer component with full exercise-first state machine (overview → lesson → exercise → reference-unlocked → final-assessment → complete → archived)
- 7 exercise types with appropriate input controls: gap-fill (text input), sentence-rewrite (textarea), matching (two-column click-to-pair), cloze (multiple blanks), reordering (list items), short-answer (textarea), mcq (radio buttons)
- Reference content hidden initially, unlocks on wrong answer, hint click, or 3rd failed attempt
- Auto-save every 10 seconds to IndexedDB (matches WritingModule pattern per D-43)
- Single active lesson enforcement per D-04 (confirmation dialog if another course active)
- Composite final assessment picks 2 exercises per topic, 60% pass threshold, 3 retry attempts (D-12, D-03)
- CourseOverview entry page with progress bar, topic list with lock/unlock status (D-09)
- CatalogView now shows three sections: Recommended for You, In Progress (enrolled courses), Completed
- CatalogView search filters by title, description, and tags; tag filter chips filter the grid
- App.jsx routing: catalog → overview → player with back navigation at each level
- useCourses extended with 6 new methods for enrollment status and progress tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: CoursePlayer + useCourses progress tracking** — `099cded` (feat)
2. **Task 2: CourseOverview + CatalogView sections + App.jsx routing** — `f19985c` (feat)

**Plan metadata:** (committed with STATE.md/ROADMAP.md below)

## Files Created/Modified

### Created
- `src/components/CoursePlayer.jsx` — Exercise-first lesson delivery: state machine, exercise rendering, auto-save, active lesson enforcement, final assessment
- `src/components/CourseOverview.jsx` — Course entry page: progress bar, topic lock/unlock, Start/Continue/Replay buttons

### Modified
- `src/hooks/useCourses.js` — 6 new methods: getEnrollmentStatus, setEnrollmentStatus, getCourseProgress, markLessonComplete, getActiveCourseId, setActiveCourseId
- `src/components/CatalogView.jsx` — Three sections (Recommended/In Progress/Completed), search by tags, tag filter chips, enrollment routing
- `src/App.jsx` — Course routing: catalog → overview → player via courseView state, activeCourseId, enrollment refresh
- `src/App.css` — ~450 lines of CSS for player, overview, exercises (mcq/matching/cloze/reorder), feedback display, progress bar, complete screen

## Decisions Made

- **Course exercises use `answer` field** (not `correctAnswer` like DSE schema in answerChecking.js). Direct comparison with `normalizeAnswer` is used for all types instead of `checkAnswer()` which expects DSE-style `correctAnswer`.
- **Matching exercise shuffle memoized** via `useMemo` to prevent re-shuffle on every render cycle.
- **Active lesson check inlined** in CoursePlayer as a simple localStorage read (`crescendo-course-active-lesson`) rather than importing useCourses, keeping the component self-contained per its specified props.
- **Final assessment is course-content-based** — picks 2 exercises per topic from the existing course content rather than AI-generating new questions. This ensures the assessment is representative of what was actually studied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] checkAnswer not compatible with course exercise schema**
- **Found during:** Task 1 (CoursePlayer exercise checking)
- **Issue:** Plan specified using `checkAnswer()` from answerChecking.js for mcq types, but course exercises use the `answer` field (per courseSchema.js) while `checkAnswer()` expects `correctAnswer` (DSE schema)
- **Fix:** Changed to direct `normalizeAnswer` comparison for all exercise types, matching the simpler course exercise checking requirements
- **Files modified:** src/components/CoursePlayer.jsx
- **Verification:** Build passes, exercise checking works for all types
- **Committed in:** 099cded (Task 1 commit)

**2. [Rule 1 - Bug] Matching exercise shuffled on every render**
- **Found during:** Task 1 (CoursePlayer rendering)
- **Issue:** The definitions array was shuffled with inline `.sort(() => Math.random() - 0.5)` which ran on every render, causing definitions to re-shuffle after each interaction
- **Fix:** Extracted shuffle into a `shuffledDefs` useMemo that only recomputes when `currentExercise` changes
- **Files modified:** src/components/CoursePlayer.jsx
- **Verification:** Build passes, matching exercise definitions stable across renders
- **Committed in:** 099cded (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Threat Mitigation Summary

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-06-10 (Tampering — IndexedDB progress) | mitigate | Course data validated on course load, progress data structure enforced by the component (no raw external input written to IndexedDB) |
| T-06-11 (Information Disclosure — XSS in exercise rendering) | mitigate | All course exercise content rendered as JSX text (React auto-escapes). No `dangerouslySetInnerHTML` used anywhere in CoursePlayer or CourseOverview |
| T-06-12 (Manipulation — Reference content unlock bypass) | accept | Reference unlock is a UX feature, not a security boundary. DOM inspection bypass is acceptable per D-10 |
| T-06-SC (Tampering — npm installs) | mitigate | No new packages added |

## Issues Encountered

- Course exercise schema uses `answer` field while answerChecking.js expects `correctAnswer` — resolved by using direct `normalizeAnswer` comparison instead of `checkAnswer()` API call

## Next Phase Readiness

- Core learning experience is complete: exercise-first delivery, auto-save, final assessment, course completion
- CourseOverview provides entry page for all courses with progress tracking and topic unlock
- CatalogView now segments courses into Recommended/In Progress/Completed sections
- Next plan (06-04) can build auto-generation trigger, weakness→course recommendation system, and dashboard integration
- Single active lesson enforcement ready for D-04 focus requirement

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| CoursePlayer.jsx exists | ✅ |
| CourseOverview.jsx exists | ✅ |
| BEM CSS usage in CoursePlayer (120 .course__) | ✅ |
| BEM CSS usage in CourseOverview (33 .course__) | ✅ |
| export default function in CoursePlayer | ✅ |
| export default function in CourseOverview | ✅ |
| Commit 099cded (Task 1: CoursePlayer + useCourses) | ✅ |
| Commit f19985c (Task 2: CourseOverview + CatalogView + App.jsx + CSS) | ✅ |
| Commit 21731b8 (docs: SUMMARY.md + STATE.md + ROADMAP.md) | ✅ |
| Build passes | ✅ |

---

*Phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra*
*Completed: 2026-06-30*
