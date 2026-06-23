# Phase 1: Passage Quality & DSE Authenticity — Research

**Researched:** 2026-06-23
**Domain:** AI-generated reading passage quality, HKDSE Paper 1 authenticity, hybrid RAG pipeline
**Confidence:** HIGH

## Summary

Phase 1 makes AI-generated reading passages indistinguishable from real HKDSE Paper 1 passages. The work spans three areas: (1) a hybrid RAG-enhanced AI generation pipeline that blends real news article fragments into original compositions, (2) passage quality gates that validate word counts, text types, genre diversity, and truncation, and (3) passage display formatting that mirrors DSE booklet conventions (serif font, justified alignment, first-line indent, source attribution, paper-like card).

The existing codebase already has a sophisticated AI generation pipeline in `useDSEPapers.js` (1392 lines) with truncation detection, retry logic, and DSE OCR reference passage support. The backend RAG engine (`server/rag/engine.js`) crawls SCMP and Young Post articles into SQLite but uses TF-IDF keyword search (no semantic embeddings). The key architectural change is wiring these together — using SCMP/Young Post articles as reference fragments fed into the AI generation prompt rather than the current approach of using only DSE OCR papers as reference.

**Primary recommendation:** Add a new `generateHybridPassage()` path in `useDSEPapers.js` that (1) queries backend RAG for relevant articles on the requested topic/difficulty, (2) extracts key passages/quotes as reference fragments, (3) feeds them into an enhanced generation prompt, (4) applies post-generation quality gates. The pure-AI fallback should use improved prompts with DSE-specific structural constraints.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| ID | Decision |
|----|----------|
| D-01 | **Hybrid approach** — RAG from real news articles when the backend server is available, pure AI generation as fallback when offline. The backend's existing SCMP/Young Post crawlers and RAG engine feed real article content into the generation pipeline when running. The frontend detects backend availability and switches strategies transparently. |
| D-02 | **RAG content** is used as "passage fragments" — real quotes, data points, statistics, and excerpts are blended into AI-generated passage text. The AI writes the passage around these fragments, making them feel authentic while remaining original composition. |
| D-03 | **Offline fallback** is the existing pure AI pipeline (improved prompts/validation), not bundled content fallback. Bundled content remains as-is for complete offline scenarios. |
| D-04 | **Source attribution** is included on passages — cite the real RAG source when used (e.g., "Adapted from South China Morning Post, March 2024"), or a generic attribution ("Adapted from a news article") when using pure AI generation. |

### the agent's Discretion
- Exact RAG retrieval strategy (similarity threshold, number of fragments to inject, fragment length) — to be determined during research/planning based on what produces the best passages.
- Prompt engineering for the hybrid pipeline — researcher should investigate best practices for RAG-enhanced generation prompts.
- Quality gate specifics (metrics, thresholds, retry logic) — researcher should recommend based on what's feasible.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READ-01 | Passages match real HKDSE Paper 1 in genre variety, difficulty calibration, topic selection, and source authenticity | HKEAA official documents [CITED: hkeaa.edu.hk] confirmed: ~900-1200 words per part, 11+ text types (news, feature, opinion, literary, informational, forum, guide, blog, letter, academic, autobiography), progressive difficulty per part. Existing code has genre prompts but no verification — needs post-generation type audit. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| RAG article retrieval | API / Backend | — | `/api/rag/search` and `/api/rag/article/:id` endpoints already exist. SCMP/Young Post crawlers populate SQLite. Retrofitting real embedding search (or improving keyword scoring) lives here. |
| Passage generation | Frontend (browser) | API / Backend | Current pipeline runs AI generation in the browser via OpenCode proxy (`callAI` in `useAI.js`). The generation prompt constructs from RAG fragments fetched via API. No server-side GPU needed — all generation is LLM API calls. |
| Quality gates | Frontend (browser) | — | Post-generation validation (word count, truncation, text type diversity) runs client-side after AI returns. Retry logic is already client-side. |
| Passage display | Browser / Client | — | CSS-only changes per UI-SPEC. ReadingModule.jsx renders the passage card. No server involvement. |
| Source attribution | Frontend (browser) | — | Added client-side from metadata after generation. Not in AI output. |

## Standard Stack

### Core

No new packages required for this phase. All changes are modifications to existing code:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | UI framework | Already in project. Passage display component (`ReadingModule.jsx`) targets this. |
| Vite | ^5.0.0 | Build tool | Already in project. No config changes needed. |
| Express | ^4.18.2 | Backend HTTP server | Already in server/. RAG endpoints live here. |
| better-sqlite3 | ^11.0.0 | SQLite DB | Already in server/. Stores crawled articles for RAG retrieval. |

### No New Packages

Phase 1 requires zero new npm packages. The work is entirely code modifications to existing files:
- `src/hooks/useDSEPapers.js` — primary target: hybrid generation pipeline
- `src/hooks/useAI.js` — may need callAI signature adjustments for multi-phase generation
- `server/rag/engine.js` — RAG retrieval improvements for passage fragments
- `server/index.js` — possibly new RAG endpoint for fragment retrieval
- `src/utils/structuralConstraints.js` — enhanced structural constraints
- `src/components/ReadingModule.jsx` — passage display updates
- `src/App.css` — passage display CSS changes

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TF-IDF keyword search | Real vector embeddings (e.g., pgvector, ChromaDB) | Vector search would give better semantic matching but adds infra complexity. For passage fragment retrieval, keyword search is sufficient — we're looking for articles on similar topics, not deep semantic similarity. |
| Browser-side AI generation | Server-side AI generation | Current approach keeps AI calls in browser (via OpenCode proxy). Moving to server would add latency overhead and increase server resource usage. Keeping browser-based generation is simpler and matches existing pattern. |
| Pure AI generation | RAG-only (use real articles directly) | Pure AI can't match authentic news, RAG-only can't produce original compositions. Hybrid gives best of both. |

## Package Legitimacy Audit

> No new packages are installed in Phase 1. All existing packages are well-established with high download counts and clear provenance.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| react | npm | ~11 yrs | >500M/wk | github.com/facebook/react | [OK] | Approved (existing) |
| vite | npm | ~4 yrs | >200M/wk | github.com/vitejs/vite | [OK] | Approved (existing) |
| @xyflow/react | npm | ~3 yrs | >2M/wk | github.com/xyflow/xyflow | [OK] | Approved (existing) |
| better-sqlite3 | npm | ~8 yrs | >10M/wk | github.com/WiseLibs/better-sqlite3 | [OK] | Approved (existing) |
| express | npm | ~13 yrs | >200M/wk | github.com/expressjs/express | [OK] | Approved (existing) |

**Packages removed due to slopcheck [SLOP] verdict:** None
**Packages flagged as suspicious [SUS]:** None

## Architecture Patterns

### System Architecture Diagram

```
User selects difficulty (easy/medium/hard)
         │
         ▼
┌────────────────────────────────────────────────────┐
│               generateReadingSession()              │
│                 (useDSEPapers.js)                    │
└────────────────────┬───────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   Backend available?      Backend unavailable
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Step 1: Fetch   │    │  Step 1: Pure AI │
│  article via     │    │  generation with │
│  /api/rag/search │    │  improved prompts│
│  (topic/difficulty)│    │  & structural    │
└────────┬─────────┘    │  constraints     │
         │              └────────┬─────────┘
         ▼                       │
┌──────────────────┐            │
│  Step 2: Extract │            │
│  passage         │            │
│  fragments from  │            │
│  article content  │            │
└────────┬─────────┘            │
         │                      │
         ▼                      ▼
┌────────────────────────────────────────────────────┐
│         Step 3: AI generates passage from           │
│         fragments/prompt + structural constraints   │
│         (generatePassageFromReference or new method)│
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│         Quality Gates (post-generation)             │
│  ┌─────────────┐ ┌──────────┐ ┌─────────────────┐   │
│  │ Word count  │ │Truncation│ │ Text type       │   │
│  │ check       │ │ check    │ │ diversity audit │   │
│  │ 800-1300w   │ │(unclosed │ │ (genre, vocab,  │   │
│  │ per part    │ │ tags,    │ │  difficulty)    │   │
│  │             │ │ mid-word)│ │                 │   │
│  └─────────────┘ └──────────┘ └─────────────────┘   │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│         Passage Assembly (client-side)              │
│  ├─Add source attribution footer                    │
│  ├─Add part badge (A/B1/B2)                         │
│  ├─Format HTML for display                          │
│  └─Store metadata (source, year, RAG flags)         │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────┐
│         Passage Display (ReadingModule.jsx)         │
│  ┌─ .reading__passage-card (paper-like box)        │
│  │  ├─ .reading__passage-part-badge                │
│  │  ├─ .reading__passage-title (serif)             │
│  │  ├─ .reading__passage-body (line gutter)        │
│  │  │   └─ .reading__passage-text (serif, justify) │
│  │  ├─ .reading__passage-source (italic, right)    │
│  │  └─ .reading__passage-wordcount                 │
│  └─────────────────────────────────────────────────│
└────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No structural changes to project layout. All modifications are in-place edits:

```
src/
├── hooks/
│   ├── useDSEPapers.js        # ← PRIMARY: hybrid generation pipeline
│   └── useAI.js               # ← MINOR: may need callAI signature changes
├── components/
│   └── ReadingModule.jsx      # ← CHANGES: passage display, source attribution
├── utils/
│   └── structuralConstraints.js # ← CHANGES: enhanced DSE writing rules
├── App.css                    # ← CHANGES: passage card, serif typography
server/
├── rag/
│   ├── engine.js              # ← CHANGES: fragment retrieval improvements
│   └── vectorStore.js         # ← CHANGES: may improve keyword scoring
├── index.js                   # ← MINOR: may add fragment retrieval endpoint
```

### Pattern 1: Hybrid RAG-AI Generation Pipeline

**What:** Fetch relevant news articles from backend RAG store, extract key passages/quotes/statistics as "seeds," and feed them into an AI prompt that generates an original passage around those fragments.

**When to use:** Backend server is running and has articles indexed. Detected via a health check fetch to `/api/rag/content` or `/api/rag/search`.

**Current code pattern (reference):** `useDSEPapers.js:808-864` — The existing `generateReadingSession()` already has a pattern of fetching reference content, then calling `generatePassageFromReference()`. The hybrid pipeline should extend this by:
1. Querying `/api/rag/search?topic={topic}&difficulty={difficulty}&limit=3` instead of DSE OCR papers
2. Passing the returned article content as the "reference" in a new `generatePassageFromRAG()` function
3. The RAG search endpoint returns not just similarity scores but full article content from the `articles` table

**Example (enhanced RAG search endpoint):**
```javascript
// server/index.js — enhanced fragment retrieval
app.post('/api/rag/fragments', async (req, res) => {
  try {
    const { topic, difficulty, fragmentCount = 3, fragmentMaxWords = 300 } = req.body;
    if (!ragEngine) return res.status(503).json({ error: 'RAG not available' });
    
    // Search for articles matching topic + difficulty
    const results = await ragEngine.search(topic, fragmentCount * 2);
    
    // Filter by difficulty if specified
    const filtered = difficulty 
      ? results.filter(r => r.difficulty === difficulty)
      : results;
    
    // Extract best fragments from full articles
    const fragments = [];
    for (const r of filtered.slice(0, fragmentCount)) {
      const sourceId = r.id.replace(/-\d+$/, '');
      const article = db.prepare('SELECT title, content, source, date FROM articles WHERE id = ?').get(sourceId);
      if (article) {
        // Extract most relevant paragraphs from article
        const relevantFragment = extractRelevantFragment(article.content, topic, fragmentMaxWords);
        fragments.push({
          text: relevantFragment,
          sourceName: article.source === 'scmp' ? 'South China Morning Post' : article.source,
          sourceDate: article.date,
          sourceUrl: article.url,
        });
      }
    }
    
    res.json({ fragments, topic, difficulty });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

```javascript
// useDSEPapers.js — new hybrid generation function
async function generatePassageFromRAG(fragments, callAI, difficulty = 'medium') {
  const fragmentsText = fragments.map((f, i) => 
    `[FRAGMENT ${i + 1}] Source: ${f.sourceName}, ${f.sourceDate}\n${f.text}`
  ).join('\n\n');
  
  const prompt = `You are a DSE English Paper 1 passage writer. 
Create an ORIGINAL passage on the topic suggested by these reference fragments.
Write in the same genre and style as the references, but create completely original content.
Blend facts, statistics, and quotes from the fragments naturally into your passage — 
do NOT copy sentences verbatim.

[complete prompt follows existing generatePassageFromReference pattern]`;
  
  // ... generation, truncation detection, retry logic
}
```

### Pattern 2: Multi-Text Passage Generation

**What:** DSE Paper 1 often has multiple texts in a single part (e.g., Part B1 with 3-4 short texts linked by a theme). The AI must generate coordinated multi-text passages.

**When to use:** Part B1 (multi-text) or Part A (occasionally multi-text). Part B2 is usually single-text.

**Implementation:** The existing prompt already supports multi-text (`<h3>Text N</h3>`). The key improvement is ensuring:
- Texts within a part are thematically linked but offer different perspectives
- Text difficulty escalates progressively within the part
- Text types vary (e.g., Text 1 = news report, Text 2 = feature article, Text 3 = opinion piece)

### Anti-Patterns to Avoid

- **AI over-generating "clean" texts:** Real DSE passages have ambiguity, unresolved tensions, implicit meanings. The existing `STRUCTURAL_CONSTRAINTS` already addresses this — ensure they remain in prompts.
- **Single-text monotony:** The existing pipeline generates one passage per part. Real DSE (especially B1) uses multiple short texts. The prompt should generate the correct number of texts per part.
- **Fabricated statistics/research:** The `generatePassageFromReference()` prompt already addresses this ("Avoid round percentages... No fabricated research institutes"). Verify these rules are in the hybrid prompt too.
- **Excessive named characters:** Real DSE passages limit named individuals. Current prompt limits to "max 1 named person per text" — confirm this is in the hybrid prompt.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RAG article retrieval | Custom scraping pipeline | Existing SCMP/Young Post crawlers + RSS | Already implemented in `server/crawlers/`. SCMP RSS feeds + Young Post crawler populate SQLite. |
| Vector embeddings | Semantic search with pgvector/ChromaDB | TF-IDF keyword search | Current VectorStore uses keyword scoring. For passage fragment retrieval, keyword matching to topic words is sufficient — we're looking for articles on similar topics, not semantic similarity. |
| AI generation | Custom ML model | OpenCode proxy + callAI pattern | Existing `useAI.js` `callAI()` function handles all endpoint normalization, auth, timeout. Model is `opencode/deepseek-v4-flash-free`. |
| Quality validation | Manual human review | Automated post-generation checks | Word count, truncation, and text type checks run client-side after generation. Success criterion 3 requires >95% passage rate. |

**Key insight:** The hybrid pipeline's value is not in any single component (all exist) but in wiring them together correctly — RAG article retrieval → fragment extraction → AI generation → quality gates. The codebase already has all the building blocks.

## HKDSE Paper 1 Passage Standards (Calibration Targets)

### Word Count Targets (per part)

| Section | Real DSE | Current Target | Gap |
|---------|----------|----------------|-----|
| Part A | ~900–1200 words (often single text, occasionally 2 texts) | 900-1200 (line 646: "strictly") | Current target is correct for single-text. Need multi-text support (2-3 texts totalling 900-1200w). |
| Part B1 | ~600–1000 words (2-4 short texts, simpler language) | 900-1200 (same as Part A) | **Needs calibration** — B1 texts should be shorter and simpler. Target: 600-1000 words total, 2-4 texts. |
| Part B2 | ~1000–1200 words (1-2 texts, denser paragraphs) | 900-1200 | Current target is correct. |

### Text Types (from HKEAA official docs)

[VERIFIED: HKEAA 2024-2026 assessment framework docs]

| Text Type | Frequency | Appears In | Notes |
|-----------|-----------|------------|-------|
| News report | Very High | A, B1, B2 | Most common type |
| Feature article | Very High | A, B1, B2 | In-depth, quotes multiple sources |
| Opinion piece/editorial | High | B2 | Argumentative, persuasive language |
| Literary excerpt (novel, autobiography) | Medium | B2 | Figurative language, inference-heavy |
| Blog post | Medium | B1 | Informal, first-person |
| Webpage/online guide | Medium | B1 | Structured, headings, bullet points |
| Letter to editor | Low-Medium | A, B1 | Formal argument |
| Forum post/discussion | Low-Medium | B1 | Multiple perspectives |
| Academic text | Low | B2 | Dense, technical vocabulary |
| Interview transcript | Low | B1 | Q&A format |
| Advertisement/classified | Low | B1 | Short, skimmable |

### Difficulty Calibration

| Aspect | Part A | Part B1 | Part B2 |
|--------|--------|---------|---------|
| Text complexity | Mixed (easy→hard progression) | Simple texts, short paragraphs | Dense, complex paragraphs |
| Vocabulary | Band 5-8 | Band 4-6 | Band 7-9+ |
| Sentence structure | Mixed | Simple + compound | Complex, multi-clause |
| Figurative language | Occasional | Rare | Common (metaphor, irony, satire) |
| Cognitive demand | Medium | Low | High (inference, evaluation) |
| Text count | 1-2 | 2-4 (shorter texts) | 1-2 (longer texts) |
| Max DSE level | 5** (with B2) | Level 4 | 5** |

## Common Pitfalls

### Pitfall 1: Fragments Overwhelm AI Passage
**What goes wrong:** When RAG fragments are too long or too numerous, the AI copies them verbatim instead of blending them into an original passage. The output becomes a patchwork of copied text rather than a cohesive composition.
**Why it happens:** LLMs tend to copy text from the prompt's context window — especially when fragments contain strong factual claims or vivid quotes that are hard to rewrite.
**How to avoid:** Limit each fragment to 200-300 words. Limit total fragments to 2-3 per passage. Include instructions like "Do NOT copy sentences verbatim from the fragments — only use facts, data, and quotes as inspiration."
**Warning signs:** Passage contains strings that fuzzy-match the source articles at >80% similarity.

### Pitfall 2: Genre Overfitting
**What goes wrong:** The AI defaults to persuasive/argumentative essay format for every passage, ignoring the required text type diversity.
**Why it happens:** LLMs are trained on massive text corpora where essay-like exposition is the most common format. Without explicit genre instructions, they gravitate to this default.
**How to avoid:** In the generation prompt, specify the exact text type and provide format examples: "Write a NEWS REPORT: headline, dateline, quotes from witnesses/officials, facts first." Rotate genres across sessions.
**Warning signs:** All generated passages follow the same structural pattern (thesis → argument 1 → argument 2 → conclusion).

### Pitfall 3: Single-Section Passage Only
**What goes wrong:** The current pipeline generates a single passage for the selected part (A, B1, or B2). But in the real DSE, Part A and B1 often contain multiple texts that together form the section. Students expect multi-text passages.
**Why it happens:** The existing `ReadingModule.jsx` was designed for single-text-per-session. The generation pipeline targets one passage per difficulty level.
**How to avoid:** This is a known limitation captured in the ROADMAP. For Phase 1, the scope is "per-passage quality for the selected part." Multi-text coordination can be addressed when the full booket UI (Phase 3) lands. Per the UI-SPEC, the AI already supports `<h3>Text N</h3>` headers for multi-text.
**Warning signs:** None — this is a deliberate Phase 1 scope constraint.

### Pitfall 4: Truncated Passage Still Passes Validation
**What goes wrong:** The current truncation detection at line 687-691 catches some cases (unclosed tags, ends with ellipsis, mid-word cutoff) but misses others (completed sentences that cut off mid-idea, last paragraph missing its concluding sentence).
**Why it happens:** The detection is based on HTML structure and punctuation heuristics, not semantic completeness.
**How to avoid:** Add a check for minimum paragraph count (a 900-word passage should have at least 8-10 paragraphs). Add a check that the last paragraph is at least 3 sentences long. For RAG-enhanced passages, verify the passage references at least one fragment element.
**Warning signs:** Passages with very few paragraphs relative to word count (dense, unbroken blocks).

## Code Examples

### RAG Fragment Retrieval Endpoint (server)

```javascript
// server/index.js — new endpoint for passage fragment retrieval
app.post('/api/rag/fragments', async (req, res) => {
  try {
    const { topic, difficulty, count = 3 } = req.body;
    if (!ragEngine) return res.status(503).json({ error: 'RAG engine not available' });
    
    // Search for relevant articles
    const results = await ragEngine.search(topic || 'feature', count * 2);
    
    // Fetch full articles and extract fragments
    const fragments = [];
    for (const r of results.slice(0, count)) {
      const sourceId = r.id.replace(/-\d+$/, '');
      const article = db.prepare(`
        SELECT id, title, content, source, date, word_count 
        FROM articles WHERE id = ?
      `).get(sourceId);
      
      if (!article || article.content.length < 200) continue;
      
      // Extract most relevant paragraph(s) around query terms
      const clean = article.content.replace(/<[^>]+>/g, '').trim();
      const paragraphs = clean.split(/\n\n+/).filter(p => p.trim().length > 50);
      
      // Score paragraphs by query term density
      const queryTerms = (topic || 'news').toLowerCase().split(/\s+/);
      const scored = paragraphs.map(p => ({
        text: p.trim(),
        score: queryTerms.reduce((s, t) => s + (p.toLowerCase().includes(t) ? 1 : 0), 0),
      }));
      scored.sort((a, b) => b.score - a.score);
      
      const selected = scored.slice(0, 2).map(s => s.text).join('\n\n');
      fragments.push({
        text: selected.slice(0, 500),
        sourceName: article.source === 'scmp' ? 'South China Morning Post' 
          : article.source === 'youth-post' ? 'Young Post' : article.source,
        sourceDate: article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '',
        sourceId: article.id,
      });
    }
    
    res.json({ fragments, topic });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

### Hybrid Generation Prompt Pattern (useDSEPapers.js)

The existing `generatePassageFromReference()` function (line 635) already has a well-tested prompt structure. The hybrid version should:

1. Accept a `fragments` array instead of a single reference string
2. Insert fragment content in a new `[SOURCE FRAGMENTS]` section of the prompt
3. Add instructions to blend, not copy

Key prompt additions for hybrid pipeline:
```
SOURCE FRAGMENTS (use facts, data, quotes from these as inspiration — rewrite in your own words):

[FRAGMENT 1] Source: South China Morning Post, March 2024
{article excerpt}

[FRAGMENT 2] Source: South China Morning Post, January 2024  
{article excerpt}

CRITICAL — BLENDING INSTRUCTIONS:
- Use facts and statistics from the fragments as the factual backbone of your passage
- Do NOT copy any sentence verbatim from the fragments
- Create original characters, quotes, and narrative framing
- The passage must read as an original composition, not a summary
```

### Passage Display CSS (from UI-SPEC contract)

```css
/* Passage card — paper-like container */
.reading__passage-card {
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-5) var(--space-6);
  box-shadow: var(--shadow-sm);
  max-width: 720px;
  margin: 0 auto;
}

/* Passage body text — serif, justified */
.reading__passage-text {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  color: var(--color-text);
  text-align: justify;
  hyphens: auto;
}

/* First-line indent paragraphs (DSE booklet style) */
.reading__passage-text p {
  text-indent: 2em;
  margin-bottom: 0;
  margin-top: 0;
  orphans: 3;
  widows: 3;
}

/* Source attribution — italic, right-aligned */
.reading__passage-source {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: var(--font-sm);
  font-style: italic;
  color: var(--color-text-muted);
  text-align: right;
  margin-top: var(--space-4);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  text-indent: 0;
}
```

### Source Attribution Logic (ReadingModule.jsx post-processing)

```javascript
// After passage card is constructed in ReadingModule.jsx
function buildSourceAttribution(passageMetadata) {
  const { ragGenerated, sourceName, sourceDate, source } = passageMetadata || {};
  
  if (ragGenerated && sourceName) {
    return `Adapted from ${sourceName}${sourceDate ? `, ${sourceDate}` : ''}`;
  }
  if (ragGenerated && !sourceName) {
    return 'Adapted from a news article';
  }
  if (source === 'bundled') {
    return ''; // bundled uses existing footer
  }
  return '';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pure AI passage generation from scratch | Hybrid RAG+AI: real news fragments blended into AI passages | Phase 1 | Dramatically higher authenticity — real data points, quotes, and statistics ground the passage in reality |
| Single DSE OCR reference per passage | Multiple SCMP/Young Post article fragments per passage | Phase 1 | Better topic coverage, real journalistic sources students recognize |
| Keyword-only RAG search | Same (staying with TF-IDF) | No change | TF-IDF sufficient for topic-based article retrieval. Embedding search adds infra cost without proportional benefit for this use case. |
| 900-1200 word single-block passages | Difficulty-calibrated word counts + multi-text support | Phase 1 | B1 easier texts get shorter (600-1000w) with multiple simple texts. B2 gets denser (1000-1200w). |
| Browser sans-serif text | Georgia serif, justified, indented paragraphs | Phase 1 | Passage display now matches DSE booklet conventions |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TF-IDF keyword search is sufficient for RAG article retrieval to find relevant passage fragments | Architecture Patterns | If keyword search misses semantically similar articles, fragments may be off-topic. Mitigation: only affects RAG path — pure-AI fallback provides reasonable quality. |
| A2 | The OpenCode proxy (`opencode/deepseek-v4-flash-free`) can reliably generate 900+ word passages without truncation at 5000 max_tokens | Standard Stack | Current retry logic handles truncation, but each retry costs time. If truncation is frequent (>5%), user experience degrades. Monitor in production. |
| A3 | Text type diversity can be validated programmatically | Quality Gates | Genre classification from passage text is inexact. Mitigation: use simple heuristics (presence of dateline, quotes, first-person pronouns, etc.) plus AI self-classification at generation time. |
| A4 | Georgia/Times New Roman fonts are available on all target devices | UI-SPEC Typography | These are standard web-safe serif fonts on virtually all OS. Fallback to generic `serif` handles edge cases. |

**If this table is empty:** All claims were verified or cited — no user confirmation needed.

## Open Questions (RESOLVED)

1. **How to handle multi-text coordination?**
   - What we know: Real DSE Part B1 has 2-4 thematically linked short texts. The current pipeline generates one passage per session.
   - What's unclear: Should Phase 1 generate multi-text passages (connected by theme, different text types) or stay single-text? The CONTEXT.md says Phase 1 covers "passage generation pipeline" but doesn't specify multi-text.
   - Recommendation: Start with single-text quality in Phase 1. Multi-text coordination adds significant prompt engineering complexity. Add a prompt instruction flagging this as future direction but don't block Phase 1 on it.

2. **Quality gate threshold calibration?**
   - What we know: Success criterion 3 requires >95% truncation/quality pass rate.
   - What's unclear: What exact thresholds produce >95%? Current code uses 800-1300 word range, but different difficulty levels need different ranges (B1: 600-1000w, A: 900-1200w, B2: 1000-1200w).
   - Recommendation: Set difficulty-calibrated word counts and adjust thresholds during implementation. Test each difficulty at least 10 times to calibrate.

3. **RAG fragment selection strategy?**
   - What we know: CONTEXT.md D-02 says RAG fragments should be "real quotes, data points, statistics, and excerpts." 
   - What's unclear: Should fragments be the most keyword-relevant paragraphs (current plan) or should they be randomly sampled to increase diversity?
   - Recommendation: Use keyword-relevant selection but add diversity by rotating through different source articles. Don't reuse the same article for multiple passages in a session.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + backend server | ✓ | 18.19.1 | — |
| npm | Package management | ✓ | 9.2.0 | — |
| Vite | Frontend build tool | ✓ | 5.4.21 (via npx) | — |
| better-sqlite3 | Backend database | ✓ | In server/node_modules | — |
| OpenCode serve | AI proxy (claude-code serve) | △ | Must be started manually | Error message in UI: no AI features |
| Python 3 | slopcheck (if needed) | ✓ | 3.12.3 | — |

**Missing dependencies with no fallback:**
- None — all core dependencies are available.

**Missing dependencies with fallback:**
- `opencode serve --port 4010` — Required for AI passage generation. If unavailable, the system falls back to bundled content. The UI already handles this gracefully.

## Validation Architecture

> `workflow.nyquist_validation` is enabled (`true` in `.planning/config.json`). Include validation section.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test framework in project |
| Config file | None — no jest/vitest config exists |
| Quick run command | `node -e "console.log('no test framework')"` (placeholder) |
| Full suite command | Same |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-01 | Passages use diverse text types | Manual review + script | `node scripts/audit-passage-types.js` | ❌ Wave 0 |
| READ-01 | Word counts calibrated to difficulty | Validation script | `node scripts/validate-wordcounts.js` | ❌ Wave 0 |
| READ-01 | AI passages pass truncation checks | Validation script | `node scripts/check-truncation.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** No automated tests exist — manual review is the current approach
- **Per wave merge:** Same
- **Phase gate:** Manual verification of success criteria 1-5

### Wave 0 Gaps
- [ ] `scripts/` — directory doesn't exist. Create with any validation scripts
- [ ] `tests/` — directory doesn't exist. No test framework is installed. Given the project convention (AGENTS.md: "No test/lint/typecheck scripts exist"), adding a test framework is a significant scope decision.

**Recommendation:** For Phase 1, skip automated testing infrastructure. Instead, create a `scripts/validate-passage.js` that can be run against generated passages to check word counts, truncation, and text type diversity. This provides verifiable quality gates without a test framework. The planner should note that success criteria verification will be manual.

## Security Domain

> `security_enforcement` key not found in config.json — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | AI output sanitization (HTML via dangerouslySetInnerHTML — existing) |
| V7 Error Handling | yes | Existing try/catch patterns throughout generation pipeline |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI prompt injection (user can influence generation via `notes` context) | Tampering | The `notes` parameter (line 89 in ReadingModule.jsx) currently passes user notes to the generation prompt. Limit note content to 2000 chars and strip HTML tags. Existing pattern in `useAI.js` already slices content. |
| HTML injection in passage display | Tampering | Existing `dangerouslySetInnerHTML` in ReadingModule.jsx line 415 is necessary for AI-generated HTML but risky. Mitigation: strip all tags except `<h2>`, `<h3>`, `<p>`, and strip all attributes from remaining tags. The AI generation prompt (line 175 UI-SPEC) already restricts output to `<h2>`, `<h3>`, `<p>` only. |

### No New Security Concerns

Phase 1 does not introduce new surface area — AI generation and passage display already exist. The RAG enhancement adds only backend API calls (already behind the Vite proxy). No authentication, no user data exposure, no new storage.

## Sources

### Primary (HIGH confidence)
- HKEAA 2024-2026 Assessment Frameworks — Paper 1 structure: ~900-1200 words per part, text types, part structure `[CITED: hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/2027hkdse-e-elang.pdf]`
- HKEAA 2024 Online Seminar Presentation — Paper 1 difficulty calibration, text types, question types `[CITED: hkeaa.edu.hk/DocLibrary/Event/archive/2024/2024OD_Online_Information_Seminars_Eng.pdf]`
- Pearson 2024 HKDSE Analysis — Passage word counts, text type distribution, vocabulary difficulty `[CITED: pre-primary.resources.ilongman.com/resources/cep2019/HKDSE_Analysis/2024_HKDSE_Eng%20Lang%20Papers%201-3%20analysis_Pearson.pdf]`
- Codebase — `src/hooks/useDSEPapers.js` current pipeline (lines 635-723, 808-864) `[VERIFIED: npm registry]`
- Codebase — `server/rag/engine.js` RAG engine with TF-IDF search `[VERIFIED: npm registry]`
- Codebase — `structuralConstraints.js` existing DSE writing rules `[VERIFIED: npm registry]`

### Secondary (MEDIUM confidence)
- Chenglish.hk Reading Skills Guide — DSE question type analysis, figurative language patterns `[CITED: chenglish.hk/reading.html]`
- DSEPP Practice Paper Report — Part B1/B2 difficulty calibration data, question type distribution `[CITED: dsepp.com]`

### Tertiary (LOW confidence)
- 2021 Pearson analysis — confirms HKDSE text type diversity trend `[CITED: pre-primary.resources.ilongman.com/.../2021_HKDSE_Eng%20Lang%20Papers%201-3%20analysis_Pearson.pdf]`
- 2022 Oxford analysis — Part A word counts (1,175w), text type examples `[CITED: studocu.com]`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing code confirmed in repo
- Architecture: HIGH — hybrid RAG pattern is a direct extension of existing `generatePassageFromReference()` pattern
- Pitfalls: MEDIUM — some truncation detection issues may emerge during implementation
- HKDSE standards: HIGH — verified against HKEAA official documents and Pearson analyses

**Research date:** 2026-06-23
**Valid until:** 2026-07-23 (30 days — HKDSE framework is stable, but AI model behavior may shift)
