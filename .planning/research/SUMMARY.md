# Project Research Summary

**Project:** Crescendo — Courses Quality Polish
**Domain:** DSE English learning platform — PDF ingestion, AI course generation, catalog content
**Researched:** 2026-07-01
**Confidence:** HIGH

## Executive Summary

Crescendo's Courses feature is broken in four distinct but interrelated ways: (1) the PDF upload pipeline produces garbage that the AI then "structures" into hallucinated courses, (2) the auto-generation pathway always falls through to offline templates because the frontend timeout (3s) is an order of magnitude shorter than the backend needs to respond, (3) the catalog is empty on first launch, and (4) no semantic validation exists to catch bad output before it reaches users. These are not fundamental architecture problems — every fix is a configuration change, a threshold adjustment, or adding validation logic within the existing codebase.

The recommended approach is a 3-phase repair: Phase 1 fixes the PDF ingestion pipeline (quality gate, chunking, no new deps, ~150 lines), Phase 2 fixes the auto-generation timeout cascade and adds semantic answer validation, and Phase 3 seeds the catalog with 8-10 bundled courses and adds post-generation quality scoring. No new technology is required — the existing React 18 + Express 4 + better-sqlite3 stack is adequate. All changes are in-project code.

The key risk is the **timeout cascade** (Pitfall 4): the frontend's 3000ms timeout makes the entire backend AI pipeline dead code for most users. Mitigate by extending to 30000ms (matching `useAI.js` patterns) and showing a loading state. Second risk: PDF text extraction's 50-character threshold passes garbage into the AI, producing courses that look valid but have hallucinated content. Raise to 500 characters and add per-page extraction stats in the upload UI.

## Key Findings

### Recommended Stack

**No new technology required.** All fixes are configuration changes, threshold adjustments, prompt engineering, and validation logic — all within the existing stack. The project already has the right tools; they're just misconfigured.

**Core technologies (unchanged):**
- **React 18** (`^18.2.0`): UI framework for all course components — already used throughout
- **Express 4** (`^4.18.2`): Backend for ingestion, auto-generation, and course API — already configured
- **better-sqlite3** (`^11.0.0`): SQLite for course storage — handles <1000 courses easily
- **pdfjs-dist** (`^3.11.174`): PDF text extraction (primary path) — already installed
- **tesseract.js** (`^7.0.0`): OCR fallback for scanned PDFs — already installed
- **OpenCode serve :4010**: AI proxy via `opencode/deepseek-v4-flash-free` — default free model

**Configuration changes required:**
| Setting | Current | Target | Why |
|---------|---------|--------|-----|
| `max_tokens` in `callAICourse()` | 4000 | 8192 | Full course 6000-8000 output tokens |
| `temperature` in `callAICourse()` | 0.7 | 0.3 | Structured JSON output needs low temperature |
| Frontend backend timeout (useCourses.js) | 3000ms | 30000ms | Backend needs 30-120s to generate course |
| PDF text threshold (pdfParser.js) | 50 chars | 500 chars | Prevents garbage header/page-number extracts from passing |

What's NOT changing: No TypeScript, no state management library, no new npm packages, no database migration, no test framework.

See [STACK.md](./STACK.md) for full details.

### Expected Features

**Must fix (table stakes — blocking quality):**
1. **PDF upload → structured course**: Core ingestion path is broken on multi-column layouts, low-content PDFs. Fix: raise quality gate to 500 chars + add chunking.
2. **Generated exercises have correct answers**: AI invents answers from garbled PDF text. Fix: add semantic validation (`validateCourseContent()`) that checks MCQ answer ∈ options.
3. **Course exercises playable end-to-end**: Works for valid courses, but exercises often lack options/answers. Fix: validation prevents publish-broken drafts.
4. **Non-empty catalog**: First-time user sees empty page. Fix: seed 8-10 courses on first launch.
5. **Consistent course quality**: Varies wildly between AI-generated and template fallback. Fix: timeout extension makes AI path the default, not the exception.

**Should fix (differentiators):**
1. **Post-generation quality score**: Show `validation_warnings` badge so users trust courses before practicing.
2. **"Regenerate lesson" button**: Let user replace one bad lesson without discarding whole course.
3. **Extraction quality preview**: Show user extracted PDF text before AI spends time on garbage.
4. **Course generation from any text**: Paste article → structured course (same pipeline, skip extraction).
5. **Difficulty-aware ordering**: Exercises ordered by difficulty within lesson for progression.

**Defer (v2+):**
- SSE progress for PDF processing
- "Regenerate lesson" button (medium complexity, low impact)
- Difficulty-aware ordering within lessons

See [FEATURES.md](./FEATURES.md) for full feature breakdown and dependency chain.

### Architecture Approach

The Courses feature has 4 pipeline gaps that need closing. The component architecture itself is sound — it's the gates between components that are missing or misconfigured.

**Pipeline gaps (in order of fix priority):**
1. **Missing quality gate** after PDF text extraction: 50-char threshold is too permissive. Add per-page character counts + 500-char minimum.
2. **Missing chunking stage**: Raw PDF text goes directly to AI with no section awareness. Add heading-detection heuristic chunking (~60 lines).
3. **Missing semantic validation**: `validateCourseDraft()` checks field existence only, not content correctness. Add answer-in-options check + exercise type matching.
4. **Empty catalog on cold start**: No seed courses bundled. Follow existing `bundled-content.json` pattern with `bundled-courses.json`.

**Component boundaries (unchanged, verified functional):**
| Component | Responsibility |
|-----------|---------------|
| `CourseIngestion` | PDF upload, parsing, review, publish |
| `CoursePlayer` | State machine: overview → lesson → exercise → final → complete |
| `CourseOverview` | Catalog entry page, enrollment, progress |
| `useCourses` | Course CRUD, enrollment tracking, recommendations, auto-generation |
| `courseSchema` | Data model, validators, tag taxonomy |
| `server/routes/courses.js` | Backend: ingest, list, auto-generate |
| `server/crawlers/pdfParser.js` | PDF text extraction + OCR |

**Scalability is fine for v1:** SQLite handles <1000 courses easily. Course JSON is ~50KB. Individually stored in IndexedDB. Auto-generation is sequential (fine for single-user).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full pipeline diagrams and detailed fix code.

### Critical Pitfalls

1. **Garbage-in-garbage-out PDF extraction (Critical):** 50-character threshold passes partial headers/page numbers as valid content. AI hallucinates courses from meaningless text. **Fix:** Raise to 500 chars + per-page extraction stats in upload UI.

2. **No answer correctness validation (Critical):** `validateCourseDraft()` checks structural presence only (typeof string). AI generates MCQs where correct answer is not in the options list. **Fix:** `validateCourseContent()` that verifies MCQ answer ∈ options, gap-fill answer ≤10 words, matching pairs have item+match.

3. **Template fatigue from timeout cascade (Critical):** Frontend 3000ms timeout + backend 120s timeout means the backend AI path ALWAYS times out. Every course falls through to `generateOfflineCourse()` which uses hardcoded sentence templates. Users see identical course structures for every topic. **Fix:** Extend frontend timeout to 30000ms (matching `useAI.js`), making AI path the default.

4. **AI timeout cascade to template garbage (Critical):** Three cascading timeouts: frontend fetch (3s) → frontend AI call (3s) → backend AI call (120s). The frontend gives up before the backend can even respond. The backend endpoint is functionally dead code for most users. **Fix:** Increase both frontend timeouts to 30000-120000ms or use a polling pattern.

5. **Empty catalog cold start (Moderate):** First launch = empty page. User has nothing to try. **Fix:** Bundle 8-10 seed courses in `bundled-courses.json`, load on first launch.

See [PITFALLS.md](./PITFALLS.md) for all 12 identified pitfalls with detailed prevention and detection strategies.

## Implications for Roadmap

Based on combined research, suggested 3-phase structure with clear dependency ordering:

### Phase 1: Fix PDF Ingestion Pipeline
**Rationale:** The PDF→course pipeline is the primary ingestion path and the most broken. Fixing it first creates a foundation for all other course work. No dependency on other phases.
**Delivers:** Reliable PDF upload with quality feedback, chunked content for better AI structuring, clear error messages for low-quality PDFs.
**Addresses from FEATURES.md:** PDF upload→course (must fix), Extraction quality preview (differentiator).
**Avoids from PITFALLS.md:** Pitfall 1 (GIGO PDF extraction), Pitfall 2 (no answer validation).
**Files touched:** `server/crawlers/pdfParser.js` (~120 lines), `server/crawlers/pdfChunker.js` (new, ~60 lines), `server/routes/courses.js` (config only).
**Esimated effort:** ~200 lines total across 3 files. No new dependencies.

### Phase 2: Fix Auto-Generation Reliability
**Rationale:** The timeout cascade makes the entire AI auto-generation path dead code. Fixing timeouts + adding semantic validation ensures users get real AI-generated courses, not templates. Depends on Phase 1 being stable (so the PDF pipeline doesn't produce garbage).
**Delivers:** AI-generated courses that actually complete, with validated answer correctness, proper exercise-type mapping, and higher quality from better AI settings.
**Addresses from FEATURES.md:** Generated exercises have correct answers (must fix), Consistent quality (must fix), Post-generation quality score (differentiator).
**Avoids from PITFALLS.md:** Pitfall 3 (template fatigue), Pitfall 4 (timeout cascade), Pitfall 7 (empty published courses), Pitfall 10 (exercise type mismatch).
**Files touched:** `src/hooks/useCourses.js` (timeout config, ~10 lines), `server/routes/courses.js` (temperature/tokens config, ~4 lines), `src/utils/courseValidator.js` (new validation, ~100 lines).
**Requires research:** No — straightforward timeout extension and validation function. Established patterns from `useAI.js`.

### Phase 3: Seed Catalog & Quality Scoring
**Rationale:** Empty catalog is the first thing a new user sees. Creating seed courses and adding quality scoring gives users confidence. Low-risk, high-impact polish phase. Depends on Phase 1 and 2 being stable (so catalog shows quality content).
**Delivers:** 8-10 high-quality DSE courses visible on first launch, quality scores on all courses, user-facing validation warnings.
**Addresses from FEATURES.md:** Non-empty catalog (must fix), Post-generation quality score (differentiator).
**Avoids from PITFALLS.md:** Pitfall 5 (empty catalog), Pitfall 7 (published empty courses).
**Files touched:** `src/assets/bundled-courses.json` (new, ~800 lines of JSON), `src/hooks/useCourses.js` (seed loading, ~30 lines), `src/components/CourseOverview.jsx` (quality badge, ~20 lines).
**Requires research:** No — pattern follows existing `bundled-content.json`. Content authors write seed courses.

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** The PDF ingestion pipeline produces the course content that auto-generation might need to work with. If Phase 2 fixes AI generation but Phase 1 still produces garbage PDF output, the generated courses will be built on garbage. Fix ingestion first.
- **Phase 2 before Phase 3:** Seed courses should be high-quality examples. Before generating them, ensure the auto-generation pipeline works and validation catches errors. Phase 2's semantic validation also improves seed course quality by providing a validation framework.
- **Configuration changes (temperature, tokens, timeouts) are Phase 2, not Phase 1:** These affect the auto-generation path, not the PDF ingestion path. The PDF pipeline fixes are independent threshold/config changes (50→500 chars) plus chunking logic.
- **Early wins strategy:** Phase 1's changes are the smallest (fewest lines) but fix the most visible breakage (PDF upload produces garbage). Phase 2's timeout fix is the highest-leverage change (one number from 3000 to 30000 fixes the entire auto-generation path).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Chunking):** Low-risk. Simple heuristic heading detection. Consider: should we use the existing `contentChunking.js` utility or create a PDF-specific chunker? The architecture suggests a new `pdfChunker.js` since the chunking strategy is PDF-specific (heading patterns vs general content splitting).
- **Phase 2 (Semantic Validation):** Low-risk. Straightforward validation function. Consider: should validation be server-side (before saving to SQLite) or client-side (before saving to IndexedDB)? Both is ideal but start with server-side since that's the write path for ingestion.

- **Phases with standard patterns (skip research-phase):**
  - **Phase 2 (Timeout/token config):** Trivial configuration changes. Pattern is well established in `useAI.js` (30s timeout, 0.3 temperature).
  - **Phase 3 (Seed courses):** Follows existing `bundled-content.json` pattern exactly. Content creation, not engineering.
  - **Phase 3 (Quality badge UI):** Simple conditional rendering. Pattern exists in `CourseOverview.jsx` for `published` status badge.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All fixes within existing stack. No new deps. Config values verified against codebase. |
| Features | HIGH | Must-fix list maps directly to broken pipeline stages. Differentiators validated against competitive analysis. |
| Architecture | HIGH | Pipeline gaps identified by tracing actual data flow. Fix code provided for each gap. Component boundaries verified as functional. |
| Pitfalls | HIGH | Every pitfall traced to root cause in specific files with line numbers. Prevention strategies include code snippets. |

**Overall confidence:** HIGH

The research is based entirely on the existing codebase — every recommended change is backed by reading specific files, identifying exact line numbers, and tracing data flow. No external integrations are needed. The four researcher analyses converge on the same root causes (timeout cascade, quality gate too low, no validation, no seed content) from different angles (stack, features, architecture, pitfalls), which gives strong confidence in the findings.

### Gaps to Address

- **PDF chunking heuristic tuning:** The heading-detection heuristic (short lines without punctuation = headings) needs testing against real DSE PDFs. The 10-80 character range and lack-of-ending-punctuation rule may need adjustment for Chinese-language documents. During Phase 1 planning, should test against 5 representative DSE PDFs and adjust thresholds.
- **Seed course content creation:** Who writes 8-10 high-quality DSE courses? The technical pattern (bundled JSON) is straightforward, but the pedagogical quality demands domain expertise. Should involve the project's subject-matter expert during Phase 3 planning.
- **Answer validation false positive risk:** The semantic validation function catches MCQ answer ∉ options, but cannot verify the *question* was correctly answered. A question might have the right structural answer (one of the options) but the prompt might be asking something different than what the answer tests. This is a known AI limitation — flag during Phase 2 planning with a note that manual review is still needed.
- **Storage migration for existing users:** If a user has broken courses in IndexedDB from previous usage, Phase 3's seed-on-first-launch logic won't trigger (courses exist, even if broken). Consider adding a `staleCourses` detection or a "recommended courses" section alongside existing ones.

## Sources

### Primary (HIGH confidence)
- **Codebase files**: `server/crawlers/pdfParser.js`, `server/routes/courses.js`, `src/hooks/useCourses.js`, `src/hooks/useAI.js`, `src/components/CoursePlayer.jsx`, `src/components/CourseOverview.jsx`, `src/utils/courseSchema.js`, `src/assets/bundled-content.json` — all examined for current values, data flow, and failure modes
- **Existing config**: Confirmed temperature (0.7), timeout (3000ms), max_tokens (4000), PDF threshold (50 chars) all diverge from working patterns in the same codebase

### Secondary (MEDIUM confidence)
- **AI content quality research**: EduGenius "Understanding AI Content Quality" (2025) — answer key errors and calibration mismatches
- **PDF extraction patterns**: IDP-Software PDF extraction guide (2026) — low text density false passes, multi-column misreading
- **Semantic chunking reference**: `thomasplangger/learnapp-llm-pipeline` (GitHub) — topic-aware chunking before AI structuring
- **Language teaching evaluation**: Futurity Proceedings (2025) — six principles violated by template-driven courses
- **L2 content evaluation**: arXiv (2026) — factual accuracy and pedagogical soundness metrics for second-language AI content

### Tertiary (LOW confidence)
- No tertiary sources — all findings cross-verified against the codebase itself

---
*Research completed: 2026-07-01*
*Ready for roadmap: yes*
