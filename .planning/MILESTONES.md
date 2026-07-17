# Milestones

## v1.2 Adaptive Study Engine (Shipped: 2026-07-17)

**Phases completed:** 2 (Phase 11-12), 8 plans, 3 waves each
**Requirements:** 21 across 6 categories — all delivered

**Key accomplishments:**

- **Phase 11 — Foundation & Assessment:** AssessmentPage with 5-phase flow (self-rating + 12 verification questions across 4 skills, system-adjusted final levels), StudyPlanPage with 3-tier accordion (This Week / This Month / Until Exam), FlawPanel with 6 cognitive category bars (Vocabulary/Grammar/Comprehension/Inference/Synthesis/Expression) and 3-severity distribution (Micro/Meso/Macro), 7-day sliding window aggregation, fallback plan generation when AI unavailable
- **Phase 12 — Execution & Adaptation:** ForgettingCurve utility (exponential decay with configurable half-life, adaptive half-life adjustment, review scheduling), TimelineView with 7-column week grid, skill-colored exercise cards (📖✍️🎧🎤), constraint-injected adaptive exercise AI generation (6 constraint fields: difficulty/type/timeLimit/theme/format/focus), useForgettingCurve hook with review CRUD, retrievability stats, due item scheduling

**Files created (Phase 11):** flawClassification.js, planConstraints.js, useAssessment.js, useFlawDetection.js, useStudyPlan.js, AssessmentPage.jsx, StudyPlanPage.jsx, FlawPanel.jsx

**Files created (Phase 12):** forgettingCurve.js, useForgettingCurve.js, TimelineView.jsx

**Extended:** useIndexedDB.js (DSE_KEYS.ASSESSMENT, .STUDY_PLAN, .FLAW_DATA, .REVIEW_DATA), useDSEPapers.js (generateAdaptiveExercise), SidebarNav.jsx (Plan nav item), ViewContext.jsx (planTab), App.jsx (routing, hook integration), App.css (~400+ lines)

---

## v1.1 Courses Quality Polish (Shipped: 2026-07-04)

**Phases completed:** 3 phases, 3 plans, 7 tasks

**Key accomplishments:**

- **Phase 7:** Positional-sorted PDF extraction with quality metrics, pdf2md/OCR fallback chain, two-step upload with per-page quality preview, typed error banners, IndexedDB sync + Refresh Courses button
- **Phase 8:** Semantic validation (5 checks) on server + client, temperature 0.3 / max_tokens 32768 globally, multi-strategy JSON parsing with error-injection retry, global loading state with floating progress panel, no hollow templates (explicit failure with Retry/Simpler Content), AbortController 120s timeout, PostTaskSuggestion generation wiring
- **Phase 9:** 10 seed courses covering DSE grammar/vocabulary/writing/reading/listening/speaking, quality badges (seed/reviewed/draft) on catalog cards, post-course improvement tracking widget on Dashboard, expanded writing prompts with domain diversity, improved DSE Paper 2 Part A prompt quality

**Known deferred items at close:** 2 (see STATE.md Deferred Items)

