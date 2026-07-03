# Roadmap: Crescendo

**Created:** 2026-06-23
**Updated:** 2026-07-01
**Milestone:** v1.1 — Courses Quality Polish
**Mode:** mvp
**Phases:** 9 (6 from v1.0 + 3 from v1.1) | **v1.1 Requirements:** 8 | **Coverage:** 100% ✓

## Phases

### Milestone v1.0 (Completed)

- [x] **Phase 1: Passage Quality & DSE Authenticity** — Reading passages match real HKDSE Paper 1
- [x] **Phase 2: Question Quality & HKDSE Format** — Questions match real DSE type distribution and marking
- [x] **Phase 3: Notes & Analysis Overhaul** — Post-practice study notes with error analysis and drills
- [x] **Phase 4: Writing Module DSE Authenticity** — DSE-authentic writing exam experience with AI correction
- [x] **Phase 5: IELTS-First Grading Pipeline** — IELTS band grading converted to DSE levels (planned)
- [x] **Phase 6: Courses Feature** — Course system with PDF ingestion, player, recommendations

### Milestone v1.1 (Active)

- [x] **Phase 7: PDF Ingestion Pipeline Fix** — Reliable PDF upload, text extraction, chunking, and AI structuring with clear error feedback (completed 2026-07-01)
- [ ] **Phase 8: Auto-Generation Reliability & Quality** — Fix timeout cascade, lower AI temperature, add semantic validation for deep, correct content
- [ ] **Phase 9: Seed Catalog & Quality Features** — 8-10 seed courses, quality badges, and post-course score improvement tracking

## Phase Details

### Phase 1: Passage Quality & DSE Authenticity

**Goal:** Reading passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity — indistinguishable from real DSE papers.
**Mode:** mvp
**Success Criteria:**

1. Passages use diverse text types matching real DSE (news, feature, opinion, literary, informational)
2. Each part (A/B1/B2) has word count and difficulty calibrated to HKEAA standards
3. AI-generated passages pass truncation/quality checks at >95% rate
4. Passage display formatting matches DSE booklet layout conventions
5. User can identify at most 2 out of 10 passages as AI-generated vs real DSE

**Requirements:** READ-01
**Plans:** 4 plans in 2 waves (+2 gap closure)

Plans:

- [x] 01-01-PLAN.md — Backend RAG fragment endpoint + difficulty-calibrated structural constraints
- [x] 01-02-PLAN.md — Frontend hybrid generation pipeline + quality gates + DSE booklet passage display
- [x] 01-03-PLAN.md — Fix pure AI fallback wiring + genre templates + prompt enforcement rules
- [x] 01-04-PLAN.md — DSE booklet layout overhaul: line numbers, sterile styling, exam framework

### Phase 2: Question Quality & HKDSE Format

**Goal:** Questions match real HKDSE Paper 1 in type distribution, mark allocation, difficulty, trickiness, and answer checking rigor — every practice session feels like sitting the real exam.
**Mode:** mvp
**Success Criteria:**

1. Each part generates exactly 42 marks with question counts matching real DSE range (16-27 per part)
2. Question type proportions match 2020-2024 averages (short answer 17-30%, cloze 12-25%, MCQ 07-20%, matching 8-15%, TFNG 8-12%, etc.)
3. MCQ distractors use documented cognitive traps; at least 30% of wrong answers selected by testers are plausible-seeming distractors (not obviously wrong)
4. TFNG has proper NG distribution (≥2 NG per 4+ TFNG questions)
5. Answer checking supports DSE-style marking: partial marks, alternative answers, spelling tolerance

**Requirements:** READ-02, READ-03, READ-04, READ-07
**Plans:** 3 plans in 2 waves

Plans:

- [x] 02-01-PLAN.md — Question type config + new input components (Summary Cloze, Pronoun Reference, Semantic Matching)
- [x] 02-02-PLAN.md — DSE answer checking system with partial marks, alternatives, spelling tolerance
- [x] 02-03-PLAN.md — Per-type generation prompts + validation pipeline

### Phase 3: Notes & Analysis Overhaul

**Goal:** Post-practice study notes are genuinely useful for learning — combining marked-script style annotations, error pattern analysis, and targeted practice drill recommendations.
**Mode:** mvp
**Success Criteria:**

1. Notes show a marked-script view: highlighted errors, teacher-style margin comments, score annotations
2. Error pattern analysis identifies weaknesses by skill (inference vs detail vs vocab) and question type
3. Notes generate 2-3 targeted drill questions based on the student's specific mistakes
4. Reading Module UI/UX feels like the real DSE exam experience (booklet colors, instruction language, answer format)
5. Layout works on both desktop and tablet

**Requirements:** READ-05, READ-06
**Plans:** 3 plans in 2 waves

Plans:

- [x] 03-01-PLAN.md — Error pattern analysis utility + MarkedScriptView annotated passage component
- [x] 03-02-PLAN.md — ErrorPatternAnalysis display + DrillGenerator + drillGenerator.js utility
- [x] 03-03-PLAN.md — ReadingResults extraction + ReadingModule surgery + App.css styling + tablet responsive

### Phase 4: Writing Module DSE Authenticity

**Goal:** Writing prompts match real HKDSE Paper 2 in prompt variety, AI correction quality, rubric scoring, and exam experience — every practice session feels like writing in the real exam.

**Mode:** mvp

**Success Criteria:**

1. Writing prompts cover all DSE Paper 2 text types (article, letter, speech, report, story, blog, review, proposal)
2. AI correction produces detailed rubric scores (Content, Language, Organisation) matching HKEAA marking scheme
3. Error analysis highlights grammar, vocab, and structural issues with specific line references
4. Timer and exam environment match real DSE Paper 2 (2-hour countdown, word count, exam-style UI)
5. Writing Module UI/UX reflects real DSE Paper 2 booklet layout and instruction language

**Requirements:** WRITE-01, WRITE-02, WRITE-03, WRITE-04, WRITE-05
**Depends on:** Phase 3
**Plans:** 4 plans in 2 waves

Plans:

- [x] 04-01-PLAN.md — Foundation: prompt bank, generation pipeline, correction prompt design (Wave 1)
- [x] 04-02-PLAN.md — Core exam: state machine, timer, ruled editor, Part B selector, auto-save (Wave 2)
- [x] 04-03-PLAN.md — Correction: AI pipeline, rubric results, error list, vocab, save to history (Wave 2)
- [x] 04-04-PLAN.md — Advanced: inline annotations, error chart, resubmit, history, comparison (Wave 2)

### Phase 5: IELTS-First Grading Pipeline & DSE Conversion

**Goal:** AI correction grades in IELTS bands first (which LLMs handle accurately), then converts to DSE levels via a calibrated mapping table — eliminating inflated grades from naive direct-HKDSE scoring that LLMs do poorly.

**Mode:** mvp

**Success Criteria:**

1. Correction prompt uses IELTS Writing band descriptors (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) as primary scoring rubrics
2. IELTS band → DSE level conversion uses a calibrated mapping table derived from HKEAA level descriptors and examiner report data
3. Conversion table is configurable in Settings → DSE tab (same pattern as existing DSE boundaries)
4. Both per-part and combined scores display IELTS band equivalent alongside DSE level
5. Spot-check against 5 real HKDSE candidate scripts: converted scores match official HKEAA grades within ±1 DSE sub-grade
6. dseGrading.js exports IELTS↔DSE conversion utilities in addition to existing scoring functions

**Requirements:** WRITE-02
**Depends on:** Phase 4
**Plans:** 3 plans in 3 waves

Plans:

- [ ] 05-01-PLAN.md — Core IELTS pipeline: rewrite correction prompt with IELTS band descriptors, create ieltsToDseMap.js + hkeaaWritingRubrics.js, update parseCorrectionResponse/combineCorrections (Wave 1)
- [ ] 05-02-PLAN.md — Format conventions: create formatConventions.js, update correction pipeline with text-type format rules + memorised phrase detection (Wave 2)
- [ ] 05-03-PLAN.md — Component extraction: extract RubricDisplay, ErrorAnnotation, FormatChecker from WritingModule.jsx; add conversion settings UI to Settings → DSE tab (Wave 3)

### Phase 6: Courses feature

**Goal:** Build a Course system where external learning resources are transformed into structured courses. Students browse a catalog, enroll with an exercise-first approach, and complete via final assessment. System analyzes weaknesses from reading/writing tasks and recommends/auto-generates courses.
**Requirements:** All 44 CONTEXT.md decisions (D-01 through D-44)
**Depends on:** Phase 5
**Plans:** 4 plans in 4 waves

Plans:
- [x] 06-01-PLAN.md — Foundation: course data model, IndexedDB keys, sidebar nav, backend skeleton, catalog shell (Wave 1)
- [x] 06-02-PLAN.md — PDF Ingestion: upload pipeline, AI structuring, draft review UI, catalog with published courses (Wave 2)
- [x] 06-03-PLAN.md — Course Player: exercise-first state machine, reference unlock, auto-save, final assessment, course overview (Wave 3)
- [x] 06-04-PLAN.md — Recommendations: weakness→tag mapping, auto-generation, inline post-task suggestions, dashboard integration, offline caching, difficulty progression, re-generation trigger (Wave 4)

### Phase 7: PDF Ingestion Pipeline Fix

**Goal:** Users can reliably upload PDFs and receive well-structured courses with clear quality feedback — no more silent failures or garbage-in-garbage-out.

**Depends on:** Phase 6 (Courses feature foundation, PDF upload pipeline)
**Requirements:** COURSE-01, COURSE-05, COURSE-06

**Success Criteria** (what must be TRUE):
1. User can upload a PDF and receive a structured course with valid exercises (multi-column layouts handled correctly via positional text extraction)
2. User sees per-page character counts and extraction quality info before AI structuring begins
3. User gets clear, user-facing error message when a PDF has insufficient extractable content (<500 chars) — no silent `catch {}` failures
4. User gets clear error message when upload exceeds 10MB body size limit (client and server limits match)
5. Course ingested through the pipeline is consistently available in both IndexedDB and SQLite (dual storage sync works)

**Plans:** 3/3 plans complete
**UI hint**: yes

Plans:
- [x] 07-01-PLAN.md — Backend Foundation: server limit, PDF extraction overhaul (positional sort, pdf2md, OCR preprocessing, heading detection), quality gate, error propagation, sync endpoint (Wave 1)
- [x] 07-02-PLAN.md — Frontend UI: quality preview screen, EnhancedErrorBanner, toast notifications, CSS for all new components (Wave 2)
- [x] 07-03-PLAN.md — Integration & Sync: IndexedDB sync methods, Refresh Courses button in catalog view, App.jsx wiring (Wave 2)

### Phase 8: Auto-Generation Reliability & Quality

**Goal:** Fix the broken auto-generation pipeline so AI-generated courses complete reliably without timeout, have deep content with validated answers, and are explicitly blocked (not silently replaced with hollow templates) when quality is insufficient.

**Depends on:** Phase 7 (stable PDF pipeline ensures AI doesn't receive garbage input)
**Requirements:** COURSE-02, COURSE-04

**Success Criteria** (what must be TRUE):
1. Generated courses have semantically valid exercises — MCQ answer ∈ options, gap-fill answer in referenceContent, explanations ≥40 chars, referenceContent ≥150 words, ≥3 exercises/lesson
2. All course generation uses temperature 0.3 and max_tokens 32768 for deep, structured content
3. Retry loop injects both structural AND semantic errors into prompt (max 3 attempts)
4. No hollow template fallback — all AI failures show explicit error with "Retry" and "Try Simpler Content" options
5. Global loading state shows progress (floating panel), navigation guard, success toast, and error states
6. Post-task enrollment triggers course generation (not catalog filter)
7. PDF generation has AbortController timeout (120s) matching backend timeout
8. All silent catch blocks replaced with explicit error logging and user-visible states

**Plans:** 4 plans in 2 waves

Plans:
- [ ] 10-01-PLAN.md — Validation Engine + Hyper-Parameter Alignment (Wave 1)
- [ ] 10-02-PLAN.md — Global Loading State + App Wiring + Seed Fix (Wave 1)
- [ ] 10-03-PLAN.md — No Hollow Templates + Explicit Failure + Catch Remediation + JSON Robustness (Wave 2)
- [ ] 10-04-PLAN.md — PDF Timeout + PostTask Enrollment + Catch Remediation (Wave 2)

### Phase 9: Seed Catalog & Quality Features

**Goal:** New users see a useful, trustworthy catalog on first launch with quality indicators and the ability to track improvement after completing courses.

**Depends on:** Phase 8 (auto-generation pipeline produces quality content that validates correctly)
**Requirements:** COURSE-03, COURSE-07, COURSE-08

**Success Criteria** (what must be TRUE):
1. First-time user sees 8-10 seed courses in the catalog on first launch (covering DSE grammar, vocabulary, writing, reading strategy, and general English)
2. User sees quality badges (draft/reviewed/seed) on each course card in the catalog — can judge course maturity before enrolling
3. User's score improvement is tracked after completing courses (e.g., grammar course completion → reduced grammar errors in subsequent writing practice)
4. Post-course improvement data is visible to the user (dashboard widget or course completion view)

**Plans:** TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Passage Quality & DSE Authenticity | 4/4 | ✓ | 2026-06-23 |
| 2. Question Quality & HKDSE Format | 3/3 | ✓ | 2026-06-23 |
| 3. Notes & Analysis Overhaul | 3/3 | ✓ | 2026-06-23 |
| 4. Writing Module DSE Authenticity | 4/4 | ✓ | 2026-06-23 |
| 5. IELTS-First Grading Pipeline | 0/3 | Planned | - |
| 6. Courses Feature | 4/4 | ✓ | 2026-06-23 |
| 7. PDF Ingestion Pipeline Fix | 3/3 | Complete   | 2026-07-01 |
| 8. Auto-Generation Reliability & Quality | 4/4 | Ready | - |
| 9. Seed Catalog & Quality Features | 0/0 | Not started | - |


