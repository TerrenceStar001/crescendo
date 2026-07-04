---
phase: standalone-audit
reviewed: 2026-07-04T12:00:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - src/components/CoursePlayer.jsx
  - src/hooks/useDSEPapers.js (lines 1777-2039)
  - src/utils/courseSchema.js
  - src/assets/bundled-courses.json
findings:
  critical: 0
  high: 12
  medium: 14
  low: 5
  total: 31
status: issues_found
---

# CoursePlayer & Exercise Pipeline — Deep Audit Report

**Reviewed:** 2026-07-04T12:00:00Z  
**Depth:** deep (cross-file)  
**Files Reviewed:** 4  
**Status:** issues_found — 31 findings (12 HIGH, 14 MEDIUM, 5 LOW)

## Summary

Four files were audited spanning ~2100 lines of production code. The CoursePlayer component has been exercised through multiple iterations but still contains correctness bugs (broken retry flow, stale closures, DOM anti-patterns) and quality issues (unnecessary recomputation, missing edge case handling). The exercise generation pipeline (`generateCourseExercises`) has structural contradictions with the course schema validation, and both the schema and runtime answer checking logic have field-model gaps for matching/reordering exercise types. The bundled courses data has no structural defects but one content error.

## Structural Findings (cross-file)

| ID | Finding | Files |
|---|---|---|
| SF-01 | Exercise schema vs runtime model mismatch: `courseSchema.js` declares `answer` as required `string` for all `Exercise` types, but `CoursePlayer.jsx` lines 276-291 and the generator also produce exercises with `pairs`, `correctOrder`, `options`, and `answers` (array) fields that the schema does not define. | `courseSchema.js:49`, `CoursePlayer.jsx:276-291`, `useDSEPapers.js:1936-1943` |
| SF-02 | Semantic validation contradicts AI generation directives: `semanticValidate()` requires gap-fill/cloze answers to appear verbatim in reference content (`courseSchema.js:356`), but `generateCourseExercises` explicitly instructs the AI "the blank requires understanding the concept, not copying a word from the text." Generated exercises will fail semantic validation. | `courseSchema.js:353-359`, `useDSEPapers.js:1915` |
| SF-03 | `EXERCISE_TYPES` mapping (courseSchema.js:61-65) defines 3 domains with 3 types each, but CoursePlayer supports 7 types. The mapping is unused by CoursePlayer — only referenced by content classification code not in scope — creating a stale abstraction. | `courseSchema.js:61-65`, `CoursePlayer.jsx:86-89,253-288` |
| SF-04 | Final assessment exercise selection (CoursePlayer.jsx:404-414) only picks exercises sequentially from each topic with no deduplication or randomization — same questions on every assessment. | `CoursePlayer.jsx:404-414` |

---

## HIGH Severity Findings

### CR-H01: Retry from Course Complete screen is non-functional

**File:** `CoursePlayer.jsx:460-463` and `CoursePlayer.jsx:1117-1120`

**Issue:** `handleFinalAssessmentRetry` only resets `finalAssessmentAnswers` and `exerciseFeedback`, but does NOT:
- Reset `finalAssessmentAttempts` — so after retry, the count is still exhausted
- Reset `finalAssessmentScore`  
- Change the phase from `'complete'` back to `'final-assessment'`

After clicking "Retry Assessment" on the complete screen (line 1117), the phase remains `'complete'`, so the user stays on the complete screen with stale data. The retry button disappears (because `phase` triggers a different render branch) or remains but is non-functional.

**Fix:** Modify `handleFinalAssessmentRetry` to include:
```js
setFinalAssessmentAttempts(0);
setFinalAssessmentScore(0);
setPhase('final-assessment');
```

---

### CR-H02: Document.querySelector breaks React abstraction (short-answer submit)

**File:** `CoursePlayer.jsx:684-688`

**Issue:** The short-answer/sentence-rewrite submit button uses `document.querySelector('.course__exercise-textarea')` to read the textarea value. This is a direct DOM query that:
1. Breaks React's virtual DOM abstraction — if there are multiple course exercises on the page, it finds the first one regardless of which exercise is active
2. Creates a race condition with the `onBlur` handler (line 675-679) — both fire on different event paths, potentially double-submitting
3. No `useRef` is used despite React providing refs for exactly this purpose

**Fix:** Replace `document.querySelector` with a `useRef`:
```jsx
const textareaRef = useRef(null);
// In JSX:
<textarea ref={textareaRef} ... />
// In handler:
if (textareaRef.current?.value.trim()) {
  handleExerciseAttempt(currentExerciseFromSet.question, textareaRef.current.value);
}
```

---

### CR-H03: Stale closure in handleSkipExercise timeout

**File:** `CoursePlayer.jsx:319-327`

**Issue:** `setTimeout` callback captures `currentExerciseIndex` and `lessonExercises.length` from closure. If the component re-renders before the 800ms timeout fires (which is unlikely but possible if another state update intervenes), the callback uses stale values. The timeout also creates a race: if the user clicks Skip twice rapidly, two timeouts fire, advancing the index twice.

**Fix:** Use functional state updater in the timeout:
```js
setTimeout(() => {
  setCurrentExerciseIndex(prev => {
    if (prev < lessonExercises.length - 1) return prev + 1;
    return prev; // handled by lessonComplete
  });
}, 800);
```

---

### CR-H04: Gap-fill double-submission via onBlur + onKeyDown race

**File:** `CoursePlayer.jsx:652-662`

**Issue:** The gap-fill input has both `onKeyDown` (Enter) and `onBlur` handlers that both call `handleExerciseAttempt`. When a user presses Enter:
1. `onKeyDown` fires → `handleExerciseAttempt` begins (sets `isSubmitting = true`)
2. The input loses focus due to the state update re-render → `onBlur` fires
3. `onBlur`'s handler calls `handleExerciseAttempt` again — blocked by `isSubmitting` check, but only because of timing

The `onBlur` also calls `handleExerciseAttempt` when the user merely clicks away to read reference content — this forces an unintended submission for incomplete answers.

**Fix:** Remove the `onBlur` auto-submit for gap-fill. The Enter key is sufficient. Add a "Submit" button instead:
```jsx
// Remove onBlur from gap-fill input
// Add explicit submit button like short-answer has
```

---

### CR-H05: Semantic validation requires gap-fill answers IN reference content, generator prohibits it

**File:** `courseSchema.js:353-359` vs `useDSEPapers.js:1915`

**Issue:** `semanticValidate` in `courseSchema.js` checks:
```js
if (!content.toLowerCase().includes(String(exercise.answer).toLowerCase().trim())) {
  errors.push(... 'answer not found in lesson referenceContent');
}
```
But the AI prompt in `generateCourseExercises` states:
> "For gap-fill: the blank requires understanding the concept, not copying a word from the text"

This means every AI-generated gap-fill exercise (which intentionally avoids verbatim text) will fail semantic validation, producing false-positive validation errors for the very exercises the pipeline was designed to generate.

**Fix:** Either remove the verbatim-inclusion check from `semanticValidate` for AI-generated courses, or change the AI prompt to allow answers that appear in the text. These two validations are contradictory.

---

### CR-H06: NormalizeAnswer strips leading articles — breaks MCQ answers that ARE articles

**File:** `CoursePlayer.jsx:255`, `answerChecking.js:22`

**Issue:** `normalizeAnswer` strips leading "a/an/the" from all answers (line 22). For MCQs where a correct answer legitimately starts with "a", "an", or "the" (e.g., answer = "The answer is inference"), normalization produces "answer is inference" which never matches the option text "Inference". While the current bundled data avoids this pattern (all MCQ answers are short phrases without leading articles), AI-generated exercises could easily produce correct answers starting with "the" or "a", causing false-negative scoring.

**Fix:** Either skip article stripping for MCQ type, or only strip articles when comparing free-text answers, not when matching against predefined options.

---

### CR-H07: No abort/cancellation for AI exercise generation on unmount or lesson change

**File:** `CoursePlayer.jsx:92-108`

**Issue:** The `useEffect` at line 81 fires `generateCourseExercises` as a fire-and-forget promise. If the component unmounts or the lesson changes before the promise resolves:
1. `setGeneratedExercises(exercises)` sets state on an unmounted component (React 18 warns, future versions may not)
2. The stale `generationAttemptedRef.current` prevents re-generation for the new lesson until manual trigger
3. No `AbortController` is used to cancel in-flight AI requests

**Fix:** Add an abort controller with cleanup:
```js
useEffect(() => {
  const abort = new AbortController();
  // ... pass abort.signal to generateCourseExercises
  return () => abort.abort();
}, [currentLesson?.title, callAI, dsePapers?.generateCourseExercises]);
```

---

### CR-H08: Reorder exercise shows pre-sorted order when reorderState is null

**File:** `CoursePlayer.jsx:811-812`

**Issue:** The reordering component renders `(reorderState || currentExerciseFromSet.correctOrder)`. If `reorderState` is `null` (before the initialization `useEffect` at line 216 fires, or if it was cleared), the fallback is `currentExerciseFromSet.correctOrder` — which is already the correct order. This makes the reorder exercise trivial: the user sees items in the right order and can just click "Confirm Order."

The initialization `useEffect` at line 216-223 can have a timing gap — React executes effects after paint, so there's one frame where `reorderState` is `null`.

**Fix:** Initialize `reorderState` synchronously from `useMemo` instead of `useEffect`:
```js
const initialReorderState = useMemo(() => {
  if (currentExerciseFromSet?.type === 'reordering' && currentExerciseFromSet.correctOrder?.length) {
    return [...currentExerciseFromSet.correctOrder].sort(() => Math.random() - 0.5);
  }
  return null;
}, [currentExerciseFromSet]);
// Use initialReorderState instead of reorderState for initial render
```
Then use `reorderState ?? initialReorderState` in the render, and `useEffect` only to update when the exercise changes.

---

### CR-H09: LLM-as-judge depth evaluation silently fails — shallow exercises pass through

**File:** `useDSEPapers.js:2009-2011`

**Issue:** The `LLM-as-judge` depth evaluation is wrapped in a `try/catch` with an empty catch block:
```js
} catch (e) {
  // Judge failed silently — use heuristic results as-is
}
```
If the judge AI call fails (network error, rate limit, malformed response, invalid JSON parse at line 1991), ALL `passed` exercises remain in the `passed` set without any depth filtering. Shallow/formula exercises that should have been caught by the judge pass through to the final output.

**Fix:** Add a fallback: if the judge fails, use the heuristic `estimateBloomDepth` already computed in `validateExercise` to filter:
```js
} catch (e) {
  console.warn('[exercises] Judge failed, using heuristic depth filter:', e.message);
  passed = passed.filter(e => estimateBloomDepth(e.question || '') >= 2);
}
```

---

### CR-H10: Course progress key uses course.id without null guard

**File:** `CoursePlayer.jsx:19`

**Issue:** `COURSE_PROGRESS_KEY = \`${DSE_KEYS.COURSE_PROGRESS}:${course.id}\`` — if `course.id` is `null` or `undefined` (which is possible for corrupted or partially-loaded course data), the key becomes `crescendo-course-progress:null` or `crescendo-course-progress:undefined`. This silently collides: all courses with missing IDs would share the same progress key, corrupting each other's progress.

**Fix:** Add a guard at the top of the component:
```js
if (!course?.id) {
  return <div className="course__player"><p className="course__empty-message">Invalid course data.</p></div>;
}
```

---

### CR-H11: finalAssessmentAttempts is not an array — tracking by single counter allows infinite retries

**File:** `CoursePlayer.jsx:452-457`

**Issue:** `finalAssessmentAttempts` is a single integer counter. It's compared against `finalAssessmentAttempts + 1 >= 3` to cap retries. However, `handleFinalAssessmentRetry` does NOT reset the counter when retrying, meaning:
- Attempt 1: counter=0 → fails → counter becomes 1 (via `setFinalAssessmentAttempts(prev => prev + 1)`)
- Click retry → counter stays at 1
- Attempt 2: counter=1 → fails → counter becomes 2
- Click retry → counter stays at 2
- Attempt 3: counter=2 → fails → counter becomes 3, `2 + 1 >= 3` is true → course completes

So the user gets exactly 3 attempts max, but this is fragile. More critically, if a user loads a saved session where `finalAssessmentAttempts` was corrupted to a high number, they'd be locked out immediately with no recourse.

Additionally, `handleFinalAssessmentRetry` (called from complete screen) doesn't reset `finalAssessmentAttempts`, so the stale count doesn't allow more attempts from the complete screen.

**Fix:** Reset `finalAssessmentAttempts` to `0` in `handleFinalAssessmentRetry`:
```js
const handleFinalAssessmentRetry = useCallback(() => {
  setFinalAssessmentAnswers({});
  setExerciseFeedback(null);
  setFinalAssessmentAttempts(0);  // ADD THIS
  setPhase('final-assessment');   // ADD THIS
}, []);
```

---

### CR-H12: Matching exercise answer key doesn't survive serialization properly

**File:** `CoursePlayer.jsx:276-279`

**Issue:** Matching exercises use `answer` as an object `{ [item]: match }`. This object is stored in `answers` state via `setAnswers(prev => ({...prev, [exerciseId]: { answer, correct, attempts }}))`. When auto-saved to IndexedDB (line 184-198), the entire `answers` object is serialized via IndexedDB's structured clone — which handles objects fine. However, when loaded from saved progress (line 156), `saved.answers` is restored. If the matching exercise's `answer` was `null` or an empty object `{}` when saved (e.g., during a partial attempt), line 277 `typeof answer === 'object'` passes, and line 278 `pairs.every(p => answer[p.item] === p.match)` evaluates `undefined === p.match` for every pair — which is always false. The user sees a 0% score on resume even if they had previously completed the matching correctly.

**Fix:** Add an empty-object guard:
```js
case 'matching': {
  if (currentExerciseFromSet.pairs && typeof answer === 'object' && answer !== null && Object.keys(answer).length > 0) {
    isCorrect = currentExerciseFromSet.pairs.every(p => answer[p.item] === p.match);
  }
  break;
}
```

---

## MEDIUM Severity Findings

### MD-01: Missing isSubmitting guard on Skip and Reveal buttons

**File:** `CoursePlayer.jsx:869-878`

**Issue:** Skip and Reveal buttons are rendered when `!exerciseFeedback` is true, but neither checks `isSubmitting`. A user could click Skip while a `handleExerciseAttempt` promise is still processing, causing conflicting state updates.

**Fix:** Add `disabled={isSubmitting}` to Skip and Reveal buttons, or guard the handlers with `isSubmitting` checks.

---

### MD-02: Matching shuffledDefs uses biased shuffle

**File:** `CoursePlayer.jsx:67, 218`

**Issue:** `[...array].sort(() => Math.random() - 0.5)` is not a uniform shuffle — it's biased toward preserving element order and has non-uniform distribution. For matching exercises with 3-5 pairs, the bias is small but non-zero. The same pattern is used for reordering initialization (line 218).

**Fix:** Implement Fisher-Yates shuffle:
```js
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

---

### MD-03: Topic completion computation repeated per render without memoization

**File:** `CoursePlayer.jsx:506-515`

**Issue:** For each topic in the overview, `allTopicLessonsDone` and `prevTopicDone` recompute global lesson indices from scratch by iterating over all previous topics. This is O(n²) in the number of topics, and `prevTopicDone` redundantly redoes the same computation. For the current 5 courses with 2 topics each, this is negligible — but for larger courses it's wasteful.

**Fix:** Compute lesson offsets once outside the render loop:
```js
const lessonOffsets = useMemo(() => {
  let offset = 0;
  return course.topics.map(t => {
    const current = offset;
    offset += t.lessons.length;
    return current;
  });
}, [course.topics]);
```

---

### MD-04: handleNextExercise uses direct value instead of functional updater

**File:** `CoursePlayer.jsx:338`

**Issue:** `handleSkipExercise` uses `setCurrentExerciseIndex(prev => prev + 1)` (functional), but `handleNextExercise` uses `setCurrentExerciseIndex(nextIdx)` (direct value). Inconsistent patterns — the direct value is computed from a stale closure. If `handleNextExercise` is called multiple times before a re-render (unlikely but possible with rapid clicks), both calls set the same `nextIdx` value, while the functional updater would correctly advance twice.

**Fix:** Use functional updater consistently:
```js
setCurrentExerciseIndex(prev => prev + 1);
```

---

### MD-05: Gap-fill multi-blank type inconsistency with courseSchema

**File:** `CoursePlayer.jsx:260-261`

**Issue:** The `gap-fill` checking code checks for `currentExerciseFromSet.answers` (plural, array) for multi-blank exercises. But `courseSchema.js:49` only defines `answer` (singular, string) as a field for `Exercise`. Neither `answers`, `pairs`, `options`, nor `correctOrder` are defined in the schema. The data model is inconsistent between the runtime checker and the schema definition.

**Fix:** Add `answers`, `pairs`, `options`, and `correctOrder` to the `Exercise` schema in `courseSchema.js`, or standardize the gap-fill to always use the singular `answer` field.

---

### MD-06: FinalAssessmentExercises selected without deduplication — same questions every time

**File:** `CoursePlayer.jsx:404-414`

**Issue:** `finalAssessmentExercises` selects exercises sequentially from each topic (first 2 exercises per topic). This means:
- Every assessment has the same questions
- If a topic has only 1 exercise, it appears only once (count = min(2, 1) = 1)
- No randomization

For a proper assessment, questions should be shuffled and/or drawn from a larger pool.

**Fix:** Shuffle the selected exercises:
```js
return selected.sort(() => Math.random() - 0.5); // or Fisher-Yates
```

---

### MD-07: Empty referenceContent shows "1 word" instead of "0 words"

**File:** `CoursePlayer.jsx:605`, `courseSchema.js:329`

**Issue:** `''.trim().split(/\s+/)` returns `['']` (length 1), not `[]` (length 0). If `referenceContent` is an empty string (not null/undefined), the word count displays as 1 instead of 0. The `|| 0` fallback only catches null/undefined, not empty string. Same bug in `semanticValidate` at `courseSchema.js:329`.

**Fix:**
```js
const refWordCount = currentLesson.referenceContent?.trim()
  ? currentLesson.referenceContent.trim().split(/\s+/).length
  : 0;
```

---

### MD-08: Skipped exercises counted as "not attempted" in lesson complete stats

**File:** `CoursePlayer.jsx:559-562`

**Issue:** Lesson complete stats compute accuracy as `correctCount / totalCount` where `totalCount` is `Object.keys(answers).length`. Skipped exercises add entries like `{ answer: null, correct: false, skipped: true }` which inflate `totalCount` but don't contribute to `correctCount`. A student who skips all exercises would see 0% accuracy, which could be demoralizing and inaccurate — they didn't attempt any exercises.

**Fix:** Filter skipped entries:
```js
const attemptedEntries = Object.values(answers).filter(a => !a.skipped);
const correctCount = attemptedEntries.filter(a => a.correct).length;
const totalCount = attemptedEntries.length;
```

---

### MD-09: Cloze/blur handler mutates currentVal before setState

**File:** `CoursePlayer.jsx:780-784`

**Issue:** In the cloze blur handler:
```js
const currentVal = answers[currentExerciseFromSet.question]?.answer || {};
currentVal[bi] = e.target.value;
handleExerciseAttempt(currentExerciseFromSet.question, currentVal);
```
This mutates the existing `currentVal` object (which is a reference from `answers` state) by setting `currentVal[bi] = e.target.value`. Direct state mutation is a React anti-pattern — this modifies the `answers` state object in-place before `handleExerciseAttempt` calls `setAnswers`.

**Fix:** Create a new object:
```js
const prevVal = answers[currentExerciseFromSet.question]?.answer || {};
const currentVal = { ...prevVal, [bi]: e.target.value };
```

---

### MD-10: onTrackImprovement prop not documented

**File:** `CoursePlayer.jsx:11-16`

**Issue:** The JSDoc comment for `CoursePlayer` lists props `course`, `onBack`, `callAI`, `dsePapers` — but `onTrackImprovement` is used at line 173 and is not documented. This is a documentation gap that could cause confusion for future maintainers.

**Fix:** Add `onTrackImprovement` to the JSDoc.

---

### MD-11: CoursePlayer stub uses deprecated prop name dsePapers

**File:** `CoursePlayer.jsx:17`

**Issue:** The prop is named `dsePapers` which is misleading — it's actually used as an IndexedDB wrapper with `generateCourseExercises`, not the DSE papers storage. The name suggests this is the `useDSEPapers` hook, but only `generateCourseExercises` is called (line 92, 126). Renaming to `exerciseGenerator` or similar would clarify intent.

**Fix:** Rename prop to `exerciseGenerator` or destructure to only pass `generateCourseExercises`.

---

### MD-12: Verbatim recall check only applies to MCQ types

**File:** `useDSEPapers.js:1850`

**Issue:** `isVerbatimRecall` is only checked for `type === 'mcq'`. Gap-fill, short-answer, and sentence-rewrite exercises are not checked for verbatim answers even though the prompt warns against "answerable by scanning for a single word." A gap-fill answer that is a direct quote passes validation.

**Fix:** Apply verbatim recall check to all exercise types, not just MCQ:
```js
if (e.answer && isVerbatimRecall(e.question, e.answer, source)) {
  issues.push('answer is a direct quote from source — rewrite to require reasoning, not recall');
}
```

---

### MD-13: No feedback shown when generateCourseExercises returns < 3 exercises

**File:** `CoursePlayer.jsx:98-103`

**Issue:** When AI generation returns fewer than 3 exercises, the code falls back to seed exercises with a `console.warn` — but no UI feedback is shown to the user. The "Generating new practice..." spinner disappears silently and old seed exercises appear. The user has no way to know generation failed or why.

**Fix:** Set a state variable like `generationError` and display a small error message:
```js
} else {
  setGenerationWarning(`AI generated ${exercises?.length || 0} exercises — using seed exercises`);
}
```

---

### MD-14: handleRevealAnswer writes answer: null — breaks gap-fill/short-answer revealed display

**File:** `CoursePlayer.jsx:343-348`

**Issue:** `handleRevealAnswer` stores `{ answer: null, correct: false, revealed: true }`. But the revealed answer display at line 860-864 shows `currentExerciseFromSet?.answer` — which is the correct answer from the exercise data, not from `answers`. The `answer: null` in `answers` is not used for display. However, if `currentExerciseFromSet?.answer` is not set (e.g., for matching exercises), the revealed answer section shows nothing. For matching exercises, `answer` is a single string (not the pairs), so it's unhelpful.

**Fix:** For matching and reordering, either don't show "Correct answer:" as a simple string, or show the full pairs list / correct order.

---

## LOW Severity Findings

### LW-01: Array index keys for matching/reorder items

**File:** `CoursePlayer.jsx:726, 740, 811`

**Issue:** Matching items, definitions, and reorder items all use array index as React `key`. While this works for static lists, it causes React to lose track of elements if items are reordered or filtered. For the matching exercise specifically, shuffled definitions use index keys — if the shuffle produces a different order, React recycles DOM elements incorrectly (focus loss, animation glitches).

**Fix:** Use the item text or a stable ID as key:
```jsx
key={pair.item}  // or pair.id if available
```

---

### LW-02: Self-contradictory explanation in bundled courses

**File:** `bundled-courses.json:414`

**Issue:** Gap-fill explanation states: `"note the 'on' not 'en' in the middle, and the final 'al' not 'al."` — the final clause says "'al' not 'al'" which is self-contradictory (same word). It should say `"not 'el'"` or similar.

**Fix:** Change to: `"note the 'on' not 'en' in the middle ('environ' not 'environn'), and the final 'al' not 'el'"`.

---

### LW-03: Code duplication of clean mapping in generateCourseExercises

**File:** `useDSEPapers.js:2015-2018, 2026-2030`

**Issue:** The same `clean = passed.map(e => { const { _passed, _issues, ...rest } = e; return rest; })` pattern appears twice in the same function (success path at line 2015, fallback update at line 2026). This duplication is maintenance risk — if the cleanup logic changes, one path may be missed.

**Fix:** Extract to a helper:
```js
const stripInternal = (exercises) => exercises.map(({ _passed, _issues, ...rest }) => rest);
```

---

### LW-04: High temperature (0.6) for structured JSON generation

**File:** `useDSEPapers.js:1957`

**Issue:** The AI call uses `temperature: 0.6` for generating structured JSON output. Higher temperatures increase output variability but also increase the chance of malformed JSON, which forces retries. For deterministic JSON generation, temperatures of 0.1-0.3 typically produce more reliable parsable output.

**Fix:** Lower temperature to 0.2-0.3 for the generation call. Keep 0.6 only for the judge call which benefits from more varied evaluation.

---

### LW-05: Final assessment attempts message uses closed-over value

**File:** `CoursePlayer.jsx:952-954`

**Issue:** The "Attempt N of 3" message uses `finalAssessmentAttempts + 1` which reads from the closure. On first render with `finalAssessmentAttempts = 0`, it shows "Attempt 1 of 3" — correct. But `finalAssessmentAttempts` is incremented via `prev => prev + 1` inside `handleFinalAssessmentSubmit`, which is a batch-updated setter. The display will reflect the updated value on the next render. This works correctly in practice but is fragile.

**Fix:** No functional fix needed — it works. But consider using a `useMemo` derived value or reading from a ref to be explicit about the intent.

---

## Detailed Findings

### CoursePlayer.jsx — Per-Line Issues

| Line | Issue | Severity |
|------|-------|----------|
| 19 | `course.id` could be undefined → key `crescendo-course-progress:undefined` | HIGH |
| 67 | Biased shuffle `Math.random() - 0.5` for matching definitions | MEDIUM |
| 84 | `generationAttemptedRef.current` set true before async starts, OK | — |
| 92-108 | No abort controller on AI generation — stale updates on unmount | HIGH |
| 255 | MCQ answer normalization strips leading articles — breaks some answers | HIGH |
| 260-261 | `answers` array used for multi-blank, but schema only defines `answer` | MEDIUM |
| 297-299 | Reference unlocks on 3rd attempt even if correct; intentional? | INFO |
| 314-316 | `handleSkipExercise` uses `question` as key, not parameter `exerciseId` | LOW |
| 319-327 | Stale closure in setTimeout — captures old `currentExerciseIndex` | HIGH |
| 338 | `setCurrentExerciseIndex(nextIdx)` — direct value, not functional updater | MEDIUM |
| 460-463 | `handleFinalAssessmentRetry` doesn't reset attempts or change phase | HIGH |
| 506-515 | O(n²) topic completion recomputation without memoization | MEDIUM |
| 559-562 | Skipped exercises inflate totalCount, deflating accuracy | MEDIUM |
| 605 | Empty string → split → `['']` → shows "1 word" | MEDIUM |
| 652-662 | Gap-fill onBlur + onKeyDown double-submission race | HIGH |
| 684-688 | `document.querySelector` instead of ref — breaks React abstraction | HIGH |
| 700 | Array index key for MCQ options | LOW |
| 726 | Array index key for matching items | LOW |
| 780-784 | Cloze blur handler mutates state object in-place | MEDIUM |
| 811-812 | `reorderState || correctOrder` fallback shows pre-sorted order | HIGH |
| 860-864 | Revealed answer for matching shows `answer` string, not pairs | MEDIUM |
| 869-878 | Skip/Reveal buttons not guarded by `isSubmitting` | MEDIUM |
| 953 | Attempt display uses closed-over `finalAssessmentAttempts + 1` | LOW |
| 1117-1120 | Retry from complete screen doesn't change phase back | HIGH |

### useDSEPapers.js (lines 1777-2039) — Per-Line Issues

| Line | Issue | Severity |
|------|-------|----------|
| 1800-1802 | Redundant `src.includes(ans)` check (already tested on line 1799) | LOW |
| 1850 | Verbatim recall check only for MCQ, not other types | MEDIUM |
| 1906-1917 | AI prompt says "not copying a word from text" for gap-fill | HIGH |
| 1957 | temperature 0.6 too high for reliable JSON output | LOW |
| 1965 | `slice(0, 5)` accepts up to 5, prompt requests "EXACTLY 4" | MEDIUM |
| 2009-2011 | Empty catch on LLM judge failure — shallow exercises pass | HIGH |
| 2015-2018 | `stripInternal` code duplication (repeated at 2026-2030) | LOW |

### courseSchema.js — Per-Line Issues

| Line | Issue | Severity |
|------|-------|----------|
| 45-53 | Exercise schema missing `pairs`, `options`, `answers`, `correctOrder` | MEDIUM |
| 61-65 | `EXERCISE_TYPES` mapping unused by CoursePlayer; stale abstraction | LOW |
| 329 | Empty string word count bug (same as CoursePlayer.605) | MEDIUM |
| 353-359 | Semantic validation requires gap-fill answers in content; contradicts AI prompt | HIGH |

### bundled-courses.json — Per-Line Issues

| Line | Issue | Severity |
|------|-------|----------|
| 414 | Self-contradictory explanation: `"not 'al'"` where it IS `'al'` | LOW |

---

## Recommendations by Priority

1. **Fix CR-H01 and CR-H11 together** — The retry flow from complete screen is broken and needs `useEffect`-safe phase and counter reset.
2. **Fix CR-H02** — Replace `document.querySelector` with `useRef` for all text area references.
3. **Fix CR-H05** — Resolve the semantic validator vs AI prompt contradiction; one of them must change.
4. **Fix CR-H03 and CR-H04** — Stale closure in skip timer and double-submission in gap-fill are correctness bugs.
5. **Fix CR-H08** — Reorder exercise shows pre-sorted order on first frame.
6. **Fix CR-H07** — Add AbortController to AI generation effect.
7. **Fix CR-H09** — Add heuristic fallback when LLM judge fails.
8. **Fix CR-H10** — Guard against undefined `course.id`.
9. **Fix CR-H12** — Add empty-object guard for matching answer checking.
10. **Fix MD-01 through MD-14** — Medium severity issues in order of impact.

---

_Reviewed: 2026-07-04T12:00:00Z_  
_Reviewer: gsd-code-reviewer (adversarial stance)_  
_Depth: deep_  
_Total findings: 31 (12 HIGH, 14 MEDIUM, 5 LOW)_
