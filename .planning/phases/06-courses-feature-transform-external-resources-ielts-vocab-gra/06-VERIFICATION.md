# Phase 6: Courses Feature — Plan Verification

**Verified:** 2026-06-30
**Verifier:** agnes-2.0-flash (Revision Gate)
**Status:** ISSUES FOUND

## Summary

| Metric | Value |
|--------|-------|
| Plans verified | 4 |
| Total tasks | 10 |
| Dimensions checked | 11 (8 skipped — Nyquist) |
| Blockers | 2 |
| Warnings | 6 |
| Info | 2 |

**Verdict:** Plans require revision before execution. Two blockers prevent the phase goal from being fully achieved: (1) D-15 (re-generate after completion) and D-18 (inline post-task suggestions) are not implemented despite being locked decisions, and (2) D-42 (self-assessment) and D-44 (checklist-style display) are referenced but not acted upon.

---

## Dimension Scores

| Dimension | Score (1-10) | Severity | Notes |
|-----------|-------------|----------|-------|
| 1. Requirement Coverage | 8 | — | All 44 D-XX decisions referenced; 4 not implemented in action text |
| 2. Task Completeness | 8 | WARNING | All tasks have Files/Action/Verify/Done; some verify commands are weak (grep counts) |
| 3. Dependency Correctness | 10 | — | Valid DAG: 01→02→03→04, no cycles, no forward references |
| 4. Key Links Planned | 7 | WARNING | Cross-plan wiring mostly present; some links incomplete (CoursePlayer→IndexedDB, Dashboard→useCourses) |
| 5. Scope Sanity | 8 | — | Plan 01: 3 tasks/9 files (acceptable); Plan 03: 2 tasks/5 files (tight but OK) |
| 6. Verification Derivation | 7 | WARNING | Some truths are implementation-focused; must_haves mostly user-observable |
| 7. Context Compliance | 6 | BLOCKER | 4 locked decisions not implemented in action text (see Issues) |
| 7b. Scope Reduction | 9 | — | No scope reduction language detected in plan actions |
| 7c. Architectural Tier Compliance | 10 | — | All capabilities correctly placed per Architectural Responsibility Map |
| 8. Nyquist Compliance | SKIPPED | — | No VALIDATION.md found; no test framework in project (confirmed by RESEARCH.md) |
| 9. Cross-Plan Data Contracts | 9 | — | courseSchema.js extended compatibly across plans; data flows compatible |
| 10. AGENTS.md Compliance | 9 | — | No TypeScript (correct), .jsx files, BEM CSS, silent catch, useCallback all followed |
| 11. Research Resolution | 10 | — | No RESEARCH.md for this phase (this is plan-checker, not phase-specific research) |

---

## Blockers (must fix before execution)

### 1. [context_compliance] D-15 (re-generate after completion) not implemented

- **Plan:** 04
- **Task:** 1
- **Decision:** D-15: "Re-generate after completion if the weakness persists in subsequent tasks."
- **Issue:** The plan implements `trackPostCourseImprovement()` which stores pre/post data, but there is no task that triggers re-generation when the weakness persists. The `getRecommendations()` function maps weaknesses to tags and `autoGenerateCourse()` calls the backend, but the trigger condition "after completion if weakness persists" is not coded. The plan covers D-13 and D-14 but not the re-generation loop of D-15.
- **Fix:** Add a task in Plan 04 that implements the re-generation trigger: when a new reading/writing task is submitted after course completion, check if weakness tags still match, and if so, call `autoGenerateCourse()` to create a fresh course.

### 2. [context_compliance] D-18 inline post-task suggestions not implemented

- **Plan:** 04
- **Task:** 1
- **Decision:** D-18: "Course recommendations appear in TWO places: catalog's 'Recommended for You' section AND inline post-task suggestions ('We noticed you struggle with X. Enroll in this course?')."
- **Issue:** The "Recommended for You" section is implemented in Plan 03 Task 2. However, the inline post-task suggestion ("We noticed you struggle with X. Enroll in this course?") requires modifying the ReadingModule or WritingModule submission flow to display course recommendations after task submission. No plan task modifies ReadingModule.jsx or WritingModule.jsx. The plans only create new course components — they don't integrate into the existing module submission flows.
- **Fix:** Add a task in Plan 04 that modifies the ReadingModule or WritingModule submission flow to display inline course recommendations after task submission. Alternatively, create a shared recommendation component that both modules can import.

---

## Warnings (should fix, execution can proceed with awareness)

### 3. [context_compliance] D-42 (self-assessment) referenced but not implemented

- **Plan:** 03
- **Task:** 2
- **Decision:** D-42: "Self-assessment before submission (Phase 4 pattern) — student can flag areas they're unsure about."
- **Issue:** Plan 03 Task 2's read_first references WritingModule.jsx selfAssessment pattern and D-42, but the action text does not implement a self-assessment checkbox or "flag areas unsure about" feature in the CoursePlayer or exercise flow.
- **Fix:** Add self-assessment checkbox to CoursePlayer exercises, following the WritingModule selfAssessment pattern.

### 4. [context_compliance] D-44 (checklist-style display) referenced but not implemented

- **Plan:** 03
- **Task:** 1
- **Decision:** D-44: "Checklist-style display for course completion criteria and topic progress (Phase 5 pattern)."
- **Issue:** Plan 03 Task 1's read_first references D-44, but the action text describes a progress bar and topic list — not a checklist-style display. Phase 5's checklist pattern should be applied to course completion criteria.
- **Fix:** Replace or supplement the progress bar in CourseOverview with a checklist-style display showing each lesson/topic as a completed/pending item.

### 5. [context_compliance] D-23/D-33 (PDF storage and searchability) not implemented

- **Plan:** 02
- **Decision:** D-23: "Uploaded PDFs are stored and made searchable. Course can reference specific PDF sections." D-33: "PDF content stored and indexed — storage strategy TBD."
- **Issue:** RESEARCH.md references D-23 and D-33 in the read_first of Plan 02 Task 1, but the action text only stores the AI-structured course content (JSON) in SQLite. The actual PDF files are not stored, nor is any searchability/indexing mechanism implemented. The courses table has no PDF blob column or search index.
- **Fix:** Add PDF storage (blob or file path) and searchability to the ingestion pipeline. At minimum, store the original PDF file in SQLite or the filesystem and index the extracted text for search.

### 6. [task_completeness] Verify commands are weak (grep-based)

- **Plans:** 01, 02, 03, 04
- **Issue:** Several verify commands use `grep -c` to count CSS class occurrences or constant names. These verify that text exists in files but don't verify functional correctness. For example, `grep -c "course__" src/components/CoursePlayer.jsx` will pass even if the CSS classes are wrong or the component is broken.
- **Fix:** Replace grep-based verifies with functional checks where possible (e.g., `npm run build` compile check, or import-based smoke tests).

### 7. [context_compliance] D-17 (extensible taxonomy) not implemented

- **Plan:** 01
- **Decision:** D-17: "Tag taxonomy starts pre-defined (e.g., grammar:articles, grammar:tenses, vocab:academic) and is extensible by AI over time."
- **Issue:** Plan 01 Task 1 creates a static `TAG_TAXONOMY` constant with pre-defined tags. There is no mechanism for AI to add new tags to the taxonomy over time. The taxonomy is a JavaScript constant, not a stored/extensible data structure.
- **Fix:** Store the taxonomy in IndexedDB or localStorage so AI can add new tags dynamically. Or add an `extendTaxonomy(tags[])` method that merges new tags.

---

## Info (suggestions for improvement)

### 8. [task_completeness] ViewContext.jsx listed in files_modified but no changes described

- **Plan:** 01
- **Task:** 3
- **Issue:** `src/context/ViewContext.jsx` is listed in `files_modified` and `must_haves.artifacts`, but Task 3 says "No changes needed — navTab is already a generic string state." Either the file doesn't need to be in `files_modified`, or a minimal change should be described (even if it's just confirming no change is needed).
- **Fix:** Remove ViewContext.jsx from files_modified if no changes are made, or add a note explaining why no change is needed.

### 9. [scope_sanity] Plan 01 has 9 files_modified for 3 tasks

- **Plan:** 01
- **Issue:** Plan 01 modifies 9 files across 3 tasks. While within the 15-file blocker threshold, it's on the higher side for a single plan. The files span frontend (hooks, components, context), backend (routes, crawlers), and utilities.
- **Fix:** Consider splitting into two plans: (A) frontend infrastructure (hooks, components, nav) and (B) backend infrastructure (routes, parsers). This would allow parallel execution.

---

## Context Compliance Detail

### Decision Coverage Matrix

| Decision | Referenced | Implemented | Notes |
|----------|-----------|-------------|-------|
| D-01 Single course type | ✓ | ✓ | Plan 01 Task 1 |
| D-02 Lifecycle | ✓ | ✓ | Plan 03 Task 1 |
| D-03 Completion criteria | ✓ | ✓ | Plan 03 Task 1 |
| D-04 Single active lesson | ✓ | ✓ | Plan 03 Task 1 |
| D-05 Multiple enrollments | ✓ | ✓ | Plan 03 must_haves |
| D-06 Sidebar tab | ✓ | ✓ | Plan 01 Task 3 |
| D-07 Catalog-first view | ✓ | ✓ | Plan 01 Task 3 |
| D-08 Search + tag chips | ✓ | ✓ | Plan 03 Task 2 |
| D-09 Course overview page | ✓ | ✓ | Plan 03 Task 2 |
| D-10 Exercise-first | ✓ | ✓ | Plan 03 Task 1 |
| D-11 Exercise types | ✓ | ✓ | Plan 01 Task 1 + Plan 03 Task 1 |
| D-12 Composite final assessment | ✓ | ✓ | Plan 03 Task 1 |
| D-13 Weakness detection | ✓ | ✓ | Plan 04 Task 1 |
| D-14 Auto-generate every time | ✓ | ✓ | Plan 04 Task 1 |
| **D-15 Re-generate after completion** | **✓** | **✗** | **Referenced in read_first only, not implemented** |
| D-16 Tag-based mapping | ✓ | ✓ | Plan 04 Task 1 |
| D-17 Extensible taxonomy | ✓ | Partial | Pre-defined tags implemented; AI extensibility missing |
| **D-18 Two recommendation places** | **✓** | **Partial** | Catalog section done; inline post-task suggestions missing |
| D-19 Hybrid ingestion | ✓ | ✓ | Plan 02 |
| D-20 In-app ingestion | ✓ | ✓ | Plan 02 Task 2 |
| D-21 Pipeline steps | ✓ | ✓ | Plan 02 |
| D-22 Freeform PDFs | ✓ | ✓ | Plan 02 Task 1 |
| D-23 PDF stored & searchable | ✓ | ✗ | Referenced but not implemented |
| D-24 Course model | ✓ | ✓ | Plan 01 Task 1 |
| D-25 Topic model | ✓ | ✓ | Plan 01 Task 1 |
| D-26 Lesson model | ✓ | ✓ | Plan 01 Task 1 |
| D-27 Exercise model | ✓ | ✓ | Plan 01 Task 1 |
| D-28 Dashboard integration | ✓ | ✓ | Plan 04 Task 2 |
| D-29 Post-course comparison | ✓ | ✓ | Plan 04 Task 1 (stores data) |
| D-30 Difficulty progression | ✓ | ✓ | Plan 04 Task 2 |
| D-31 Offline caching | ✓ | ✓ | Plan 04 Task 2 |
| D-32 IndexedDB storage | ✓ | ✓ | Plan 01 Task 1 |
| D-33 PDF storage strategy | ✓ | ✗ | Same as D-23 |
| D-34 AI through useAI.js | ✓ | ✓ | Plan 02 Task 1 |
| D-35 Structured JSON pattern | ✓ | ✓ | Plan 02 Task 1 |
| D-36 Silent catch | ✓ | ✓ | Plan 01 Task 1 |
| D-37 Quality gates | ✓ | ✓ | Plan 04 threat model |
| D-38 Flat components | ✓ | ✓ | All in src/components/ |
| D-39 BEM prefix | ✓ | ✓ | All plans reference .course__* |
| D-40 State machine | ✓ | ✓ | Plan 03 Task 1 |
| D-41 Never auto-enroll | ✓ | ✓ | Plan 03 Task 2 |
| **D-42 Self-assessment** | **✓** | **✗** | **Referenced in read_first only** |
| D-43 Auto-save | ✓ | ✓ | Plan 03 Task 1 (10s interval) |
| **D-44 Checklist display** | **✓** | **✗** | **Referenced in read_first only** |

**Coverage:** 40/44 decisions implemented (91%). 4 decisions not implemented in action text: D-15, D-18 (partial), D-42, D-44.

---

## Deferred Ideas Compliance

No deferred ideas from CONTEXT.md are included in the plans:
- Multi-device sync: Not included ✓
- Course marketplace/sharing: Not included ✓
- Mobile native app: Not included ✓
- Admin/teacher dashboard: Not included ✓
- Course series/learning paths: Not included ✓

---

## Requirement Coverage

The ROADMAP.md marks Phase 6 requirements as "TBD" — no formal requirement IDs exist. All 44 CONTEXT.md decisions serve as the effective requirements. Coverage is 91% (40/44 implemented).

---

## Dependency Graph

```
Wave 1: 01 (no deps)
Wave 2: 02 → depends on 01
Wave 3: 03 → depends on 01, 02
Wave 4: 04 → depends on 01, 02, 03
```

No cycles. No forward references. Wave numbers consistent with max(dep) + 1.

---

## Key Links Analysis

| From | To | Via | Status |
|------|----|-----|--------|
| SidebarNav.jsx | ViewContext.jsx | navTab='courses' state | ✓ Wired in Plan 01 |
| useCourses.js | useIndexedDB.js | DSE_KEYS.COURSES prefix | ✓ Wired in Plan 01 |
| server/index.js | server/routes/courses.js | app.use mount | ✓ Wired in Plan 01 |
| CourseIngestion.jsx | POST /api/courses/ingest | fetch | ✓ Wired in Plan 02 |
| CatalogView.jsx | GET /api/courses | fetch | ✓ Wired in Plan 02 |
| CoursePlayer.jsx | useCourses.js | saveProgress + getInProgressCourseId | ✓ Wired in Plan 03 |
| CourseOverview.jsx | CoursePlayer.jsx | Start/Continue button passes courseId | ✓ Wired in Plan 03 |
| errorPatternAnalysis.js | courseSchema.js | weakness tags → tag matching | ✓ Wired in Plan 04 |
| Dashboard.jsx | useCourses.js | getCompletedCourses count | ✓ Wired in Plan 04 |
| **ReadingModule/WritingModule** | **CatalogView** | **inline post-task suggestions** | **✗ Not wired (D-18)** |

---

## Scope Assessment

| Plan | Tasks | Files Modified | Estimated Context |
|------|-------|---------------|-------------------|
| 01 | 3 | 9 | ~70% |
| 02 | 2 | 5 | ~50% |
| 03 | 2 | 5 | ~45% |
| 04 | 2 | 8 | ~60% |

No plan exceeds 5 tasks. No plan exceeds 15 files. Scope is within budget.

---

## Security Threat Model Review

All 4 plans include threat models with STRIDE analysis:
- Plan 01: 6 threats (T-06-01 through T-06-SC)
- Plan 02: 4 threats (T-06-06 through T-06-SC)
- Plan 03: 3 threats (T-06-10 through T-06-SC)
- Plan 04: 3 threats (T-06-13 through T-06-SC)

Total: 16 unique threat mitigations. Covers PDF injection, AI prompt injection, DoS, IndexedDB tampering, XSS, and cached content validation. No gaps identified.

---

## Architectural Tier Compliance

All plan tasks correctly assign capabilities per the Architectural Responsibility Map:
- PDF text extraction → Backend (server/crawlers/pdfParser.js) ✓
- AI course structuring → Backend → AI proxy ✓
- Course catalog → Frontend (CatalogView) ✓
- Exercise-first delivery → Frontend (CoursePlayer) ✓
- Reference content unlock → Frontend (CoursePlayer local state) ✓
- Weakness detection → Frontend (errorPatternAnalysis) + Backend (AI) ✓
- Auto-course generation → Backend (server/routes/courses.js) ✓
- Course progress persistence → IndexedDB (CrescendoDSE) ✓
- PDF storage → Backend (SQLite) ✓
- Dashboard integration → Frontend (Dashboard.jsx) ✓
- Offline caching → Frontend (Service Worker + IndexedDB) ✓

No tier mismatches detected.

---

## Recommendation

**2 blockers require resolution before execution can proceed:**

1. **D-15 (re-generate after completion):** Add a trigger mechanism in Plan 04 that checks for persistent weaknesses after course completion and auto-generates a new course.

2. **D-18 (inline post-task suggestions):** Add integration in Plan 04 to display course recommendations in the ReadingModule or WritingModule submission flow.

**4 warnings are recommended but not blocking:**
- D-42 (self-assessment) and D-44 (checklist display) should be implemented per locked decisions.
- D-23/D-33 (PDF storage and searchability) should be addressed.
- D-17 (extensible taxonomy) should support AI-added tags.
- Verify commands should be strengthened beyond grep-based checks.

Plans should be revised to address blockers, then re-verified.
