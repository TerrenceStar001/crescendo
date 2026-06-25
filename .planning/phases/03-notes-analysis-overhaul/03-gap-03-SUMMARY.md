---
phase: 03-notes-analysis-overhaul
plan: gap-03
type: execute
subsystem: drill-generator
tags: [drill-generation, gap-closure]
requires: []
provides: [robust-drill-prompt]
affects: [src/utils/drillGenerator.js]
key-files:
  modified:
    - path: src/utils/drillGenerator.js
      scope: "Full rewrite of buildDrillPrompt and generateDrills — 57 insertions, 54 deletions"
metrics:
  duration: ~10m
  completed_at: "2026-06-25"
---

# Gap Closure 03: Fix Drill Generation — Summary

## Completed Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Fix buildDrillPrompt | `5ba2a49` |
| 2 | Fix generateDrills error handling | `5ba2a49` |

## What Was Fixed

Root cause: Three failure points in the drill generation pipeline — (1) regex-based passage stripping could miss, (2) `weakTypes` contained skill slugs instead of question type slugs, (3) `validateQuestions` was too strict for 3-question drills.

**Task 1 — buildDrillPrompt:**
- Replaced unanchored regex with `lastIndexOf('PASSAGE:')` for robust passage extraction
- Added `VALID_DRILL_TYPES` filter — only question type slugs (mcq, gap-fill, etc.) passed to the prompt, not skill slugs (inference, detail)
- Empty passagePreview returns null immediately
- Prompt explicitly specifies JSON format with exact field names

**Task 2 — generateDrills:**
- Empty/whitespace-only AI responses caught before parsing
- `parseJSONResponse` rewritten with JSON array extraction regex + fallthrough
- Replaced `validateQuestions` call with per-question structural validation (no TFNG/type diversity requirements)
- Increased timeout from 30s to 45s
- Added dev-only debug logging for AI response length

## Verification
- ✅ All 6 automated checks pass
- ✅ Build passes cleanly
- ✅ Gap 6 closed: drill generation now reliably produces 2-3 questions
