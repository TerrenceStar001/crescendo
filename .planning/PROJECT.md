# Crescendo

## What This Is

Crescendo (formerly NodeMind) is a DSE English learning platform that helps Hong Kong students prepare for the HKDSE English examination through AI-powered practice across all four papers: Reading, Writing, Listening, and Speaking. It combines AI-generated exam materials, smart note-taking with content type detection, and performance analytics to provide a complete self-study solution.

## Core Value

Students can practice authentic DSE-style English exam papers with AI-generated passages and questions, get immediate feedback with detailed analysis, and track their progress across all four skills — all from a single offline-capable web app.

## Current State

**Shipped:** v1.1 Courses Quality Polish (2026-07-04)

All 9 roadmap phases complete. The Courses feature has been hardened with reliable PDF ingestion, quality auto-generation pipelines, and a seeded catalog with 10 built-in courses. User improvement tracking monitors progress across skill areas after course completion.

## Current Milestone: v1.2 Adaptive Study Engine

**Goal:** Build an Adaptive Study Engine that profiles students, generates personalized study plans, detects cognitive flaw patterns, and delivers targeted exercises with optimal review scheduling.

**Target features:**
- Student initial assessment (self-rated + verification quiz)
- Personalized 3-tier study plans (short/mid/long-term)
- Cognitive flaw detection from DSE session results (6 categories)
- Adaptive exercise generation targeting weak areas
- Timeline view with daily exercise recommendations
- Forgetting curve review scheduling

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
- ✓ Study notes generation after practice sessions — existing
- ✓ Bundled offline content fallback — existing
- ✓ Writing Module with AI correction (rubric, errors, vocab) — existing
- ✓ Listening Module with TTS playback and MCQ — existing
- ✓ Speaking Module with recording, STT, and analysis — existing
- ✓ Note-taking system with kind detection (12 content types) — existing
- ✓ Dashboard with skill rings, grade history, recommendations — existing
- ✓ PWA with offline support — existing
- ✓ **READ-01**: Passages match real HKDSE Paper 1 in genre variety, difficulty calibration, and source authenticity — Phase 1 ✓
- ✓ **READ-02**: Each part has correct marks and type distribution matching real DSE — Phase 2 ✓
- ✓ **READ-03**: Question difficulty and trickiness with cognitive traps, proper NG distribution — Phase 2 ✓
- ✓ **READ-04**: Answer checking with partial marking, spelling tolerance, rubric-aware scoring — Phase 2 ✓
- ✓ **READ-05**: Notes analysis with marked-script annotations, error pattern analysis, drill recommendations — Phase 3 ✓
- ✓ **READ-06**: Reading Module UI/UX matching DSE Paper 1 booklet format — Phase 3 ✓
- ✓ **READ-07**: Full DSE question type range with correct proportions — Phase 2 ✓
- ✓ Course Player with exercise-first state machine, reference unlock, final assessment — Phase 6 ✓
- ✓ Course recommendations from weakness→tag mapping — Phase 6 ✓
- ✓ PDF ingestion pipeline with AI structuring — Phase 6 ✓ (quality fix in Phase 7 ✓)
- ✓ **COURSE-01**: PDF upload pipeline works reliably — file upload, text extraction, and AI structuring produce usable courses end-to-end — Phase 7 ✓
- ✓ **COURSE-02**: Auto-generated courses from user practice sessions have sufficient quality and quantity of content — Phase 8 ✓
- ✓ **COURSE-03**: Catalog has useful seed courses available immediately (DSE + general English) — Phase 9 ✓
- ✓ **COURSE-04**: Generated course content is sufficiently deep and well-structured for meaningful learning — Phase 8 ✓
- ✓ **COURSE-05**: Failed uploads and generation show clear error messages to the user (no silent catch blocks) — Phase 7 ✓
- ✓ **COURSE-06**: Infrastructure fixes — body size limits match between client and server, storage sync between IndexedDB and SQLite — Phase 7 ✓
- ✓ **COURSE-07**: Course quality indicators — badges show draft/reviewed/seed quality level in the catalog — Phase 9 ✓
- ✓ **COURSE-08**: Post-course tracking — track user score improvement after completing courses — Phase 9 ✓

### Active

*No active requirements — next milestone pending.*

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
- **v1.1 results**: 3 phases shipped (7-9), 7 plans executed, 18 commits. PDF ingestion pipeline overhauled with positional-sorted text extraction, quality-first flow, typed error handling. Auto-generation hardened with semantic validation, temperature/token tuning, and explicit failure recovery. Catalog seeded with 10 built-in courses. Quality badges and improvement tracking added.

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
| Keep RAG approach (reference real DSE papers) | Authentic passages are better than fully AI-generated ones; RAG provides structural and thematic grounding | ✓ Good |
| 42 marks per part, aligned to real distribution | User explicitly wants exact DSE format match | — Pending |
| Notes analysis: marked script + error patterns + drills | User selected "both combined" — needs to be genuinely useful for students | ✓ Good |
| 3 phases (Passages → Questions → Notes) | Each area is independently large and testable; splitting avoids monolithic changes | ✓ Good |
| Phase 7 before Phase 8 | PDF pipeline must produce clean input before AI generation can work reliably | ✓ Good |
| Phase 8 before Phase 9 | Auto-generation must produce quality content before seeding catalog with examples | ✓ Good |
| Quality-first PDF ingestion (extract → quality gate → AI) | Prevents garbage-in-garbage-out; user sees quality metrics before AI call | ✓ Good |
| Temperature 0.3 / max_tokens 32768 globally | Lower temperature reduces hallucination; larger tokens prevent content truncation | ✓ Good |
| No hollow template fallback | Explicit failure is better than silently saving garbage courses | ✓ Good |
| Global loading state with floating progress panel | Long AI calls need visual feedback and navigation guard | ✓ Good |

---

*Last updated: 2026-07-17 after v1.1 milestone — v1.2 initialized*

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
