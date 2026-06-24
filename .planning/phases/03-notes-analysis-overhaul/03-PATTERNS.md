# Phase 3: Notes & Analysis Overhaul — Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 10 new/modified
**Analogs found:** 8 / 8 with matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ReadingResults.jsx` | component | request-response | `ReadingModule.jsx` lines 555-761 (results phase block) | exact — extracted from same file |
| `src/components/MarkedScriptView.jsx` | component | request-response | `ReadingModule.jsx` lines 436-443 (passage render) + `QuestionRenderer.jsx` lines 29-65 (MCQ correct/wrong display) | role-match |
| `src/components/ErrorPatternAnalysis.jsx` | component | request-response | `ReadingModule.jsx` lines 631-681 (subscores + skill breakdown) | exact — direct inspiration |
| `src/components/DrillGenerator.jsx` | component | request-response + AI | `ReadingModule.jsx` lines 237-248 (notes generation trigger) + `useDSEPapers.js` lines 1704-1759 (generateReadingNotes) | role-match |
| `src/utils/errorPatternAnalysis.js` | utility | CRUD | `dseGrading.js` lines 247-266 (`computeSubScores`) + lines 302-356 (`generateRecommendations`) | exact — same aggregation pattern |
| `src/utils/drillGenerator.js` | utility | transform | `questionGenerator.js` lines 229-271 (`composeFullPrompt`) | exact — extends prompt builder pattern |
| `src/components/ReadingModule.jsx` | component (modify) | CRUD | — (self, lines 555-761 need extraction) | N/A |
| `src/App.css` | config (modify) | — | Existing `.reading__results*` (lines 4644-4903) + `.reading__passage-text*` (lines 4310-4348) | exact — same conventions |

## Pattern Assignments

### `src/components/ReadingResults.jsx` (component, request-response)

**Analog:** `src/components/ReadingModule.jsx` — lines 555-761 (results phase block)

**Component signature pattern** (ReadingModule.jsx line 6):
```jsx
export default function ReadingModule({ dsePapers, skillAnalytics, callAI, notes, createNote, onBack }) {
```

**Implied signature for ReadingResults:**
```jsx
export default function ReadingResults({
  results, questions, answers, paper,
  passageContent, questionTimers,
  answerFlags, handleFlagAnswer, handleUnflagAnswer,
  notesGenerated, generateReadingNotes, createNote, callAI,
  onBack, onPracticeAgain
}) {
```

**Container pattern** (ReadingModule.jsx lines 558-562):
```jsx
if (phase === 'results') {
    if (!results) return null;
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => { setPhase('start'); setPaper(null); }}>← Back</button>
          <h1 className="dse-module__title">📊 Results</h1>
        </div>
```

**Results summary ring pattern** (ReadingModule.jsx lines 565-587):
```jsx
<div className="reading__results-summary">
  <div className="reading__results-ring" style={{ '--pct': results.percentage, '--color': results.percentage >= 80 ? 'var(--color-success)' : results.percentage >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}>
    <svg viewBox="0 0 36 36" className="reading__results-svg">
      <path className="reading__results-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      <path className="reading__results-fill" strokeDasharray={`${results.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      <text x="18" y="20.5" className="reading__results-text" textAnchor="middle">{results.percentage}%</text>
    </svg>
  </div>
  <div className="reading__results-stats">
    <div className="reading__results-stat">
      <span className="reading__results-stat-value">{results.score}/{results.totalQuestions}</span>
      <span className="reading__results-stat-label">Marks</span>
    </div>
    {/* DSE Level stat */}
    {/* Time stat */}
  </div>
</div>
```

**ReadingResults should compose sub-components** as `<details>` collapsible sections:
```jsx
// Composes sub-views (model after existing <details> pattern at line 354-383)
<details className="reading__history" open>
  <summary className="reading__history-summary">
    📜 Past Sessions ({pastSessions.length})
  </summary>
  {/* ... content */}
</details>
```

---

### `src/components/MarkedScriptView.jsx` (component, request-response)

**Analog:** `ReadingModule.jsx` lines 436-443 (passage render) + `QuestionRenderer.jsx` lines 29-65 (MCQ correct/wrong display)

**Imports pattern:**
```jsx
import React, { useMemo } from 'react';
import { checkAnswer } from '../utils/answerChecking';
```

**Passage rendering pattern** (ReadingModule.jsx lines 436-443):
```jsx
<div className="reading__passage-body">
  <div className="reading__line-gutter" aria-hidden="true">
    {/* Line numbers injected by CSS counter — no JS needed */}
  </div>
  <div className="reading__passage-text">
    <div dangerouslySetInnerHTML={{ __html: currentPassage?.content || '' }} />
  </div>
</div>
```

**Parsing passage HTML pattern** — DOMParser for client-side paragraph extraction:
```jsx
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
```

**Question-to-paragraph mapping pattern:** Use `checkAnswer()` from answerChecking.js and the `paragraphRef` field on questions:
```jsx
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
```

**Correct/wrong indicator pattern** — use Unicode markers + CSS modifiers (from MCQQuestion.jsx lines 44-48):
```jsx
{isCorrect && showResult && <span className="mcq__option-icon">{'\u2713'}</span>}
{isWrong && <span className="mcq__option-icon">{'\u2717'}</span>}
```

**Result status classes pattern** (ReadingModule.jsx lines 694-697):
```jsx
<div className={`reading__results-review-item ${correct ? '' : 'reading__results-review-item--wrong'}`}>
  <span className={`reading__results-review-status ${correct ? 'reading__results-review-status--correct' : 'reading__results-review-status--wrong'}`}>
    {correct ? '\u2713' : '\u2717'}
  </span>
```

---

### `src/components/ErrorPatternAnalysis.jsx` (component, request-response)

**Analog:** `ReadingModule.jsx` lines 631-681 (subscores + skill breakdown) + lines 649-681 (skill breakdown section)

**Imports pattern:**
```jsx
import React, { useMemo } from 'react';
import { isQuestionCorrect } from '../utils/dseGrading';
```

**Subscore bar pattern** — reuse `.reading__results-subscore*` classes (ReadingModule.jsx lines 634-646):
```jsx
{Object.entries(results.subScores).map(([type, score]) => (
  <div key={type} className="reading__results-subscore">
    <span className="reading__results-subscore-label">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
    <div className="reading__results-subscore-bar-bg">
      <div className="reading__results-subscore-bar-fill" style={{
        width: `${score}%`,
        background: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-error)',
      }} />
    </div>
    <span className="reading__results-subscore-value">{score}%</span>
  </div>
))}
```

**Skill breakdown pattern** (ReadingModule.jsx lines 649-681):
```jsx
const skillScores = {};
const skillCounts = {};
for (const q of skillQuestions) {
  const sk = q.skillTested;
  if (skillScores[sk] === undefined) { skillScores[sk] = 0; skillCounts[sk] = 0; }
  skillCounts[sk] += q.marks || 1;
  if (isQuestionCorrect(q, answers[q.id])) skillScores[sk] += q.marks || 1;
}
```

**Section breakdown with part-specific colors** (ReadingModule.jsx lines 619-622):
```jsx
<div className="reading__results-subscore-bar-fill" style={{
  width: `${sectionPct}%`,
  background: section === 'A' ? 'var(--color-accent)' : section === 'B1' ? '#ff9800' : '#e91e63',
}} />
```

---

### `src/components/DrillGenerator.jsx` (component, request-response + AI)

**Analog:** `ReadingModule.jsx` lines 237-248 (notes generation trigger) + `useDSEPapers.js` lines 1704-1759 (AI generation pattern)

**Imports pattern:**
```jsx
import React, { useState, useCallback } from 'react';
import QuestionRenderer from './QuestionRenderer';
import { generateDrills } from '../utils/drillGenerator';
```

**State machine pattern for AI generation** (model after ReadingModule.jsx notes generation, lines 237-248):
```jsx
const [drillState, setDrillState] = useState('idle'); // idle | generating | ready | answering | answered | failed
const [drills, setDrills] = useState([]);

const handleGenerateDrills = useCallback(async () => {
  setDrillState('generating');
  try {
    const generated = await generateDrills(
      passagePreview, weakTypes, part, mistakesContext, callAI
    );
    if (generated?.length) {
      setDrills(generated);
      setDrillState('ready');
    } else {
      setDrillState('failed');
    }
  } catch {
    setDrillState('failed');
  }
}, [passagePreview, weakTypes, part, mistakesContext, callAI]);
```

**AI generation trigger pattern** — effect-based background generation (ReadingModule.jsx lines 260-294):
```jsx
useEffect(() => {
    const data = notesGenDataRef.current;
    if (!data) return;
    notesGenDataRef.current = null;
    let cancelled = false;
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) { setNotesGenerated(false); cancelled = true; }
    }, 50000);
    data.generateReadingNotes(data.passageText, data.questions, data.answers, data.timers, data.callAI)
      .then(noteContent => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        // ...handle success
        setNotesGenerated(true);
      })
      .catch(e => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        console.warn('[DSE] Notes generation error:', e?.message || e);
        setNotesGenerated(false);
      });
    return () => { cancelled = true; };
  }, [phase]);
```

**UI state branches pattern** (ReadingModule.jsx lines 737-751):
```jsx
{drillState === 'generating' && (
  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 8 }}>
    ⏳ Generating targeted practice questions...
  </div>
)}
{drillState === 'failed' && (
  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 8 }}>
    Practice questions could not be generated.
    <button onClick={handleGenerateDrills}>Try Again</button>
  </div>
)}
```

**Button pattern** (ReadingModule.jsx lines 752-757):
```jsx
<div className="reading__results-actions">
  <button className="reading__results-btn">← Back</button>
  <button className="reading__results-btn reading__results-btn--primary" onClick={handlePractice}>
    🔄 Practice Again
  </button>
</div>
```

---

### `src/utils/errorPatternAnalysis.js` (utility, CRUD)

**Analog:** `src/utils/dseGrading.js` — pure function aggregation pattern

**Imports pattern:**
```js
import { checkAnswer } from './answerChecking';
```

**Module structure pattern** — named pure functions, module-level constants, no side effects (dseGrading.js lines 1-5):
```js
import { checkAnswer } from './answerChecking';

const SKILL_LABELS = {
  mainIdea: 'Main Idea',
  detail: 'Detail Retrieval',
  inference: 'Inference',
  vocabInContext: 'Vocabulary in Context',
  tone: 'Tone & Attitude',
  purpose: 'Purpose',
};

export function analyzeBySkill(questions, answers) {
  // Pure aggregation — input questions/output analysis
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
      skill, label: SKILL_LABELS[skill] || skill,
      percentage: Math.round((data.earned / data.total) * 100),
      total: data.total, earned: data.earned, count: data.count,
    }))
    .sort((a, b) => a.percentage - b.percentage);
}
```

**Named exports pattern** (dseGrading.js lines 69, 85, 90, 94, 247, 302):
```js
export function analyzeBySkill(questions, answers) { ... }
export function identifyWeakAreas(bySkill, byType) { ... }
export function calculateSkillGap(bySkill, targetPercentage = 70) { ... }
```

**Constant + function composition pattern** (questionTypes.js lines 11-43):
```js
export const QUESTION_TYPE_DISTRIBUTIONS = { A: { ... }, B1: { ... }, B2: { ... } };
```

---

### `src/utils/drillGenerator.js` (utility, transform)

**Analog:** `src/utils/questionGenerator.js` — prompt builder pattern

**Imports pattern:**
```js
import { composeFullPrompt, buildMCQPrompt, buildTFNGPrompt, buildShortAnswerPrompt } from './questionGenerator';
import { validateQuestions } from './questionValidator';
```

**Prompt builder pattern** (questionGenerator.js lines 229-271):
```js
export function buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext) {
  return `You are a DSE English tutor creating TARGETED PRACTICE questions.
The student struggled with: ${weakTypes.join(', ')}.
Their mistakes: ${mistakeSummary}
Create 2-3 drill questions targeting specific weaknesses.
${composeFullPrompt(passagePreview, 3, part, typeDist).replace(...)}
CRITICAL: Each question MUST be answerable from the passage alone.`;
}
```

**AI call wrapper pattern** (model after useDSEPapers.js lines 1748-1758):
```js
export async function generateDrills(passagePreview, weakTypes, part, mistakesContext, callAI) {
  const prompt = buildDrillPrompt(passagePreview, weakTypes, part, mistakesContext);
  const systemMsg = 'You are a DSE English tutor. Return a JSON array of 2-3 drill questions.';
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

---

### `src/App.css` — New CSS Sections (config/modify, request-response)

**Analog:** Existing `.reading__results*` rules (lines 4644-4903) + `.reading__passage-text*` (lines 4310-4348)

**BEM class naming pattern** — all new CSS follows existing conventions (from lines 4719-4768):
```css
/* Block component */
.reading__results-subscores {}

/* Element — double underscore */
.reading__results-subscore {}
.reading__results-subscore-label {}
.reading__results-subscore-bar-bg {}
.reading__results-subscore-bar-fill {}
.reading__results-subscore-value {}

/* Modifier — double dash */
.reading__results-subscore-bar-fill { background: ... }
.reading__results-btn--primary { background: var(--color-accent); }
.reading__results-review-item--wrong { border-left-color: var(--color-error); }
```

**New section header pattern** — match existing comment style (line 4363):
```css
/* ===== Marked Script View ===== */
.marked-script {}
.marked-script__para {}
.marked-script__para--has-errors {}
.marked-script__para--all-correct {}
.marked-script__gutter {}
.marked-script__annotation {}
.marked-script__annotation--correct {}
.marked-script__annotation--wrong {}
.marked-script__annotation--partial {}
.marked-script__annotation-marker {}
.marked-script__annotation-text {}
.marked-script__annotation-marks {}
.marked-script__text {}
.marked-script__text--highlighted {}
.marked-script__empty {}

/* ===== Error Pattern Analysis ===== */
.error-pattern {}
.error-pattern__card {}
.error-pattern__card--skill {}
.error-pattern__card--type {}
.error-pattern__card--weakness {}
.error-pattern__row {}
.error-pattern__label {}
.error-pattern__bar-bg {}
.error-pattern__bar-fill {}
.error-pattern__value {}
.error-pattern__weakest-badge {}
.error-pattern__recommendation {}

/* ===== Drill Generator ===== */
.drill-generator {}
.drill-generator__card {}
.drill-generator__cta {}
.drill-generator__loading {}
.drill-generator__error {}
.drill-generator__question {}
.drill-generator__actions {}
```

**Color usage pattern** — use CSS custom properties consistently (passage uses serif on results too):
```css
.marked-script__annotation--correct {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-left: 3px solid var(--color-success);
}
.marked-script__annotation--wrong {
  background: var(--color-error-bg);
  color: var(--color-error);
  border-left: 3px solid var(--color-error);
}
.marked-script__annotation--partial {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border-left: 3px solid var(--color-warning);
}
```

**Passage text on results — reuse serif typography** (App.css lines 4310-4328):
```css
.marked-script__text {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  text-align: justify;
}
.marked-script__text p {
  text-indent: 2em;
  margin-bottom: 0;
  margin-top: 0;
}
```

---

## Shared Patterns

### Phase State Machine
**Source:** `ReadingModule.jsx` lines 7-22
**Apply to:** `ReadingResults.jsx` (parent orchestrator), `DrillGenerator.jsx` (internal state machine)
```jsx
const [phase, setPhase] = useState('start');
// Phases: 'start' | 'passage-view' | 'results' | 'history-review'

// Guard clause pattern — early return if state doesn't match
if (phase === 'start') { return (...); }
if (phase === 'passage-view') { return (...); }
if (phase === 'results') { return (...); }
```

### Import Conventions
**Source:** All components in `src/components/`
**Apply to:** All new component files

| Pattern | Example | Source |
|---------|---------|--------|
| React import | `import React, { useState, useMemo, useCallback } from 'react';` | ReadingModule.jsx:1 |
| Component import (no curly braces) | `import QuestionRenderer from './QuestionRenderer';` | ReadingModule.jsx:2 |
| Utility import (named exports) | `import { computeWeightedScore, isQuestionCorrect } from '../utils/dseGrading';` | ReadingModule.jsx:3 |
| Utility import (named exports) | `import { computeScore } from '../utils/answerChecking';` | ReadingModule.jsx:4 |
| Hook import | `import { useNotes } from '../hooks/useNotes';` | (established pattern) |

### Error Handling
**Source:** Throughout codebase
**Apply to:** All new components and utilities

```jsx
// Pattern 1: Silent catch (used for non-critical storage/optional calls)
try { ... } catch { /* silent */ }

// Pattern 2: Console warn for AI failures
try { ... } catch (e) { console.warn('[DSE] Error:', e?.message || e); }

// Pattern 3: Guard clause early return
if (!results) return null;
if (!questions?.length) return {};
```

### Container/Sub-component Props Pattern
**Source:** `ReadingModule.jsx` → `QuestionRenderer` (line 514-521)
**Apply to:** All sub-components created in this phase

```jsx
<QuestionRenderer
  question={questions[currentQuestion]}
  number={currentQuestion + 1}
  value={answers[questions[currentQuestion]?.id] || null}
  onSelect={handleAnswer}
  showResult={false}
  disabled={false}
/>
```

### AI Call Pattern
**Source:** `useDSEPapers.js` lines 1748-1749, `ReadingModule.jsx` lines 272-283
**Apply to:** `DrillGenerator.jsx`, `ReadingResults.jsx`

```js
// AI endpoint call pattern
const raw = await callAI(prompt, {
  system: systemMsg,
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 30000
});
```

### Guard Clause / Null Return Pattern
**Source:** `ReadingModule.jsx` lines 556, 764; `QuestionRenderer.jsx` line 437
**Apply to:** All new components

```jsx
export default function MyComponent({ requiredProp }) {
  if (!requiredProp) return null;  // Guard clause
  // ...render
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All 8 new/modified files have direct analogs in existing codebase |

## Metadata

**Analog search scope:** `src/components/`, `src/utils/`, `src/hooks/`, `src/App.css`
**Files scanned:** 12 source files + 3 planning docs
**Pattern extraction date:** 2026-06-24
