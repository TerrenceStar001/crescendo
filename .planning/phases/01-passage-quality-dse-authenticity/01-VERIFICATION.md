---
phase: 01-passage-quality-dse-authenticity
verified: 2026-06-23T10:00:00Z
status: human_needed
score: 8/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "When backend is unavailable, pure AI generation runs with enhanced prompts and structural constraints"
    status: partial
    reason: "generatePureAIPassage() function exists at useDSEPapers.js:856 with full implementation (850+ lines including prompt construction, quality gates, truncation handling) but is NEVER called from any code path. When backend is unavailable, generation falls to bundled content (Step 2), not pure AI generation. The DSE OCR path (Step 1.5) which uses generatePassageFromReference() with enhanced quality gates also requires the backend."
    artifacts:
      - path: "src/hooks/useDSEPapers.js"
        issue: "generatePureAIPassage() function defined at line 856 is orphaned — not imported or called anywhere. The generateReadingSession() flow skips it entirely."
    missing:
      - "Wire generatePureAIPassage() as a fallback step between Step 0 and Step 1 (or after Step 1 fails) in generateReadingSession()"
human_verification:
  - test: "Generate passages for each difficulty (easy/medium/hard) and verify text type diversity"
    expected: "Passages should use a variety of text types matching the TEXT_TYPE_REQUIREMENTS per difficulty. Part B1 should use simple types (news, blog, guide), Part A should use mixed types, Part B2 should use complex types (opinion, literary, academic)"
    why_human: "Text type authenticity is a qualitative assessment — requires reading generated output to verify AI follows genre instructions"
  - test: "Generate 20+ passages and verify quality gate pass rate exceeds 95%"
    expected: "At least 19 out of 20 generated passages pass all quality gates (word count within range, no truncation, minimum paragraph count, last paragraph ≥3 sentences)"
    why_human: "Statistical test requiring N>20 sampling. Cannot verify programmatically without running batch generations and tracking pass/fail rates"
  - test: "Blind A/B test: mix 5 AI-generated passages with 5 real DSE passages, ask user to identify which are AI-generated"
    expected: "User identifies at most 2 out of 10 passages as AI-generated (≤2 incorrect identifications)"
    why_human: "Turing-test style evaluation requires human judgment of passage authenticity"
---

# Phase 1: Passage Quality & DSE Authenticity Verification Report

**Phase Goal:** Reading passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity — indistinguishable from real DSE papers.
**Verified:** 2026-06-23T10:00:00Z
**Status:** HUMAN_NEEDED (8/9 must-haves verified, 1 partial gap, 3 items need human testing)
**Mode:** mvp

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Backend can return passage fragments for a topic/difficulty query | ✓ VERIFIED | `server/index.js:373-449` — POST /api/rag/fragments endpoint accepts `{ topic, difficulty, count, fragmentMaxWords }`, returns `{ fragments: [{ text, sourceName, sourceDate, sourceId }] }`. Returns 503 when RAG unavailable, 400 on invalid input. Missing topic defaults to 'feature'. Source name mapping: scmp → 'South China Morning Post', youth-post → 'Young Post'. Fragment text ≤ fragmentMaxWords words. |
| 2 | Structural constraints contain difficulty-calibrated word count targets and genre diversity requirements | ✓ VERIFIED | `src/utils/structuralConstraints.js:17-27` — WORD_COUNT_TARGETS exports: B1 (600-1000, textCount 2-4), A (900-1200, textCount 1-2), B2 (1000-1200, textCount 1-2). TEXT_TYPE_REQUIREMENTS exports per-difficulty genre lists matching DSE Paper 1 patterns. Existing STRUCTURAL_CONSTRAINTS and ARGUMENTATION_FLOW exports unchanged. |
| 3 | Backend health check determines if RAG fragments are available at generation time | ✓ VERIFIED | `useDSEPapers.js:1051` — `fetch('/api/health')` fires before DSE OCR path. Checks `healthData.embeddings > 0` to confirm indexed content exists before fetching fragments. If health check fails or returns 0 embeddings, falls through gracefully. |
| 4 | When backend has articles, RAG fragments are fetched and blended into the AI passage prompt | ✓ VERIFIED | `useDSEPapers.js:1055-1076` — POST to `/api/rag/fragments` with topic from TEXT_TYPE_REQUIREMENTS. `generatePassageFromRAG()` at line 748 builds SOURCE FRAGMENTS section with `[FRAGMENT N] Source: {sourceName}, {sourceDate}` prefix. Critical blending instructions prevent verbatim copying: "Do NOT copy any sentence verbatim", "Create original characters, quotes, and narrative framing". |
| 5 | When backend is unavailable, pure AI generation runs with enhanced prompts and structural constraints | ⚠️ PARTIAL | `generatePureAIPassage()` at line 856 is fully implemented (uses TEXT_TYPE_REQUIREMENTS for type selection, WORD_COUNT_TARGETS for word counts, quality gates) but is NEVER wired into the generation flow. When backend is unavailable, code falls to bundled content (Step 2, line 1596), not pure AI. The DSE OCR path (Step 1.5) uses generatePassageFromReference() which has enhanced quality gates but requires backend access. |
| 6 | AI-generated passages pass quality gates (difficulty-calibrated word counts, truncation detection, minimum paragraph count) | ✓ VERIFIED | All three generation functions (generatePassageFromReference, generatePassageFromRAG, generatePureAIPassage) apply: difficulty-calibrated word counts from WORD_COUNT_TARGETS (line 640), unclosed tag detection (lines 690-694), minimum paragraph count check (lines 696-701: `Math.max(4, target.max/100)`), last-paragraph sentence count (lines 703-710: ≥3 sentences), retry logic on truncation (lines 712-724). |
| 7 | Source attribution renders on every passage (real source name when RAG used, generic attribution when pure AI) | ✓ VERIFIED | `ReadingModule.jsx:423-429` — Conditional rendering: RAG-generated passages show "Adapted from {sourceName}, {sourceDate}". Pure AI passages show "Adapted from a news article". Wordcount footer (line 436-443) also includes source context. Source attribution CSS (App.css:4360-4370): italic, right-aligned, below thin border. |
| 8 | Passage display uses serif font, justified text, first-line-indent paragraphs, and a paper-like card | ✓ VERIFIED | App.css: `.reading__passage-card` (paper-like, shadow, 720px max-width, centered), `.reading__passage-text` (Georgia/Times New Roman serif, 1rem, justify, hyphens auto), `.reading__passage-text p` (text-indent: 2em, margin: 0, orphans/widows: 3). Existing `.reading__passage p` margin-bottom removed — superseded by new rules. |
| 9 | Part badges (A/B1/B2) display with section-appropriate colors above the passage title | ✓ VERIFIED | ReadingModule.jsx:392-396 — Part label derivation (`partLabels`, `partClasses`). Lines 408-411: badge rendered inside `.reading__passage-card` above title. App.css: `.reading__passage-part-badge--A` (accent bg/accent color), `--B1` (warning bg/warning color), `--B2` (error bg/error color). Inline-block, uppercase, 0.75rem. |

**Score:** 8/9 truths verified (1 partial)

### Deferred Items

No items deferred — later phases (Phase 2: Question Quality, Phase 3: Notes & Analysis) do not cover the pure AI fallback wiring gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/index.js` | POST /api/rag/fragments endpoint | ✓ VERIFIED | Lines 373-449. Accepts `{ topic, difficulty, count, fragmentMaxWords }`, returns fragments with text/sourceName/sourceDate/sourceId. Input validation, 503 on RAG unavailable, 500 on internal error. Source name mapping. Query term density scoring. |
| `src/utils/structuralConstraints.js` | WORD_COUNT_TARGETS + TEXT_TYPE_REQUIREMENTS exports | ✓ VERIFIED | Lines 17-27. B1: 600-1000, A: 900-1200, B2: 1000-1200 word ranges. Per-difficulty genre lists with 5-6 types each. Existing exports unchanged. |
| `src/hooks/useDSEPapers.js` | Hybrid RAG-AI pipeline, quality gates, source tracking | ✓ VERIFIED | `generatePassageFromRAG()` at line 748 with SOURCE FRAGMENTS prompt. `generatePureAIPassage()` at line 856 with TEXT_TYPE_REQUIREMENTS-based text type selection (not wired). `generatePassageFromReference()` enhanced with WORD_COUNT_TARGETS, paragraph count, sentence count quality gates. Step 0 RAG pipeline in generateReadingSession() at line 1048. RAG metadata in session assembly at line 1646. |
| `src/components/ReadingModule.jsx` | Passage card with part badge, source attribution, serif text | ✓ VERIFIED | Lines 392-396: part label/class derivation. Lines 408-444: card structure with badge, title, body, source attribution, truncation warning, word count. |
| `src/App.css` | DSE booklet CSS: card, badge, serif, justify, indent, source | ✓ VERIFIED | Lines 4262-4370: Complete DSE Booklet Passage Display CSS block with all required selectors. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `server/index.js:389` | `ragEngine.search()` | `ragEngine.search(topic, count*2)` via pattern `ragEngine\.search` | ✓ WIRED |
| `server/index.js:404` | articles table | `db.prepare('SELECT id, title, content, source, date, word_count FROM articles WHERE id = ?').get(sourceId)` via pattern `articles.*WHERE.*id` | ✓ WIRED |
| `useDSEPapers.js:1051` | /api/health | `fetch('/api/health')` | ✓ WIRED |
| `useDSEPapers.js:1055` | /api/rag/fragments | `fetch('/api/rag/fragments', { method: 'POST', body: JSON.stringify({...}) })` | ✓ WIRED |
| `useDSEPapers.js:1063` | callAI | `generatePassageFromRAG(fragments, callAI, difficulty)` with SOURCE FRAGMENTS prompt section | ✓ WIRED |
| `ReadingModule.jsx:423` | `paper.metadata.ragGenerated` | Conditional source attribution rendering via `paper.metadata.ragGenerated` and `paper.metadata.sourceName` | ✓ WIRED |
| `App.css:4265` | ReadingModule.jsx:408 | `.reading__passage-card` class applied to passage card `div` | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `server/index.js` fragments endpoint | `ragEngine.search()` | `ragEngine` (SQLite articles table via vectorStore) | ✓ DB query — real SCMP/Young Post/Local articles | ✓ FLOWING |
| `useDSEPapers.js` Step 0 | `healthRes`, `fragRes`, `generated.content` | `fetch(/api/health)` → `fetch(/api/rag/fragments)` → `generatePassageFromRAG()` → `callAI()` | ✓ Data flows through all stages end-to-end | ✓ FLOWING |
| `ReadingModule.jsx` source attribution | `paper.metadata.sourceName/Date` | `generatePassageFromRAG()` returns `sourceName/sourceDate` → stored in session metadata → rendered in JSX | ✓ Real source names propagate from RAG fragments through metadata to display | ✓ FLOWING |
| `generatePureAIPassage()` | Function return value | Never called from anywhere in codebase | ✗ Orphaned function — no caller consumes its output | ✗ DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vite build compiles without errors | `NODE_OPTIONS="--experimental-global-webcrypto" npx vite build` | ✓ 557 modules transformed, built in ~10s, no errors | ✓ PASS |
| `structuralConstraints.js` exports correct values | Source code inspection | WORD_COUNT_TARGETS: B1(min:600,max:1000), A(min:900,max:1200), B2(min:1000,max:1200). All keys present. STRUCTURAL_CONSTRAINTS and ARGUMENTATION_FLOW unchanged. | ✓ PASS |
| `server/index.js` syntax valid | Node.js require parse | ✓ File parsed without errors | ✓ PASS |
| POST /api/rag/fragments input validation | Code path inspection | ✓ topic string check (line 379-381), count positive integer check (line 382-384), missing topic defaults to 'feature' (line 386) | ✓ PASS |
| RAG metadata in session assembly | Code path inspection | ✓ `ragGenerated`, `sourceName`, `sourceDate`, `aiGenerated`, `passageReconstructed`, `passageTruncated` all set at lines 1646-1661 | ✓ PASS |

### Probe Execution

Step 7b: SKIPPED — no probe scripts exist in the project (no `scripts/` directory).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| READ-01 | 01-01, 01-02 | Passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity | ✓ SATISFIED | Hybrid RAG-AI pipeline blends real article fragments (SCMP/Young Post) with AI composition. Difficulty-calibrated WORD_COUNT_TARGETS per part (B1:600-1000, A:900-1200, B2:1000-1200). TEXT_TYPE_REQUIREMENTS define DSE-authentic genre lists per difficulty. Quality gates enforce word counts, paragraph structure, truncation detection. Source attribution renders real source names. DSE booklet display formatting (serif, justify, text-indent, part badges). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useDSEPapers.js` | 856 | Orphaned function `generatePureAIPassage()` — defined but never called | ⚠️ Warning | Pure AI fallback (D-03) not fully implemented. When backend unavailable, falls to bundled content instead of pure AI generation. Function has full implementation (prompt construction, quality gates, truncation handling) and just needs wiring. |

No TBD/FIXME/XXX markers found in any modified file. No placeholder text, stub components, or stub handlers detected.

### Human Verification Required

#### 1. Text Type Diversity (SC-1)

**Test:** Generate passages for each difficulty (easy/medium/hard) and visually inspect their text type variety.
**Expected:** Part B1 passages should use simple types (news report, blog post, webpage/guide, forum post). Part A should use mixed types (news, feature, letter, interview). Part B2 should use complex types (opinion piece, literary excerpt, academic text). Each passage should not default to the same persuasive essay format.
**Why human:** Text type authenticity requires qualitative reading of generated output. Grep can verify prompt instructions exist but cannot verify AI compliance.

#### 2. Quality Gate Pass Rate >95% (SC-3)

**Test:** Generate 20+ passages (ideally across all difficulties) and track how many pass the quality gates on first attempt vs. require retry. Count passes vs. failures.
**Expected:** At least 19 out of 20 passages (>95%) pass quality checks on first attempt or after retry. Failures should only occur if AI generates irrecoverably bad content.
**Why human:** Statistical test requiring batch generation and pass/fail tracking. Cannot be verified from code alone.

#### 3. Indistinguishable from Real DSE (SC-5)

**Test:** Blind A/B test — mix 5 AI-generated passages from the system with 5 real HKDSE Paper 1 passages. Ask a DSE-knowledgeable user to identify which are AI-generated.
**Expected:** User correctly identifies at most 2 out of 10 passages as AI-generated (≤20% detection rate).
**Why human:** This is a Turing-test style evaluation requiring human judgment of passage authenticity. No automated oracle exists for this.

### Gaps Summary

**1 partial gap found:**

**Pure AI fallback not wired:** `generatePureAIPassage()` (useDSEPapers.js:856) is fully implemented with 850+ lines of code including TEXT_TYPE_REQUIREMENTS-based text type selection, WORD_COUNT_TARGETS word counts, quality gates (paragraph count, sentence count, truncation), and retry logic. However, it is never called from any code path. When the backend is unavailable, the generation flow skips directly to bundled content (Step 2, line 1596) without attempting pure AI generation.

**Impact:** Low. The normal RAG-enabled flow works end-to-end. When backend is available (typical for AI features), passages go through enhanced quality gates via `generatePassageFromRAG()` or the DSE OCR path via `generatePassageFromReference()`. The missing wiring only affects the edge case where the backend is entirely unavailable AND the user expects AI-generated passages (vs. static bundled content). The function is structurally complete and ready to be wired.

**Fix:** In `generateReadingSession()`, add a `generatePureAIPassage()` call as a fallback step if both Step 0 (RAG) and Step 1 (DSE OCR) fail, before falling to Step 2 (bundled). This requires passing `callAI` through to the fallback path, which already happens in the existing code structure.

**3 items require human verification** (see Human Verification Required section above) — covering SC-1 (text type diversity), SC-3 (>95% quality pass rate), and SC-5 (indistinguishable from real DSE).

---

_Verified: 2026-06-23T10:00:00Z_
_Verifier: the agent (gsd-verifier)_
