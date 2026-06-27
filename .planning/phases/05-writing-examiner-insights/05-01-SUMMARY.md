---
phase: 05-writing-examiner-insights
plan: 01
subsystem: api
tags: [ielts, hkeaa, writing-correction, scoring, conversion]

# Dependency graph
requires:
  - phase: 04-writing-module
    provides: "correction pipeline (buildCorrectionPrompt, parseCorrectionResponse, combineCorrections), WritingModule state machine"
provides:
  - "IELTS-first correction prompt with 4 band descriptors (TA/CC/LR/GRA 0-9)"
  - "IELTS→HKEAA conversion mapping table with localStorage persistence"
  - "Structured HKEAA level descriptors (Content/Organisation/Language 1-7)"
  - "Memorised phrase detection directive in correction prompt"
affects: [writing-module, dse-grading, correction-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [utility-as-constants, localStorage-persistence-with-default-fallback, IELTS-first-scoring]

key-files:
  created:
    - src/utils/ieltsToDseMap.js
    - src/utils/hkeaaWritingRubrics.js
  modified:
    - src/utils/dseGrading.js
    - src/hooks/useDSEPapers.js
    - src/components/WritingModule.jsx

key-decisions:
  - "IELTS band descriptors (TA/CC/LR/GRA 0-9) used as primary scoring rubric — LLMs produce more accurate IELTS scores than direct HKEAA scoring"
  - "HKEAA Content/Organisation/Language scores derived via calibrated conversion table, not direct AI scoring"
  - "IELTS scores internal only — only HKEAA scores displayed to user"
  - "Memorised phrase detection added as prompt directive with TA cap at 5/9"

patterns-established:
  - "Utility-as-constants: ieltsToDseMap.js and hkeaaWritingRubrics.js follow structuralConstraints.js pattern"
  - "localStorage persistence with default fallback: getIeltsToDseMap/storeIeltsToDseMap mirror getStoredBoundaries/storeBoundaries pattern"
  - "Schema guard + defaulting: parseCorrectionResponse validates IELTS fields before conversion, defaults missing to 0"

requirements-completed: ["WRITE-02"]

# Metrics
duration: 15min
completed: 2026-06-27
---

# Phase 05 Plan 01: IELTS-First Correction Pipeline & HKEAA Conversion Mapping

**Rewrite AI correction prompt to use IELTS Writing band descriptors (TA/CC/LR/GRA 0-9) as primary scoring rubric, with automatic conversion to HKEAA Content/Organisation/Language scores via calibrated mapping table, plus memorised phrase detection.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-27T15:55:00Z
- **Completed:** 2026-06-27T16:01:28Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `ieltsToDseMap.js` with configurable IELTS→HKEAA conversion mapping and localStorage persistence
- Created `hkeaaWritingRubrics.js` with structured HKEAA level descriptors for all 7 bands × 3 categories
- Rewrote `buildCorrectionPrompt` to use IELTS band descriptors (TA/CC/LR/GRA) instead of direct HKEAA scoring
- Updated `parseCorrectionResponse` to extract IELTS scores and convert to HKEAA via mapping table
- Updated `combineCorrections` to average IELTS scores across Parts A and B
- Added memorised phrase detection directive with TA cap at 5/9
- Updated WritingModule.jsx system prompts to reference IELTS descriptors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ieltsToDseMap.js + hkeaaWritingRubrics.js + dseGrading.js re-exports** - `73098aa` (feat)
2. **Task 2: Rewrite buildCorrectionPrompt with IELTS descriptors + memorised phrases; update parseCorrectionResponse and combineCorrections** - `7fc7b27` (feat)

**Plan metadata:** `7fc7b27` (docs: complete plan)

## Files Created/Modified
- `src/utils/ieltsToDseMap.js` — IELTS→HKEAA conversion mapping table with localStorage persistence, `getIeltsToDseMap`, `storeIeltsToDseMap`, `convertToHkeaa` exports
- `src/utils/hkeaaWritingRubrics.js` — HKEAA Content/Organisation/Language level descriptors for bands 1-7, sourced from HKEAA LevelDescriptors-ENG-Writing.pdf
- `src/utils/dseGrading.js` — Added import and re-export of `getIeltsToDseMap`, `storeIeltsToDseMap`, `convertToHkeaa`
- `src/hooks/useDSEPapers.js` — Rewrote `buildCorrectionPrompt` (IELTS descriptors + memorised phrase detection), updated `parseCorrectionResponse` (IELTS extraction + HKEAA conversion), updated `combineCorrections` (IELTS averaging)
- `src/components/WritingModule.jsx` — Updated system prompts in handleSubmit to reference IELTS band descriptors

## Decisions Made
- Used IELTS band descriptors (TA/CC/LR/GRA 0-9) as the primary scoring rubric because LLMs produce more accurate scores in IELTS format than in direct HKEAA scoring
- HKEAA Content/Organisation/Language scores are derived via calibrated conversion table, not direct AI scoring
- IELTS scores are internal only — only HKEAA scores displayed to user (per D-04)
- Memorised phrase detection implemented as prompt directive with TA cap at 5/9 (per D-16/D-17)
- Conversion table uses identical default mappings for all four IELTS dimensions, allowing future per-dimension calibration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Plan 05-02 (conversion table calibration + settings UI) can proceed. The conversion mapping table is in place with sensible defaults; Wave 2 will calibrate the values based on examiner report data and add Settings UI for customization.

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git log. Build passes without errors.

---
*Phase: 05-writing-examiner-insights*
*Completed: 2026-06-27*
