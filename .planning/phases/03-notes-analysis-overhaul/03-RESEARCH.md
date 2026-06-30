# Phase 3: Notes & Analysis Overhaul — Research

**Researched:** 2026-06-24
**Domain:** Reading module post-practice analysis, error pattern analytics, drill recommendation, DSE booklet UI/UX
**Confidence:** HIGH (all claims verified against codebase or official project patterns)

## Summary

The current ReadingModule results screen shows per-question review with correct/wrong indicators and background AI notes generation via `generateReadingNotes()`. For Phase 3, we need to transform this into a genuine learning tool with: (1) a marked-script passage view that highlights errors in context with teacher-style margin annotations, (2) error pattern analysis aggregated by skill and question type, (3) targeted drill recommendations based on mistakes, and (4) DSE-authentic booklet styling on the results screen.

The existing architecture supports this well — questions already carry `skillTested`, `paragraphRef`, and `type` fields; the line-numbered passage display uses CSS counters; and the AI notes pipeline is already wired. The main technical challenge is the **marked-script view**: correlating `paragraphRef` to actual passage DOM elements and rendering annotations alongside the passage. This requires a client-side component that renders the passage with overlaid highlights and margin comments.

**Primary recommendation:** Build a new `ReadingResults.jsx` component to replace the inline results section in `ReadingModule.jsx`. This component composes three sub-components: `MarkedScriptView` (annotated passage), `ErrorPatternAnalysis` (skill/type breakdown), and `DrillGenerator` (targeted questions). Use the existing `generateReadingNotes` AI call but refactor it to return structured data that feeds these views, rather than opaque HTML notes.

## User Constraints (from CONTEXT.md)

*No CONTEXT.md found for this phase. No locked decisions exist yet. This research operates under the agent's full discretion for READ-05 and READ-06.*

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READ-05 | Notes analysis output combines marked-script style annotations, error pattern analysis, and targeted drill recommendations | See Marked-Script View Architecture, Error Pattern Analysis Design, Drill Recommendation Approach sections |
| READ-06 | Reading Module UI/UX reflects real DSE Paper 1 booklet format and examination experience | See Reading Module UI/UX Enhancements section — builds on existing DSE booklet patterns from Phase 1 |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Marked-script passage annotation | Browser / Client | API (AI) | Passage rendering and annotation overlay is DOM-rendered; AI provides the analysis content |
| Error pattern aggregation | Browser / Client | — | Pure JS computation from existing `results.questions` data — no server needed |
| Drill recommendation generation | API (AI) | Browser / Client | AI generates focused questions from mistake patterns; client triggers and displays |
| DSE booklet results CSS | Browser / Client | — | Pure CSS styling — responsive layout, exam-branded colors, typography |
| Study notes persistence | Browser / Client | — | Notes saved as `kind: 'exercise'` notes via existing `createNote` pipeline |

## Standard Stack

### Core — No new libraries needed

All Phase 3 work uses existing stack (React 18, Vite 5, custom CSS) and existing utilities:

| Module | Purpose | File |
|--------|---------|------|
| `ReadingModule.jsx` | Parent component that orchestrates results display | `src/components/ReadingModule.jsx` |
| `dseGrading.js` | `computeSubScores`, `isQuestionCorrect`, `scoreToDseLevel` | `src/utils/dseGrading.js` |
| `answerChecking.js` | `checkAnswer` with partial marks (for detailed analysis) | `src/utils/answerChecking.js` |
| `questionTypes.js` | `QUESTION_TYPE_DISTRIBUTIONS`, `COGNITIVE_TRAP_TYPES` | `src/utils/questionTypes.js` |
| `questionGenerator.js` | `composeFullPrompt`, per-type prompt builders (for drills) | `src/utils/questionGenerator.js` |
| `questionValidator.js` | `validateQuestions` (for drill validation) | `src/utils/questionValidator.js` |
| `useDSEPapers.js` | `generateReadingNotes` — existing AI notes pipeline | `src/hooks/useDSEPapers.js` |
| `useAI.js` | `callAI` — the AI endpoint abstraction | `src/hooks/useAI.js` |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/ReadingResults.jsx` | **New** — Extracted results view from ReadingModule.jsx (lines 555-761); composes sub-views |
| `src/components/MarkedScriptView.jsx` | **New** — Passage with inline highlights, margin annotations, per-question score overlays |
| `src/components/ErrorPatternAnalysis.jsx` | **New** — Skill/question-type error breakdown with actionable insights |
| `src/components/DrillGenerator.jsx` | **New** — Generates and displays 2-3 targeted drill questions |
| `src/utils/errorPatternAnalysis.js` | **New** — Pure function to aggregate errors by skill, type, part from session data |
| `src/utils/drillGenerator.js` | **New** — AI prompt builder for targeted drills based on mistake patterns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extracting results into `ReadingResults.jsx` | Keeping results inline in `ReadingModule.jsx` | Inline would make the component even more monolithic (already 869 lines). Extraction follows existing component modularity pattern |
| Client-side JS for error aggregation | AI-powered error categorization | Client-side is deterministic, instant, works offline. AI categorization would be slower and potentially inconsistent. Use client-side for aggregation, AI for drill generation |
| AI-generated drill questions | Static question bank with filtered selection | Static bank doesn't exist and would be massive to cover all combinations. AI generation is more flexible and matches existing patterns |

## Package Legitimacy Audit

> No external packages are needed for this phase. All work uses existing dependencies (React 18, custom CSS) and existing utility modules. The AI pipeline uses the already-verified `callAI` abstraction.

**Packages removed due to slopcheck [SLOP] verdict:** N/A
**Packages flagged as suspicious [SUS]:** N/A

## Architecture Patterns

### System Architecture Diagram

```
ReadingModule.jsx (phase='results')
       │
       ├──► ReadingResults.jsx  [NEW — extracted from ReadingModule results section]
       │       │
       │       ├──► ResultsSummary ─── (percentage ring, marks, DSE level, time)
       │       │       └── uses: scoreToDseLevel(), dseGrading
       │       │
       │       ├──► MarkedScriptView.jsx  [NEW]
       │       │       ├── Renders passage HTML with per-paragraph highlights
       │       │       │   (green/red overlays based on paragraphRef question results)
       │       │       ├── Margin annotations — teacher-style comments per question
       │       │       │   (e.g., "✓ Q3 — correct inference" / "✗ Q4 — careful: extreme wording distractor")
       │       │       └── Score annotations — "[2/3 marks]" next to multi-mark questions
       │       │
       │       ├──► ErrorPatternAnalysis.jsx  [NEW]
       │       │       ├── Skill breakdown bars (mainIdea, detail, inference, etc.)
       │       │       ├── Question type breakdown (mcq, tfng, short-answer, etc.)
       │       │       ├── Section breakdown (A vs B1 vs B2) — reuses existing subscore UI
       │       │       ├── Time analysis — which questions took longest vs. quickest
       │       │       └── Weak area identification — "Your weakest skill: inference (40%)"
       │       │
       │       ├──► DrillGenerator.jsx  [NEW]
       │       │       ├── Identifies 2-3 weakest question types/skills
       │       │       ├── Calls AI with focused drill prompt (builds on composeFullPrompt)
       │       │       ├── Displays generated drill questions inline
       │       │       └── Student can answer drills and get instant feedback
       │       │
       │       └──► (existing) AI Notes Section
       │               └── generateReadingNotes → displayed as saved note
       │
       └── useDSEPapers.generateReadingNotes()  [REFACTOR prompt]
               └── Now feeds structured annotation data to MarkedScriptView
```

### Recommended Project Structure — New/Modified Files

```
src/
├── components/
│   ├── ReadingModule.jsx       [MODIFY — extract results phase to ReadingResults]
│   ├── ReadingResults.jsx      [NEW — results container]
│   ├── MarkedScriptView.jsx    [NEW — annotated passage display]
│   ├── ErrorPatternAnalysis.jsx [NEW — skill/type error breakdown]
│   └── DrillGenerator.jsx      [NEW — targeted drill questions]
├── utils/
│   ├── errorPatternAnalysis.js  [NEW — pure error aggregation functions]
│   └── drillGenerator.js        [NEW — drill prompt builders]
└── App.css                      [MODIFY — add marked-script, error pattern, drill, tablet RWD CSS]
```

### Pattern 1: Extract Results Phase from ReadingModule

**What:** The `phase === 'results'` block in ReadingModule.jsx (lines 555-761) is ~200 lines of JSX inline. Extract to a dedicated `ReadingResults.jsx` component. This follows the existing pattern of component modularity in the project (QuestionRenderer.jsx, NoteList.jsx, etc.).

**When to use:** Always. The results section has grown beyond what belongs inline in the parent orchestrator.

**Data flow:**
```
ReadingModule passes to ReadingResults:
  - results (sessionData object)
  - questions (full question array)
  - answers (user answer map)
  - paper (paper metadata)
  - answerFlags (wrong answer reports)
  - notesGenerated (status of AI notes)
  - handlers: onBack, startSession
```

### Pattern 2: Marked-Script Annotation via Paragraph Reference Mapping

**What:** Each question has a `paragraphRef` field (integer, 1-indexed). The passage is rendered as HTML paragraphs. We can:

1. Parse the passage HTML into an array of paragraph elements
2. Group questions by their `paragraphRef`
3. For each question, determine its status (correct/wrong/partially-correct) using `isQuestionCorrect()` or `checkAnswer()`
4. Render the passage with paragraphs colored/labeled based on associated question results

**When to use:** This is the core of READ-05. The existing `paragraphRef` field was designed for exactly this purpose (see questionGenerator.js line 44: `"paragraphRef": integer (the paragraph number this question targets)`).

**Key insight:** The line number gutter already uses CSS counter on `.reading__passage-text > p` elements. This same DOM structure makes each `<p>` identifiable by index, which maps to `paragraphRef`.

**Example approach:**
```jsx
// In MarkedScriptView.jsx
function parsePassageParagraphs(passageHtml) {
  // Parse the passage HTML, splitting by <p> tags
  // Return array of { html, index } for each paragraph
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${passageHtml}</div>`, 'text/html');
  return Array.from(doc.body.firstElementChild.children)
    .filter(el => el.tagName === 'P')
    .map((el, i) => ({ html: el.innerHTML, index: i + 1 }));
}

function getQuestionsForParagraph(questions, paragraphRef) {
  return questions.filter(q => q.paragraphRef === paragraphRef);
}

function getQuestionStatus(question, userAnswers) {
  // Use existing checkAnswer from answerChecking.js
  return checkAnswer(question, userAnswers[question.id]);
}
```

### Pattern 3: Error Analysis Aggregation (Pure Functions)

**What:** A new utility module `errorPatternAnalysis.js` exports pure functions that take session questions + answers and return structured error analysis data.

**When to use:** Every time the results screen renders or drills are generated.

**Example interface:**
```js
// src/utils/errorPatternAnalysis.js

export function analyzeErrors(questions, answers) {
  return {
    bySkill: aggregateBySkill(questions, answers),
    byType: aggregateByType(questions, answers),
    byPart: aggregateByPart(questions, answers),
    weakestSkill: findWeakest(bySkill),
    weakestType: findWeakest(byType),
    timeAnalysis: analyzeTimeSpent(questions, questionTimers),
    recommendations: generateRecommendationsFromErrors(bySkill, byType),
  };
}

function aggregateBySkill(questions, answers) {
  // Group by skillTested field
  // For each skill: total marks, earned marks, percentage
  // Return sorted weakest-first
}

function aggregateByType(questions, answers) {
  // Group by question type
  // Similar to existing computeSubScores but with richer data
}

function findWeakest(aggregations) {
  // Return the skill/type with lowest percentage
}
```

### Anti-Patterns to Avoid

- **Don't re-parse passage HTML with regex** — The passage is HTML with nested elements. Use DOM parsing (DOMParser or ref-based) to find paragraphs.
- **Don't generate drill questions synchronously** — AI calls take time. Show a loading state and generate in background, similar to the existing `notesGenerated` pattern.
- **Don't mutate the `results` session data** — The session is saved to IndexedDB. Derive analysis from the data rather than adding fields to it.
- **Don't show marked-script and original passage simultaneously** — The marked-script view replaces or augments the original passage in the results view. Don't render both.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error pattern aggregation | Custom aggregation logic | Pure functions in `errorPatternAnalysis.js` | This IS the custom logic — but keep it pure, testable, offline-capable. Don't add AI dependency for something deterministic |
| Drill question generation | Prompt for a whole new question set | `composeFullPrompt()` focused on 2-3 questions of weak types | The existing prompt builders generate full 19-27 question papers. For drills, call the same `composeFullPrompt` with `numQuestions: 3` and limited `typeDist` containing only the student's weak types |
| Passage location mapping | Building a coordinate system | `paragraphRef` field (already exists) | Questions already have `paragraphRef`. Just need to map it to DOM paragraphs |
| Study notes persistence | Building a new storage system | Existing `createNote` with `kind: 'exercise'` | Notes are already saved via `createNote`. The marked-script annotations and error analysis render in the UI — the saved note is supplementary |

**Key insight:** The `paragraphRef` field on questions is the key enabler for the marked-script view. It was designed for this purpose in Phase 2's question generator, but never used for display. This is a direct link between questions and passage locations — no additional mapping infrastructure needed.

## Common Pitfalls

### Pitfall 1: Paragraph-Reference Mismatch
**What goes wrong:** `paragraphRef` values don't match actual `<p>` elements because the passage uses `<h3>`, `<h2>`, or other block elements.
**Why it happens:** The line number CSS counter counts only `> p` elements, but `paragraphRef` from AI generation may point to non-`<p>` content.
**How to avoid:** In `MarkedScriptView`, map question `paragraphRef` values by treating ALL direct children of `.reading__passage-text > *` as referenceable positions. Use index position, not tag type.
**Warning signs:** Highlights appear on wrong paragraphs or are missing entirely.

### Pitfall 2: AI Drill Generation Quality
**What goes wrong:** Generated drill questions are too easy, too hard, or don't target the identified weakness.
**Why it happens:** The AI model (free tier `opencode/deepseek-v4-flash-free`) has limited reasoning capability. A focused prompt may not produce high-quality questions.
**How to avoid:** Use `temperature: 0.7` for drill generation (higher creativity than paper generation). Include the student's actual wrong answers in the prompt as context. Validate generated drills with `validateQuestions()` before display.
**Warning signs:** Student ignores drills, or drills appear irrelevant to their mistakes.

### Pitfall 3: Results Page Performance with Two-Column Annotations
**What goes wrong:** The results page becomes slow or has layout issues when showing the annotated passage alongside analysis panels.
**Why it happens:** The reading module already uses a two-column layout (passage + questions). The results page adds multiple sections that could overflow.
**How to avoid:** Use a single-column scroll layout for results, with collapsible sections (`<details>`). Use the existing `reading__results` container pattern. The annotated marked-script view should be the hero element at the top.
**Warning signs:** Horizontal scrollbars, overlapping elements on tablet.

## Code Examples

### Example 1: Paragraph-to-Question Mapping (MarkedScriptView core logic)

```jsx
// Source: Derived from existing question shape (questionGenerator.js line 44) and
// passage structure (Phase 1 DSE booklet layout in ReadingModule.jsx)

import React, { useMemo } from 'react';
import { checkAnswer } from '../utils/answerChecking';

export default function MarkedScriptView({ passageHtml, questions, userAnswers }) {
  // Parse passage into referenceable blocks
  const paragraphs = useMemo(() => {
    const temp = document.createElement('div');
    temp.innerHTML = passageHtml;
    return Array.from(temp.children).filter(
      el => el.tagName === 'P' || el.tagName === 'H2' || el.tagName === 'H3'
    ).map((el, i) => ({
      index: i + 1,
      html: el.innerHTML,
      tagName: el.tagName,
    }));
  }, [passageHtml]);

  // Group questions by paragraphRef
  const questionMap = useMemo(() => {
    const map = {};
    for (const q of questions) {
      const ref = q.paragraphRef || Math.ceil((questions.indexOf(q) + 1) / 3) || 1;
      if (!map[ref]) map[ref] = [];
      const result = checkAnswer(q, userAnswers[q.id]);
      map[ref].push({ ...q, result });
    }
    return map;
  }, [questions, userAnswers]);

  const getParaAnnotations = (paraIndex) => {
    const qs = questionMap[paraIndex];
    if (!qs?.length) return null;
    const correct = qs.filter(q => q.result.correct);
    const wrong = qs.filter(q => !q.result.correct && q.userAnswer !== null && q.userAnswer !== undefined);
    return { total: qs.length, correct: correct.length, wrong: wrong.length, questions: qs };
  };

  return (
    <div className="marked-script">
      {paragraphs.map((para, i) => {
        const annotations = getParaAnnotations(para.index);
        const hasIssues = annotations?.wrong > 0;
        return (
          <div key={i} className={`marked-script__para ${hasIssues ? 'marked-script__para--has-errors' : ''}`}>
            <div className="marked-script__gutter">
              {annotations && annotations.questions.map((q, qi) => (
                <div key={qi} className={`marked-script__annotation ${q.result.correct ? 'marked-script__annotation--correct' : 'marked-script__annotation--wrong'}`}>
                  <span className="marked-script__annotation-marker">{q.result.correct ? '✓' : '✗'}</span>
                  <span className="marked-script__annotation-text">
                    Q{questions.indexOf(q) + 1} — {q.result.feedback}
                  </span>
                  <span className="marked-script__annotation-marks">
                    [{Math.round(q.result.marksEarned)}/{q.result.maxMarks}m]
                  </span>
                </div>
              ))}
            </div>
            <div className={`marked-script__text ${hasIssues ? 'marked-script__text--highlighted' : ''}`}>
              <para.tagName dangerouslySetInnerHTML={{ __html: para.html }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Example 2: Error Pattern Analysis (Pure Aggregation)

```js
// Source: Extends existing computeSubScores pattern in dseGrading.js (lines 247-266)
// and the skill breakdown in ReadingModule.jsx (lines 649-681)

// src/utils/errorPatternAnalysis.js

const SKILL_LABELS = {
  mainIdea: 'Main Idea',
  detail: 'Detail Retrieval',
  inference: 'Inference',
  vocabInContext: 'Vocabulary in Context',
  tone: 'Tone & Attitude',
  purpose: 'Purpose',
};

export function analyzeBySkill(questions, answers) {
  const bySkill = {};
  for (const q of questions) {
    const skill = q.skillTested || 'other';
    if (!bySkill[skill]) bySkill[skill] = { total: 0, earned: 0, count: 0 };
    bySkill[skill].total += q.marks || 1;
    const result = checkAnswer(q, answers?.[q.id]);
    bySkill[skill].earned += result.marksEarned;
    bySkill[skill].count += 1;
  }

  return Object.entries(bySkill)
    .map(([skill, data]) => ({
      skill,
      label: SKILL_LABELS[skill] || skill,
      percentage: Math.round((data.earned / data.total) * 100),
      total: data.total,
      earned: data.earned,
      count: data.count,
    }))
    .sort((a, b) => a.percentage - b.percentage); // Weakest first
}

export function identifyWeakAreas(bySkill, byType) {
  const weakAreas = [];
  for (const s of bySkill) {
    if (s.percentage < 60) {
      weakAreas.push({
        area: s.label,
        type: 'skill',
        percentage: s.percentage,
        severity: s.percentage < 40 ? 'critical' : 'needs-work',
        recommendation: getSkillRecommendation(s.skill),
      });
    }
  }
  // ... similar for byType
  return weakAreas;
}

function getSkillRecommendation(skill) {
  const recs = {
    inference: 'Practice identifying implied meaning — look for clues the author suggests without stating directly.',
    detail: 'Scan more carefully. Try underlining key names, dates, and numbers as you read.',
    mainIdea: 'Focus on topic sentences — the first and last sentences of each paragraph often contain the main idea.',
    vocabInContext: 'Use context clues: look at surrounding words, synonyms, and antonyms to guess meaning.',
    tone: 'Pay attention to adjectives, adverbs, and figurative language that reveal the author\'s attitude.',
    purpose: 'Ask yourself WHY the author included this information — what effect is it intended to have?',
  };
  return recs[skill] || 'Review this skill area with focused practice.';
}

export function calculateSkillGap(bySkill, targetPercentage = 70) {
  return bySkill
    .filter(s => s.percentage < targetPercentage)
    .map(s => ({
      skill: s.label,
      gap: targetPercentage - s.percentage,
      priority: (targetPercentage - s.percentage) > 30 ? 'high' : 'medium',
    }));
}
```

### Example 3: Drill Generator Prompt

```js
// Source: Extends composeFullPrompt from questionGenerator.js (lines 229-271)
// and the per-type prompt builders

// src/utils/drillGenerator.js

import { composeFullPrompt, buildMCQPrompt, buildTFNGPrompt, buildShortAnswerPrompt } from './questionGenerator';
import { validateQuestions } from './questionValidator';

/**
 * Build a focused drill prompt targeting specific weak areas.
 * @param {string} passagePreview - Plain text passage excerpt
 * @param {Array} weakTypes - Question types student performed poorly on
 * @param {string} part - 'A', 'B1', or 'B2'
 * @param {Array} mistakesContext - Brief descriptions of actual mistakes
 * @returns {string} Focused AI prompt
 */
export function buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext) {
  const typeDist = {};
  const perType = Math.floor(100 / weakTypes.length);
  weakTypes.forEach(t => { typeDist[t] = perType; });

  const mistakeSummary = mistakesContext
    .map(m => `- Q${m.qNum} (${m.type}): Your answer "${m.userAnswer}", correct was "${m.correctAnswer}"`)
    .join('\n');

  return `You are a DSE English tutor creating TARGETED PRACTICE questions.

The student struggled with these question types: ${weakTypes.join(', ')}.
Their actual mistakes were:
${mistakeSummary}

Create 2-3 drill questions targeting their specific weaknesses.
Make each question directly address the skill they found difficult.
Keep stems clear but challenging — these are practice questions, not the real exam.

${composeFullPrompt(passagePreview, 3, part, typeDist)
  .replace(/^You are a DSE.*?TASK: Create.*?questions\./m, '')
  .replace(/^TASK:.*?PASSAGE:/ms, '')}

CRITICAL: Each question MUST be answerable from the passage alone.
Focus on the SKILL the student got wrong, not just the question type.`;
}

export async function generateDrills(passagePreview, weakTypes, part, mistakesContext, callAI) {
  const prompt = buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext);
  const systemMsg = 'You are a DSE English tutor. Generate 2-3 practice questions as a JSON array. Each question matches the format: { stem, type, skillTested, paragraphRef, marks, options, correctAnswer, explanation }.';
  try {
    const raw = await callAI(prompt, { system: systemMsg, temperature: 0.7, maxTokens: 2000, timeout: 30000 });
    const parsed = parseJSONArray(raw);
    if (!parsed?.length) return null;
    const validation = validateQuestions(parsed);
    return validation.valid ? parsed.slice(0, 3) : null;
  } catch {
    return null;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Results inline in ReadingModule.jsx lines 555-761 | Extract to dedicated ReadingResults.jsx | Phase 3 | Cleaner architecture, reusable results component |
| AI notes as opaque HTML via generateReadingNotes() | AI notes + structured annotations for MarkedScriptView | Phase 3 | Marked-script view gets deterministic annotation data; AI notes remain supplementary |
| Per-question review list (correct/wrong) | Per-question review + marked-script passage + error patterns + drills | Phase 3 | Study notes become genuinely useful for learning |

**Deprecated/outdated:**
- Inline `phase === 'results'` JSX in ReadingModule.jsx: Extract to ReadingResults.jsx to keep ReadingModule under control

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `paragraphRef` on questions (integer, 1-indexed) reliably maps to `<p>` element position in passage HTML | Marked-Script View Architecture | **HIGH** — If paragraphRef values are unreliable or consistently wrong, the marked-script view will show annotations on wrong paragraphs. Mitigation: Fall back to partition-based mapping (divide questions evenly across paragraphs) when paragraphRef is missing or inconsistent |
| A2 | AI-generated drills via `callAI` with focused prompt will produce usable questions | Drill Recommendation Approach | **MEDIUM** — The free-tier AI model may produce low-quality drill questions. Mitigation: Validate with `validateQuestions()`, show inline feedback, allow student to dismiss |

## Open Questions

1. **How to handle the marked-script view when `paragraphRef` is unreliable?**
   - What we know: AI-generated questions sometimes lack `paragraphRef` or have inconsistent values.
   - What's unclear: What fallback strategy to use — evenly distribute questions across paragraphs? Use question order?
   - Recommendation: Implement a `resolveParagraphRef(question, questions, totalParagraphs)` function that: (a) uses `paragraphRef` if valid, (b) falls back to proportional distribution if missing. Document this in code.

2. **Should drill questions be answerable inline (within DrillGenerator) or link to a new session?**
   - What we know: Drills are 2-3 focused questions. Starting a new full session for 2-3 questions is overkill.
   - What's unclear: Should drills reuse QuestionRenderer inline, or open a mini-session?
   - Recommendation: **Inline.** Use QuestionRenderer with `showResult: false` initially then `showResult: true` after answer. This matches the existing pattern in the passage-view phase.

3. **Should the marked-script annotation data come from AI or be deterministic?**
   - What we know: AI notes already exist via `generateReadingNotes`. Annotations (which paragraph a question maps to, correct/wrong status) are deterministic.
   - What's unclear: Should AI provide "teacher-style margin comments" or should they be templated?
   - Recommendation: **Hybrid.** Highlight overlays + score annotations are deterministic from `checkAnswer()` results. Teacher-style margin comments can be pulled from existing AI-generated content (distractor deconstruction, TFNG logic matrix) if available, otherwise use templated feedback.

## Implementation Recommendations

### Recommendation 1: Extract ReadingResults.jsx (READ-05, READ-06)

**Files to modify:**
- `src/components/ReadingModule.jsx` — Remove lines 555-761 (`if (phase === 'results')` block), replace with `<ReadingResults>` component
- `src/components/ReadingResults.jsx` — New component receiving props from ReadingModule

**Prop interface:**
```
ReadingResults receives:
- results: sessionData object (from finishSession)
- questions: original question array
- answers: user answer map
- paper: paper metadata
- answerFlags, handleFlagAnswer, handleUnflagAnswer
- notesGenerated status
- onBack, onPracticeAgain handlers
- passageContent: the full passage HTML (for marked-script view)
- questionTimers: per-question timing data (from questionTimersRef)
- createNote, dsePapers, callAI (for drill generation)
```

### Recommendation 2: Build MarkedScriptView.jsx (READ-05)

**Files to create/modify:**
- `src/components/MarkedScriptView.jsx` — New
- `src/App.css` — Add `.marked-script*` CSS classes

**Key design decisions:**
- Passage rendered as two-column: paragraph text (left) + annotations (right)
- Annotations gutter shows per-question indicators (✓/✗, marks, brief comment)
- Auto-scroll to paragraphs with errors
- Collapsible if passage is very long

**CSS patterns to follow:**
- Use the same `reading__passage-text` typography for the passage rendering
- Annotation gutter: 200px width, right side, sticky positioning
- Color palette: green `var(--color-success)` for correct, red `var(--color-error)` for wrong, amber `var(--color-warning)` for partially correct

### Recommendation 3: Build ErrorPatternAnalysis.jsx (READ-05)

**Files to create/modify:**
- `src/components/ErrorPatternAnalysis.jsx` — New
- `src/utils/errorPatternAnalysis.js` — New
- `src/App.css` — Add `.error-pattern*` CSS classes

**Key design decisions:**
- **Reuse existing subscore display pattern:** The existing `.reading__results-subscore*` CSS is designed for exactly this. Use it.
- **Top 3 sections:** (1) Skill breakdown, (2) Question type breakdown, (3) Weak area identification + recommendations
- **Weak area identification:** Show the skill with lowest percentage, the question type with lowest percentage, and specific action items
- **Time analysis:** Which questions took >2x the average time (indicating difficulty)
- **Local storage for trend tracking:** Store per-session error patterns in a new localStorage key `crescendo-reading-error-patterns` so students can see improvement over time (stretch goal)

### Recommendation 4: Build DrillGenerator.jsx (READ-05)

**Files to create/modify:**
- `src/components/DrillGenerator.jsx` — New
- `src/utils/drillGenerator.js` — New
- `src/App.css` — Add `.drill-generator*` CSS classes
- `src/components/QuestionRenderer.jsx` — No changes needed (reuse existing)

**Key design decisions:**
- **Trigger:** After results display, student clicks "Generate Targeted Practice" button
- **State machine:** idle → generating → ready → answering → answered
- **AI prompt:** Use `composeFullPrompt` with `numQuestions: 2-3` and `typeDist` limited to the student's 1-2 weakest types
- **Validation:** Pass generated questions through `validateQuestions()` before display
- **Inline answering:** Use `QuestionRenderer` with `showResult: false` → student answers → toggle `showResult: true`
- **Fallback:** If AI generation fails, show a message with generic practice suggestions (e.g., "Try reviewing vocabulary in context")

### Recommendation 5: DSE Booklet UI/UX on Results (READ-06)

**CSS additions to `src/App.css`:**

1. **Results page booklet styling:**
   - Add the DSE exam framework header (seat number, HKDSE title, year) to the results page
   - Use serif typography for the marked-script passage view to match the passage display
   - Results analysis panels: use the existing `.reading__results-subscores` card pattern

2. **Tablet responsive layout (new media queries):**
   - At `<= 1024px`: The marked-script view collapses from two-column (passage + annotations) to single-column with inline annotations
   - At `<= 1024px`: Error analysis panels stack vertically instead of side-by-side
   - At `<= 768px`: Marked-script annotations appear inline between paragraphs instead of in a gutter
   - Keep the same `reading__questions-col 420px` for the exam-taking view; only the results view changes layout

3. **Part-specific color scheme on results:**
   - Section A results: accent purple/blue (`var(--color-accent)`)
   - Section B1 results: warm orange (`#ff9800`)
   - Section B2 results: pink/red (`#e91e63`)
   - Already implemented in `.reading__results-subscore-bar-fill` per section

### Recommendation 6: Refactor generateReadingNotes (READ-05)

**Files to modify:**
- `src/hooks/useDSEPapers.js` — Lines 1704-1759

**Changes:**
- Keep the AI notes generation as supplementary content saved to a note
- Add a new structured output alongside it: a JSON blob containing per-question annotation data that the MarkedScriptView can use
- The annotation data is deterministic (correct/wrong from checkAnswer) but AI-enhanced comments are bonus

**Alternative:** Don't change generateReadingNotes. Instead, compute annotations entirely on the client side in MarkedScriptView using `checkAnswer()` for each question. This is simpler, works offline, and doesn't require AI for the deterministic parts. Use AI notes only for the supplementary "study notes" saved as a note.

### Recommendation 7: Tablet Layout (READ-06)

**Key constraint:** The current `reading__body` uses side-by-side columns (passage + questions). Tablet screens (768-1024px) may not have enough width for both.

**For results view (tablet):**
- Single-column scroll with the marked-script passage as hero section
- Error analysis panels below in collapsible sections
- Annotation gutter collapses to inline indicators between paragraphs

**Media query additions:**
```css
@media (max-width: 1024px) {
  .reading__results { padding: var(--space-3); }
  .marked-script__gutter { width: auto; position: static; }
  .marked-script__annotation { display: inline-block; margin-right: 4px; }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework detected) |
| Config file | None |
| Quick run command | `npm run build` (build-only check) |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READ-05 | Error pattern analysis computes skill breakdown from questions | Manual | Manual verification | ❌ Wave 0 |
| READ-05 | Drill generator creates 2-3 questions targeting weak types | Manual | Manual verification | ❌ Wave 0 |
| READ-05 | Marked script view shows highlights + annotations | Manual | Manual verification | ❌ Wave 0 |
| READ-06 | Results page renders with DSE booklet styling | Manual | Visual check | ❌ Wave 0 |
| READ-06 | Results page responsive at 768px tablet breakpoint | Manual | Resize browser to 768px | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build`
- **Phase gate:** Build passes + visual verification of all 4 results sections

### Wave 0 Gaps
- No test infrastructure exists. All verification for this phase is manual (visual review + build check).

## Security Domain

> Security enforcement disabled for this phase — all work is frontend-only (React components, CSS, and pure JS utilities). No new API endpoints, data persistence, or user input handling beyond what already exists in ReadingModule.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | no | QuestionRenderer already handles user input for existing types; drills reuse same components |
| V7 Error Handling | no | Existing catch-blank pattern throughout codebase sufficient |

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `src/components/ReadingModule.jsx` (869 lines) — confirmed results phase pattern, question data shape, generateReadingNotes flow
- Codebase analysis of `src/utils/questionTypes.js` — confirmed `skillTested` field, `paragraphRef`, 9 question types
- Codebase analysis of `src/hooks/useDSEPapers.js` lines 1704-1759 — confirmed `generateReadingNotes` prompt structure and AI notes pipeline
- Codebase analysis of `src/App.css` lines 4216-4903 — confirmed all results CSS, passage layout CSS, part-specific colors, exam framework header
- Codebase analysis of Phase 1 + Phase 2 completion reports from STATE.md

### Secondary (MEDIUM confidence)
- Existing `computeSubScores` and skill breakdown in ReadingModule.jsx lines 631-681 — confirmed pattern to extend for error pattern analysis
- `questionGenerator.js` `composeFullPrompt` — confirmed extensible for drill generation with reduced numQuestions

### Tertiary (LOW confidence)
- Reliability of AI free-tier model for drill generation — `[ASSUMED]` based on free tier behavior observed in Phase 1-2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified against codebase
- Architecture: HIGH — extends existing patterns documented in AGENTS.md and codebase
- Pitfalls: MEDIUM — paragraphRef reliability and AI drill quality are unverified assumptions
- UI/UX: HIGH — builds on existing DSE booklet CSS from Phase 1

**Research date:** 2026-06-24
**Valid until:** 2026-07-24
