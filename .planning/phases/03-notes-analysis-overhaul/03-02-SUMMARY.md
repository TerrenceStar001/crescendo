---
phase: 03-notes-analysis-overhaul
plan: 02
type: execute
subsystem: reading
tags: [error-pattern-analysis, drill-generation, ai-validation]
requires: [03-01]
provides: [ErrorPatternAnalysis.jsx, DrillGenerator.jsx, drillGenerator.js]
affects: [ReadingResults.jsx (03-03)]
tech-stack:
  added: []
  patterns:
    - 'State machine pattern (idle→generating→ready→answering→answered→failed)'
    - 'AI call wrapper with JSON parsing + markdown fence stripping'
    - 'validateQuestions() as validation gate for AI output (per T-03-02-01)'
key-files:
  created:
    - src/utils/drillGenerator.js
    - src/components/ErrorPatternAnalysis.jsx
    - src/components/DrillGenerator.jsx
  modified: []
decisions: []
metrics:
  duration: ~10m
  completed: 2026-06-24
commits:
  - dabe445: feat(03-02): create drillGenerator.js utility
  - f2cdacb: feat(03-02): create ErrorPatternAnalysis component
  - 7657a4c: feat(03-02): create DrillGenerator component
---

# Phase 3 Plan 02: Error Pattern & Drill Generator Summary

## One-liner

Error pattern display component (ErrorPatternAnalysis) and AI-powered targeted drill generation system (drillGenerator.js + DrillGenerator.jsx) that consume the error analysis utility from Plan 03-01.

## Files Created

### `src/utils/drillGenerator.js` — Drill prompt builder and AI generation wrapper

Named exports: `buildDrillPrompt`, `generateDrills`.

- `buildDrillPrompt()`: Takes passage preview, weak type slugs, part, and mistake context → builds a `typeDist` limited to weak types (equal distribution) → calls `composeFullPrompt()` for base structure → strips the DSE examiner framing via regex → prepends a custom drill tutor header with mistake summary → returns complete focused AI prompt
- `generateDrills()`: Calls `buildDrillPrompt()`, then `callAI()` with `temperature: 0.7, maxTokens: 2000, timeout: 30000` → parses JSON with markdown code fence stripping → validates with `validateQuestions()` → returns `parsed.slice(0, 3)` on success or `null` on failure
- Implements T-03-02-01 mitigation: output validated before display
- No console logging on failure (silent try/catch → null return)

### `src/components/ErrorPatternAnalysis.jsx` — Error breakdown panel component

Props: `{ questions, answers, sections?, part? }`

Computed via `useMemo`:
- `analyzeBySkill(questions, answers)` → skill breakdown bars
- `analyzeByType(questions, answers)` → question type breakdown bars
- `identifyWeakAreas(bySkill, byType)` → weak area identification

Renders 3 cards:
1. **Skill breakdown card** — sorted weakest-first, color-coded bars (green ≥80%, amber ≥60%, red <60%)
2. **Question type breakdown card** — same bar pattern
3. **Weak areas card** — severity badge (Critical/Needs Work), area name, percentage, recommendation text

Empty states: returns `null` if no questions; "No weak areas identified" when all ≥60%.
No CSS added — all BEM classes (`error-pattern__*`) for Plan 03-03.

### `src/components/DrillGenerator.jsx` — Targeted drill generation with state machine

Props: `{ passagePreview, weakTypes, part, mistakesContext, callAI }`

6-state machine:
| State | Display |
|-------|---------|
| `idle` | CTA card: "Review your mistakes..." + [Generate Targeted Practice] button |
| `generating` | "⏳ Generating targeted practice questions..." loading text |
| `ready` | 2-3 QuestionRenderer instances |
| `answering` | Per-drill inline answering via QuestionRenderer |
| `answered` | Results shown + [Try Again] button |
| `failed` | Error message + [Try Again] button |

- Guard: returns `null` if `callAI` is not provided
- Guard: shows alternate text if `weakTypes` is empty
- Reuses `QuestionRenderer` for inline drill display
- `handleGenerate` uses `useCallback` with proper dependency array
- Per T-03-02-02: AI call timeout handled, failed UI on error
- Per T-03-02-03: only mistake context (no PII) passed to AI

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. All new code is frontend-only (React components + pure JS utility).

## Self-Check: PASSED

- `src/utils/drillGenerator.js` — exists (4060 bytes, 94 lines)
- `src/components/ErrorPatternAnalysis.jsx` — exists (4050 bytes, 103 lines)
- `src/components/DrillGenerator.jsx` — exists (4937 bytes, 140 lines)
- Commits verified: `dabe445`, `f2cdacb`, `7657a4c` all in git log
- `npm run build` passes cleanly (no errors, no warnings beyond chunk size advisory)
- All imports resolve: `questionGenerator`, `questionValidator`, `errorPatternAnalysis`, `QuestionRenderer`
