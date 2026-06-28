---
phase: 05-writing-examiner-insights
plan: 02
subsystem: writing-correction
tags: format-conventions, part-a, hkeaa, correction-pipeline, text-types

requires:
  - phase: 05-01
    provides: IELTS-first correction pipeline, convertToHkeaa, hkeaaWritingRubrics
provides:
  - PART_A_FORMAT_RULES — 9 text types with structural requirements
  - checkRequiredElements — deterministic format validator
  - buildFormatPromptSection — AI prompt section for register/tone evaluation
  - Consolidated checkPartAFormat delegating to formatConventions

affects: 05-03, WritingModule

tech-stack:
  added: []
  patterns:
    - Utility-as-constants with object config + helper functions (matched structuralConstraints.js pattern)

key-files:
  created:
    - src/utils/formatConventions.js
  modified:
    - src/hooks/useDSEPapers.js

key-decisions:
  - "checkPartAFormat consolidated from standalone letter-only checker to delegate via formatConventions.checkRequiredElements"
  - "buildCorrectionPrompt uses dynamic buildFormatPromptSection for Part A text types, with static fallback for unknown types"
  - "Signature regex uses /i flag for case-insensitive matching (Rule 1 fix from original code)"

requirements-completed:
  - WRITE-02

duration: ~5min
completed: 2026-06-28
---

# Phase 05 Plan 02: Part A Format Convention Rules

**Per-text-type structural rules (9 types) with deterministic format checking and AI prompt directives for register/tone evaluation, consolidated into the correction pipeline**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-28T02:27:30Z
- **Completed:** 2026-06-28T02:29:49Z
- **Tasks:** 2 (1 TDD)
- **Files modified:** 3

## Accomplishments

- Created `formatConventions.js` with 9 text-type format rule sets (letter, email, proposal, speech, article, report, blog, blog comment, questionnaire response)
- Implemented `checkRequiredElements()` — deterministic structural element validator using text pattern matching
- Implemented `buildFormatPromptSection()` — generates AI prompt directives for per-type register/tone evaluation
- Consolidated `checkPartAFormat` in `useDSEPapers.js` to delegate to `formatConventions.checkRequiredElements`, removing duplicate logic
- Updated `buildCorrectionPrompt` to use dynamic `buildFormatPromptSection` for Part A when text type is known, with static fallback for unknown types
- Added instructional note clarifying AI's role: evaluate appropriateness of format element usage, not just existence
- Followed TDD flow: behavioral test file created (RED) before implementation (GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create formatConventions.js** (TDD)
   - `1606907` — RED: behavioral specification tests
   - `2badbe9` — GREEN: full implementation
2. **Task 2: Update checkPartAFormat + buildCorrectionPrompt**
   - `4ae724f` — feat: consolidated checkPartAFormat and updated correction prompt

## Files Created/Modified

- `src/utils/formatConventions.js` (CREATED) — `PART_A_FORMAT_RULES`, `checkRequiredElements`, `buildFormatPromptSection`
- `src/hooks/useDSEPapers.js` (MODIFIED) — imports from formatConventions, checkPartAFormat delegation, buildCorrectionPrompt format section
- `src/__tests__/formatConventions.test.mjs` (CREATED) — behavioral specification tests

## Decisions Made

- Pattern matched `structuralConstraints.js` for utility design (named UPPER_SNAKE constants + helper function exports)
- `checkPartAFormat` return shape unchanged for full backward compatibility with WritingModule.jsx
- Fallback static format rules retained in buildCorrectionPrompt for unknown text types or Part B

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Case-sensitive signature regex misses capitalized names**
- **Found during:** Task 1 (formatConventions.js implementation)
- **Issue:** Signature regex `/[a-z]+\s+[a-z]+[,.]?\s*$/` only matched lowercase names (e.g., `john wong`), missing the common pattern `John Wong` with capitalized letters. The description says "check for name pattern at end (word + word)" but the regex didn't fulfill this.
- **Fix:** Added `i` flag to make the regex case-insensitive
- **Files modified:** `src/utils/formatConventions.js`
- **Verification:** Test with `John Wong` now correctly detects signature
- **Committed in:** `2badbe9` (GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix. Without it, most real signatures (capitalized) would be missed, reducing detection quality.

## Issues Encountered

- **No Node.js ESM support for test execution:** The root `package.json` lacks `"type": "module"`, so Node.js cannot natively import `.js` files with `export` syntax. Tests were verified via temporary `.mjs` copies and inline `node --input-type=module` scripts. The test file (`formatConventions.test.mjs`) serves as behavioral documentation but cannot be run as-is without a Vite-based test runner or package.json modification.

## Verification Results

- `npm run build` — **PASSES** (clean build, no errors)
- `checkPartAFormat` delegates to `formatConventions.checkRequiredElements` — **CONFIRMED** (no duplicate logic)
- `checkPartAFormat` return shape unchanged — **CONFIRMED** (`{ hasSalutation, hasClosingFormula, hasSignature, issues }`)
- WritingModule.jsx `_preChecks` flow unaffected — **CONFIRMED** (uses `formatCheck.issues` and `hasFormatIssues`)

## Next Phase Readiness

- Format convention rules ready for use in correction pipeline
- BuildPromptSection can be extended with additional text types if needed
- Ready for Phase 05-03 (further integration or refinement)

---

*Phase: 05-writing-examiner-insights*
*Completed: 2026-06-28*
