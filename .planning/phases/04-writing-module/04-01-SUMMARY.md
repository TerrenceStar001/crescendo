# Plan 04-01 Summary

**Phase 4**: Writing Module DSE Authenticity  
**Plan**: 04-01 — Foundation: Prompt Bank, Generation, Correction Prompt  
**Status**: ✅ Done  
**Committed**: `8066a6d`

## What Was Built

### Task 1: Curated Prompt Bank (`src/assets/writing-prompts.json`)
- 20 curated prompts covering all 8 text types (article, letter, speech, report, story, blog, review, proposal)
- 10 Part A prompts (email, letter, blog comment, questionnaire response, short article, speech)
- 10 Part B prompts across 9 topic domains (education, environment, technology, health, society, culture, work, lifestyle, politics)
- Used prompt tracking in localStorage (`crescendo-used-writing-prompts`)

### Task 2: Core Logic Refactor (`src/hooks/useDSEPapers.js`)
- **Replaced** `generateWritingPrompt` with `generateWritingSession(options, callAI)`:
  - Part A: tries curated bank first, falls back to AI generation
  - Part B: tries curated bank (4 prompts), falls back to single AI call generating all 4 options (D-37)
  - Respects `notes` array for topic inspiration
  - Returns `{ partA, partB, duration: 7200 }` structure
- **Added** `buildCorrectionPrompt(part, essay, promptInfo, selfAssessment)`:
  - Builds HKEAA-aligned correction prompt with Level Descriptors (L5/L3/L1)
  - Includes text type adjustments, prompt context, essay text
  - Requests structured JSON output matching UI-SPEC schema
- **Added** `parseCorrectionResponse(rawText)`:
  - Strips markdown code fences, extracts JSON
  - Validates scores (0-7 range), ensures all fields present
  - Falls back to empty arrays for missing optional fields
- **Added** `combineCorrections(partAResult, partBResult)`:
  - Averages scores across parts for combined view
  - Concatenates errors, vocab suggestions, good language
  - Computes combined total out of 42, percentage

### Task 3: CSS Scaffold (`src/App.css`)
- Added `/* ===== Writing Module — Phase 4 Overhaul ===== */` section marker
- Ready for Phase 4 component styles (added in Wave 2)

## Locked Decisions Applied
- D-37: Single AI call for all 4 Part B options ✅
- D-38: Separate correction per part ✅
- D-39: 2-hour timer (7200s) ✅

## Not Yet Done
- Task 4: WritingModule.jsx rewrite (Plan 04-02, Wave 2)
- Task 5: Correction display components (Plan 04-03, Wave 2)
- Task 6: History & comparison (Plan 04-04, Wave 2)

## Dependencies for Wave 2
- WritingModule.jsx imports `generateWritingSession`, `buildCorrectionPrompt`, `parseCorrectionResponse`, `combineCorrections` from `useDSEPapers`
- Uses `DSE_KEYS.WRITING_SESSIONS` from `useIndexedDB`
- All CSS classes defined in UI-SPEC §Component Styles (ready to implement)
