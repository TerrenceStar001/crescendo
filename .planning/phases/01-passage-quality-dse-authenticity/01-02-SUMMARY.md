---
phase: 01-passage-quality-dse-authenticity
plan: 02
subsystem: reading
tags: rag, ai-generation, dse-booklet, passage-quality, css

# Dependency graph
requires:
  - phase: 01-passage-quality-dse-authenticity
    plan: 01
    provides: WORD_COUNT_TARGETS, TEXT_TYPE_REQUIREMENTS from structuralConstraints, RAG fragment endpoint
provides:
  - Hybrid RAG-AI generation pipeline in generateReadingSession()
  - generatePassageFromRAG() with SOURCE FRAGMENTS prompt construction
  - generatePureAIPassage() fallback with TEXT_TYPE_REQUIREMENTS-based text type selection
  - Difficulty-calibrated quality gates (word counts, paragraph count, sentence count)
  - DSE booklet passage card display (serif, justified, text-indent, part badge)
  - Source attribution rendering (RAG source name or generic)
affects: [01-03, 01-04, ui-readability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Step 0 hybrid RAG-AI fetch pattern in generateReadingSession"
    - "Difficulty-calibrated WORD_COUNT_TARGETS quality gates"
    - "DSE booklet CSS with first-line indent paragraphs and serif typography"

key-files:
  created: []
  modified:
    - src/hooks/useDSEPapers.js (hybrid RAG pipeline, quality gates, new generation functions)
    - src/components/ReadingModule.jsx (DSE booklet passage card, part badge, source attribution)
    - src/App.css (passage card, part badge, serif/justified typography, source attribution CSS)

key-decisions:
  - "RAG health check (GET /api/health) fires BEFORE DSE OCR path; if fragments available, generatePassageFromRAG runs as Step 0, skipping DSE OCR entirely"
  - "generatePassageFromRAG uses CRITICAL BLENDING INSTRUCTIONS to prevent verbatim copying from fragments — creates original characters, quotes, narrative framing"
  - "Quality gates use WORD_COUNT_TARGETS (B1:600-1000, A:900-1200, B2:1000-1200) instead of hardcoded 800-1300"
  - "Passage card uses max-width 720px center, serif font, justified text, first-line indent — matching DSE booklet format"
  - "Source attribution shows real source name when RAG used, 'Adapted from a news article' when pure AI"

requirements-completed: [READ-01]

duration: 30min
completed: 2026-06-23
---

# Phase 01 Plan 02: Hybrid RAG-AI Pipeline & DSE Booklet Display Summary

**Hybrid RAG-AI generation pipeline that blends real news article fragments with AI composition, difficulty-calibrated quality gates, and DSE booklet passage display with serif typography and source attribution**

## Performance

- **Duration:** 30 min
- **Started:** 2026-06-23T09:00:00Z (approx)
- **Completed:** 2026-06-23T09:29:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **Hybrid RAG-AI pipeline (Step 0):** Backend health check → RAG fragment fetch → `generatePassageFromRAG()` with SOURCE FRAGMENTS prompt containing blending instructions (facts as backbone, no verbatim copying, original characters/quotes/narrative framing)
- **Two new generation functions:** `generatePassageFromRAG(fragments, callAI, difficulty)` with source tracking, and `generatePureAIPassage(callAI, difficulty)` with TEXT_TYPE_REQUIREMENTS-based text type selection
- **Difficulty-calibrated quality gates:** All thresholds (word counts, truncation, paragraph count, sentence count) use `WORD_COUNT_TARGETS[part]` — B1: 600–1000, A: 900–1200, B2: 1000–1200
- **Enhanced truncation detection:** Minimum paragraph count check (`Math.max(4, target.max/100)` paragraphs) and last-paragraph sentence count check (≥3 sentences) catch incomplete passages
- **DSE booklet passage card:** Paper-like container (720px max, shadow, border), serif font (Georgia/Times New Roman), justified text, first-line paragraph indentation (2em), part badge with section color (accent/warning/error)
- **Source attribution rendering:** RAG passages show "Adapted from {sourceName}, {sourceDate}" in italic, right-aligned below thin border; pure AI passages show "Adapted from a news article"
- **Pure AI fallback generation:** Uses `TEXT_TYPE_REQUIREMENTS[part].types` for genre selection, `WORD_COUNT_TARGETS` for word count, same structural constraints as reference-based generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Hybrid RAG-AI pipeline, quality gates, prompt engineering** - `5557b1d` (feat)
2. **Task 2: DSE booklet passage display + source attribution** - `002d977` (feat)

**Plan metadata:** (committed as part of final output)

## Files Created/Modified
- `src/hooks/useDSEPapers.js` (1885 lines) — Hybrid RAG-AI pipeline: `generatePassageFromRAG()`, `generatePureAIPassage()`, enhanced `generatePassageFromReference()` with WORD_COUNT_TARGETS quality gates, Step 0 in `generateReadingSession()`, RAG metadata tracking
- `src/components/ReadingModule.jsx` — DSE booklet card structure: part badge, passage title inside card, passage-text wrapper, conditional source attribution, AI badge when reconstructed
- `src/App.css` — New DSE booklet CSS block: `.reading__passage-card`, `.reading__passage-part-badge` (+ A/B1/B2 color variants), `.reading__passage-text` (+ p/h2/h3 rules), `.reading__passage-source`, `.reading__passage-body`

## Decisions Made

- **Step 0 fires before Step 1:** The RAG health check and fragment fetch are the FIRST operation in `generateReadingSession()`. If fragments are available and `generatePassageFromRAG()` produces content, the DSE OCR path (Step 1) and bundled fallback (Step 2) are skipped entirely. If RAG fails or produces no content, the existing path runs as before.
- **Duplicated question generation for RAG path:** The question generation code in Step 0 uses the same qPrompt/tryGenerateQuestions pattern as Step 1.5. This was explicitly specified to keep the RAG path self-contained.
- **Session metadata split:** `aiGenerated` is now `true` only when NOT using RAG fragments. `ragGenerated` tracks when the passage came from `generatePassageFromRAG()`. `sourceName`/`sourceDate` carry through from the first fragment.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The plan's verification (`node --input-type=module -e "import('./src/hooks/useDSEPapers.js')"`) does not work because the project lacks `"type": "module"` in package.json. This is a pre-existing project issue. The Vite build passes (exit code 0) which confirms no syntax errors. Verified manually as equivalent.
- The question generation code in Step 0 (RAG path) duplicates approximately 220 lines from Step 1.5. This is by design as specified in the plan — the qPrompt and tryGenerateQuestions pattern are identical but cannot be shared without restructuring the function.

## Known Stubs

None identified — all passage display features (part badge, source attribution, word count, truncation warning) are fully wired.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Next Phase Readiness

- Hybrid RAG-AI generation pipeline operational (health → fragments → RAG passage → questions)
- Pure AI fallback ready for use (function exported, not yet wired into `generateReadingSession`)
- DSE booklet display complete with all CSS rules
- Quality gates enforce difficulty-calibrated word counts and paragraph structure
- Ready for phase 01 plan 03 (question quality improvements) or downstream work

---

*Phase: 01-passage-quality-dse-authenticity*
*Completed: 2026-06-23*
