# Milestones

## v1.2 Adaptive Study Engine (Planning)

**Phases planned:** 2 (Phase 11-12)
**Requirements:** 21 across 6 categories

**Target features:**
- Student assessment and profiling
- Personalized 3-tier study plans
- Cognitive flaw detection
- Adaptive exercise generation
- Timeline view
- Forgetting curve scheduling

---

## v1.1 Courses Quality Polish (Shipped: 2026-07-04)

**Phases completed:** 3 phases, 3 plans, 7 tasks

**Key accomplishments:**

- **Phase 7:** Positional-sorted PDF extraction with quality metrics, pdf2md/OCR fallback chain, two-step upload with per-page quality preview, typed error banners, IndexedDB sync + Refresh Courses button
- **Phase 8:** Semantic validation (5 checks) on server + client, temperature 0.3 / max_tokens 32768 globally, multi-strategy JSON parsing with error-injection retry, global loading state with floating progress panel, no hollow templates (explicit failure with Retry/Simpler Content), AbortController 120s timeout, PostTaskSuggestion generation wiring
- **Phase 9:** 10 seed courses covering DSE grammar/vocabulary/writing/reading/listening/speaking, quality badges (seed/reviewed/draft) on catalog cards, post-course improvement tracking widget on Dashboard, expanded writing prompts with domain diversity, improved DSE Paper 2 Part A prompt quality

**Known deferred items at close:** 2 (see STATE.md Deferred Items)

