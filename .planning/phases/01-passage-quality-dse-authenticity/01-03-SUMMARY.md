---
phase: 01-passage-quality-dse-authenticity
plan: 03
subsystem: dse-reading
tags: [dse, ai-generation, structural-constraints, genre-classification, fallback-wiring]

# Dependency graph
requires:
  - phase: 01-passage-quality-dse-authenticity
    provides: WORD_COUNT_TARGETS, TEXT_TYPE_REQUIREMENTS, STRUCTURAL_CONSTRAINTS, ARGUMENTATION_FLOW
provides:
  - Fixed pure AI fallback wiring — passages survive to session return when backend unavailable
  - 14 genre templates with structure/voice/features for diverse text types
  - PROMPT_ENFORCEMENT_RULES enforcing paragraph length, colloquial dialogue, concrete nouns, no moralizing
  - Genre-specific prompt injection across all three generation functions
affects: [ReadingModule, WritingModule, DSE paper generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [genre-templating, prompt-enforcement, quality-gate-retry]

key-files:
  created:
    - tests/01-03-task1-pure-ai-fallback.test.js
    - tests/01-03-task2-genre-templates.test.js
  modified:
    - src/hooks/useDSEPapers.js
    - src/utils/structuralConstraints.js

key-decisions:
  - "Changed Step 2 fallback condition from `!finalContent || (finalSource === 'dse' && !finalQuestions?.length)` to just `!finalContent` — pure AI passages should never fall to bundled content"
  - "Expanded retry logic in generatePureAIPassage to cover word count failures, not just truncation signals"
  - "14 genre templates covering all B1/B2 text types plus additional realistic types (report, interview transcript, advertisement)"
  - "PROMPT_ENFORCEMENT_RULES injected into both user prompt and system message for maximum AI attention"

patterns-established:
  - "Genre-templating: GENRE_TEMPLATES maps text types to structure/voice/features for consistent prompt injection"
  - "Quality-gate retry: Pure AI passages now retry on word count failures, not just truncation"
  - "Dual enforcement: PROMPT_ENFORCEMENT_RULES in both user prompt and system message"

requirements-completed: [READ-01]

# Metrics
duration: ~15 min
completed: 2026-06-23
---

# Phase 01 Plan 03: Pure AI Fallback Wiring & Genre Diversity Summary

**Fixed pure AI fallback wiring to prevent bundled override, added 14 genre templates with structure/voice/features, and injected PROMPT_ENFORCEMENT_RULES for paragraph length, colloquial dialogue, concrete nouns, and anti-moralizing across all three generation functions.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-23T23:00:00Z
- **Completed:** 2026-06-23T23:15:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 2 source + 2 test files

## Accomplishments
1. Fixed the pure AI fallback bug where Step 2 incorrectly overrode pure AI passages with bundled content due to a faulty `finalSource === 'dse' && !finalQuestions?.length` condition
2. Added 14 genre templates (GENRE_TEMPLATES) with structure, voice, and features for each text type
3. Added PROMPT_ENFORCEMENT_RULES enforcing ≤3-sentence paragraphs, colloquial dialogue, concrete nouns, and no moralizing endings
4. Injected genre-specific instructions into all three generation functions (reference, RAG, pure AI)
5. Enhanced retry logic in pure AI path to cover word count failures, not just truncation

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix pure AI fallback wiring** - `3a2ca9b` (test + feat)
   - Added `pureAiAttempted` flag, simplified Step 2 condition, fixed readOnly, enhanced retry logic
   
2. **Task 2: Add genre templates and enforcement rules** - `049e617` (feat)
   - Exported GENRE_TEMPLATES (14 types) and PROMPT_ENFORCEMENT_RULES, injected into all generation functions

**Plan metadata:** `049e617` (docs: complete plan)

## Files Created/Modified
- `src/utils/structuralConstraints.js` — Added GENRE_TEMPLATES (14 types) and PROMPT_ENFORCEMENT_RULES exports
- `src/hooks/useDSEPapers.js` — Fixed pure AI fallback wiring, added genre injection, enhanced retry logic
- `tests/01-03-task1-pure-ai-fallback.test.js` — Test verifying Step 2 condition, pureAiAttempted flag, readOnly fix
- `tests/01-03-task2-genre-templates.test.js` — Test verifying genre templates and enforcement rules exports

## Decisions Made
- Changed Step 2 fallback condition to `!finalContent` only — pure AI passages with no questions should render as readOnly (passage only), not fall to bundled content
- Expanded retry in `generatePureAIPassage()` to cover word count failures (was only truncation)
- 14 genre templates chosen to cover all B1/B2 types plus report, interview transcript, and advertisement
- PROMPT_ENFORCEMENT_RULES appended to both user prompt and system message for dual-layer enforcement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Last paragraph regex already fixed in generatePureAIPassage**
- **Found during:** Task 1 implementation
- **Issue:** Plan specified fixing `/[^<]+/` to `/[\s\S]*?/` at line 920, but the code at that location already used the correct pattern. The buggy pattern `/[^<]+/` exists in `generatePassageFromReference()` at line 708, but the plan only asked to fix `generatePureAIPassage()`.
- **Fix:** No change needed — the pure AI path already had the correct regex. Left `generatePassageFromReference()` unchanged as it was out of scope.
- **Files modified:** None (verified no regression)
- **Verification:** Build passes, all tests pass

**Total deviations:** 1 (minor — code was already correct for the specified fix)
**Impact on plan:** No scope impact — all planned functionality implemented correctly.

## Issues Encountered
- Node.js ESM module loading issue: `structuralConstraints.js` uses `export` syntax but the project lacks `"type": "module"` in package.json. Verified via grep and Vite build instead of direct Node import.
- Path mangling with Chinese characters in home directory (`珈珈`) caused `__dirname`-based imports to resolve incorrectly. Used `process.cwd()` as fallback.

## Next Phase Readiness
- Pure AI fallback wiring fixed — passages now survive to session return
- Genre diversity infrastructure in place — different text types produce visibly different passages
- Ready for Phase 02 (question-quality-hkdse-format) which builds on these generation improvements

---
*Phase: 01-passage-quality-dse-authenticity*
*Completed: 2026-06-23*
