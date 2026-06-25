# Roadmap: Crescendo

**Created:** 2026-06-23
**Mode:** mvp
**Phases:** 4 | **Requirements:** 7 | **Coverage:** 100% ✓

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

- [ ] 03-01-PLAN.md — Error pattern analysis utility + MarkedScriptView annotated passage component
- [ ] 03-02-PLAN.md — ErrorPatternAnalysis display + DrillGenerator + drillGenerator.js utility
- [ ] 03-03-PLAN.md — ReadingResults extraction + ReadingModule surgery + App.css styling + tablet responsive

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

- [ ] 04-01-PLAN.md — Foundation: prompt bank, generation pipeline, correction prompt design (Wave 1)
- [ ] 04-02-PLAN.md — Core exam: state machine, timer, ruled editor, Part B selector, auto-save (Wave 2)
- [ ] 04-03-PLAN.md — Correction: AI pipeline, rubric results, error list, vocab, save to history (Wave 2)
- [ ] 04-04-PLAN.md — Advanced: inline annotations, error chart, resubmit, history, comparison (Wave 2)
