---
phase: 01-passage-quality-dse-authenticity
plan: 01
subsystem: backend
tags: [rag, express, sqlite, structural-constraints, dse-authenticity]

requires:
  - phase: 00
    provides: RAG engine with vector store, article database
provides:
  - POST /api/rag/fragments endpoint for passage fragment retrieval
  - difficulty-calibrated word count targets and text type requirements
affects: [02-passage-generation-pipeline]

tech-stack:
  added: []
  patterns:
    - "Input validation at route entry for POST endpoints"
    - "Source name mapping for article attribution"
    - "Per-difficulty structural constraint constants"

key-files:
  created: []
  modified:
    - server/index.js — added POST /api/rag/fragments endpoint (lines 373-449)
    - src/utils/structuralConstraints.js — exported WORD_COUNT_TARGETS + TEXT_TYPE_REQUIREMENTS

key-decisions:
  - "Followed existing RAG search endpoint pattern for error handling and middleware"
  - "Added input validation (topic string, count positive int) beyond plan spec to mitigate T-01-01"
  - "Used query term density scoring (matching research code example) for fragment selection"

patterns-established:
  - "Per-difficulty constants in structuralConstraints.js as source of truth for generation pipeline"
  - "Parameterized SQL queries via better-sqlite3 (existing pattern, preserved)"

requirements-completed: [READ-01]

duration: 12min
completed: 2026-06-23
---

# Phase 01 Plan 01: Passage Fragment Endpoint + Structural Constraints Summary

**POST /api/rag/fragments endpoint returning real article fragments with source attribution, plus difficulty-calibrated word count targets and text type requirements for the DSE generation pipeline**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-23T09:14:36Z
- **Completed:** 2026-06-23T09:26:36Z
- **Tasks:** 2 (2 auto)
- **Files modified:** 2

## Accomplishments

- New `POST /api/rag/fragments` endpoint accepts `{ topic, difficulty, count, fragmentMaxWords }`, searches the RAG engine for relevant article chunks, extracts top-scoring paragraphs via query term density, and returns fragments with source attribution (`sourceName`, `sourceDate`, `sourceId`)
- Input validation on `topic` (must be string) and `count` (must be positive integer) — T-01-01 mitigation
- Proper error handling: 503 when RAG engine unavailable, 400 for invalid input, 500 for internal errors
- `WORD_COUNT_TARGETS` exported with HKDSE-calibrated word count ranges: B1 (600-1000), A (900-1200), B2 (1000-1200)
- `TEXT_TYPE_REQUIREMENTS` exported with per-difficulty genre lists matching real DSE Paper 1 patterns
- Existing `STRUCTURAL_CONSTRAINTS` and `ARGUMENTATION_FLOW` exports unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add POST /api/rag/fragments endpoint** - `92ad1d9` (feat)
2. **Task 2: Export difficulty-calibrated word counts and text type requirements** - `9c94d4b` (feat)

## Files Created/Modified

- `server/index.js` (+78 lines for fragments endpoint) — New POST endpoint at line 373, after existing search handler
- `src/utils/structuralConstraints.js` (+12 lines for WORD_COUNT_TARGETS + TEXT_TYPE_REQUIREMENTS) — Two new exports after ARGUMENTATION_FLOW

## Decisions Made

- Followed existing `POST /api/rag/search` error handling and middleware patterns for consistency
- Added input validation (`topic` string check, `count` positive integer check) beyond plan spec as Rule 2 mitigation for T-01-01 (Tampering threat)
- Used query term density scoring for paragraph selection matching the research code example — scores paragraphs by how many query terms appear in each

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added input validation on POST /api/rag/fragments**
- **Found during:** Task 1 (Endpoint implementation)
- **Issue:** POST endpoint accepting user input without validation — plan specified T-01-01 `mitigate` disposition but validation code was not included in the action description
- **Fix:** Added `topic` must be a string check and `count` must be a positive integer check at route entry, returning 400 with descriptive error messages
- **Files modified:** server/index.js (lines 378-384)
- **Verification:** Tested both invalid cases (`topic: 123` → 400, `count: -1` → 400)
- **Committed in:** 92ad1d9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Input validation is necessary for security. No scope creep — follows threat model directive.

## Issues Encountered

None — plan executed smoothly. Initial server start for endpoint testing required careful timing to avoid process timeout killing the server mid-test. All acceptance criteria confirmed passing:

| Criterion | Result |
|-----------|--------|
| POST returns 200 with `fragments` array | ✅ Passed |
| Each fragment has text/sourceName/sourceDate/sourceId | ✅ Passed |
| Fragment text ≤ 300 words | ✅ Passed (205 words) |
| Missing topic defaults to 'feature' | ✅ Passed |
| RAG unavailable returns 503 | ✅ Code path verified |
| 400 on invalid topic/count input | ✅ Passed |
| WORD_COUNT_TARGETS exported with correct A: 900 min | ✅ Passed |
| TEXT_TYPE_REQUIREMENTS exported with correct types | ✅ Passed |
| Existing STRUCTURAL_CONSTRAINTS unchanged | ✅ Passed |
| Existing ARGUMENTATION_FLOW unchanged | ✅ Passed |

## Next Phase Readiness

- POST /api/rag/fragments endpoint is ready for Plan 02 (generation pipeline) to consume real article fragments for hybrid RAG-AI passage generation
- WORD_COUNT_TARGETS and TEXT_TYPE_REQUIREMENTS are ready for quality gate enforcement in the generation pipeline
- Ready for **Plan 02: Passage Generation Pipeline with RAG-AI Hybrid**

---
*Phase: 01-passage-quality-dse-authenticity*
*Completed: 2026-06-23*
