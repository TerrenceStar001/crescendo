# Phase 5: Writing Examiner Insights - Pattern Map

**Mapped:** 2026-06-27
**Files analyzed:** 9 (6 new, 3 modified)
**Analogs found:** 8 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/hkeaaWritingRubrics.js` | utility | constants | `src/utils/structuralConstraints.js` | exact |
| `src/utils/formatConventions.js` | utility | constants | `src/utils/structuralConstraints.js` | exact |
| `src/utils/ieltsToDseMap.js` | utility | config-bounds | `src/utils/dseGrading.js` (getStoredBoundaries) | exact |
| `src/components/RubricDisplay.jsx` | component | request-response | `src/components/SkillRing.jsx` | role-match |
| `src/components/ErrorAnnotation.jsx` | component | request-response | `src/components/MarkedScriptView.jsx` | exact |
| `src/components/FormatChecker.jsx` | component | request-response | `src/components/ErrorPatternAnalysis.jsx` | role-match |
| `src/hooks/useDSEPapers.js` (modify) | hook | CRUD | self: existing build/parse/combine (lines 1749-2103) | self |
| `src/components/WritingModule.jsx` (modify) | component | request-response | self: existing renderCorrectionBlock (lines 614-837) | self |
| `src/utils/dseGrading.js` (modify) | utility | config-bounds | self: existing get/set boundaries (lines 70-93) | self |

## Pattern Assignments

### `src/utils/hkeaaWritingRubrics.js` (utility, constants)

**Analog:** `src/utils/structuralConstraints.js`

**Imports pattern:** No imports needed — pure JS constants file.

**Core pattern — exported constant objects** (lines 17-28, 30-34):
```javascript
export const WORD_COUNT_TARGETS = {
  B1: { label: 'Part B1 — Easier', min: 600, max: 1000, textCount: '2-4' },
  A:  { label: 'Part A — Compulsory', min: 900, max: 1200, textCount: '1-2' },
  B2: { label: 'Part B2 — Harder', min: 1000, max: 1200, textCount: '1-2' },
};

export const TEXT_TYPE_REQUIREMENTS = {
  B1: { types: ['news report', 'blog post', ...], description: '...' },
  // ...
};
```

**Exact structure to follow for `hkeaaWritingRubrics.js`:**
```javascript
// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
export const CONTENT_DESCRIPTORS = {
  7: "Fully satisfies all task requirements; ideas are highly relevant, well-developed, and sustained throughout; audience and purpose clearly addressed",
  6: "Relevant, well-developed, clear purpose, mostly engaging, some specific evidence",
  // ... 5, 4, 3, 2, 1
};

export const ORGANISATION_DESCRIPTORS = { /* same 1-7 bands */ };
export const LANGUAGE_DESCRIPTORS = { /* same 1-7 bands */ };
```

**Export pattern** (lines 109, 116):
```javascript
export const GENRE_TEMPLATES = { ... };
export const PROMPT_ENFORCEMENT_RULES = `...`;
```
→ Use named exports for each descriptor group.

---

### `src/utils/formatConventions.js` (utility, constants)

**Analog:** `src/utils/structuralConstraints.js` (lines 30-106)

**Core pattern — per-text-type configuration objects** (lines 36-106):
```javascript
export const GENRE_TEMPLATES = {
  'news report': {
    structure: 'Inverted pyramid: lead paragraph with who/what/when/where...',
    voice: 'Journalistic — third person, attribution to named sources...',
    features: 'Direct quotes from officials/residents, statistics...'
  },
  'feature article': { /* ... */ },
  // ...
};
```

**Exact structure to follow for `formatConventions.js`:**
```javascript
export const PART_A_FORMAT_RULES = {
  letter: {
    requiredElements: ['salutation', 'opening_purpose', 'body_points', 'closing_formula', 'signature'],
    register: 'formal or semi-formal',
    wordRange: '140-180',
    commonErrors: ['missing closing formula', 'wrong salutation for recipient relationship', 'informal contractions in formal letter']
  },
  email: { /* ... */ },
  proposal: { /* ... */ },
  speech: { /* ... */ },
  article: { /* ... */ },
  report: { /* ... */ },
  blog: { /* ... */ },
};
```

**Deterministic check helpers** (follow checkPartAFormat approach from `useDSEPapers.js:1979-2008`):
```javascript
export function checkRequiredElements(text, textType) {
  const rules = PART_A_FORMAT_RULES[textType];
  if (!rules) return { valid: true, issues: [] };
  // Check each requiredElement exists in text
  // Return { valid, issues[] }
}

export function estimateRegister(text) {
  // Heuristic: formal/informal markers
  // Return 'formal' | 'semi-formal' | 'informal'
}
```

---

### `src/utils/ieltsToDseMap.js` (utility, config-bounds)

**Analog:** `src/utils/dseGrading.js` (lines 55-93)

**Storage key pattern** (lines 55, 70-93):
```javascript
const BOUNDARIES_KEY = 'crescendo-dse-boundaries';

export function getStoredBoundaries() {
  try {
    const raw = localStorage.getItem(BOUNDARIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // handle migration...
      return parsed;
    }
  } catch {}
  return PER_SKILL_DEFAULTS;
}

export function storeBoundaries(b) {
  localStorage.setItem(BOUNDARIES_KEY, JSON.stringify(b));
}
```

**Exact structure to follow for `ieltsToDseMap.js`:**
```javascript
const STORAGE_KEY = 'crescendo-ielts-dse-map';

// Default conversion table — IELTS band → HKEAA score mapping
const DEFAULT_IELTS_TO_DSE = {
  ta: { /* IELTS Task Achievement → HKEAA Content (0-7) */ },
  cc: { /* Coherence & Cohesion → HKEAA Organisation (0-7) */ },
  lr: { /* Lexical Resource → HKEAA Language component */ },
  gra: { /* Grammatical Range & Accuracy → HKEAA Language component */ },
};

export function getIeltsToDseMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_IELTS_TO_DSE;
}

export function storeIeltsToDseMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function convertToHkeaa(ieltsScores, map) {
  // ieltsScores: { ta: 7.0, cc: 6.5, lr: 6.0, gra: 6.5 }
  // Returns: { content: 6, organisation: 5, language: 5 }
}
```

---

### `src/components/RubricDisplay.jsx` (component, request-response)

**Analog:** `src/components/SkillRing.jsx` + `src/components/ErrorPatternAnalysis.jsx`

**Imports pattern** (SkillRing lines 1-2):
```jsx
import React from 'react';
import { dseLevelColor } from '../utils/dseGrading';
```

**Component export pattern** (SkillRing line 4, ErrorPatternAnalysis line 12):
```jsx
export default function SkillRing({ skill, percentage, dseLevel, size = 110, strokeWidth = 6, onClick, animated = true }) {
```

**CSS BEM class pattern** (ErrorPatternAnalysis lines 29-101, SkillRing lines 16-57):
```jsx
// BEM: component__element--modifier
return (
  <div className="error-pattern">
    <div className="error-pattern__card error-pattern__card--skill">
      <h4 className="error-pattern__header">Skill Breakdown</h4>
      {items.map(...)}
    </div>
  </div>
);
```

**Exact structure for `RubricDisplay.jsx` — Extraction target: WritingModule.jsx lines 641-661:**
```jsx
import React from 'react';

export default function RubricDisplay({ scores, feedbacks, showDescriptors = false }) {
  // scores: { content: 5, organization: 4, language: 6 }
  // feedbacks: { content: "...", organization: "...", language: "..." }
  return (
    <div className="rubric-display">
      {['content', 'organization', 'language'].map(cat => (
        <div key={cat} className="rubric-display__item">
          <div className="rubric-display__header">
            <span className="rubric-display__name">
              {cat === 'content' ? 'Content' : cat === 'organization' ? 'Organisation' : 'Language'}
            </span>
            <span className="rubric-display__score">{scores[cat]}/7</span>
          </div>
          <div className="rubric-display__bar-bg">
            <div className="rubric-display__fill"
              style={{
                width: `${(scores[cat] / 7) * 100}%`,
                background: scores[cat] >= 5 ? 'var(--color-success)' : scores[cat] >= 4 ? 'var(--color-warning)' : 'var(--color-error)',
              }}
            />
          </div>
          {feedbacks[cat] && <div className="rubric-display__feedback">{feedbacks[cat]}</div>}
        </div>
      ))}
    </div>
  );
}
```

**Early return pattern** (ErrorPatternAnalysis line 13, MarkedScriptView line 5):
```jsx
if (!questions?.length) return null;
```

---

### `src/components/ErrorAnnotation.jsx` (component, request-response)

**Analog:** `src/components/MarkedScriptView.jsx` (lines 78-137)

**Imports pattern:**
```jsx
import React, { useMemo } from 'react';
```

**Core pattern — inline annotation rendering** (MarkedScriptView lines 78-137):
```jsx
return (
  <div className="marked-script">
    {items.map((item, i) => {
      const annotations = item.isContent ? (questionMap[item.paraNum] || []) : [];
      return (
        <div key={i} className={`marked-script__para${annotations.length > 0 ? ' marked-script__para--has-errors' : ''}`}>
          <p dangerouslySetInnerHTML={{ __html: item.html }} />
          {annotations.map((ann, qi) => (
            <div key={qi} className={`marked-script__annotation ${modClass}`}>
              <span className="marked-script__annotation-marker">...</span>
              <span className="marked-script__annotation-text">...</span>
            </div>
          ))}
        </div>
      );
    })}
  </div>
);
```

**Exact extraction target: WritingModule.jsx lines 707-741 (inline annotation logic):**
```jsx
export default function ErrorAnnotation({ essayHTML, inlineAnnotations }) {
  if (!inlineAnnotations?.length) return null;

  // Strip HTML to plain text, then inject span markers
  const plainText = essayHTML.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
  // Build annotated text with annotation markers
  // ...

  return (
    <div className="writing__annotated-essay">
      <h3 className="writing__annotated-essay-header">Your Essay with Annotations</h3>
      <div className="writing__annotated-essay-body">
        {annotatedParts.map((part, i) => (
          <React.Fragment key={i}>
            {part.text}
            {part.annotation && (
              <span className={`writing__annotation writing__annotation--${part.annotation.type}`}
                title={`${part.annotation.type}: '${part.annotation.text}' → '${part.annotation.replacement}'`}
              >
                {part.annotation.text}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

---

### `src/components/FormatChecker.jsx` (component, request-response)

**Analog:** `src/components/ErrorPatternAnalysis.jsx` (card/checklist pattern, lines 28-101)

**Core pattern — checklist-style card display:**
```jsx
export default function FormatChecker({ checks, textType }) {
  if (!checks) return null;

  const formatItems = [
    { label: 'Salutation', passed: checks.hasSalutation },
    { label: 'Closing Formula', passed: checks.hasClosingFormula },
    { label: 'Signature', passed: checks.hasSignature },
    // Additional format checks...
  ];

  return (
    <div className="format-checker">
      <h3 className="format-checker__header">Format Check — {textType}</h3>
      <div className="format-checker__list">
        {formatItems.map((item) => (
          <div key={item.label}
            className={`format-checker__item ${item.passed ? 'format-checker__item--pass' : 'format-checker__item--fail'}`}
          >
            <span className="format-checker__icon">{item.passed ? '\u2713' : '\u2717'}</span>
            <span className="format-checker__label">{item.label}</span>
          </div>
        ))}
      </div>
      {checks.issues?.length > 0 && (
        <div className="format-checker__issues">
          {checks.issues.map((issue, i) => (
            <div key={i} className="format-checker__issue">{issue}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**No direct analog** for this component in the codebase — it is a new pattern. Follow the `reading__*` BEM pattern for CSS classes (see ErrorPatternAnalysis for the card/checklist layout pattern). Parent component (WritingModule) passes `textType` and `checks` objects down as props.

---

### `src/hooks/useDSEPapers.js` (modify — hook, CRUD)

**Self-analog locations:**

**`buildCorrectionPrompt`** (lines 1749-1891):
- Currently uses HKEAA Content/Organisation/Language direct scoring (0-7).
- **Phase 5 change:** Replace direct HKEAA scoring prompt with IELTS band descriptors (TA/CC/LR/GRA 0-9) + conversion back to HKEAA scores via calibration function.
- Keep the same `useCallback` + template string pattern.
- Keep the JSON output schema (must remain compatible with `parseCorrectionResponse`).
- Add IELTS band fields to the output schema:
  ```json
  {
    "ielts": {
      "taskAchievement": { "score": 0-9, "feedback": "..." },
      "coherenceCohesion": { "score": 0-9, "feedback": "..." },
      "lexicalResource": { "score": 0-9, "feedback": "..." },
      "grammaticalRangeAccuracy": { "score": 0-9, "feedback": "..." }
    },
    ...existing fields unchanged
  }
  ```

**`parseCorrectionResponse`** (lines 1893-1916):
- Keep the silent try/catch + regex fallback pattern (lines 1897-1900):
  ```javascript
  try { parsed = JSON.parse(cleaned); } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
  }
  ```
- Add extraction of `ielts` fields alongside existing fields.
- Add calibration call: after parsing, run `convertToHkeaa(parsed.ielts, ieltsToDseMap)` to fill in content/organization/language scores.
- Keep score clamping (line 1904): `Math.max(0, Math.min(7, Math.round(parsed[cat].score)))`
- Keep default array initialization (lines 1908-1914).

**`combineCorrections`** (lines 2067-2103):
- Keep the weighted average pattern (Part A × 2, Part B × 3).
- IELTS scores from Part A + B get averaged, then converted to HKEAA.
- The return schema stays compatible with existing consumers.

---

### `src/components/WritingModule.jsx` (modify — component, request-response)

**Extraction pattern** (same as ReadingModule → ReadingResults in ReadingModule.jsx lines 561-580):

```jsx
// Before (ReadingModule.jsx):
// Inline rendering of all results content (~200 lines inline)

// After (ReadingModule.jsx):
import ReadingResults from './ReadingResults';
// ...
<ReadingResults
  results={results}
  questions={questions}
  answers={answers}
  // ...props
/>
```

**Phase 5 extraction targets from WritingModule.jsx:**

1. **Rubric bars** (lines 641-661) → `RubricDisplay.jsx` — receives `scores` + `feedbacks` props
2. **Inline annotation rendering** (lines 707-741) → `ErrorAnnotation.jsx` — receives `essayHTML` + `inlineAnnotations` props
3. **Format warnings** (lines 1022-1045) + `checkPartAFormat` (in useDSEPapers) → `FormatChecker.jsx` — receives `checks` + `textType` props

**Import pattern in WritingModule after extraction:**
```jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useView } from '../context/ViewContext';
import { scoreToDseLevel, dseLevelToIelts, pctToIeltsWriting } from '../utils/dseGrading';
import RubricDisplay from './RubricDisplay';
import ErrorAnnotation from './ErrorAnnotation';
import FormatChecker from './FormatChecker';
```

**Usage after extraction** (replacing inline rendering in correctionPartA/Combined phases):
```jsx
<RubricDisplay
  scores={{
    content: cr.content?.score || 0,
    organization: cr.organization?.score || 0,
    language: cr.language?.score || 0,
  }}
  feedbacks={{
    content: cr.content?.feedback,
    organization: cr.organization?.feedback,
    language: cr.language?.feedback,
  }}
/>

<FormatChecker
  textType={sessionData?.partA?.prompt?.type}
  checks={cr._preChecks}
/>

<ErrorAnnotation
  essayHTML={partA.essay}
  inlineAnnotations={cr.inlineAnnotations}
/>
```

---

### `src/utils/dseGrading.js` (modify — utility, config-bounds)

**Self-analog — getStoredBoundaries pattern** (lines 70-93):

```javascript
export function getStoredBoundaries() {
  try {
    const raw = localStorage.getItem(BOUNDARIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {}
  return PER_SKILL_DEFAULTS;
}

export function storeBoundaries(b) {
  localStorage.setItem(BOUNDARIES_KEY, JSON.stringify(b));
}
```

**Add new functions following the same pattern:**
```javascript
const IELTS_DSE_MAP_KEY = 'crescendo-ielts-dse-map';

export function getIeltsToDseMap() {
  try {
    const raw = localStorage.getItem(IELTS_DSE_MAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_IELTS_DSE_MAP;
}

export function storeIeltsToDseMap(map) {
  localStorage.setItem(IELTS_DSE_MAP_KEY, JSON.stringify(map));
}
```

Where `DEFAULT_IELTS_DSE_MAP` is imported from the new `ieltsToDseMap.js` utility (or defined inline if small enough).

---

## Shared Patterns

### Authentication
Not applicable — all features are client-side. No auth middleware needed.

### Error Handling — Silent Try/Catch
**Source:** `src/hooks/useDSEPapers.js` lines 1893-1916, `src/utils/dseGrading.js` lines 70-84
**Apply to:** All new utility files, `parseCorrectionResponse`
```javascript
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
} catch {}
return DEFAULT_VALUE;
```

### Error Handling — Early Return for Null/Empty
**Source:** `src/components/ErrorPatternAnalysis.jsx` line 13, `src/components/MarkedScriptView.jsx` line 5
**Apply to:** All new components
```jsx
if (!questions?.length) return null;
if (!passageHtml || !questions?.length) return null;
```

### Component Export Pattern
**Source:** All existing components
**Apply to:** All new components
```jsx
import React from 'react';
// Hooks/utils imports
// Default export function declaration
export default function ComponentName({ prop1, prop2 }) {
  // Early returns
  // useMemo computations
  // JSX with BEM classes
}
```

### CSS BEM Convention
**Source:** `src/App.css`
**Apply to:** All new components — follow the `writing__*` BEM prefix established in Phase 4
- `.rubric-display__item` — rubric score card
- `.rubric-display__header`, `.rubric-display__score`, `.rubric-display__bar-bg`, `.rubric-display__fill`, `.rubric-display__feedback`
- `.error-annotation__body`, `.error-annotation__mark`
- `.format-checker__list`, `.format-checker__item--pass`, `.format-checker__item--fail`
- All CSS goes in `src/App.css` (single file convention)

### Validation — Schema Guard
**Source:** `src/hooks/useDSEPapers.js` lines 2009-2065 (validateCorrectionOutput)
**Apply to:** `parseCorrectionResponse` — ensure IELTS fields are validated before use
```javascript
if (!parsed.ielts) parsed.ielts = {};
if (parsed.ielts.taskAchievement?.score === undefined) parsed.ielts.taskAchievement = { score: 0 };
// Default all IELTS fields
```

### Dashboard Integration (DSE Tab) — Configurable Mapping
**Source:** `src/utils/dseGrading.js` — `getStoredBoundaries`/`storeBoundaries` for DSE grade thresholds
**Apply to:** `src/utils/ieltsToDseMap.js` — `getIeltsToDseMap`/`storeIeltsToDseMap` for the conversion table
Pattern: localStorage persistence with JSON serialization, default fallback, configurable via Settings → DSE tab (same as existing DSE boundaries in SettingsPage).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/FormatChecker.jsx` | component | request-response | New checklist-based format validation display — no existing component shows a format checklist with pass/fail indicators. Closest analog is `ErrorPatternAnalysis.jsx` for the card layout pattern, but the checklist logic is novel. |

---

## Metadata

**Analog search scope:**
- `src/utils/*.js` — 15 utility files
- `src/components/*.jsx` — 30 component files
- `src/hooks/*.js` — 12 hook files
- `src/context/*.jsx` — 1 context file

**Files scanned:** 58
**Pattern extraction date:** 2026-06-27
