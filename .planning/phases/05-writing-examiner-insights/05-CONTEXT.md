# Phase 5: Writing Examiner Insights - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Inject HKEAA examiner insights into the existing AI correction pipeline (built in Phase 4) to produce more authentic, rubric-grounded feedback. This phase encodes HKEAA level descriptors as structured code, adds per-text-type format convention checking, extracts modular correction sub-components, and enhances the AI prompt with memorised phrase detection.

**Scope:** Correction pipeline improvements only (prompt engineering, utility modules, sub-component extraction, prompt refinements). No new features or modules beyond what Phase 4 established.

**Not in scope:** Adding new exam types (IELTS, TOEFL), overhauling the WritingModule state machine, changing the Part A/B submission workflow.

</domain>

<decisions>
## Implementation Decisions

### HKEAA Level Descriptor Encoding

- **D-01:** Create `src/utils/hkeaaWritingRubrics.js` — structured JS constants encoding all 7 bands for Content, Organisation, and Language per HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf). Each band gets exact descriptor text as a string constant.
- **D-02:** The AI correction prompt (`buildCorrectionPrompt` in `useDSEPapers.js`) dynamically injects the full descriptor text for all 7 bands of each dimension. No summarising or band-selection logic — the model sees the complete HKEAA rubric for its scoring decision.
- **D-03:** The JS constants serve as the single source of truth. Prompt text is generated programmatically from the constants, not maintained separately. Any future descriptor updates happen in the JS file only.

### Part A Format Conventions

- **D-04:** Create `src/utils/formatConventions.js` — structured per-text-type format rules (letter, email, proposal, speech as primary Part A types; article, report, blog as secondary). Each entry defines required structural elements, expected register, and common errors.
- **D-05:** Code-based validation checks structural elements only: presence of salutation, closing, signature, subject line, headings, etc. (Deterministic checks.)
- **D-06:** AI evaluation handles register, tone, and appropriateness of format elements. The code results and AI evaluation are combined in the correction output.
- **D-07:** The existing `checkPartAFormat` in `useDSEPapers.js` is replaced/consolidated with the new utility.

### Component Extraction

- **D-08:** Extract three new sub-components from the inline `WritingModule.jsx` correction display:
  - `src/components/RubricDisplay.jsx` — Content/Organisation/Language score cards with descriptor-level breakdown
  - `src/components/ErrorAnnotation.jsx` — Inline error annotations (extracted from existing inline annotation logic)
  - `src/components/FormatChecker.jsx` — Format validation results display (new, for the format conventions module)
- **D-09:** All components live flat in `src/components/` (no subdirectory), consistent with existing codebase convention.
- **D-10:** This reduces `WritingModule.jsx` by approximately 400 lines. The module imports these components rather than rendering everything inline.

### Memorised Phrase Detection

- **D-11:** Add a new scoring dimension to the AI correction prompt instructing the model to detect and penalise over-reliance on memorised/template phrases. No code-based pattern matching.
- **D-12:** Implementation: add to the prompt a directive like "If the essay reads like a standardised template with generic fill-in-the-blank content, cap Content at 5/7. Flag specific memorised phrases in errors/warnings." Exact wording refined during planning.

### Planning Resolved Decisions

- **D-13:** Existing plans (05-01-PLAN.md, 05-02-PLAN.md, 05-03-PLAN.md) propose IELTS band integration — this conflicts with the HKEAA-examiner-insight direction confirmed by this discussion. These plans MUST be rewritten during `/gsd-plan-phase` to align with the decisions above.

### the agent's Discretion

- Exact file structure and exports for `hkeaaWritingRubrics.js` and `formatConventions.js` — follow existing utility patterns (named exports, pure functions/constants)
- CSS naming for new components — follow existing `.writing__*` BEM pattern in App.css
- Prompt wording for memorised phrase detection — to be refined during planning based on what produces reliable results
- Threshold for "over-reliance on memorised phrases" — agent to determine appropriate Content score cap (discussed: 5/7 max but can adjust)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research & Requirements
- `.planning/phases/05-writing-examiner-insights/05-RESEARCH.md` — Full research output: HKEAA level descriptors, format conventions, common pitfalls, architecture recommendations
- `.planning/REQUIREMENTS.md` — Phase 5 maps to WRITE-02 (AI correction quality), WRITE-03 (error analysis depth)

### Existing Code (primary targets)
- `src/hooks/useDSEPapers.js` — Contains `buildCorrectionPrompt` (lines 1749-1891), `parseCorrectionResponse` (lines 1893-1916), `combineCorrections` (lines 2067-2103), `checkPartAFormat`, `detectTextType` — all targets for refinement
- `src/components/WritingModule.jsx` — Correction display inline (~1400 lines total) — target for sub-component extraction
- `src/App.css` — All styling, `.writing__*` sections from Phase 4 overhaul
- `src/utils/dseGrading.js` — DSE level calculation, reused for writing scores

### Reference Patterns (from prior phases)
- `.planning/phases/04-writing-module/04-CONTEXT.md` — Phase 4 context: D-11 (HKEAA rubric research), D-14 (type-adjusted rubric), D-16 (error categories), D-38 (separate correction per part)
- `src/components/ReadingModule.jsx` — Phase state machine pattern (reference for WritingModule structure)
- `src/components/ReadingResults.jsx` — Results composition pattern (reference for new sub-components)
- `src/assets/bundled-content.json` — JSON data pattern (reference for format conventions data structure)

### HKEAA Source Documents (cited in research)
- HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf, 25/11/2014) — Official marking criteria for Content/Organisation/Language 0-7
- HKEAA Briefing Session PowerPoint Presentations (2021-2025) — Examiner commentary on common weaknesses

### Existing Plans (to rewrite)
- `.planning/phases/05-writing-examiner-insights/05-01-PLAN.md` — Existing plan (IELTS focus) — will be replaced
- `.planning/phases/05-writing-examiner-insights/05-02-PLAN.md` — Existing plan (IELTS→DSE conversion) — will be replaced
- `.planning/phases/05-writing-examiner-insights/05-03-PLAN.md` — Existing plan (IELTS display) — will be replaced

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useDSEPapers.js` — `buildCorrectionPrompt` is the primary integration point. Already has HKEAA-style scoring in the prompt text. Phase 5 refines this prompt and extracts structured descriptors into a standalone utility.
- `src/components/WritingModule.jsx` — Existing inline correction display includes: rubric scores, error list, good language, vocab suggestions, pitfalls, inline annotations, section breakdown, error frequency chart. These are the extraction targets.
- `src/utils/structuralConstraints.js` — Existing DSE structural rules file. `formatConventions.js` follows the same pattern.
- `src/utils/dseGrading.js` — `scoreToDseLevel()` used for writing score→level mapping. No changes needed unless scoring logic changes.

### Established Patterns
- **Utility-as-constants**: Project already uses this pattern (e.g., `structuralConstraints.js` with `WORD_COUNT_TARGETS`, `GENRE_TEMPLATES`). `hkeaaWritingRubrics.js` and `formatConventions.js` follow the same approach.
- **Prompt-as-function**: `buildCorrectionPrompt` is a `useCallback` that returns a template string. Phase 5 will make this dynamically inject descriptor constants.
- **Silent parsing**: `parseCorrectionResponse` uses try/catch with regex fallback for malformed JSON. New format validation output should follow the same robustness pattern.
- **Component extraction pattern**: Prior phases extracted `ReadingResults.jsx` from `ReadingModule.jsx` (Phase 3). Same pattern for WritingModule → RubricDisplay/ErrorAnnotation/FormatChecker.

### Integration Points
- `useDSEPapers.js:buildCorrectionPrompt` — Import `hkeaaWritingRubrics.js` constants, inject into prompt text
- `useDSEPapers.js:parseCorrectionResponse` — May need to parse additional output fields (format validation results, memorised phrase flags)
- `WritingModule.jsx` — Import and render RubricDisplay, ErrorAnnotation, FormatChecker components
- `WritingModule.jsx` — Submit/correction state machine unchanged (D-38 from Phase 4: separate correction per part)

### Risks
- Existing 05-*.PLAN.md files propose IELTS band integration, which conflicts with the HKEAA examiner insight direction. Plans must be rewritten.
- The free AI model (opencode/deepseek-v4-flash-free) may not reliably follow nuanced descriptor-level scoring. Consider whether prompt refinements will actually produce better results within model constraints.

</code_context>

<specifics>
## Specific Ideas

- The `hkeaaWritingRubrics.js` constants should be structured so they can be used BOTH for prompt injection AND for potential future UI reference (e.g., showing "What does Score 5 mean?" tooltips).
- Format convention results should be displayed as a checklist in the correction output (e.g., "✓ Salutation present, ✓ Closing formula present, ✗ Signature missing").
- The three new components should follow the same import/export pattern as `SkillRing.jsx` or `ErrorPatternAnalysis.jsx`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Writing Examiner Insights*
*Context gathered: 2026-06-27*
