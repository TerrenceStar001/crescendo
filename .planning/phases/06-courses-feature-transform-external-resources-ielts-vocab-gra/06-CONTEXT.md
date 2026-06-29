# Phase 6: Courses Feature — Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a Course system where external learning resources (IELTS vocab, grammar, sentence structure PDFs) are transformed into structured courses. Students browse a catalog, enroll, attend lessons with an exercise-first (test-then-learn) approach, and complete courses via a final assessment. The system analyzes weaknesses from submitted reading/writing tasks, tags error patterns, and recommends or auto-generates courses targeting those weaknesses.

**In scope:**
- Course data model (Topics → Lessons → Exercises)
- Course catalog with search and tag filtering
- Exercise-first lesson delivery with reference content that unlocks on struggle
- Final composite assessment per course
- Tag-based weakness→course mapping (pre-defined taxonomy, extensible by AI)
- Pattern-based auto-generation of courses from detected weaknesses
- PDF ingestion pipeline: user uploads → backend parses → AI structures → draft review → publish
- Storage and searchability of uploaded PDFs
- New SidebarNav tab between Speaking and Graph
- Course progress tracking and completion
- Offline caching of previously accessed courses
- Partial integration with Dashboard (completion count only; scores stay separate from DSE)

**Out of scope:**
- Spaced repetition scheduling (Phase 3's forgetting curve remains separate)
- Multi-device sync (localStorage/IndexedDB is per-device)
- Admin/teacher roles (any user can upload PDFs)
- Course marketplace or sharing between users
- Live tutoring or classroom features (self-study tool)
</domain>

<decisions>
## Implementation Decisions

### Course Types & Lifecycle
- **D-01:** Single course type — imported (from PDF) and auto-generated courses share the same data model. They differ only in source metadata (source, sourceTaskId, weaknessPattern, generationDate).
- **D-02:** Lifecycle: Browse → Enroll → Complete → Archived. Completed courses persist and can be replayed anytime (read-only archive).
- **D-03:** Course is complete when all lessons are done AND the final assessment is passed. Lesson exercises are untracked practice — only the final assessment score matters.
- **D-04:** Student can only have one active lesson at a time for focus. Must complete or abandon before starting another.
- **D-05:** Students can enroll in multiple courses simultaneously (catalog style), but only actively work on one.

### Navigation & Placement
- **D-06:** New SidebarNav tab between Speaking and Graph.
- **D-07:** Main view is catalog-first: Recommended for You, In Progress, Completed sections.
- **D-08:** Catalog also includes search bar + tag filter chips ('grammar', 'vocabulary', 'sentence structure', difficulty levels) + course grid.

### Course Delivery UI
- **D-09:** Course entry shows an overview page: title, description, progress bar, topic list (lock/unlock status), Start/Continue button.
- **D-10:** Lesson flow is exercise-first (test then learn). Student starts with exercises. If they struggle, referenceContent unlocks.
- **D-11:** Exercise types vary per topic type: grammar → gap-fill/sentence rewrite, vocabulary → matching/cloze, sentence structure → reordering/short answer.
- **D-12:** Final assessment is composite — mix of all exercise types covered across topics.

### Auto-generation Trigger
- **D-13:** Pattern-based detection: system detects a repeated weakness pattern across submitted reading/writing tasks.
- **D-14:** Auto-generates a new course **every time** a weakness pattern is detected, even if courses for that weakness already exist or were completed. Each is a fresh course (possibly different approach).
- **D-15:** Re-generate after completion if the weakness persists in subsequent tasks.

### Weakness→Course Mapping
- **D-16:** Tag-based mapping. Courses have skill tags. Error pattern analysis outputs tags. Match tags to recommend courses.
- **D-17:** Tag taxonomy starts pre-defined (e.g., grammar:articles, grammar:tenses, vocab:academic) and is extensible by AI over time.
- **D-18:** Course recommendations appear in TWO places: catalog's "Recommended for You" section AND inline post-task suggestions ("We noticed you struggle with X. Enroll in this course?").

### Content Ingestion (PDF)
- **D-19:** Hybrid approach: developer provides PDFs as source material, AI parses them into course structures. User reviews/edits a draft before publishing.
- **D-20:** Ingestion is in-app (accessible via Settings-like panel by any user, not just admin). No separate dev tool.
- **D-21:** Pipeline: user uploads PDF → backend parses text (using pdfjs-dist) → AI structures into course draft → user reviews + edits → saves → course is published.
- **D-22:** AI handles freeform PDFs — no expected format. Extracts what it can.
- **D-23:** Uploaded PDFs are stored and made searchable. Course can reference specific PDF sections.

### Course Structure Model
- **D-24:** Course: `{ id, title, description, topics[], tags[], difficulty, source, sourceTaskId, weaknessPattern, generationDate, createdAt }`
- **D-25:** Topic: `{ title, learningObjectives, lessons[] }`
- **D-26:** Lesson: `{ title, exercises[], referenceContent }` — referenceContent unlocks when student struggles in exercise-first flow.
- **D-27:** Exercise: `{ question, type, answer, explanations, difficulty, tags }` — type varies per topic domain.

### Course Completion & Scoring
- **D-28:** Partial integration with Dashboard: course completion count is shown, but course scores do NOT affect DSE skill rings or grade calculations. Courses are supplementary.
- **D-29:** After course completion, system waits for the student's next submitted reading/writing task. Then compares pre-course vs post-course error patterns to show improvement.
- **D-30:** Difficulty progression: mixed — beginner/entry courses always available. Advanced courses unlock as the student's skill level improves (based on skill analytics).

### Offline
- **D-31:** Previously accessed courses are cached locally. Students can attend enrolled courses fully offline. Course browsing, PDF ingestion, and auto-generation require internet.

### Storage
- **D-32:** Course definitions stored in IndexedDB (following `useIndexedDB` pattern with `CrescendoDSE` DB and a new key prefix like `courseProgress` or `courseSessions`). Course metadata/config can use localStorage.
- **D-33:** PDF content stored and indexed — storage strategy TBD (IndexedDB for small PDFs, potentially backend for larger ones).

### AI Integration
- **D-34:** All AI calls go through existing `useAI.js` `callAI` function (endpoint normalization, auth, timeouts, error handling).
- **D-35:** Course content generation follows the community patterns: structured JSON prompt → validation → regeneration loop for failed items (Phase 2 pattern).
- **D-36:** Silent catch for recoverable errors (AI parse failures, storage quota, network).
- **D-37:** Quality gates at generation time, not post-processing fixes (Phase 2 pattern).

### UI Patterns (from prior phases)
- **D-38:** All course components in `src/components/` as `.jsx` (flat, no subdirectories).
- **D-39:** CSS uses `.course__*` BEM prefix in App.css, following `.writing__*` / `.reading__*` pattern.
- **D-40:** Course module manages its own internal phase state machine (Phase 4 pattern).
- **D-41:** Student chooses, AI suggests — never auto-enroll. Recommendations are suggestions.
- **D-42:** Self-assessment before submission (Phase 4 pattern) — student can flag areas they're unsure about.
- **D-43:** Auto-save course progress (following Phase 4's 30s IndexedDB auto-save pattern).
- **D-44:** Checklist-style display for course completion criteria and topic progress (Phase 5 pattern).

### Agent's Discretion
- UI layout details (card sizes, grid vs list, breakpoints beyond tablet-responsive pattern)
- Specific tag taxonomy categories and hierarchy
- Exact prompt engineering for PDF parsing and course generation
- PDF storage mechanism details (IndexedDB vs backend)
- Exercise difficulty calibration for different topic types
- Catalog search implementation specifics
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Core value, constraints, DSE fidelity requirement, offline-first mandate
- `.planning/REQUIREMENTS.md` — All v1/v2 requirements (Courses not yet in requirements tracking)
- `.planning/ROADMAP.md` — Phase 6 entry, milestone structure

### Prior Phase Patterns
- `.planning/phases/04-writing-module/04-CONTEXT.md` — State machine pattern, auto-save, crash recovery, self-assessment
- `.planning/phases/05-writing-examiner-insights/05-CONTEXT.md` — Checklist-style display, component extraction pattern
- `.planning/phases/02-question-quality-hkdse-format/02-CONTEXT.md` — Validation + regeneration loop, generation-time quality gates

### Existing Code
- `src/hooks/useIndexedDB.js` — IndexedDB wrapper pattern for course progress storage
- `src/hooks/useAI.js` — AI call pattern (callAI, error handling, timeouts)
- `src/hooks/useSkillAnalytics.js` — Skill analytics integration point for weakness detection
- `src/utils/errorPatternAnalysis.js` — Error pattern analysis to feed into tag-based weakness detection
- `src/components/ReadingModule.jsx` — Existing DSE module with internal state machine pattern
- `src/components/WritingModule.jsx` — Existing module with auto-save, self-assessment, submission flow
- `src/components/SidebarNav.jsx` — Adding new nav tab between Speaking and Graph
- `src/App.jsx` — Conditional rendering for course views
- `src/components/Dashboard.jsx` — Integration point for course completion count
- `server/index.js` — Backend endpoint for PDF parsing (POST /api/courses/ingest or similar new route)
- `server/routes/` — New route file for course ingestion endpoints
- `src/App.css` — All course CSS under `.course__*` BEM prefix
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useIndexedDB.js` — IndexedDB wrapper (getItem/setItem/updateItem) — directly reusable for course progress storage
- `answerChecking.js` (Phase 2) — DSE-style answer checking with partial marks, spelling tolerance — reusable for course exercise checking
- `errorPatternAnalysis.js` (Phase 3) — Error aggregation by skill/type — feeds into weakness detection for auto-generation trigger
- `questionTypes.js` (Phase 2) — Exercise type definitions — extend for course-specific exercise types
- `ReadingModule.jsx` — State machine pattern, timer, session management — reference architecture for course module
- `WritingModule.jsx` — Auto-save, self-assessment, inline annotations — patterns to follow for course delivery
- `useDSEPapers.js` — Hybrid source pipeline (RAG → AI → bundled) — pattern for course content sourcing
- `SkillRing.jsx` / `PerformanceChart.jsx` — Dashboard visualization components — potential reuse for course progress charts

### Established Patterns
- Internal phase state machine — each module manages its own phases (start → active → complete → review)
- Utility-as-constants files (structuralConstraints.js, hkeaaWritingRubrics.js) — course definitions as structured JS
- Prompt-as-function in useCallback — AI prompts as template strings
- Silent try/catch for recoverable errors — AI calls, storage, JSON parsing
- No routing library — views managed via useState/useLocalStorage flags in App.jsx
- CSS custom properties + BEM naming — `--color-*` tokens, `:root` theming
- Checkpoint-based incremental saves for long operations

### Integration Points
- `SidebarNav.jsx` — Add "Courses" item between Speaking and Graph
- `App.jsx` — Add conditional render for course views (catalog, player, admin)
- `useSkillAnalytics.js` — Read skill data for weakness detection + auto-generation trigger
- `Dashboard.jsx` — Show course completion count in skill view
- `useIndexedDB.js` — New key prefix for course progress in existing `CrescendoDSE` DB
- `server/index.js` — New route for PDF parsing endpoint
- `ViewContext.jsx` — May need a new navTab value for "courses"
</code_context>

<specifics>
## Specific Ideas

- Course UI should feel like a modern learning platform (catalog with recommended/enrolled/completed sections) rather than an exam simulation (unlike the DSE modules)
- Exercise-first approach (test-then-learn) is inspired by active recall learning theory — students attempt before seeing content
- Students upload their own IELTS prep PDFs → AI parses → course generated. Makes the feature useful with the student's own study materials
- Auto-generated courses from weakness patterns create a continuous learning loop: practice → detect weakness → course → improve → practice again
</specifics>

<deferred>
## Deferred Ideas

- Multi-device sync — course progress tied to browser localStorage/IndexedDB. Cloud sync would be a future phase.
- Course marketplace or sharing generated courses between users — potential social feature for later
- Mobile native app — PWA sufficient for v1, native app deferred
- Admin/teacher dashboard for creating courses for students — role-based access deferred
- Course series / learning paths — chaining courses into a curriculum, belongs in a future phase
</deferred>

---

*Phase: 6-Courses Feature*
*Context gathered: 2026-06-29*
