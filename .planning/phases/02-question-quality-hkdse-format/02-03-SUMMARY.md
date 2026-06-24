---
phase: 02-question-quality-hkdse-format
plan: 03
subsystem: question-generation-pipeline
tags: prompt-templates, validation, hkdse, ai-generation, dse-papers

requires:
  - phase: 02-question-quality-hkdse-format
    plan: 01
    provides: question type distributions, cognitive trap taxonomy, DSE config
  - phase: 02-question-quality-hkdse-format
    plan: 02
    provides: DSE-style answer checking module

provides:
  - Per-type AI prompt template builders for all 9 HKDSE question types
  - Dedicated post-generation validation pipeline with type-specific checks
  - Modular prompt composition based on per-part type distribution
  - Enhanced validation in useDSEPapers.js generation pipeline

affects:
  - Phase 3 (reading-module-enhancements) — question generator improvements
  - Future UI work — question validation results display

tech-stack:
  added:
    - questionGenerator.js (utility module, 271 lines)
    - questionValidator.js (utility module, 431 lines)
  patterns:
    - Per-type prompt template builder pattern (UPPER_SNAKE case constants, camelCase functions)
    - Composite validator pattern (pure functions returning { valid, warnings })
    - Bridge pattern for backward-compatible validator migration

key-files:
  created:
    - src/utils/questionGenerator.js — Per-type AI prompt template builders + prompt composer
    - src/utils/questionValidator.js — Per-type validation pipeline with composite validator
  modified:
    - src/hooks/useDSEPapers.js — Integrated new modules, replaced monolithic prompts

key-decisions:
  - "TFNG NG distribution is enforced during generation (via prompt constraint) not post-processing — validateTFNGDistribution returns needsFix flag to trigger regeneration"
  - "Legacy validate functions preserved with bridge comment — new code uses questionValidator.js alongside existing validation for gradual migration"
  - "composeFullPrompt includes per-type sections only for types present in the current part's distribution (avoiding unnecessary tokens for unused types)"

patterns-established:
  - "Prompt template builder pattern: each builder is a pure function returning a format-specific string fragment"
  - "Composite validator pattern: validateQuestions() runs all sub-validators and aggregates results"
  - "Pure validation functions: no input mutation, all results returned as new objects"

requirements-completed:
  - READ-02
  - READ-03
  - READ-07

duration: 4 min
completed: 2026-06-24
---

# Phase 2 Plan 3: Per-type AI prompt templates and dedicated question validation pipeline

**Decomposed the monolithic generation prompt into per-type template builders with a dedicated post-generation validation pipeline.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-24T02:18:06Z
- **Completed:** 2026-06-24T02:22:02Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Created `questionGenerator.js` with 9 per-type AI prompt builder functions plus `composeFullPrompt` that assembles shared rules and type-specific sections based on the part's distribution
- Created `questionValidator.js` with 5 validation functions covering per-question format, MCQ distractors, TFNG NG distribution, type consistency, and a composite validator
- Refactored `useDSEPapers.js` to replace both monolithic generation prompts with `composeFullPrompt` calls and run the new validator alongside the legacy one for enhanced type-specific checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create questionGenerator.js** — `d4569a0` (feat)
2. **Task 2: Create questionValidator.js** — `f45f4b6` (feat)
3. **Task 3: Refactor useDSEPapers.js** — `1c1144c` (feat)

**Plan metadata:** *(committed below)*

## Files Created/Modified

- `src/utils/questionGenerator.js` — 9 per-type prompt builders + composeFullPrompt (created, 271 lines)
- `src/utils/questionValidator.js` — 5 validation functions with composite aggregate (created, 431 lines)
- `src/hooks/useDSEPapers.js` — Imports new modules, replaces monolithic prompts, adds new validator calls (modified, -170 lines net)

## Decisions Made

- TFNG NG distribution is enforced during generation (via prompt constraint) not post-processing — `validateTFNGDistribution` returns `needsFix` flag to trigger regeneration rather than mutating questions
- Legacy `validateQuestions` preserved with bridge comment — new validator runs alongside (not replacing) existing validation for gradual migration
- `composeFullPrompt` includes per-type sections only for types present in the current part's distribution, avoiding unnecessary tokens

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Phase 2 is now complete: question type config (01), answer checking (02), and per-type generation/validation (03) all built
- Ready for Phase 3 (reading-module-enhancements / notes analysis)

## Self-Check: PASSED

- [x] questionGenerator.js exports all 9 functions
- [x] questionValidator.js exports all 5 validation functions
- [x] useDSEPapers.js imports from both new modules
- [x] Build passes (`npm run build`)
- [x] All three commits exist in git history

---

*Phase: 02-question-quality-hkdse-format*
*Completed: 2026-06-24*
