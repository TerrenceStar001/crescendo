# Roadmap: Crescendo

**Created:** 2026-06-23
**Mode:** mvp
**Phases:** 3 | **Requirements:** 7 | **Coverage:** 100% ✓

---

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
**Plans:** 2 plans in 2 waves

Plans:
- [ ] 01-01-PLAN.md — Backend RAG fragment endpoint + difficulty-calibrated structural constraints
- [ ] 01-02-PLAN.md — Frontend hybrid generation pipeline + quality gates + DSE booklet passage display

---

### Phase 2: Question Quality & HKDSE Format
**Goal:** Questions match real HKDSE Paper 1 in type distribution, mark allocation, difficulty, trickiness, and answer checking rigor — every practice session feels like sitting the real exam.
**Mode:** mvp
**Success Criteria:**
1. Each part generates exactly 42 marks with question counts matching real DSE range (19-27 per part)
2. Question type proportions match 2020-2024 averages (short answer 20-30%, cloze 15-25%, MCQ 10-20%, matching 8-15%, TFNG 8-12%, etc.)
3. MCQ distractors use documented cognitive traps; at least 30% of wrong answers selected by testers are plausible-seeming distractors (not obviously wrong)
4. TFNG has proper NG distribution (≥2 NG per 4+ TFNG questions)
5. Answer checking supports DSE-style marking: partial marks, alternative answers, spelling tolerance

**Requirements:** READ-02, READ-03, READ-04, READ-07

---

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
