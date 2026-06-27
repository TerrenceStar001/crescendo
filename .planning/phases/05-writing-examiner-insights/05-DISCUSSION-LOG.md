# Phase 5: Writing Examiner Insights - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 5-writing-examiner-insights
**Areas discussed:** Descriptor encoding, Format conventions, Component extraction, Memorised phrases

---

## Descriptor Encoding

| Option | Description | Selected |
|--------|-------------|----------|
| JS constants + dynamic prompt (Recommended) | Create hkeaaWritingRubrics.js as structured JS. AI prompt references descriptors dynamically. Clean, testable, single source of truth. | ✓ |
| Keep prompt-only | Descriptors stay in AI prompt text only. Less code, harder to maintain, impossible to test independently. | |
| JS constants + static prompt | JS file as reference docs only. Descriptors live in two places — risk of drift. | |

**User's choice:** JS constants + dynamic prompt

> Follow-up question dismissed (user wanted freeform input):
> Asked about how prompt should reference descriptors (inject full text / inject relevant bands / keep prompt as-is).
> User clarified: Inject full descriptor text dynamically.

---

## Format Conventions

| Option | Description | Selected |
|--------|-------------|----------|
| Both: code + prompt (Recommended) | Create formatConventions.js with structured rules per text type. Update prompt to reference rules. Deterministic checks + nuanced AI evaluation. | ✓ |
| Refine prompt only | Just improve existing prompt with more precise format rules. Less code, relies fully on AI. | |
| Code-only validation | Build code-based format checker. Deterministic but can't handle register nuance. | |

**User's choice:** Both code + prompt

> Follow-up: What should code validate?
> Selected: Structural elements only (salutation, closing, signature, headings). AI handles register, tone, appropriateness.

---

## Component Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Extract all three (Recommended) | Create RubricDisplay.jsx, ErrorAnnotation.jsx, FormatChecker.jsx. Cleaner separation, WritingModule drops ~400 lines. | ✓ |
| Only FormatChecker | Existing rubric/annotation display adequate inline. Only new FormatChecker. | |
| Keep all inline | No refactoring. WritingModule continues growing. | |

**User's choice:** Extract all three

> Follow-up: Where should components live?
> Selected: Flat in src/components/ (existing convention, no subdirectory).

---

## Memorised Phrases

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt-based detection (Recommended) | Add scoring dimension to AI prompt. Cap Content at 5/7 if essay reads like template. No new code. | ✓ |
| Code-based pattern matching | Build utility with patterns for common DSE clichés. Runs alongside AI correction. | |
| Both: AI detects + code validates | AI flags suspicious phrases, code cross-references with pattern list. Most robust but most work. | |
| Defer to future phase | Existing Content scoring already penalises generic writing implicitly. | |

**User's choice:** Prompt-based detection

---

## the agent's Discretion

- Exact file structure and exports for hkeaaWritingRubrics.js and formatConventions.js
- CSS naming for new components
- Prompt wording for memorised phrase detection
- Threshold for "over-reliance on memorised phrases" Content score cap

## Deferred Ideas

None — discussion stayed within phase scope.
