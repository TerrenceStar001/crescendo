# Phase 10: Auto-Generation Reliability & Quality — Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken auto-generation pipeline so AI-generated courses from user practice complete reliably without timeout, have deep content with validated answers, and are explicitly blocked (not silently replaced with hollow templates) when quality is insufficient.

Includes:
- Unified hyper-parameters (temperature 0.3, max_tokens 32768) across all generation paths
- Two-tier validation engine (structural + semantic) with error-injection retry loop
- Global loading state with bottom-right floating panel and pseudo-progress tracker
- Explicit failure with "Retry" and "Try Simpler Content" options (NO hollow template fallback)
- Post-task enrollment auto-triggers generation instead of filtering empty catalog
- Seed flow fix to pass completedIds for context continuity
- Frontend timeout on PDF generation call (currently missing)

Out of scope: seed catalog content (Phase 9), quality badges/display (blocked per decision), DSE question type alignment for courses (deferred), matching pair uniqueness validation (deferred), difficulty calibration (deferred), cross-lesson progression sequencing (deferred).

</domain>

<decisions>
## Implementation Decisions

### Hyper-Parameter Alignment
- **D-01:** Temperature 0.3 globally for all course generation (PDF import + auto-generate + seed flow). Rationale: structural correctness > creativity for JSON output and DSE-aligned exercises.
- **D-02:** max_tokens 32768 globally. Rationale: 8000 cuts off deep courses with long referenceContent passages and detailed explanations.
- **D-03:** Timeout 120s across all generation paths with AbortController. Rationale: matches backend callAICourse timeout; prevents indefinite hangs.

### Two-Tier Validation Engine
- **D-04:** Semantic validation is a separate utility file (`server/utils/courseSemanticValidator.js` or equivalent) imported by both server (`server/routes/courses.js`) and client (`src/utils/courseSchema.js`). Single source of truth prevents logic drift.
- **D-05:** Must-have semantic checks (in scope):
  - MCQ: `correctAnswer` must match one of the `options` values
  - Gap-fill/cloze: answer text must exist within the lesson's `referenceContent`
  - Explanation: `explanation.trim().length >= 40`
  - Reference content: `referenceContent.trim().split(/\s+/).length >= 150`
  - Exercise volume: `exercises.length >= 3` per lesson
- **D-06:** Deferred checks (not in Phase 8): matching pair uniqueness, short-answer binary rejection ("yes"/"no"), difficulty calibration, cross-lesson duplication, HKDSE question type alignment.
- **D-07:** Quality gate is backend-only, pass/fail binary. No quality badges displayed to user. Courses that pass validation are treated as high-quality; those that fail are blocked from saving.

### Error Injection Retry Loop
- **D-08:** Retry loop injects BOTH structural AND semantic validation errors back into the prompt. Current code only injects structural errors.
- **D-09:** Maximum 3 total attempts per generation path (1 initial + 2 retries). If all exhausted, generation fails explicitly.
- **D-10:** Retry prompt modification appends specific validation errors with correction instructions (not just "NO markdown fences").

### Explicit Failure (No Hollow Templates)
- **D-11:** `generateOfflineCourse()` is REMOVED from the auto-generation fallback chain. When all AI tiers fail, the user sees an explicit error view — never a hollow template.
- **D-12:** Error view shows: "Custom Generation Paused" message with two options:
  - "Try Simpler Content" — reduces scope (1 topic, 2 exercises per lesson, prompt modifier for concise output)
  - "Choose from Validated Catalog" — navigates to catalog browsing
- **D-13:** No courses are saved to IndexedDB/SQLite when generation fails. Prevents data pollution.

### Global Loading State
- **D-14:** `CourseGenerationProvider` wraps the app root (in `App.jsx`). Exposes `useCourseGeneration` hook with state: `{ isGenerating, progress, status, error, courseId }`.
- **D-15:** UI: bottom-right floating panel (expanded, persistent) with pseudo-progress tracker:
  - 0-30s: rapid climb to 45%
  - 31-90s: slow crawl to 85%
  - 91-115s: asymptotic deceleration to 95%
  - 100% on payload arrival
- **D-16:** Internal navigation during generation: custom React modal ("Your course is generating in the background. [Browse Site] [Stay on Page]"). NOT `window.confirm()`.
- **D-17:** `beforeunload` (tab close): let request finish, save course, show success toast on next visit.
- **D-18:** Success toast: "Your personalized course is ready! [View Course]" — app-wide, bottom-right panel transitions to green success state.
- **D-19:** Error display: inline banner at origin location (where user clicked "Generate") + red state in floating panel. Manual retry only, no auto-retry on frontend.

### Post-Task Enrollment Behavior
- **D-20:** Clicking "Enroll" on a PostTaskSuggestion auto-triggers course generation with the recommended tag set. Does NOT just filter the catalog.
- **D-21:** UI shows loading state: "Tailoring your remedial course for [Tag Names]..." with the global floating panel progress indicator.
- **D-22:** If generation succeeds, course appears in catalog + success toast. If it fails, error view with retry options.

### Seed Flow Fix
- **D-23:** Initial course seeding in `App.jsx` passes actual `completedCourseIds` (not `[]`) to `autoGenerateCourseFn()`. Enables AI to avoid repetitive approaches.
- **D-24:** Seed flow uses `console.log` instead of `console.warn` for generation events.

### PDF Generation Timeout
- **D-25:** `CourseIngestion.jsx` handleProceedToGeneration() adds AbortController with 120s timeout (currently has none). Previously the call hangs indefinitely.
- **D-26:** Error handling for PDF generation timeout: same error view pattern as auto-generation (inline banner + retry).

### Silent Catch Block Remediation
- **D-27:** Replace silent `catch {}` blocks in the generation flow with explicit error states:
  - `CourseIngestion.jsx`: lines 114-118 (upload catch), 148-152 (generation catch), 222-224 (publish catch)
  - `useCourses.js`: lines 442 (backend catch), 504 (frontend catch), 516-518 (outer catch)
  - `App.jsx`: line 229 (seed catch)
- **D-28:** Each catch block sets a user-visible error state with contextual message + retry option.

### Parse JSON Robustness
- **D-29:** `parseJSONResponse()` in `courses.js` (line 120) and frontend JSON extraction in `useCourses.js` (line 490-493) should prefer structured JSON parsing over naive brace extraction. If the model supports JSON mode, use it; otherwise, try multiple brace-pair strategies and validate each parsed result.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Milestone Context
- `.planning/REQUIREMENTS.md` — COURSE-02 (quality auto-generated courses), COURSE-04 (deep content, timeout config)
- `.planning/ROADMAP.md` §Phase 10 — Phase goal and success criteria
- `.planning/phases/07-pdf-ingestion-pipeline-fix/07-CONTEXT.md` — Carry-forward decisions from Phase 7 (SQLite source of truth, quality preview, 10MB limit)

### Code Files to Modify (Read Before Planning)
- `server/routes/courses.js` — `callAICourse()`, `validateCourseDraft()`, `parseJSONResponse()`, `buildCoursePrompt()` — temperature, max_tokens, retry loop, validation
- `src/hooks/useCourses.js` — `autoGenerateCourse()`, `generateOfflineCourse()` — fallback chain, timeout, catch blocks
- `src/components/CourseIngestion.jsx` — `handleProceedToGeneration()`, `handlePublish()` — missing timeout, error handling
- `src/utils/courseSchema.js` — `validateCourse()`, `validateExercise()` — needs semantic validation augmentation
- `src/App.jsx` — seed flow (line 319), `callAI()` wrapper (line 185), course state management
- `src/components/PostTaskSuggestion.jsx` — enrollment behavior needs generation trigger
- `server/index.js` — body limit already at 20MB (D-14 from Phase 7), no change needed

### Reference Patterns
- `src/hooks/useAI.js` — Existing AI call pattern with AbortController, timeout, error handling. Template for frontend timeout implementation.
- `src/utils/questionValidator.js` — Existing validation pattern that inspired course quality validation
- `src/hooks/useSkillAnalytics.js` — `getWeakAreas()` pattern for deriving recommendation tags
- `src/components/CatalogView.jsx` — Existing catalog UI where generated courses appear

### Research Artifacts
- `.planning/phases/10-8/` — Phase directory (currently empty, awaiting PLAN.md)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/routes/courses.js:callAICourse()` — Existing retry loop with dual-endpoint fallback. Needs temperature/max_tokens change + semantic error injection.
- `server/routes/courses.js:validateCourseDraft()` — Structural validation that can be extended with semantic checks in a separate utility.
- `server/routes/courses.js:parseJSONResponse()` — Bracket extraction pattern. Needs robustness improvement.
- `src/utils/courseSchema.js:validateCourse()` — Client-side structural validation. Mirror semantic checks here.
- `src/utils/courseSchema.js:validateExercise()` — Type-specific structural checks. Good foundation for semantic extensions.
- `src/hooks/useCourses.js:autoGenerateCourse()` — Three-tier fallback pattern. Replace tier 3 (offline) with explicit failure.
- `src/hooks/useCourses.js:checkAndRegenerateCourse()` — Persistence detection pattern (D-15). Sound architecture.
- `src/components/CourseIngestion.jsx:EnhancedErrorBanner` — Existing error banner component. Reuse for generation failures.
- `server/routes/courses.js:deriveCourseTags()` — Post-processing pattern (deterministic override of AI output). Good pattern to follow for semantic validation.

### Established Patterns
- **Backend file organization:** Express routes in `server/routes/`, crawlers in `server/crawlers/`. New validator utility goes in `server/utils/` or `server/routes/courses.js` inline.
- **AI integration:** Backend calls AI via OpenCode proxy. Course AI structuring already uses this pattern. No new AI infra needed.
- **Validation:** Pure-function validators in `src/utils/` (e.g., `questionValidator.js`). Course semantic validation should follow the same pattern — exportable pure functions.
- **Error handling:** Currently `catch {}` everywhere in courses pipeline. Phase 8 replaces these with explicit error states.
- **Frontend timeout:** `src/hooks/useAI.js:45` — AbortController + setTimeout pattern. Template for PDF generation timeout.
- **Storage:** SQLite (server) + IndexedDB (client) + localStorage (lightweight config). Phase 8 doesn't change storage architecture.

### Integration Points
- `server/routes/courses.js:234-302` — `callAICourse()` — temperature 0.7→0.3, max_tokens 8000→32768, add semantic error injection
- `server/routes/courses.js:120-130` — `parseJSONResponse()` — naive brace extraction, needs robustness
- `src/hooks/useCourses.js:420-519` — `autoGenerateCourse()` — remove offline fallback, add timeout, replace catch{}
- `src/components/CourseIngestion.jsx:124-153` — `handleProceedToGeneration()` — add AbortController timeout
- `src/App.jsx:319` — seed flow passes `completedIds: []` → fix to pass actual IDs
- `src/components/PostTaskSuggestion.jsx:52-56` — enrollment button → trigger generation instead of filter

</code_context>

<specifics>
## Specific Ideas

- **Simpler content mode** — When user chooses "Try Simpler Content": 1 topic, 2 exercises per lesson, prompt modifier: "CRITICAL: Generate highly concise, straightforward reference passages (150–200 words max) and prioritize highly predictable, standardized question syntax to maximize validation compliance."
- **Unified semantic validator** — Single file (`courseSemanticValidator.js`) exported to both server and client. Prevents validation logic drift.
- **Pseudo-progress tracker** — Asymptotic curve: 0-30s → 45%, 31-90s → 85%, 91-115s → 95%, 100% on payload. No real backend progress signal needed.
- **Inline error at origin** — Error banner renders at the component where user clicked "Generate" (Dashboard card, post-task suggestion, catalog). Floating panel mirrors error state as fallback.
- **No quality badges** — Quality gate is invisible to user. Pass = saved. Fail = retry or explicit error. No "thin/basic/good" ratings displayed.

</specifics>

<deferred>
## Deferred Ideas

### Phase 8 Deferred (Nice-to-Have / Future Releases)
- Matching pair uniqueness validation
- Short-answer binary rejection ("yes"/"no"/"n/a")
- Difficulty calibration (exercise difficulty matches course difficulty)
- Cross-lesson content duplication detection
- Cognitive difficulty progression (Bloom's taxonomy alignment across lessons)
- Explicit HKDSE structural question blueprinting for courses
- Parallel dual-endpoint AI calls (instead of sequential fallback)
- Circuit breaker pattern for AI endpoint failures
- Incremental course sync (ETag / If-Modified-Since)
- Human review workflow for published courses
- Content safety filters (profanity, age-appropriateness)
- Factual grounding via RAG corpus cross-reference
- Copyright compliance detection (n-gram similarity with source PDF)
- Adaptive difficulty within courses (adjust based on student performance)
- Spaced repetition scheduling within courses
- Interleaved exercise practice
- Multi-modal exercise support (TTS for reading passages)

### Scope Creep Redirected
- DSE question type alignment for courses (MCQ, TFNG, pronoun reference) — belongs in a dedicated "DSE Course Format" phase
- Course completion certificates / badges — gamification, out of scope per PROJECT.md
- Course sharing / collaborative features — multi-user features out of scope
- Video content in courses — platform is text-based

</deferred>

---

*Phase: 10-Auto-Generation Reliability & Quality*
*Context gathered: 2026-07-02*
