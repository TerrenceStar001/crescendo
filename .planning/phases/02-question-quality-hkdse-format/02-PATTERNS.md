# Phase 2: Question Quality & HKDSE Format - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 8 new/modified
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/questionTypes.js` | utility / config | config | `src/utils/structuralConstraints.js` | exact |
| `src/utils/answerChecking.js` | utility | transform | `src/utils/dseGrading.js` (isQuestionCorrect) + `src/components/QuestionRenderer.jsx` (isQuestionCorrect) | role-match |
| `src/utils/questionGenerator.js` | utility | CRUD (AI generation) | `src/hooks/useDSEPapers.js` (generatePassage + tryRAGQuestions patterns) | role-match |
| `src/utils/questionValidator.js` | utility | transform (validation pipeline) | `src/hooks/useDSEPapers.js` (validateQuestions, validateQuestionAnswer, ensureNGCount) | exact |
| `src/hooks/useDSEPapers.js` | hook | CRUD (modified) | Same file — extend existing patterns | exact |
| `src/components/QuestionRenderer.jsx` | component | request-response (modified) | Same file — extend existing switch-based renderer | exact |
| `src/components/ReadingModule.jsx` | component | request-response (modified) | Same file — extend results/checking patterns | exact |
| `src/utils/dseGrading.js` | utility | transform (modified) | Same file — extend isQuestionCorrect patterns | exact |

## Pattern Assignments

### `src/utils/questionTypes.js` (utility/config, config)

**Analog:** `src/utils/structuralConstraints.js`

**Exports pattern** (lines 1-4):
```javascript
// Universal structural constraints for AI-generated exam content.
// These correct four patterns where machine-generated text diverges from
// authentic high-tier assessment material (HKDSE Part B2 and equivalent).

export const STRUCTURAL_CONSTRAINTS = `...`;

export const ARGUMENTATION_FLOW = `...`;

export const WORD_COUNT_TARGETS = {
  B1: { label: 'Part B1 - Easier', min: 600, max: 1000, textCount: '2-4' },
  A:  { label: 'Part A - Compulsory', min: 900, max: 1200, textCount: '1-2' },
  B2: { label: 'Part B2 - Harder', min: 1000, max: 1200, textCount: '1-2' },
};

export function getMaxTokensForPart(part) {
  const target = WORD_COUNT_TARGETS[part] || WORD_COUNT_TARGETS.A;
  return Math.ceil(target.max * 1.33);
}

export const TEXT_TYPE_REQUIREMENTS = {
  B1: { types: ['news report', 'blog post', ...], description: '...' },
  A:  { types: ['news report', 'feature article', ...], description: '...' },
  B2: { types: ['opinion piece/editorial', ...], description: '...' },
};

export const PROMPT_ENFORCEMENT_RULES = `...`;
```

**Pattern to copy:** Named exports of constants (UPPER_SNAKE_CASE for config, camelCase for functions). Group related config by part (A/B1/B2). Use descriptive comment blocks at file top. Export as plain uppercase constants + helper functions.

**Specific template for new file:**
```javascript
// Question type distribution, mark allocation, and per-type configuration.
// These define DSE Paper 1 question type proportions and mark schemes.

export const QUESTION_TYPE_DISTRIBUTIONS = {
  B1: { /* ... */ },
  A:  { /* ... */ },
  B2: { /* ... */ },
};

export const MARK_ALLOCATION = {
  marksPerPart: 42,
  questionRange: { min: 19, max: 27 },
  // default: 1 mark per question
};

export const COGNITIVE_TRAP_TYPES = [
  'extreme-wording',
  'similar-sounding',
  'partial-truth',
  'out-of-scope',
  'numerical',
];

export const QUESTION_CATEGORIES = {
  // Level 2-4 foundation types
  // Level 4-5 intermediate types
  // Level 5 advanced types
  // Level 5** highest types
};
```

---

### `src/utils/answerChecking.js` (utility, transform)

**Analog 1:** `src/utils/dseGrading.js` — `isQuestionCorrect` function (lines 199-243)

**Core answer-checking pattern** (lines 199-243):
```javascript
export function isQuestionCorrect(q, answer) {
  if (answer === null || answer === undefined || answer === '') return false;
  switch (q.type) {
    case 'mcq':
    case 'tfng':
      return answer === q.correctAnswer;
    case 'gap-fill': {
      if (q.answers && Array.isArray(q.answers)) {
        if (!answer || typeof answer !== 'object') return false;
        return q.answers.every((a, i) => String(answer[i] || '').toLowerCase().trim() === a.toLowerCase().trim());
      }
      return String(answer).toLowerCase().trim() === String(q.correctAnswer || '').toLowerCase().trim();
    }
    case 'matching': {
      if (!answer || typeof answer !== 'object') return false;
      return (q.pairs || []).every(p => answer[p.item] === p.match);
    }
    case 'short-answer': {
      const userText = String(answer || '').trim();
      if (!userText) return false;
      const correct = String(q.correctAnswer || '').trim();
      if (!correct) return userText.length > 0;
      const keyTerms = correct
        .toLowerCase()
        .split(/[,;/\s]+/)
        .filter(t => t.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'than', 'that', 'they', 'this', 'very', 'what', 'when', 'where', 'which', 'who', 'will', 'with', 'from', 'their', 'there', 'would', 'about', 'into', 'over', 'such', 'your'].includes(t));
      if (keyTerms.length === 0) return userText.length > 0;
      return keyTerms.some(term => userText.toLowerCase().includes(term));
    }
    // ...
  }
}
```

**Analog 2:** `src/components/QuestionRenderer.jsx` — Duplicate `isQuestionCorrect` (lines 297-347).

**Pattern to follow for DSE-style partial marking:**
- Split `isQuestionCorrect` into `checkAnswer(q, answer)` returning `{ correct: boolean, marksEarned: number, maxMarks: number, feedback: string }`.
- Add spelling tolerance via `normalizeAnswer(text)` helper: case-insensitive, article stripping (a/an/the), UK/US variant map.
- For short-answer: support `acceptableAnswers` array in question schema (multiple correct alternatives).
- For open-ended: support `rubric.requiredPoints` — partial marks per point hit.
- Export as pure functions, similar to `dseGrading.js` style.

---

### `src/utils/questionGenerator.js` (utility, CRUD — AI generation)

**Analog:** `src/hooks/useDSEPapers.js` — The AI prompt construction for question generation (lines 1137-1228)

**Prompt construction pattern** (lines 1137-1228):
```javascript
const qPrompt = `You are a DSE English Paper 1 examiner. Below is a reading passage for comprehension assessment.

TASK: Create ${numQuestions} original comprehension questions. ...

CRITICAL — The "type" field MUST be exactly one of these 9 values ...

TFNG RULES (Binary Overhaul):
- The stem MUST be a declarative STATEMENT ending with a period (.) — NOT a question.
- The correctAnswer must be exactly "T", "F", or "NG" (single letter).
- FALSE requires explicit, verifiable contradiction in the text.
- NOT GIVEN applies when a statement is highly plausible
  but simply cannot be verified from the text.
- If you include 4+ TFNG questions, at least 2 MUST be "NG".

MCQ & DISTRACTOR DESIGN (The Distractor Engine):
- The stem MUST be a QUESTION ending with a question mark (?)
- Only ONE option can be correct.
- Design each distractor as one of these cognitive traps:
  * OVER-GENERALIZATION ...
  * TEMPORAL/CAUSAL FLIP ...
  * KEYWORD BAIT ...

For each question output this JSON:
{
  "stem": "question text or statement",
  "type": "mcq | tfng | gap-fill | short-answer | matching | open-ended | ...",
  "skillTested": "mainIdea | detail | inference | vocabInContext | tone | purpose",
  "paragraphRef": integer,
  "marks": integer (1-3),
  "options": [{"label": "A", "text": "option text"}],
  "pairs": [{"item": "1", "match": "C"}, {"item": "2", "match": "A"}],
  "rubric": { "requiredPoints": [...], "unacceptableAnswers": [...] },
  "correctAnswer": "the answer",
  "explanation": "explain with passage reference"
}
Return ONLY a valid JSON array. No other text.

PASSAGE:
${passagePreview}`;
```

**System message pattern** (lines 1233-1234):
```javascript
const systemMsg = 'You are a DSE English Paper 1 examiner creating original comprehension questions. Return ONLY valid JSON array.';
```

**Pattern to follow for per-type prompts:**
- Extract each question type's prompt section into its own template function (e.g., `buildMCQPrompt()`, `buildTFNGPrompt()`, `buildClozePrompt()`).
- Each returns a constraint string fragment that gets composed into the full prompt.
- Keep the same `callAI()` function shape from `useAI.js` (lines 43-87) — returns parsed JSON.
- Keep the same JSON parsing pipeline: `fixAIJSON` -> `parseJSONArray` -> `normalizeQuestion` -> `fixQuestionTypes` -> `validateQuestionAnswer`.

**Generation retry pattern** (lines 1232-1296):
```javascript
async function tryRAGQuestions(basePrompt, maxRetries = 2) {
  const systemMsg = '...';
  let lastQualityWarnings = [];
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let prompt = basePrompt;
    if (attempt > 1) {
      await new Promise(r => setTimeout(r, (attempt - 1) * 1500));
      let retryMsg = '\n\nCRITICAL — Your previous output had the following issues that MUST be fixed:';
      if (lastQualityWarnings.length > 0) {
        retryMsg += '\n- ' + lastQualityWarnings.join('\n- ');
      } else {
        retryMsg += '\n- JSON syntax error...';
      }
      prompt = basePrompt + retryMsg;
    }
    try {
      const raw = await callAI(prompt, {
        system: systemMsg, temperature: attempt === 1 ? 0.3 : 0.2,
        maxTokens: 4000, timeout: 300000
      });
      if (!raw) continue;
      // ... parsing + validation + quality checks ...
    } catch (e) { lastQualityWarnings = []; }
  }
  return null;
}
```

---

### `src/utils/questionValidator.js` (utility, transform)

**Analog 1:** `src/hooks/useDSEPapers.js` — `validateQuestions` (lines 301-393)

**Validation pipeline pattern** (lines 301-393):
```javascript
function validateQuestions(questions, passagePlain) {
  const warnings = [];
  if (!questions?.length) return { valid: false, warnings: ['No questions'] };
  const lowerPassage = passagePlain.replace(/<[^>]+>/g, '').toLowerCase();

  // 1. NG count check
  const tfngQuestions = questions.filter(q => q.type === 'tfng');
  if (tfngQuestions.length >= 4) {
    const ngCount = tfngQuestions.filter(q => /^ng$/i.test((q.correctAnswer || '').trim())).length;
    if (ngCount < 2) { warnings.push(`Need >=2 NG answers in TFNG, got ${ngCount}`); }
  }

  // 2. Paragraph distribution
  const withRef = questions.filter(q => Number.isFinite(q.paragraphRef));
  if (withRef.length >= 5) {
    const maxPara = Math.max(...withRef.map(q => q.paragraphRef));
    if (maxPara > 1) {
      const mid = maxPara / 2;
      const secondHalf = withRef.filter(q => q.paragraphRef > mid).length;
      const rate = secondHalf / withRef.length;
      if (rate < 0.3) { warnings.push(`Uneven distribution: ${Math.round(rate*100)}% from second half`); }
    }
  }

  // 3. Distractor overlap
  for (const q of questions) {
    if (q.type === 'mcq' && q.options?.length >= 2) {
      // check >60% word overlap between any two options
    }
  }

  // 4. Pattern-matching check
  // 5. Truncation check
  // 6. Rubric check for marks >=2
  // 7. Type diversity check

  return { valid: warnings.length === 0, warnings };
}
```

**Analog 2:** `src/hooks/useDSEPapers.js` — `validateQuestionAnswer` (lines 241-281)

**Per-question validation pattern:**
```javascript
function validateQuestionAnswer(q) {
  const type = q.type || 'mcq';
  const stem = (q.stem || '').trim();
  const answer = (q.correctAnswer || '').trim();
  if (!stem || stem.length < 5) return false;
  if (detectTruncatedStem(stem)) return { ...q, stemTruncated: true, answerUnknown: true };
  if (!answer) return { ...q, answerUnknown: true };
  switch (type) {
    case 'mcq':
      if (!/^[A-D]/i.test(answer)) return { ...q, answerUnknown: true };
      break;
    case 'tfng':
      if (!/^(T|F|NG|True|False|Not Given)/i.test(answer)) return { ...q, answerUnknown: true };
      break;
    case 'gap-fill': {
      const words = answer.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      if (words.length === 0) return { ...q, answerUnknown: true };
      break;
    }
    case 'short-answer':
      if (answer.split(/\s+/).filter(Boolean).length > 30) return { ...q, answerUnknown: true };
      break;
    // Add: summary-cloze, pronoun-ref, semantic-connect
    default: return { ...q, answerUnknown: true };
  }
  return q;
}
```

**Analog 3:** `src/hooks/useDSEPapers.js` — `ensureNGCount` (lines 283-299)

**NG constraint pattern:**
```javascript
function ensureNGCount(questions) {
  const tfng = questions.filter(q => q.type === 'tfng');
  if (tfng.length < 4) return questions;
  const ngCount = tfng.filter(q => /^ng$/i.test((q.correctAnswer || '').trim())).length;
  if (ngCount >= 2) return questions;
  const needed = 2 - ngCount;
  let flipped = 0;
  return questions.map(q => {
    if (q.type !== 'tfng') return q;
    if (flipped >= needed) return q;
    if (/^ng$/i.test((q.correctAnswer || '').trim())) return q;
    q.correctAnswer = 'NG';
    q.explanation = (q.explanation || '') + ' [Not explicitly stated in the passage]';
    flipped++;
    return q;
  });
}
```

---

### `src/hooks/useDSEPapers.js` — Modified (hook, CRUD)

**Existing patterns to extend:**
- `generateReadingSession` function (line 1078) already has the hybrid pipeline with question generation at lines 1132-1354.
- Modifications for Phase 2:
  1. Import `questionTypes.js` for distribution config
  2. Import `questionGenerator.js` for per-type prompt templates
  3. Import `questionValidator.js` for validation pipeline
  4. Replace hardcoded type distribution with config-driven approach

**Existing question normalization pipeline** (lines 127-156):
```javascript
function normalizeQuestion(q) {
  const stem = typeof q.stem === 'object' && q.stem !== null
    ? Object.values(q.stem).join(' ') : (q.stem || '');
  let correctAnswer = typeof q.correctAnswer === 'object' && q.correctAnswer !== null
    ? Object.values(q.correctAnswer).join(', ') : (q.correctAnswer || '');
  let options = q.options;
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    options = Object.entries(options).map(([k, v]) => ({
      label: k.replace(/[()]/g, '').trim(), text: String(v)
    }));
  }
  // ... pairs normalization ...
  let rubric = q.rubric;
  if ((q.marks || 1) >= 2 && !rubric) {
    rubric = { requiredPoints: ['see answer key'], unacceptableAnswers: [] };
  }
  return { ...q, stem, correctAnswer, options, pairs, answers, rubric };
}
```

**Session return shape** (lines 1705-1729):
```javascript
const session = {
  id: `${finalSource}_${Date.now()}`,
  type: 'reading',
  source: finalSource === 'dse' ? 'ai-generated' : 'bundled',
  difficulty: partDifficulty,
  createdAt: new Date().toISOString(),
  title: finalTitle,
  passages: [{ id: 'p1', title: finalTitle, content: combined, wordCount }],
  questions: finalQuestions || [],
  sections,
  metadata: {
    topics: [...],
    aiGenerated: ...,
    ragGenerated: ...,
    // source tracking, timeLimit, year, part, etc.
  },
};
```

---

### `src/components/QuestionRenderer.jsx` — Modified (component, request-response)

**Existing switch statement** (lines 274-281):
```javascript
let input;
switch (type) {
  case 'gap-fill': input = <GapFillInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
  case 'tfng': input = <TFNGInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
  case 'short-answer': input = <ShortAnswerInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
  case 'matching': input = <MatchingInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
  case 'open-ended': input = <OpenEndedInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
  default: input = <MCQInput {...{ question: q, value, onSelect, showResult, disabled }} />;
}
```

**Need to add:** `summary-cloze`, `pronoun-ref`, `semantic-connect` cases in switch.

**TYPE_LABELS reference** (lines 3-10):
```javascript
const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  'gap-fill': 'Fill in the Blank',
  tfng: 'True / False / Not Given',
  'short-answer': 'Short Answer',
  matching: 'Matching',
  'open-ended': 'Open-ended',
  // Add:
  'summary-cloze': 'Summary Cloze',
  'pronoun-ref': 'Reference Question',
  'semantic-connect': 'Semantic Matching',
};
```

---

### `src/components/ReadingModule.jsx` — Modified (component, request-response)

**Answer checking in finishSession** (lines 175-246):
```javascript
// Current import:
import QuestionRenderer, { isQuestionCorrect } from './QuestionRenderer';

// Score calculation:
const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
const marksEarned = questions.reduce((s, q) =>
  s + ((isQuestionCorrect(q, answers[q.id]) ? (q.marks || 1) : 0)), 0);
```

**Modifications needed:** Replace `isQuestionCorrect` with DSE-style partial marking:
```javascript
import { checkAnswer } from '../utils/answerChecking';

// In finishSession:
const marksEarned = questions.reduce((s, q) => {
  const result = checkAnswer(q, answers[q.id]);
  return s + result.marksEarned;
}, 0);
```

---

### `src/utils/dseGrading.js` — Modified (utility, transform)

**Existing `isQuestionCorrect`** (lines 199-243): Exact same logic as in `QuestionRenderer.jsx`. Will be consolidated into `answerChecking.js`.

**Existing `computeSubScores`** (lines 245-265) — already supports per-type breakdown:
```javascript
export function computeSubScores(skill, questions, answers) {
  if (!questions?.length) return {};
  const subScores = {};
  const counts = {};
  for (const q of questions) {
    const type = q.type || 'mcq';
    if (subScores[type] === undefined) { subScores[type] = 0; counts[type] = 0; }
    counts[type] += q.marks || 1;
    if (isQuestionCorrect(q, answers?.[q.id])) {
      subScores[type] += q.marks || 1;
    }
  }
  const result = {};
  for (const [type, earned] of Object.entries(subScores)) {
    result[type] = Math.round((earned / counts[type]) * 100);
  }
  return result;
}
```

**Modification:** Update to use `checkAnswer` from `answerChecking.js` for partial marks.

---

## Shared Patterns

### Question Normalization Pipeline
**Source:** `src/hooks/useDSEPapers.js` — `normalizeQuestion()`, `fixQuestionTypes()`, `validateQuestionAnswer()` (lines 127-281)
**Apply to:** `src/utils/questionGenerator.js`, `src/utils/questionValidator.js`

Standard pipeline flow:
1. `normalizeQuestion(q)` — flatten stem/options/pairs from AI's varied output formats (object->array conversions)
2. `fixQuestionTypes(q)` — fix type-skill confusion, validate type against VALID_TYPES set, normalize TFNG/MCQ/matching
3. `validateQuestionAnswer(q)` — validate per-type answer format, mark unknown answers

### AI JSON Parsing
**Source:** `src/hooks/useDSEPapers.js` — `parseJSONArray`, `fixAIJSON`, `parseJSONObject` (lines 6-125)
**Apply to:** `src/utils/questionGenerator.js`

All AI generation functions must pipe raw AI output through:
1. Strip markdown code fences: `raw.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim()`
2. Extract JSON array via regex: `cleaned.match(/\[[\s\S]*\]/)`
3. Parse with `fixAIJSON` fallback for malformed JSON
4. Handle retry with exponential backoff: `await new Promise(r => setTimeout(r, (attempt-1)*1500))`

### Generation Retry with Quality Feedback
**Source:** `src/hooks/useDSEPapers.js` — `tryGenerateQuestions` (lines 1232-1296, 1501-1567)
**Apply to:** `src/utils/questionGenerator.js`

Retry loop:
1. Attempt with `temperature: 0.3`, `maxTokens: 4000`, `timeout: 300000`
2. On parse failure or quality warning, inject retry instruction
3. Retry with `temperature: 0.2` (lower = more deterministic)
4. Accept on final attempt even with minor warnings

### CallAI Function Signature
**Source:** `src/hooks/useAI.js` — `callAI()` (lines 43-87)
**Apply to:** All question generation functions

Standard AI call shape used throughout:
```javascript
const raw = await callAI(prompt, {
  system: systemMsg,
  temperature: 0.3,
  maxTokens: 4000,
  timeout: 300000,
});
```

The `callAI` function wraps `fetch()` with `AbortController` + timeout (lines 44-46) and returns the parsed JSON response `data.choices[0].message.content`.

## No Analog Found

All files have close analogs in the existing codebase.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | | | All files have existing analogs |

## Metadata

**Analog search scope:** `src/utils/`, `src/hooks/`, `src/components/`
**Files scanned:** 8 source files
**Pattern extraction date:** 2026-06-24
