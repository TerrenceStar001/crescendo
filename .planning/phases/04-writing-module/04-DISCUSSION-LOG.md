# Phase 4: Writing Module DSE Authenticity — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 4-Writing Module
**Areas discussed:** Prompt text types & format, Correction rubric depth, Error categorization & feedback detail, Exam environment UI, Prompt bank & session management

---

## Prompt Text Types & Format

| Option | Selected |
|--------|----------|
| Both Part A & B (full DSE format) | ✓ |
| Part B only | |
| Unified short/long option | |

**Notes:** Real DSE Paper 2 has Part A (short, compulsory) + Part B (long, choose from options). No B1/B2 split — that's Paper 1 only.

| Option | Selected |
|--------|----------|
| All 8 DSE types (article, letter, speech, report, story, blog, review, proposal) | ✓ |
| Core set only (4-5 types) | |

| Option | Selected |
|--------|----------|
| Curated bank + AI generation (hybrid) | ✓ |
| AI-only | |
| Curated bank only | |

| Option | Selected |
|--------|----------|
| Full DSE prompt card with context, instructions, requirements, word limit, type badge | ✓ |
| Keep current plain text | |

| Option | Selected |
|--------|----------|
| ~20 per text type | ✓ |
| 5-8 per text type | |
| Let the agent decide | |

| Option | Selected |
|--------|----------|
| Article & letter only (Part A) | |
| Any type, shorter | |
| Align with HKDSE — researcher to verify | ✓ |

| Option | Selected |
|--------|----------|
| Frontend JSON file (src/assets/) | ✓ |
| IndexedDB | |
| Let the agent decide | |

| Option | Selected |
|--------|----------|
| DSE-style: Part A + Part B (choose from options) | ✓ |
| Keep current easy/medium/hard | |

| Option | Selected |
|--------|----------|
| Single 2-hour timer | ✓ |
| Split timers | |
| Let the agent decide | |

| Option | Selected |
|--------|----------|
| Show all 8 options to pick from | |
| AI picks one | |
| Part B: Bank + AI gen for variety | ✓ |

| Option | Selected |
|--------|----------|
| Track used prompts in localStorage | ✓ |
| No tracking | |

| Option | Selected |
|--------|----------|
| All DSE-relevant topics | ✓ |
| Core 4 topics only | |

| Option | Selected |
|--------|----------|
| Detailed JSON structure with all metadata | ✓ |
| Let the agent decide | |

## Correction Rubric Depth

| Option | Selected |
|--------|----------|
| 3 categories with sub-scores | |
| Exact HKEAA rubric | ✓ |
| Keep current (Content/Org/Language /7) | |

**Notes:** Researcher MUST find official HKEAA Paper 2 marking scheme.

| Option | Selected |
|--------|----------|
| AI returns rubric scores (structured JSON) | ✓ |
| Let the agent decide | |

| Option | Selected |
|--------|----------|
| Use existing dseGrading.js | ✓ |
| AI returns DSE level | |

| Option | Selected |
|--------|----------|
| Type-adjusted rubric | ✓ |
| Single rubric for all | |

| Option | Selected |
|--------|----------|
| Scores + overall narrative summary | ✓ |
| Scores only | |

## Error Categorization & Feedback Detail

| Option | Selected |
|--------|----------|
| Categorized errors (grammar, vocab, structure, style, punctuation, spelling, content) | ✓ |
| Keep current freeform | |

| Option | Selected |
|--------|----------|
| Both errors and good language use | ✓ |
| Errors only | |

| Option | Selected |
|--------|----------|
| Line/paragraph references | ✓ |
| No line refs | |

| Option | Selected |
|--------|----------|
| CEFR levels on vocab suggestions | ✓ |
| No CEFR | |

| Option | Selected |
|--------|----------|
| DSE level labels on vocab upgrades | ✓ |
| No level labels | |

| Option | Selected |
|--------|----------|
| Error frequency chart by type | ✓ |
| List only | |

| Option | Selected |
|--------|----------|
| Section breakdown (intro, body, conclusion) | ✓ |
| Essay-level only | |

| Option | Selected |
|--------|----------|
| Re-submit & compare | ✓ |
| Single submission | |
| Let the agent decide | |

| Option | Selected |
|--------|----------|
| Severity levels (Critical/Major/Minor) | ✓ |
| No severity | |

| Option | Selected |
|--------|----------|
| Self-assessment before correction | ✓ |
| No self-assessment | |

| Option | Selected |
|--------|----------|
| Track across sessions | ✓ |
| Single session only | |

| Option | Selected |
|--------|----------|
| Direct highlights in essay text (color-coded) | ✓ |
| Click-to-scroll | |
| Both | |

| Option | Selected |
|--------|----------|
| Pitfalls avoided section | ✓ |
| No pitfalls section | |

## Exam Environment UI

| Option | Selected |
|--------|----------|
| DSE answer booklet editor (ruled lines, margins) | ✓ |
| Keep current contentEditable | |

| Option | Selected |
|--------|----------|
| Full DSE exam header | ✓ |
| Minimal header | |

| Option | Selected |
|--------|----------|
| None during writing (authentic DSE) | ✓ |
| Detailed word display | |
| Keep current counter | |

| Option | Selected |
|--------|----------|
| Exam-style HH:MM:SS with prom warnings | ✓ |
| Keep current timer | |

| Option | Selected |
|--------|----------|
| Sound alerts (configurable) | ✓ |
| Visual only | |

| Option | Selected |
|--------|----------|
| Full-screen distraction-free mode | ✓ |
| Regular mode | |

| Option | Selected |
|--------|----------|
| Responsive (desktop + tablet) | ✓ |
| Desktop only | |

## Prompt Bank & Session Management

| Option | Selected |
|--------|----------|
| Full session history with browseable essays | ✓ |
| No history | |

| Option | Selected |
|--------|----------|
| Auto-save every 30s with recovery | ✓ |
| Manual save | |
| No save during exam | |

| Option | Selected |
|--------|----------|
| IndexedDB (via useIndexedDB) | ✓ |
| localStorage | |

| Option | Selected |
|--------|----------|
| Side-by-side session comparison | ✓ |
| No comparison | |

## the agent's Discretion

- Exact Part B option count per session — researcher to verify from real DSE papers
- Part A specific text type distribution — researcher to verify
- Auto-save debounce timing
- Sound alert implementation approach
- Responsive breakpoint values (match existing Reading Module)
- CSS naming conventions for new `.writing__*` sections

## Deferred Ideas

None — discussion stayed within phase scope.
