---
phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra
plan: 04
subsystem: courses
tags: recommendation, auto-generation, dashboard, offline, difficulty-progression, post-task-suggestion
requires:
  - "06-01: Foundation scaffolding (course data model, IndexedDB keys, useCourses hook, CatalogView shell)"
  - "06-02: PDF ingestion pipeline (CourseIngestion, backend course routes, published courses)"
  - "06-03: Exercise-first lesson delivery (CoursePlayer, CourseOverview, enrollment)"
provides:
  - "Weakness-to-course recommendation pipeline (WEAKNESS_TO_TAG_MAP, calculateCourseRecommendations, getRecommendations)"
  - "Auto-generated courses from weakness tags (POST /api/courses/auto-generate, autoGenerateCourse)"
  - "Dashboard integration: 'Courses Completed: X' stat and Browse Courses button"
  - "Difficulty progression: advanced/intermediate courses locked by DSE level (D-30)"
  - "Offline caching: enrolled courses stored in IndexedDB + PWA cache (D-31)"
  - "Re-generation trigger: auto-creates new course draft when weakness persists after course completion (D-15)"
  - "Post-task course recommendation banner in ReadingModule and WritingModule results (D-18)"
  - "trackPostCourseImprovement: stores pre/post error patterns for D-29 comparison"
affects: ["No downstream phases — Phase 6 final integration plan"]
tech-stack:
  added: []
  patterns:
    - "Recommendation pipeline: weakness → WEAKNESS_TO_TAG_MAP → tag-based course matching"
    - "Difficulty progression: UI-only gating based on skillAnalytics.overallDseLevel"
    - "Post-task suggestions: async recommendations loaded on entering results phase"
    - "7-day dismissal expiry for post-task recommendation banners"
    - "Re-generation trigger: periodic check after reading/writing session completion"
    - "Frontend double-validation of AI-generated courses (T-06-15)"
key-files:
  created:
    - "src/components/PostTaskSuggestion.jsx — Inline course recommendation banner with Enroll/Dismiss/Browse All"
  modified:
    - "src/utils/courseSchema.js — WEAKNESS_TO_TAG_MAP, calculateCourseRecommendations, getDismissedRecommendations, dismissRecommendation"
    - "src/utils/errorPatternAnalysis.js — weaknessTagsToCourseTags export"
    - "src/hooks/useCourses.js — 10 new methods: getRecommendations, autoGenerateCourse, getCompletedCourses, getCourseCount, trackPostCourseImprovement, checkAndRegenerateCourse, cacheCourseOffline, getCachedCourse, isCourseAvailableOffline"
    - "src/components/Dashboard.jsx — courseCompletionCount prop, Courses Completed stat, Browse Courses button"
    - "src/components/CatalogView.jsx — difficulty progression (locked courses), skillAnalytics + filterTags props"
    - "src/components/ReadingModule.jsx — PostTaskSuggestion in results phase"
    - "src/components/WritingModule.jsx — PostTaskSuggestion in correctionCombined phase"
    - "src/App.jsx — course data wired to Dashboard, re-generation trigger, course recommendation/enrollment callbacks"
    - "src/App.css — locked course card styles + PostTaskSuggestion banner styles"
key-decisions:
  - "Re-generation trigger fires via useEffect watching skillAnalytics sessions (not inline in module handlers)"
  - "Course recommendations computed in App.jsx via getCourseRecommendations async callback, passed to modules"
  - "Difficulty progression uses numeric DSE level conversion: 5**=5.5, 5*=5, 5=4.5, 4=4, 3=3, 2=2, 1=1"
  - "Enrollment from PostTaskSuggestion extracts tag prefix (e.g., 'grammar' from 'grammar:tenses') for catalog filtering"
requirements-completed: []
duration: 7min
completed: 2026-06-30
---

# Phase 6: Courses Feature — Plan 04 Summary

**Weakness-to-course recommendation pipeline, auto-generation from error tags, Dashboard integration with course completion count, difficulty progression locking, offline caching, inline post-task course suggestion banner in ReadingModule and WritingModule**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-30T02:59:36Z
- **Completed:** 2026-06-30T03:06:44Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- WEAKNESS_TO_TAG_MAP in courseSchema.js: maps error pattern areas (Grammar, Vocabulary, Inference, etc.) to course tags (grammar:tenses, vocab:academic, reading:inference, etc.)
- calculateCourseRecommendations: sorts weak areas by severity, excludes tags completed courses already cover (but D-14 always recommends even if covered — fresh approach)
- weaknessTagsToCourseTags export in errorPatternAnalysis.js: converts identifyWeakAreas() output to course tag array
- useCourses.js: 10 new methods — getRecommendations, autoGenerateCourse, getCompletedCourses, getCourseCount, trackPostCourseImprovement, checkAndRegenerateCourse, cacheCourseOffline, getCachedCourse, isCourseAvailableOffline
- autoGenerateCourse calls POST /api/courses/auto-generate, double-validates via validateCourse() (T-06-15), saves to IndexedDB
- checkAndRegenerateCourse (D-15): compares current weakness tags vs. completed course weaknessPatterns, recreates if overlap > 50%
- Dashboard.jsx: "Courses Completed: X" stat in stats bar + "Browse Courses" button in Quick Actions
- CatalogView.jsx: difficulty progression (D-30) — advanced courses locked below DSE 4, intermediate below DSE 3, with lock overlay and tooltip. Accepts skillAnalytics + filterTags props
- Offline caching (D-31): cacheCourseOffline stores course in IndexedDB + PWA Cache API
- PostTaskSuggestion.jsx: compact banner showing at most 2 recommendations, with Enroll/Dismiss/Browse All buttons. Dismissal persists 7 days via localStorage.
- ReadingModule.jsx: PostTaskSuggestion in results phase after task submission
- WritingModule.jsx: PostTaskSuggestion in correctionCombined phase after correction
- Re-generation trigger (D-15): useEffect watches skillAnalytics sessions, fires checkAndRegenerateCourse after reading/writing session completion
- Dashboard wiring: courseCompletionCount and onBrowseCourses passed from App.jsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Recommendation pipeline + auto-generation** — `857cdad` (feat)
2. **Task 2: Dashboard integration + difficulty progression + re-generation** — `c4e7c4e` (feat)
3. **Task 3: Inline post-task course recommendations** — `7a3ef8a` (feat)
4. **Task 1 fix: Double-validate auto-generated courses** — `910c315` (fix)

**Plan metadata:** (committed with STATE.md/ROADMAP.md below)

## Files Created/Modified

### Created
- `src/components/PostTaskSuggestion.jsx` — Inline course recommendation banner with Enroll, Dismiss (7-day expiry), and Browse All Courses buttons

### Modified
- `src/utils/courseSchema.js` — WEAKNESS_TO_TAG_MAP, calculateCourseRecommendations, getDismissedRecommendations, dismissRecommendation helpers
- `src/utils/errorPatternAnalysis.js` — weaknessTagsToCourseTags export function
- `src/hooks/useCourses.js` — 10 new methods covering recommendations, auto-generation, offline caching, improvement tracking, re-generation
- `src/components/Dashboard.jsx` — courseCompletionCount prop, "Courses Completed: X" stat, Browse Courses button
- `src/components/CatalogView.jsx` — difficulty progression (locked courses with tooltips), skillAnalytics + filterTags props
- `src/components/ReadingModule.jsx` — PostTaskSuggestion in results phase
- `src/components/WritingModule.jsx` — PostTaskSuggestion in correctionCombined phase
- `src/App.jsx` — course data wired to Dashboard (both renders), re-generation trigger, course recommendation/enrollment callbacks, filterTags state
- `src/App.css` — ~80 lines of CSS for locked course cards and PostTaskSuggestion banner

## Decisions Made

- **Re-generation trigger approach**: Fires via `useEffect` watching `skillAnalytics.sessions` (debounced 3s) rather than inline in module submission handlers. This is simpler and avoids modifying the module's internal flow.
- **Course recommendations computed in App.jsx**: Provided as `onGetCourseRecommendations` async callback to ReadingModule/WritingModule. Modules call it when entering their results phase. This keeps modules dependency-free.
- **Difficulty level parsing**: DSE strings (5**, 5*, 5, 4, ...) converted to numeric values for comparison. 5** = 5.5, 5* = 5, 5 = 4.5, 4 = 4, etc.
- **Enrollment tag filtering**: PostTaskSuggestion extracts the tag prefix (e.g., 'grammar' from 'grammar:tenses') to pre-filter the catalog view, showing courses relevant to the recommended area.

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Added frontend double-validation of auto-generated courses**
- **Found during:** Task 1 (autoGenerateCourse implementation)
- **Issue:** Plan only specified server-side validation (validateCourseDraft), but frontend saved AI-generated courses to IndexedDB without re-validating
- **Fix:** Added `validateCourse()` call in autoGenerateCourse before saving to IndexedDB, matching T-06-15 mitigation requirement
- **Files modified:** src/hooks/useCourses.js
- **Verification:** grep -c validates course drops invalid drafts before saving
- **Committed in:** 910c315 (fix commit)

**2. [Rule 1 - Bug] Fixed ES module import in errorPatternAnalysis.js**
- **Found during:** Task 1 (weaknessTagsToCourseTags function)
- **Issue:** Initial implementation used `require()` (CommonJS) in an ES module codebase
- **Fix:** Changed to static ES import `import { WEAKNESS_TO_TAG_MAP } from './courseSchema'`
- **Files modified:** src/utils/errorPatternAnalysis.js
- **Verification:** Build passes, import resolves correctly
- **Committed in:** 857cdad (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Threat Mitigation Summary

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-06-13 (Info Disclosure — cached course content offline) | mitigate | cacheCourseOffline uses IndexedDB + PWA Cache API. No PII stored. |
| T-06-14 (Tampering — difficulty progression bypass) | accept | UI-only gating (D-30). Acceptable for MVP. |
| T-06-15 (Manipulation — auto-generated course quality) | mitigate | validateCourse() called server-side (validateCourseDraft) AND frontend before saving to IndexedDB. Invalid courses discarded. |
| T-06-SC (Tampering — npm installs) | mitigate | No new packages added. |
| T-06-16 (Spoofing — PostTaskSuggestion dismissals) | accept | Dismissal is convenience UX, not security boundary. |
| T-06-17 (Info Disclosure — recommendations reveal weakness patterns) | mitigate | PostTaskSuggestion shows tag-level recommendations (e.g., "grammar:tenses"), not raw error data. |

## Issues Encountered

- `errorPatternAnalysis.js` uses ES modules — initial `require()` call had to be replaced with static `import` to match codebase conventions
- Auto-generated courses from the backend are server-validated, but the frontend was saving to IndexedDB without re-validation — added `validateCourse()` call as defense-in-depth

## Next Phase Readiness

- **Phase 6 complete!** All four waves (06-01 through 06-04) have been executed:
  - 06-01: Foundation scaffolding (course model, IndexedDB keys, sidebar nav, catalog shell)
  - 06-02: PDF ingestion pipeline (upload, AI structuring, draft review, published courses)
  - 06-03: Exercise-first lesson delivery (CoursePlayer, 7 exercise types, auto-save, final assessment)
  - 06-04: Recommendations (weakness→tag mapping, auto-generation, dashboard integration, offline caching, post-task suggestions)
- Ready for next step: Phase 6 is feature-complete and ready for verification

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| WEAKNESS_TO_TAG_MAP in courseSchema.js | ✅ |
| calculateCourseRecommendations in courseSchema.js | ✅ |
| getDismissedRecommendations/dismissRecommendation helpers | ✅ |
| weaknessTagsToCourseTags in errorPatternAnalysis.js | ✅ |
| 10 new methods in useCourses.js | ✅ |
| Dashboard.jsx shows course completion count | ✅ |
| CatalogView.jsx difficulty progression locked cards | ✅ |
| PostTaskSuggestion.jsx created and rendered | ✅ |
| ReadingModule.jsx PostTaskSuggestion in results phase | ✅ |
| WritingModule.jsx PostTaskSuggestion in correctionCombined | ✅ |
| Re-generation trigger (checkAndRegenerateCourse) in App.jsx | ✅ |
| cacheCourseOffline/getCachedCourse/isCourseAvailableOffline | ✅ |
| validateCourse called in autoGenerateCourse | ✅ |
| Build passes | ✅ |
| Commit 857cdad (Task 1) | ✅ |
| Commit c4e7c4e (Task 2) | ✅ |
| Commit 7a3ef8a (Task 3) | ✅ |
| Commit 910c315 (fix) | ✅ |

---

*Phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra*
*Completed: 2026-06-30*
