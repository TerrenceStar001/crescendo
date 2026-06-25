# Requirements: Crescendo

**Defined:** 2026-06-23
**Core Value:** Students can practice authentic DSE-style English exam papers with AI-generated passages and questions, get immediate feedback with detailed analysis, and track their progress across all four skills — all from a single offline-capable web app.

## v1 Requirements

### Reading — Passage Quality

- [ ] **READ-01**: Reading passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity

### Reading — Question Quality

- [ ] **READ-02**: Each part (A, B1, B2) has exactly 42 marks with question counts and type distribution matching real HKDSE Paper 1
- [ ] **READ-03**: Question difficulty and trickiness matches real DSE — distractors use cognitive traps, TFNG has proper NG distribution
- [ ] **READ-04**: Answer checking handles DSE marking scheme nuances — partial marking, acceptable alternatives, rubric-aware scoring
- [ ] **READ-07**: Question generation covers the full DSE question type range with correct proportions

### Reading — Notes & Analysis

- [ ] **READ-05**: Notes analysis output combines marked-script style annotations, error pattern analysis, and targeted drill recommendations
- [ ] **READ-06**: Reading Module UI/UX reflects real DSE Paper 1 booklet format and examination experience

## v2 Requirements

### Writing — Module Overhaul

- [ ] **WRITE-01**: Writing prompts cover all DSE Paper 2 text types (article, letter, speech, report, story, blog, review, proposal) with Part A (compulsory, short practical) + Part B (choose from 4 options, extended)
- [ ] **WRITE-02**: AI correction produces detailed rubric scores (Content 7, Language 7, Organisation 7) matching HKEAA marking scheme per part, with overall DSE level via dseGrading.js
- [ ] **WRITE-03**: Error analysis highlights grammar, vocab, structural, and content issues with severity, line references, inline annotations, and cross-session pattern tracking
- [ ] **WRITE-04**: Timer and exam environment match real DSE Paper 2 — 2-hour HH:MM:SS countdown with warnings, ruled-line DSE answer booklet editor, no word count display, sound alerts, distraction-free mode
- [ ] **WRITE-05**: Writing Module UI/UX reflects real DSE Paper 2 booklet layout — exam header, instruction language, Part B option cards, auto-save/crash-recovery, session history with side-by-side comparison

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time multiplayer | Self-study tool; classroom features out of scope |
| Mobile native apps | Web PWA sufficient |
| Video content | Not part of DSE exam format |
| Spaced repetition scheduling | Limited to forgetting curve tracking |
| Third-party exam boards | DSE-specific only |
| Automated essay grading | Writing Module uses AI correction, not automated scoring |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| READ-01 | Phase 1 | Pending |
| READ-02 | Phase 2 | Pending |
| READ-03 | Phase 2 | Pending |
| READ-04 | Phase 2 | Pending |
| READ-05 | Phase 3 | Pending |
| READ-06 | Phase 3 | Pending |
| READ-07 | Phase 2 | Pending |
| WRITE-01 | Phase 4 | Pending |
| WRITE-02 | Phase 4 | Pending |
| WRITE-03 | Phase 4 | Pending |
| WRITE-04 | Phase 4 | Pending |
| WRITE-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 7 total
- v2 requirements: 5 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---

*Requirements defined: 2026-06-23*
*Last updated: 2026-06-23 after initial definition*
