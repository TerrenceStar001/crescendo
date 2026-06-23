# Phase 1: Passage Quality & DSE Authenticity — Context

**Gathered:** 2026-06-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make AI-generated reading passages indistinguishable from real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity. This phase covers the passage generation pipeline only — question quality and answer checking are Phase 2, notes/analysis/UI are Phase 3.

**Requirement:** READ-01 — Passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity.

**Success Criteria (from ROADMAP.md):**
1. Passages use diverse text types matching real DSE (news, feature, opinion, literary, informational)
2. Each part (A/B1/B2) has word count and difficulty calibrated to HKEAA standards
3. AI-generated passages pass truncation/quality checks at >95% rate
4. Passage display formatting matches DSE booklet layout conventions
5. User can identify at most 2 out of 10 passages as AI-generated vs real DSE

</domain>

<decisions>
## Implementation Decisions

### Source Strategy

- **D-01:** Hybrid approach — RAG from real news articles when the backend server is available, pure AI generation as fallback when offline. The backend's existing SCMP/Young Post crawlers and RAG engine feed real article content into the generation pipeline when running. The frontend detects backend availability and switches strategies transparently.
- **D-02:** RAG content is used as "passage fragments" — real quotes, data points, statistics, and excerpts are blended into AI-generated passage text. The AI writes the passage around these fragments, making them feel authentic while remaining original composition.
- **D-03:** Offline fallback is the existing pure AI pipeline (improved prompts/validation), not bundled content fallback. Bundled content remains as-is for complete offline scenarios.
- **D-04:** Source attribution is included on passages — cite the real RAG source when used (e.g., "Adapted from South China Morning Post, March 2024"), or a generic attribution ("Adapted from a news article") when using pure AI generation.

### the agent's Discretion

- Exact RAG retrieval strategy (similarity threshold, number of fragments to inject, fragment length) — to be determined during research/planning based on what produces the best passages.
- Prompt engineering for the hybrid pipeline — researcher should investigate best practices for RAG-enhanced generation prompts.
- Quality gate specifics (metrics, thresholds, retry logic) — researcher should recommend based on what's feasible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, phase boundary
- `.planning/REQUIREMENTS.md` — READ-01 requirement definition
- `.planning/PROJECT.md` §Context, §Key Decisions — Research findings (HKDSE Paper 1 structure, text types, difficulty calibration data)

### Codebase (key files for this phase)
- `src/hooks/useDSEPapers.js` — AI generation pipeline (primary target for changes)
- `src/hooks/useAI.js` — AI endpoint management and proxy configuration
- `server/rag/engine.js` — RAG engine: vectorStore, search, generate-reading
- `server/rag/vectorStore.js` — Cosine similarity + TF-IDF fallback for content retrieval
- `server/crawlers/scmp.js` — SCMP RSS scraper (news source for RAG)
- `server/crawlers/youthPost.js` — Young Post scraper (student-level content for RAG)
- `src/components/ReadingModule.jsx` — Passage display and user interaction
- `src/assets/bundled-content.json` — 5 offline bundled passages (fallback)
- `src/utils/structuralConstraints.js` — DSE passage writing rules

### Research Sources (cited in PROJECT.md)
- HKEAA official documents (Paper 1 structure)
- Pearson annual analyses 2020-2024 (question type distribution)
- HKEAA examiner reports (common student errors, marking guidelines)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useDSEPapers.js` — The full paper generation pipeline including passage creation, question generation, and validation. This is where the hybrid RAG+AI pipeline will be integrated. Already has retry logic and quality warnings.
- `server/rag/engine.js` — RAGEngine with `search(query)` and `generateReading(topic, difficulty, requirements)` methods. Can be called from the frontend via `/api/rag/*` proxy.
- `server/crawlers/` — SCMP, Young Post crawlers that populate the backend's SQLite database with articles. Already running as background jobs.
- `src/assets/bundled-content.json` — 5 existing passages that can serve as test fixtures.
- `src/utils/structuralConstraints.js` — Contains DSE passage writing rules (word counts, section format, etc.).

### Established Patterns
- **AI generation via callAI**: All AI calls go through `useAI.js`'s `callAI` function, which handles endpoint normalization, auth, timeouts, and error handling. The RAG-enhanced pipeline should follow the same pattern.
- **Silent fallback**: The codebase extensively uses try/catch with silent fallbacks. The hybrid strategy (RAG → pure AI fallback) follows this pattern naturally.
- **Internal phase state machine**: ReadingModule manages its own phases (`start` → `difficulty-select` → `generating` → `passage-view` → `results`). The generation phase is where pipeline improvements apply.
- **Prompt-as-config**: AI prompts are embedded as template strings in `useDSEPapers.js`. The RAG-enhanced prompts will follow this convention.

### Integration Points
- `ReadingModule.jsx` calls `dsePapers.selectPaper()` which triggers generation. The RAG-aware pipeline should be integrated at this call site.
- `/api/rag/generate-reading` endpoint on the backend (if using server-side generation) or `/api/rag/search` (if doing client-side retrieval + AI).
- The generator in `useDSEPapers.js:808` (`generatePaperWithAI`) is the function to modify for RAG enrichment.

</code_context>

<specifics>
## Specific Ideas

- Passages should feel like they could have appeared in a real DSE exam — source attribution with real publication names adds to this authenticity.
- The hybrid approach should be transparent to the user: they don't see "RAG mode" vs "AI mode", just consistent-quality passages.
- When RAG is used, cite the real source to build credibility with students (who are familiar with SCMP, Young Post as DSE source materials).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Passage Quality & DSE Authenticity*
*Context gathered: 2026-06-23*
