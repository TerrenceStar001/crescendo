---
phase: 10-auto-generation-reliability-quality
plan: 01
subsystem: courses
tags: [semantic-validation, hyper-parameters, json-parsing, retry-loop, quality]
requires: []
provides:
  - server/utils/courseSemanticValidator.js
  - server/routes/courses.js (enhanced)
  - src/utils/courseSchema.js (enhanced)
affects:
  - server/routes/courses.js — callAICourse, parseJSONResponse, retry loop
  - src/utils/courseSchema.js — validateCourse, semanticValidate
tech-stack:
  added:
    - Pure ES module semantic validator (server/utils/courseSemanticValidator.js)
  patterns:
    - Two-tier validation (structural + semantic) with combined error injection
    - Multi-strategy JSON parsing (4 strategies before returning null)
    - Client-server semantic validation parity
key-files:
  created:
    - server/utils/courseSemanticValidator.js
  modified:
    - server/routes/courses.js
    - src/utils/courseSchema.js
decisions:
  - Temperature 0.3 globally for all course generation paths (per D-01)
  - max_tokens 32768 globally for deep content without truncation (per D-02)
  - Semantic validation is a shared utility with identical logic on server and client (per D-04)
  - Retry prompt injects both structural AND semantic errors with specific correction instructions (per D-08, D-10)
  - parseJSONResponse uses 4 fallback strategies before returning null (per D-29)
metrics:
  duration: ~15 min
  files_created: 1
  files_modified: 2
  commits: 3
  completed_date: 2026-07-03
requirements:
  - COURSE-02
  - COURSE-04
---

# Phase 10 Plan 01: Semantic Validation Engine & Hyper-Parameter Alignment

One-liner: Created a shared semantic validation engine with 5 content-validity checks (MCQ answer in options, gap-fill answer in content, explanation length ≥40, reference content ≥150 words, exercise volume ≥3), aligned temperature to 0.3 and max_tokens to 32768 across all generation paths, and added multi-strategy JSON parsing with 4 fallback strategies.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared semantic validation utility | `59acb31` | `server/utils/courseSemanticValidator.js` |
| 2 | Modify server routes/courses.js | `271c942` | `server/routes/courses.js` |
| 3 | Add semantic validation to client-side courseSchema | `5fcb183` | `src/utils/courseSchema.js` |

## What Was Built

### Task 1: server/utils/courseSemanticValidator.js
- `semanticValidate(courseDraft)` — main export, iterates all topics/lessons/exercises
- 5 individual exported check functions:
  - `checkMCQAnswer()` — verifies MCQ answer (case-insensitive) matches an option
  - `checkGapFillAnswer()` — verifies gap-fill/cloze answer appears in referenceContent
  - `checkExplanationLength()` — verifies explanation ≥40 characters
  - `checkReferenceContent()` — verifies referenceContent ≥150 words
  - `checkExerciseVolume()` — verifies each lesson has ≥3 exercises
- Pure functions, no state, no side effects, no external imports

### Task 2: server/routes/courses.js
- **Import:** `semanticValidate` imported from the new utility
- **Hyper-parameters:** `temperature: 0.7 → 0.3`, `max_tokens: 8000 → 32768`
- **Dual-error retry loop:** After structural `validateCourseDraft()`, calls `semanticValidate()` and combines errors via `allErrors = [...validation.errors, ...semanticValidation.errors]`. Retry prompt includes specific correction instructions per D-10.
- **Multi-strategy parseJSONResponse:** 4 strategies — outer braces, brace-depth tracking, regex match for complete JSON objects, full string parse — all attempted before returning null

### Task 3: src/utils/courseSchema.js
- `semanticValidate(courseDraft)` — exported, same 5 checks inline (mirrors server version)
- `validateCourse()` — modified to call `semanticValidate()` after structural checks, appending semantic errors to the existing errors array
- Ensures client-side validation catches semantic issues before saving to IndexedDB

## Verification Results

```
1. Validator exists:                   PASS (server/utils/courseSemanticValidator.js)
2. Temperature 0.3 + max_tokens 32768: PASS
3. Dual-error retry injection:         PASS (semanticValidate + allErrors + correction instructions)
4. parseJSONResponse >=3 strategies:   PASS (4 strategies)
5. Client-side semanticValidate:       PASS (exported from courseSchema.js)
6. validateCourse calls semantic:      PASS (line 247)
```

## Success Criteria

- [x] server/utils/courseSemanticValidator.js exists with semanticValidate export
- [x] server/routes/courses.js has temperature 0.3 and max_tokens 32768
- [x] server/routes/courses.js injects both structural AND semantic errors into retry prompt
- [x] parseJSONResponse uses 4 strategies before returning null
- [x] src/utils/courseSchema.js exports semanticValidate with same 5 checks
- [x] validateCourse in courseSchema.js calls semanticValidate and includes results
- [x] All retry paths limited to 3 total attempts (existing behavior, unchanged)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new security-relevant surface introduced. The semantic validator is a pure utility with no network endpoints. Hyper-parameter changes suppress hallucination risk (T-10-01 mitigated).

## Self-Check: PASSED

All files exist, all commits verified.
