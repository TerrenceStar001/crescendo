---
phase: 03-notes-analysis-overhaul
plan: gap-03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/utils/drillGenerator.js
  - src/components/DrillGenerator.jsx
autonomous: true
requirements:
  - READ-05
user_setup: []
must_haves:
  truths:
    - "Clicking 'Generate Targeted Practice' produces 2-3 drill questions via QuestionRenderer"
    - "Drill questions are answerable from the passage and target the student's weak areas"
  artifacts:
    - path: src/utils/drillGenerator.js
      provides: "Robust drill prompt building and AI call with proper error handling"
    - path: src/components/DrillGenerator.jsx
      provides: "State machine that handles generation success/failure gracefully"
  key_links:
    - from: src/components/DrillGenerator.jsx
      to: src/utils/drillGenerator.js
      via: "import { generateDrills } from '../utils/drillGenerator'"
      pattern: "import.*generateDrills"
    - from: src/utils/drillGenerator.js
      to: src/App.jsx
      via: "callAI function signature compatibility"
      pattern: "callAI\\(prompt,"
---

<objective>
Fix drill generation failure — AI call returns empty string or unparsable response, causing `generateDrills` to return null.

Purpose: The DrillGenerator shows "Practice questions could not be generated" because `generateDrills` fails silently. Root cause analysis: (1) `buildDrillPrompt` strips the DSE examiner framing via regex that may not match, leaving an empty or malformed passage; (2) `parseJSONResponse` may fail on empty string responses; (3) `validateQuestions` rejects valid drills due to overly strict TFNG/type consistency rules when only 3 questions are generated.

Output: Fixed drill generation pipeline that reliably produces 2-3 questions.
</objective>

<execution_context>
@/home/terrence/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/terrence/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-notes-analysis-overhaul/03-02-SUMMARY.md
@src/utils/drillGenerator.js — current implementation with 3 failure points
@src/components/DrillGenerator.jsx — state machine that shows failed state
@src/App.jsx lines 58-89 — callAI signature returns string (data.choices?.[0]?.message?.content?.trim() || '')
@src/utils/questionValidator.js — validateQuestions returns { valid, warnings } — valid=false if any warnings
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fix buildDrillPrompt to produce valid drill prompts</name>
  <files>src/utils/drillGenerator.js</files>
  <read_first>
    @src/utils/drillGenerator.js lines 34-61 — buildDrillPrompt function
    @src/utils/questionGenerator.js lines 229-271 — composeFullPrompt function (the base prompt builder)
  </read_first>
  <behavior>
    - buildDrillPrompt must produce a prompt that the AI can parse into valid JSON questions
    - The regex strip of DSE examiner framing may fail, leaving garbage in the prompt
    - typeDist must use actual question type slugs (mcq, gap-fill, short-answer), not skill slugs (inference, detail)
    - Empty or whitespace-only passagePreview must be handled gracefully
  </behavior>
  <action>
    Fix `buildDrillPrompt` in `src/utils/drillGenerator.js`:

    1. **Fix the regex stripping** (line 47): The regex `/^You are a DSE.*?TASK:.*?PASSAGE:/ms` may not match because `composeFullPrompt` builds the prompt differently. Replace with a more robust approach:
       ```js
       // Extract passage content from the base prompt by finding "PASSAGE:" and taking everything after it
       const passageIdx = basePrompt.lastIndexOf('PASSAGE:');
       const strippedPassage = passageIdx >= 0 ? basePrompt.slice(passageIdx + 8).trim() : passagePreview;
       ```
       Fallback to `passagePreview` if the regex fails.

    2. **Filter weakTypes to valid question types**: The `weakTypes` array passed from ReadingResults contains both skill slugs (e.g., `'inference'`, `'detail'`) and question type slugs (e.g., `'mcq'`, `'short-answer'`). Only pass question type slugs to `buildDrillPrompt`:
       ```js
       const VALID_DRILL_TYPES = ['mcq', 'gap-fill', 'short-answer', 'tfng', 'matching', 'summary-cloze', 'pronoun-ref', 'semantic-connect', 'open-ended'];
       const drillTypes = weakTypes.filter(t => VALID_DRILL_TYPES.includes(t));
       ```
       If no valid types remain, default to `['short-answer', 'gap-fill']` (most flexible for AI generation).

    3. **Fix typeDist construction** (lines 36-38): Only distribute among valid question types, not skill slugs:
       ```js
       const typesToUse = drillTypes.length > 0 ? drillTypes : ['short-answer', 'gap-fill'];
       const typeDist = {};
       const perType = Math.floor(100 / typesToUse.length);
       typesToUse.forEach(t => { typeDist[t] = perType; });
       ```

    4. **Handle empty passagePreview**: If `passagePreview` is empty or whitespace-only after stripping HTML tags, return null from `generateDrills` immediately (don't call AI with empty context).

    5. **Improve the drill prompt header** (lines 49-60): Make it more specific about the expected JSON format:
       ```js
       return `You are a DSE English tutor creating TARGETED PRACTICE questions.
       
       The student struggled with these question types: ${drillTypes.join(', ')}.
       Their actual mistakes were:
       ${mistakeSummary}
       
       Create exactly 3 drill questions targeting their specific weaknesses.
       Each question MUST be answerable from the passage alone.
       
       Return ONLY a JSON array with exactly 3 question objects. Each object MUST have these fields:
       - "stem": the question text (string)
       - "type": one of: ${typesToUse.join(', ')}
       - "skillTested": the skill being tested (string)
       - "paragraphRef": paragraph number (integer)
       - "marks": 1 or 2
       - "correctAnswer": the correct answer
       - "explanation": brief explanation of why this is correct
       ${typesToUse.includes('mcq') ? '- "options": array of 4 options with "label" (A-D) and "text"' : ''}
       
       Do NOT include any markdown code fences, explanations, or text outside the JSON array.
       
       PASSAGE:
       ${strippedPassage}`;
       ```
  </action>
  <verify>
    <automated>node -e "
const fs = require('fs');
const code = fs.readFileSync('src/utils/drillGenerator.js', 'utf8');
// Verify robust passage extraction
const hasFallbackExtraction = code.includes('lastIndexOf') || code.includes('slice(passageIdx');
// Verify type filtering
const hasTypeFilter = code.includes('VALID_DRILL_TYPES') || code.includes('filter.*includes');
// Verify improved prompt format
const hasJsonFormatSpec = code.includes('\"stem\"') || code.includes(\"'stem'\");
console.log('robust_passage_extract:', hasFallbackExtraction);
console.log('type_filtering:', hasTypeFilter);
console.log('json_format_spec:', hasJsonFormatSpec);
console.log(hasFallbackExtraction && hasTypeFilter ? 'PASS' : 'FAIL');
process.exit(hasFallbackExtraction && hasTypeFilter ? 0 : 1);
    "</automated>
  </verify>
  <done>
    - buildDrillPrompt produces valid prompts even when composeFullPrompt output varies
    - weakTypes are filtered to valid question type slugs before use
    - Empty passagePreview handled gracefully
    - AI prompt specifies exact JSON format expected
    - Build passes: npm run build
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fix generateDrills error handling and validateQuestions tolerance</name>
  <files>src/utils/drillGenerator.js</files>
  <read_first>
    @src/utils/drillGenerator.js lines 74-94 — generateDrills function
    @src/utils/questionValidator.js lines 367-431 — validateQuestions function (strict TFNG/type consistency)
  </read_first>
  <behavior>
    - generateDrills must handle empty string returns from callAI (fallback to '')
    - validateQuestions is too strict for 3-question drills (requires TFNG distribution, type diversity)
    - parseJSONResponse must handle non-JSON responses gracefully
  </behavior>
  <action>
    Fix `generateDrills` in `src/utils/drillGenerator.js`:

    1. **Handle empty string return** (line 79): `callAI` returns `''` on failure (App.jsx line 83: `|| ''`). Check for this before parsing:
       ```js
       if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
         console.warn('[Drill] AI returned empty response');
         return null;
       }
       ```

    2. **Fix parseJSONResponse** (lines 17-21): The current function tries `JSON.parse(text)` as fallback which fails on empty strings or non-JSON. Improve it:
       ```js
       function parseJSONResponse(text) {
         if (!text || typeof text !== 'string') return null;
         const trimmed = text.trim();
         // Try to find JSON array in the text
         const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
         if (jsonMatch) {
           try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
         }
         // Try parsing the whole text as JSON
         try { return JSON.parse(trimmed); } catch { return null; }
         return null;
       }
       ```

    3. **Relax validateQuestions for drills**: The `validateQuestions` function requires TFNG distribution and type diversity (lines 397-406 in questionValidator.js), which is inappropriate for 3-question drills. Instead of calling `validateQuestions` directly, add a lightweight per-question validation:
       ```js
       // Replace validateQuestions call with per-question validation
       const isValid = parsed.every(q =>
         q && typeof q === 'object' &&
         typeof q.stem === 'string' && q.stem.trim().length > 5 &&
         typeof q.correctAnswer === 'string' &&
         typeof q.type === 'string' &&
         typeof q.skillTested === 'string' &&
         typeof q.marks === 'number' && q.marks >= 1
       );
       return isValid ? parsed.slice(0, 3) : null;
       ```

    4. **Add console.debug for troubleshooting** (development only): Log the raw AI response length to help diagnose future failures, but only in non-production:
       ```js
       if (process.env.NODE_ENV !== 'production') {
         console.debug('[Drill] AI response length:', raw?.length);
       }
       ```

    5. **Increase timeout for drill generation**: Change timeout from 30000 to 45000ms since drill prompts are shorter but the AI may still need time to generate coherent questions.
  </action>
  <verify>
    <automated>node -e "
const fs = require('fs');
const code = fs.readFileSync('src/utils/drillGenerator.js', 'utf8');
// Verify empty string handling
const hasEmptyCheck = code.includes('typeof raw !==') || code.includes('raw?.length');
// Verify improved parseJSONResponse
const hasParseFallback = code.includes('JSON.parse(trimmed)');
// Verify relaxed validation
const hasPerQuestionValidation = code.includes('parsed.every') || code.includes('isValid');
console.log('empty_string_handling:', hasEmptyCheck);
console.log('parse_json_fallback:', hasParseFallback);
console.log('relaxed_validation:', hasPerQuestionValidation);
console.log(hasEmptyCheck && hasParseFallback ? 'PASS' : 'FAIL');
process.exit(hasEmptyCheck && hasParseFallback ? 0 : 1);
    "</automated>
  </verify>
  <done>
    - generateDrills handles empty string returns from callAI gracefully
    - parseJSONResponse handles non-JSON responses without throwing
    - Validation relaxed for 3-question drills (no TFNG/type diversity requirements)
    - Drill generation succeeds with 2-3 questions
    - Build passes: npm run build
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AI response → JSON parse | Untrusted AI output parsed into question objects |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-gap03-01 | Tampering | AI response JSON parsing | mitigate | parseJSONResponse catches JSON.parse exceptions and returns null; only valid question objects passed to QuestionRenderer |
| T-03-gap03-02 | Information Disclosure | Mistake context sent to AI | accept | Mistake context contains only question numbers, types, and answers — no PII or user identity |
</threat_model>

<verification>
- Drill generation produces 2-3 questions from AI
- Empty or malformed AI responses handled gracefully (shows "Try Again" not crash)
- Drills display correctly via QuestionRenderer
- Build passes: npm run build
</verification>

<success_criteria>
- Gap 6 closed: drill generation succeeds and produces 2-3 questions
- Error handling covers empty responses, malformed JSON, and validation failures
- Build passes with no errors
</success_criteria>

<output>
Create `.planning/phases/03-notes-analysis-overhaul/03-gap-03-SUMMARY.md` when done
</output>
