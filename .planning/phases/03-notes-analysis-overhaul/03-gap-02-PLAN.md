---
phase: 03-notes-analysis-overhaul
plan: gap-02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ReadingModule.jsx
autonomous: true
requirements:
  - READ-05
user_setup: []
must_haves:
  truths:
    - "Session review (past sessions) displays error pattern analysis and drill CTA"
    - "History-review phase shows the same comprehensive results as live results"
  artifacts:
    - path: src/components/ReadingModule.jsx
      provides: "History-review phase uses ReadingResults component"
  key_links:
    - from: src/components/ReadingModule.jsx
      to: src/components/ReadingResults.jsx
      via: "import and render ReadingResults in history-review phase"
      pattern: "import.*ReadingResults"
---

<objective>
Replace inline history-review JSX in ReadingModule.jsx with ReadingResults component.

Purpose: The history-review phase (lines 582-684 of ReadingModule.jsx) renders its own inline results JSX instead of using the extracted ReadingResults component. This means past session reviews lack the ErrorPatternAnalysis, DrillGenerator CTA, and weakness showcase that ReadingResults provides.

Output: ReadingModule.jsx history-review phase delegates to ReadingResults component.
</objective>

<execution_context>
@/home/terrence/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/terrence/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-notes-analysis-overhaul/03-03-SUMMARY.md
@src/components/ReadingModule.jsx — lines 582-684 contain inline history-review JSX
@src/components/ReadingResults.jsx — the extracted results component with full feature set
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Refactor history-review to use ReadingResults component</name>
  <files>src/components/ReadingModule.jsx</files>
  <read_first>
    @src/components/ReadingModule.jsx lines 582-684 — current inline history-review JSX
    @src/components/ReadingResults.jsx — the ReadingResults component interface (props it accepts)
  </read_first>
  <behavior>
    - History-review phase must render ReadingResults with the same components (MarkedScriptView, ErrorPatternAnalysis, DrillGenerator) as live results
    - The reviewSession data shape differs from results data shape — need to transform reviewSession into ReadingResults-compatible props
    - ErrorPatternAnalysis needs questions + answers data derived from reviewSession.questions
    - DrillGenerator needs passagePreview, weakTypes, part, mistakesContext, callAI
    - MarkedScriptView needs passageHtml (from reviewSession.passageContent), questions, userAnswers
  </behavior>
  <action>
    Replace the entire `if (phase === 'history-review')` block (lines 582-684) in ReadingModule.jsx with a ReadingResults-based implementation:

    1. **Transform reviewSession data**: The `reviewSession` object has a different shape than `results`. Map it:
       - `reviewSession.percentage` → `results.percentage`
       - `reviewSession.score` → `results.score`
       - `reviewSession.totalQuestions` → `results.totalQuestions`
       - `reviewSession.dseLevel` → `results.dseLevel`
       - `reviewSession.duration` → derive from completedAt or use 0
       - `reviewSession.questions` → transform to the format ReadingResults expects (each question has `isCorrect`, `userAnswer`, `correctAnswer`, `stem`, `type`, `skillTested`, `paragraphRef`, `marks`, `options`, `correctAnswer`)

    2. **Build answers map**: From `reviewSession.questions[].userAnswer`, construct an `answers` object keyed by question id. Since reviewSession.questions may not have `id` fields (they're stored as-is from the session), generate stable ids or use array indices.

    3. **Derive weakTypes and mistakesContext**: Compute these from the transformed questions/answers the same way ReadingResults does (the useMemo at lines 24-67 of ReadingResults.jsx).

    4. **Replace the inline JSX**: Remove lines 582-684 and replace with:
       ```jsx
       <ReadingResults
         results={transformedResults}
         questions={transformedQuestions}
         answers={answerMap}
         paper={paper}
         passageContent={reviewSession.passageContent || ''}
         passagePreview={reviewSession.passageContent?.replace(/<[^>]+>/g, '').slice(0, 2000) || ''}
         part={part}
         notesGenerated={notesGenerated}
         callAI={callAI}
         onBack={() => { setPhase('start'); setReviewSession(null); }}
         onPracticeAgain={() => startSession(paper?.difficulty || 'medium')}
       />
       ```

    5. **Preserve the back button**: The original inline code had `<button className="dse-module__back" onClick={() => { setPhase('start'); setReviewSession(null); }}>← Back</button>` — ReadingResults already has a back button, so this is covered.

    6. **Handle missing passageContent**: If `reviewSession.passageContent` is empty, show a fallback message instead of crashing.

    Key data transformation needed for questions:
    - Each `reviewSession.questions[i]` has: `id`, `type`, `questionType`, `stem`, `options`, `correctAnswer`, `userAnswer`, `isCorrect`, `marksEarned`, `marks`, `timeSpent`, `skillTested`
    - Map to ReadingModule question shape: `{ id, type, stem, options, correctAnswer, skillTested, paragraphRef, marks, ... }`
    - The `id` field exists in reviewSession questions (stored from session), so use it directly
  </action>
  <verify>
    <automated>node -e "
const fs = require('fs');
const code = fs.readFileSync('src/components/ReadingModule.jsx', 'utf8');
// Verify ReadingResults is imported
const hasImport = code.includes(\"import ReadingResults from './ReadingResults'\");
// Verify history-review uses ReadingResults instead of inline JSX
const hasHistoryReviewReadingResults = code.includes('phase === \"history-review\"') && code.match(/history-review[\\s\\S]{0,500}ReadingResults/);
// Verify inline review-items are gone
const hasInlineReviewItems = code.includes('reading__results-review-item');
console.log('import_exists:', hasImport);
console.log('history_uses_reading_results:', !!hasHistoryReviewReadingResults);
console.log('inline_review_items_removed:', !hasInlineReviewItems);
console.log(hasImport && !hasInlineReviewItems ? 'PASS' : 'FAIL');
process.exit(hasImport && !hasInlineReviewItems ? 0 : 1);
    "</automated>
  </verify>
  <done>
    - History-review phase renders ReadingResults with error pattern analysis, drill CTA, and annotated passage
    - Past session data correctly transformed to ReadingResults-compatible format
    - No inline review-item JSX remains in history-review phase
    - Back button works correctly from history review
    - Build passes: npm run build
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| reviewSession data → ReadingResults | Stored session data from IndexedDB — trusted but may have incomplete shapes |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-gap02-01 | Tampering | reviewSession.questions shape | mitigate | Defensive mapping: use optional chaining and fallbacks for missing fields (id, skillTested, paragraphRef) |
| T-03-gap02-02 | Information Disclosure | passageContent in reviewSession | accept | Passage content is already stored in IndexedDB and displayed inline in current implementation |
</threat_model>

<verification>
- History-review phase renders ReadingResults with full analysis
- ErrorPatternAnalysis visible in past session review
- DrillGenerator CTA visible in past session review
- No regression in live results phase
- Build passes: npm run build
</verification>

<success_criteria>
- Gap 5 closed: past session reviews show error pattern analysis, drill CTA, and weakness showcase
- ReadingResults component reused consistently across results and history-review phases
- Build passes with no errors
</success_criteria>

<output>
Create `.planning/phases/03-notes-analysis-overhaul/03-gap-02-SUMMARY.md` when done
</output>
