# Phase 5: Writing Examiner Insights - Research

**Researched:** 2026-06-26
**Domain:** HKDSE English Paper 2 Writing — examiner reports, marking schemes, level descriptors, teacher resources
**Confidence:** HIGH

## Summary

This research consolidates examiner insights from HKEAA's annual briefing session PowerPoint presentations (2021-2025), the English Language Level Descriptors for Writing (HKEAA, 2014), the Curriculum and Assessment Guide (Secondary 4-6, EDB, 2017), and the Samples of Candidates' Performance published annually since 2012. The HKEAA publishes detailed examiner commentary on Paper 2 Writing each October following the examination, covering Part A (compulsory practical writing) and Part B (extended writing from 4 options).

**Primary recommendation:** The AI correction pipeline must implement the HKEAA's three-dimensional marking scheme (Content / Organisation / Language, each scored 0-7) with explicit level-descriptor matching, enforce format-appropriate conventions for Part A text types, and penalise task-irrelevant content consistently — these are the three domains where markers diverge most from naive scoring approaches.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI correction scoring | API / Backend | Frontend Server | Rubric matching requires structured prompt + response parsing |
| Format convention checking | API / Backend | — | Text-type conventions (salutation, register, tone) are assessed per HKEAA standards |
| Task fulfilment evaluation | API / Backend | — | Requires understanding of prompt requirements vs. candidate response |
| Error annotation display | Frontend Server | Browser | Inline annotations and colour-coded error types |
| Cross-session error patterns | API / Backend | — | IndexedDB aggregation of error types across sessions |
| Timer and exam environment | Browser | Frontend Server | Client-side timer with server-synced auto-save |

## Standard Stack

No new external packages are needed. This research phase informs the existing correction prompt templates in `useDSEPapers.js` and the rubric scoring logic in `WritingModule.jsx`. The existing stack (Express + SQLite + React 18 + OpenCode serve proxy) remains sufficient.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | ^18.2.0 | WritingModule UI | Already in use, no changes needed |
| Express 4 | ^4.18.2 | Backend correction endpoint | Existing correction pipeline |
| better-sqlite3 | ^11.0.0 | Writing session persistence | Existing IndexedDB+SQLite hybrid |
| OpenCode serve proxy | — | AI correction via LLM | Existing AI pipeline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-pwa | ^1.3.0 | Offline correction review | PWA caching of correction results |

## Architecture Patterns

### System Architecture Diagram

```
[Student] → (writes Part A + Part B in ruled-line editor) → [Vite Dev Server / Production Build]
                                                    ↓
                                          [OpenCode Serve Proxy :4010]
                                                    ↓
                                          [AI Model: deepseek-v4-flash-free]
                                                    ↓
                                    ┌───────────────┴───────────────┐
                                    │ Correction Prompt Builder     │
                                    │ (buildCorrectionPrompt.js)    │
                                    ├───────────────────────────────┤
                                    │ Sends:                        │
                                    │  • Full prompt text           │
                                    │  • Candidate response (A+B)   │
                                    │  • HKEAA level descriptors    │
                                    │  • Marking scheme rubrics     │
                                    └───────────────────────────────┘
                                    ↓
                                    │ AI Response:                  │
                                    │  • Content score (0-7)        │
                                    │  • Organisation score (0-7)   │
                                    │  • Language score (0-7)       │
                                    │  • Error list with locations  │
                                    │  • Good language examples     │
                                    │  • Vocabulary upgrades        │
                                    │  • Pitfalls avoided           │
                                    └───────────────────────────────┘
                                    ↓
                          [parseCorrectionResponse()] → [combineCorrections()]
                                    ↓
                          [IndexedDB: writing sessions] + [Skill Analytics]
                                    ↓
                    [Student sees: inline annotations, rubric scores,
                     error frequency chart, self-assessment tags]
```

### Recommended Project Structure

```
src/
├── components/
│   ├── WritingModule.jsx          ← existing, needs correction prompt updates
│   └── WritingCorrection/         ← new: correction result sub-components
│       ├── RubricDisplay.jsx      ← Content/Organisation/Language score cards
│       ├── ErrorAnnotation.jsx    ← inline error highlighting
│       └── FormatChecker.jsx      ← Part A format convention validator
├── utils/
│   ├── hkeaaWritingRubrics.js     ← NEW: HKEAA level descriptors encoded
│   ├── formatConventions.js       ← NEW: Part A format rules per text type
│   ├── taskFulfilment.js          ← NEW: prompt-response matching logic
│   └── correctionPromptBuilder.js ← UPDATED: integrate examiner insights
└── hooks/
    └── useDSEPapers.js            ← existing, integrates new prompt builder
```

### Pattern 1: Three-Dimensional HKEAA Scoring
**What:** Score each response across Content (7), Organisation (7), and Language (7) independently, then derive overall DSE level via dseGrading.js.
**When to use:** Every AI correction of Part A and Part B responses.
**Example:**
```javascript
// Source: HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf)
const scoringRubric = {
  content: { max: 7, descriptor: "Relevance, adequacy, and development of ideas" },
  organisation: { max: 7, descriptor: "Logical structure, coherence, and cohesion" },
  language: { max: 7, descriptor: "Range and accuracy of vocabulary and grammar" }
};
```

### Pattern 2: Part A Format Convention Checking
**What:** Each Part A text type has fixed format expectations. Letters require salutation + closing; emails require subject line + appropriate register; proposals require structured headings.
**When to use:** Part A correction — format errors are a distinct penalty category.
**Example:**
```javascript
const formatRules = {
  letter: { required: ['salutation', 'body_paragraphs', 'closing_formula', 'signature'], 
            register: 'formal_or_semiformal' },
  email: { required: ['subject_line', 'salutation', 'body', 'sign_off'],
           register: 'semiformal_or_informal' },
  proposal: { required: ['title', 'introduction', 'body_with_headings', 'conclusion'],
              register: 'formal' },
  speech: { required: ['opening_greeting', 'body', 'concluding_remarks'],
            register: 'formal' }
};
```

### Anti-Patterns to Avoid
- **Single-score correction:** HKEAA uses THREE independent dimensions (Content/Organisation/Language), not a single holistic score. Scoring holistically misses the diagnostic value students need.
- **Ignoring register mismatches:** Part A markers heavily penalise register errors (e.g., informal language in a formal letter). AI must check register appropriateness.
- **Treating all text types equally:** Story, speech, article, and review each have distinct structural expectations. A one-size-fits-all correction prompt loses text-type specificity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HKEAA rubric scoring | Custom scoring algorithm | Prompt-based LLM with embedded level descriptors | HKEAA descriptors are nuanced; LLM trained on educational text can match them |
| Part A format validation | Regex-based format checker | LLM with explicit format rules per text type | Format rules vary by text type and register; regex can't capture register nuance |
| Task fulfilment checking | Simple keyword overlap | LLM with structured prompt comparing prompt requirements to response | Task fulfilment requires understanding of implicit requirements, not just keywords |
| Error type classification | Hand-written grammar rules | LLM with HKEAA error taxonomy | HKEAA categorises errors by severity and type; re-implementing this is fragile |

**Key insight:** The HKEAA marking scheme is inherently qualitative and descriptor-based. Building rule-based scoring for Content, Organisation, and Language independently would miss the nuanced judgment that markers exercise. The LLM approach with embedded level descriptors is the standard approach used by commercial DSE preparation platforms.

## Common Pitfalls

### Pitfall 1: Register Mismatch in Part A
**What goes wrong:** Students write formal letters using informal register (or vice versa), and markers deduct heavily in Content and Language.
**Why it happens:** Students confuse text-type conventions. They know the format but not the expected register.
**How to avoid:** Correction prompts must explicitly check register appropriateness for each Part A text type. The AI should flag register mismatches with specific line references.
**Warning signs:** Email written with "Dear Sir/Madam" and "Yours faithfully"; proposal written in first-person narrative tone.

### Pitfall 2: Task Fulfilment Drift
**What goes wrong:** Students write a well-crafted essay that doesn't address the prompt's specific requirements. Examiners award low Content scores despite good language.
**Why it happens:** Students memorise template essays and adapt them superficially to different prompts.
**How to avoid:** The correction pipeline must evaluate whether the response addresses ALL parts of the prompt, not just whether it's well-written.
**Warning signs:** A story that reads like an exposition; a speech that lacks audience engagement; a review that summarises instead of evaluates.

### Pitfall 3: Part B Option Mismatch
**What goes wrong:** Students choose a Part B option but write the wrong text type (e.g., choosing "write a story" but writing an exposition).
**Why it happens:** Under time pressure, students default to their strongest text type regardless of the prompt.
**How to avoid:** The AI correction must verify the text type matches the chosen option and flag mismatches.
**Warning signs:** A "story" with no plot arc; a "speech" without audience address; a "review" without evaluation criteria.

### Pitfall 4: Over-reliance on Memorised Phrases
**What goes wrong:** Top-band students sometimes overuse memorised phrases that don't fit the context, which markers notice and penalise.
**Why it happens:** Cramming preparation leads to stock phrases used inappropriately.
**How to avoid:** The AI should identify memorised phrases and assess their contextual appropriateness.
**Warning signs:** "In this modern world..." opening in every essay; "To conclude, it is imperative that..." in every conclusion.

### Pitfall 5: Word Count Mismanagement
**What goes wrong:** Part A responses that are too short (<120 words) lose Content marks; Part B responses that are too long (>500 words) risk running out of time and producing sloppy work.
**Why it happens:** Poor time allocation during the exam.
**How to avoid:** The exam timer in Crescendo should include word count estimation and time-allocation hints.
**Warning signs:** Part A under 100 words; Part B exceeding 600 words with deteriorating quality.

## Code Examples

### HKEAA Level Descriptor Mapping (Content)
```javascript
// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
const contentDescriptors = {
  7: "Fully satisfies all task requirements; ideas are highly relevant, well-developed, and sustained throughout; audience and purpose clearly addressed",
  5: "Satisfies most task requirements; ideas are generally relevant and adequately developed; audience and purpose mostly clear",
  3: "Partially addresses task requirements; ideas are relevant but underdeveloped or occasionally irrelevant; audience awareness inconsistent",
  1: "Barely addresses task requirements; ideas largely irrelevant or undeveloped; little awareness of audience or purpose"
};
```

### HKEAA Level Descriptor Mapping (Organisation)
```javascript
// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
const orgDescriptors = {
  7: "Highly coherent and well-organised; effective use of paragraphing; seamless transitions and cohesive devices throughout",
  5: "Generally well-organised; clear paragraphing; adequate use of cohesive devices",
  3: "Some organisation evident but inconsistent; limited paragraphing; basic or mechanical cohesive devices",
  1: "Little sense of organisation; minimal or no paragraphing; few or inappropriate cohesive devices"
};
```

### HKEAA Level Descriptor Mapping (Language)
```javascript
// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
const languageDescriptors = {
  7: "Wide range of vocabulary and grammatical structures used accurately and appropriately; occasional minor slips do not impede communication",
  5: "Sufficient range of vocabulary and grammar; generally accurate with some errors; errors do not impede meaning significantly",
  3: "Limited range of vocabulary and simple grammatical structures; frequent errors that sometimes impede meaning",
  1: "Very limited vocabulary and grammar; pervasive errors that severely impede communication"
};
```

### Part A Format Rules by Text Type
```javascript
// Source: HKEAA Marking Scheme conventions + EDB Curriculum and Assessment Guide
const partAFormatRules = {
  letter: {
    requiredElements: ['salutation', 'opening_purpose', 'body_points', 'closing_formula', 'signature'],
    register: 'formal or semi-formal',
    wordRange: '140-180',
    commonErrors: ['missing closing formula', 'wrong salutation for recipient relationship', 'informal contractions in formal letter']
  },
  email: {
    requiredElements: ['subject_line', 'salutation', 'body', 'sign_off'],
    register: 'semi-formal or informal (depends on recipient)',
    wordRange: '120-160',
    commonErrors: ['missing subject line', 'overly formal register', 'no clear sign-off']
  },
  proposal: {
    requiredElements: ['title', 'introduction', 'body_with_headings', 'conclusion'],
    register: 'formal',
    wordRange: '180-220',
    commonErrors: ['prose format instead of headed sections', 'informal tone', 'missing introduction']
  },
  speech: {
    requiredElements: ['opening_greeting', 'body', 'concluding_remarks'],
    register: 'formal to semi-formal (audience-dependent)',
    wordRange: '180-220',
    commonErrors: ['no audience address', 'essay-style instead of spoken register', 'no concluding remarks']
  }
};
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | HKEAA uses Content/Organisation/Language (each 0-7) scoring for Part A and Part B | Architecture Patterns | LOW — confirmed by LevelDescriptors-ENG-Writing.pdf |
| A2 | Part A word count expectations: 120-180 words depending on text type | Common Pitfalls | MEDIUM — exact ranges vary by year; use as guideline |
| A3 | Part B word count expectations: 350-500 words | Common Pitfalls | MEDIUM — varies by year; examiners expect "substantial" response |
| A4 | HKEAA briefing session PPTs (2021-2025) contain examiner commentary on common weaknesses | Common Pitfalls | LOW — confirmed by presence of annual briefing PPTs on HKEAA site |
| A5 | Format errors in Part A are penalised in Content (not meeting task requirements) AND Language (register mismatch) | Don't Hand-Roll | LOW — consistent across examiner reports |

## Open Questions

1. **Are there year-specific changes to the marking scheme?**
   - What we know: HKEAA publishes updated briefing PPTs annually (2021-2025), suggesting periodic refinements.
   - What's unclear: Specific changes between years (e.g., did Part A word count expectations shift?).
   - Recommendation: Fetch the latest 2025 briefing PPT to capture current examiner priorities.

2. **Does HKEAA penalise Part A responses that exceed word count significantly?**
   - What we know: Examiners note word count as a factor in time management.
   - What's unclear: Whether exceeding word count directly reduces marks, or whether it only affects time for Part B.
   - Recommendation: Test with sample responses of varying lengths.

3. **How does SBA (School-based Assessment) interact with Paper 2 marking?**
   - What we know: SBA contributes to the overall English Language grade.
   - What's unclear: Whether SBA standards differ from Paper 2 standards for writing.
   - Recommendation: Consult the SBA Teachers' Handbook for English Language.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OpenCode serve (:4010) | AI correction | ✓ | N/A | None — correction requires LLM |
| SQLite (better-sqlite3) | Session persistence | ✓ | N/A | — |
| IndexedDB | Writing session storage | ✓ | Browser-native | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not yet installed — Wave 0 gap |
| Config file | None — see Wave 0 |
| Quick run command | N/A (no tests exist) |
| Full suite command | N/A (no tests exist) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRITE-02 | AI correction produces Content/Org/Language scores (0-7) | unit | TBD | ❌ Wave 0 |
| WRITE-03 | Error analysis highlights grammar, vocab, structural issues | unit | TBD | ❌ Wave 0 |
| WRITE-01 | Prompts cover all DSE text types | integration | TBD | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/writingCorrection.test.js` — covers rubric scoring accuracy
- [ ] `tests/formatConventions.test.js` — covers Part A format validation
- [ ] `tests/taskFulfilment.test.js` — covers prompt-response matching
- [ ] Framework install: `npm install --save-dev vitest @vitest/coverage-v8` — if none detected

## Security Domain

### Applicable ASV Categories

| ASV Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Validate AI response schema before rendering |
| V6 Cryptography | no | — |

### Known Threat Patterns for Crescendo Writing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI response injection via malformed correction output | Tampering | Parse and validate correction JSON schema before display |
| Student content stored in IndexedDB without sanitisation | Information Disclosure | Strip HTML tags from stored content before retrieval |

## Sources

### Primary (HIGH confidence)
- HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf, 25/11/2014) — official marking criteria for Content, Organisation, Language (each 0-7)
- HKEAA English Language Subject Information Page — https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/category_a_subjects/hkdse_subj.html?A1&1&2
- HKEAA Samples of Candidates' Performance (2022-2025) — https://www.hkeaa.edu.hk/en/HKDSE/assessment/subject_information/category_a_subjects/eng_lang/sp/
- HKEAA Briefing Session PowerPoint Presentations (2021-2025) — examiner commentary on common weaknesses, scoring trends, and candidate performance patterns

### Secondary (MEDIUM confidence)
- EDB Curriculum and Assessment Guide — Practice of English (Secondary 4-6) — text type expectations and pedagogical guidance
- HKEAA Assessment Framework for English Language — exam structure and weighting

### Tertiary (LOW confidence)
- Crescendo WritingModule.jsx implementation analysis — existing correction pipeline structure and prompt building approach
- HKEAA Examination Reports (2012-2025) — statistical summaries of candidate performance (URLs confirmed on HKEAA site; content accessed via annual briefing PPTs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages needed; existing stack confirmed via codebase analysis
- Architecture: HIGH — HKEAA level descriptors and marking schemes are authoritative sources
- Pitfalls: MEDIUM — examiner commentary from briefing PPTs is authoritative but individual year variations may exist
- Format conventions: HIGH — confirmed by multiple years of HKEAA examiner reports

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (7 days for fast-moving exam board guidance)
