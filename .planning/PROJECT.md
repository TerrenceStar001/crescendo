# Crescendo

## What This Is

Crescendo (formerly NodeMind) is a DSE English learning platform that helps Hong Kong students prepare for the HKDSE English examination through AI-powered practice across all four papers: Reading, Writing, Listening, and Speaking. It combines AI-generated exam materials, smart note-taking with content type detection, and performance analytics to provide a complete self-study solution.

## Core Value

Students can practice authentic DSE-style English exam papers with AI-generated passages and questions, get immediate feedback with detailed analysis, and track their progress across all four skills — all from a single offline-capable web app.

## Requirements

### Validated

- ✓ Reading Module with Part A (compulsory), B1 (easier), B2 (harder) difficulty selection — existing
- ✓ AI-generated reading passages from DSE OCR reference papers with retry pipeline — existing
- ✓ AI-generated comprehension questions with 9 types (MCQ, TFNG, gap-fill, short-answer, matching, open-ended, summary-cloze, pronoun-ref, semantic-connect) — existing
- ✓ Question validation pipeline (type fixing, answer normalization, NG count enforcement, quality warnings) — existing
- ✓ Timer, session save/recovery, results display with DSE level scoring — existing
- ✓ Past session review with passage + answers — existing
- ✓ Answer reporting/flagging mechanism — existing
- ✓ Skill analytics recording to IndexedDB — existing
- ✓ Study notes generation after practice sessions — existing (needs overhaul)
- ✓ Bundled offline content fallback — existing
- ✓ Writing Module with AI correction (rubric, errors, vocab) — existing
- ✓ Listening Module with TTS playback and MCQ — existing
- ✓ Speaking Module with recording, STT, and analysis — existing
- ✓ Note-taking system with kind detection (12 content types) — existing
- ✓ Dashboard with skill rings, grade history, recommendations — existing
- ✓ PWA with offline support — existing

### Active

- [ ] **READ-01**: Passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity — not just AI-generated text
- [ ] **READ-02**: Each part (A, B1, B2) has exactly 42 marks with question counts and type distribution matching real HKDSE Paper 1 (2020-2024 data)
- [ ] **READ-03**: Question difficulty and trickiness matches real DSE — distractors use cognitive traps (over-generalization, temporal/causal flip, keyword bait), TFNG has proper NG distribution
- [ ] **READ-04**: Answer checking handles DSE marking scheme nuances — partial marking, acceptable alternatives, spelling tolerance, rubric-aware scoring
- [ ] **READ-05**: Notes analysis output is useful for learning — combines marked-script style annotations, error pattern analysis, and targeted drill recommendations
- [ ] **READ-06**: Reading Module UI/UX reflects real DSE Paper 1 booklet format and examination experience
- [ ] **READ-07**: Question generation covers the full DSE question type range with correct proportions (short answer, cloze, MCQ, matching, TFNG, table/chart, extended response)

### Out of Scope

- Real-time multiplayer or classroom features — this is a self-study tool
- Mobile native apps — web PWA is sufficient for v1
- Video content or multimedia learning materials
- Spaced repetition scheduling — knowledge health tracking is limited to forgetting curve
- Third-party exam board support (IELTS/TOEFL/IB) — DSE-specific only
- Automated essay grading with full rubric — Writing Module uses AI correction, not automated scoring

## Context

- **Existing codebase**: Crescendo is a mature React SPA (27 components, 12 hooks, 7 utilities) with an Express backend. The Reading Module has a sophisticated AI generation pipeline but output quality doesn't match real HKDSE standards.
- **AI infrastructure**: Uses OpenCode serve as default AI proxy (opencode/deepseek-v4-flash-free). No API key needed — authenticated via CLI session. Support for external API override (Settings → AI).
- **Research conducted**: Multi-source analysis of HKDSE Paper 1 structure from HKEAA official documents, Pearson annual analyses (2020-2024), examiner reports, and independent analysis platforms.
- **Key research findings**:
  - Paper 1: 1.5 hours, 20% weighting, 84 total marks (42 per part)
  - Part A: compulsory, mixed difficulty, Level 1-5 range
  - Part B1: easier, max Level 4, simpler texts, less cognitively demanding
  - Part B2: harder, up to 5**, more challenging texts, cognitively demanding
  - Question types in order of mark allocation: short answer > cloze > MCQ > matching > TFNG > table/chart > extended response
  - Text types: news reports, feature articles, opinion pieces, autobiographies, novel excerpts, blog posts, webpages, letters to editor, academic texts, forum posts, guides
- **Technical constraints**: localStorage 5MB limit for notes (primary storage), no test framework, no TypeScript, no routing library, monolithic App.jsx (1071 lines). All JSX/JS — plain JavaScript.

## Constraints

- **Tech Stack**: React 18 + Vite 5 + custom CSS (`.jsx` only — no TypeScript). Backend: Express + SQLite. No state management library.
- **AI**: OpenCode serve proxy default. AI model is `opencode/deepseek-v4-flash-free` (free tier). No guaranteed quality on AI-generated content — need validation pipeline.
- **Storage**: localStorage (5MB limit) for notes + config. IndexedDB for DSE session data. No backend dependency for core functionality.
- **Offline-First**: Core features must work without internet. Only AI features require connectivity.
- **DSE Fidelity**: All generated content must match HKDSE standards — users are practicing for a real exam and will reject content that doesn't feel authentic.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Research HKDSE Paper 1 structure first | Need authoritative reference to calibrate every aspect of generation | Done — 8+ sources analyzed |
| Keep RAG approach (reference real DSE papers) | Authentic passages are better than fully AI-generated ones; RAG provides structural and thematic grounding | Confirmed |
| 42 marks per part, aligned to real distribution | User explicitly wants exact DSE format match | — Pending |
| Notes analysis: marked script + error patterns + drills | User selected "both combined" — needs to be genuinely useful for students | — Pending |
| 3 phases (Passages → Questions → Notes) | Each area is independently large and testable; splitting avoids monolithic changes | — Pending |

---

*Last updated: 2026-06-23 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
