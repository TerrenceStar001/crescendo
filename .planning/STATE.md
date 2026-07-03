---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Courses Quality Polish
current_phase: 07
status: executing
last_updated: "2026-07-02T15:55:20.238Z"
last_activity: 2026-07-01
progress:
  total_phases: 10
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 10
---

# Project State

## Session: Phase 7 — Roadmap Created

**Current phase:** 07
**Last action:** Roadmap created for v1.1 — 3 phases defined (Phase 7–9)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-01)

**Core value:** Students can practice authentic DSE-style English exam papers with AI-generated passages and questions, get immediate feedback with detailed analysis, and track their progress across all four skills — all from a single offline-capable web app.

**Current milestone:** v1.1 Courses Quality Polish — Fix and polish the Courses feature so PDF uploads work end-to-end, auto-generated courses have quality content, and the catalog has useful seed courses.

## Accumulated Context

### Roadmap Evolution

- Phase 10 added: added phase: 8
- Phase 10 added: context gathered: global loading state, semantic validation, explicit failure, simpler content mode, unified validator

### Milestone v1.0 Completion

All 6 phases of v1.0 completed:

- Phase 1-4: Reading + Writing Module DSE authenticity
- Phase 5: IELTS grading pipeline (planned, not executed)
- Phase 6: Courses feature (initial implementation — PDF ingestion, player, recommendations)

### Milestone v1.1 — Courses Quality Polish

The Courses feature from Phase 6 has known quality issues that need fixing:

1. **PDF ingestion pipeline** — text extraction quality gate too low (50 chars), no chunking, garbage-in-garbage-out AI structuring
2. **Auto-generation timeout cascade** — frontend timeout (3000ms) far shorter than backend needs (30-120s), so AI path always falls through to template fallback
3. **Empty catalog** — first-time user sees empty catalog with no courses to try
4. **No quality validation** — no semantic answer checking, no quality badges, no post-course tracking

**Phase roadmap:**

| Phase | Focus | Key Requirements |
|-------|-------|-----------------|
| 7 | PDF Ingestion Pipeline Fix | COURSE-01, COURSE-05, COURSE-06 |
| 8 | Auto-Generation Quality | COURSE-02, COURSE-04 |
| 9 | Seed Catalog & Quality Features | COURSE-03, COURSE-07, COURSE-08 |

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Phase 7 before Phase 8 | PDF pipeline must produce clean input before AI generation can work reliably |
| Phase 8 before Phase 9 | Auto-generation must produce quality content before seeding catalog with examples |
| Infrastructure fixes (COURSE-06) in Phase 7 | Body size limits and storage sync are foundational for both PDF ingestion and catalog |

### Known Risks

- **Timeout cascade** (Phase 8): The frontend's 3000ms timeout makes the entire backend AI pipeline dead code for most users. Mitigation: extend to 30000ms (matching `useAI.js` patterns) and show loading state during generation.
- **PDF text extraction** (Phase 7): 50-character threshold passes garbage into AI. Mitigation: raise to 500 characters and add per-page extraction stats in upload UI.
- **Seed course content** (Phase 9): Needs domain expertise to write 8-10 high-quality DSE courses. Technical pattern (bundled JSON) is straightforward.

## Status

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 7 — PDF Ingestion Pipeline Fix | Not started | 0/0 | 0% |
| 8 — Auto-Generation Reliability & Quality | Not started | 0/0 | 0% |
| 9 — Seed Catalog & Quality Features | Not started | 0/0 | 0% |

## Current Position

Phase: 07 (pdf-ingestion-pipeline-fix) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-07-01

## Next Steps

1. `/gsd-plan-phase 7` — Plan Phase 7 (PDF Ingestion Pipeline Fix)
