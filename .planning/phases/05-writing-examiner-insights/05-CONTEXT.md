# Phase 5: Writing Examiner Insights - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Overhaul the AI correction pipeline to use an **IELTS-first scoring approach** (LLMs are more accurate at IELTS band scoring) with automatic conversion to HKEAA Content/Organisation/Language scores and DSE levels. Also encode HKEAA level descriptors as structured code, add per-text-type format convention checking, extract modular correction sub-components, and add memorised phrase detection.

**Scope:** Correction prompt redesign, IELTS→HKEAA conversion table, format convention utilities, sub-component extraction, prompt refinements for memorised phrases. No new features or modules beyond what Phase 4 established.

**Not in scope:** Displaying IELTS scores to the user, overhauling the WritingModule state machine, changing the Part A/B submission workflow.

</domain>

<decisions>
## Implementation Decisions

### Scoring Pipeline (IELTS-First Approach)

- **D-01:** The AI correction prompt uses IELTS Writing band descriptors as the primary scoring rubric: Task Achievement (TA), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA) — each scored 0-9 with 0.5 increments. LLMs produce more accurate scores in IELTS format than in direct HKEAA scoring.
- **D-02:** After `parseCorrectionResponse` extracts IELTS band scores, a calibration function converts IELTS TA → HKEAA Content (0-7), CC → HKEAA Organisation (0-7), and (LR + GRA avg) → HKEAA Language (0-7) via a mapping table.
- **D-03:** Create `src/utils/ieltsToDseMap.js` — calibrated IELTS→HKEAA conversion mapping table derived from HKEAA level descriptors and examiner report data. Configurable via Settings → DSE tab (same pattern as existing DSE boundaries).
- **D-04:** Only HKEAA Content/Organisation/Language scores and overall DSE level are displayed to the user. IELTS scores are internal only — never shown in the UI.
- **D-05:** `combineCorrections` computes overall DSE level from the converted HKEAA scores using the existing `dseGrading.js` path, but is informed by the IELTS→HKEAA mapping.

### HKEAA Level Descriptor Encoding

- **D-06:** Create `src/utils/hkeaaWritingRubrics.js` — structured JS constants encoding all 7 bands for Content, Organisation, and Language per HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf). Each band gets exact descriptor text as a string constant.
- **D-07:** The JS constants serve as source data for designing the IELTS→HKEAA conversion table, NOT for direct prompt injection. The prompt uses IELTS descriptors (D-01), not HKEAA descriptors.
- **D-08:** hkeaaWritingRubrics.js also serves as structured reference for potential future UI (e.g., "What does a Content score of 5 mean?" tooltips).

### Part A Format Conventions

- **D-09:** Create `src/utils/formatConventions.js` — structured per-text-type format rules (letter, email, proposal, speech as primary Part A types; article, report, blog as secondary). Each entry defines required structural elements, expected register, and common errors.
- **D-10:** Code-based validation checks structural elements only: presence of salutation, closing, signature, subject line, headings, etc. (Deterministic checks.)
- **D-11:** AI evaluation handles register, tone, and appropriateness of format elements. The code results and AI evaluation are combined in the correction output.
- **D-12:** The existing `checkPartAFormat` in `useDSEPapers.js` is replaced/consolidated with the new utility.

### Component Extraction

- **D-13:** Extract three new sub-components from the inline `WritingModule.jsx` correction display:
  - `src/components/RubricDisplay.jsx` — Content/Organisation/Language score cards with descriptor-level breakdown
  - `src/components/ErrorAnnotation.jsx` — Inline error annotations (extracted from existing inline annotation logic)
  - `src/components/FormatChecker.jsx` — Format validation results display (new, for the format conventions module)
- **D-14:** All components live flat in `src/components/` (no subdirectory), consistent with existing codebase convention.
- **D-15:** This reduces `WritingModule.jsx` by approximately 400 lines. The module imports these components rather than rendering everything inline.

### Memorised Phrase Detection

- **D-16:** Add a detection directive to the IELTS-based correction prompt instructing the model to flag over-reliance on memorised/template phrases. No code-based pattern matching.
- **D-17:** Implementation: add to the prompt a directive like "If the essay reads like a standardised template with generic fill-in-the-blank content, cap Task Achievement at 5/9. Flag specific memorised phrases in errors/warnings." Exact wording refined during planning.

### the agent's Discretion

- Exact IELTS→HKEAA conversion mapping values (to be derived from research data)
- File structure and exports for `hkeaaWritingRubrics.js`, `formatConventions.js`, `ieltsToDseMap.js` — follow existing utility patterns
- CSS naming for new components — follow existing `.writing__*` BEM pattern in App.css
- Prompt wording for memorised phrase detection
- Whether `parseCorrectionResponse` also extracts format check results from the AI's output

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

### HKEAA & IELTS Source Documents (cited in research)
- HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf, 25/11/2014) — Official marking criteria for Content/Organisation/Language 0-7
- HKEAA Briefing Session PowerPoint Presentations (2021-2025) — Examiner commentary on common weaknesses
- IELTS Writing Task 2 band descriptors (public) — Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy, each 0-9

### Upstream Phase References
- `.planning/phases/05-writing-examiner-insights/05-RESEARCH.md` — HKEAA format conventions, pitfalls, architecture recommendations
- `.planning/ROADMAP.md` §Phase 5 — Original IELTS-first phase goal, success criteria, existing plan structure
- `.planning/REQUIREMENTS.md` — WRITE-02 (AI correction quality)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useDSEPapers.js` — `buildCorrectionPrompt` is the primary integration point. Currently has HKEAA-style scoring in the prompt text. Phase 5 replaces this with IELTS-band prompt + conversion back to HKEAA scores. Also contains `parseCorrectionResponse` and `combineCorrections`.
- `src/components/WritingModule.jsx` — Existing inline correction display includes: rubric scores, error list, good language, vocab suggestions, pitfalls, inline annotations, section breakdown, error frequency chart. These are the extraction targets.
- `src/utils/structuralConstraints.js` — Existing DSE structural rules file. `formatConventions.js` and `ieltsToDseMap.js` follow the same pattern.
- `src/utils/dseGrading.js` — Existing `scoreToDseLevel()`, `getStoredBoundaries()`, `storeBoundaries()`. The IELTS→DSE conversion uses the same configurable-boundaries pattern.

### Established Patterns
- **Utility-as-constants**: Project uses this pattern (e.g., `structuralConstraints.js` with `WORD_COUNT_TARGETS`, `GENRE_TEMPLATES`). `hkeaaWritingRubrics.js`, `formatConventions.js`, `ieltsToDseMap.js` follow the same approach.
- **Prompt-as-function**: `buildCorrectionPrompt` is a `useCallback` returning a template string. Phase 5 rewrites this with IELTS band descriptors and conversion logic.
- **Silent parsing**: `parseCorrectionResponse` uses try/catch with regex fallback for malformed JSON. New IELTS band fields must follow the same robustness pattern.
- **Configurable mapping**: `dseGrading.js` already has `getStoredBoundaries()`/`storeBoundaries()` for DSE grade thresholds. The IELTS→HKEAA conversion table follows the same `getIeltsToDseMap()`/`storeIeltsToDseMap()` pattern.
- **Component extraction pattern**: Prior phases extracted `ReadingResults.jsx` from `ReadingModule.jsx` (Phase 3). Same pattern for WritingModule → RubricDisplay/ErrorAnnotation/FormatChecker.

### Integration Points
- `useDSEPapers.js:buildCorrectionPrompt` — Rewrite to use IELTS band descriptors (TA/CC/LR/GRA 0-9) as the primary prompt
- `useDSEPapers.js:parseCorrectionResponse` — Extract IELTS band scores alongside existing error/annotation fields; convert to HKEAA scores
- `useDSEPapers.js:combineCorrections` — Use converted HKEAA scores for combined scoring and DSE level
- `src/utils/dseGrading.js` — Add `getIeltsToDseMap()`/`storeIeltsToDseMap()` for the conversion table
- `WritingModule.jsx` — Import and render RubricDisplay, ErrorAnnotation, FormatChecker components
- `WritingModule.jsx` — Submit/correction state machine unchanged (D-38 from Phase 4: separate correction per part)

### Risks
- IELTS→HKEAA conversion accuracy depends on the calibration data. Conversion must be validated against real DSE candidate scripts (success criterion 5 from ROADMAP).
- The free AI model (opencode/deepseek-v4-flash-free) may produce less accurate IELTS band scores than premium models. Consider if conversion-based approach actually improves scoring over direct HKEAA prompting.

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
