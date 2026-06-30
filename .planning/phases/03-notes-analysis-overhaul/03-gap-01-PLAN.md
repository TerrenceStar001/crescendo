---
phase: 03-notes-analysis-overhaul
plan: gap-01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/MarkedScriptView.jsx
  - src/App.css
autonomous: true
requirements:
  - READ-05
  - READ-06
user_setup: []
must_haves:
  truths:
    - "Paragraph gutter annotations show correct sequential paragraph numbers (1, 2, 3...) matching the actual passage order"
    - "Headings (H2/H3) in the annotated passage render with distinct styling from body text"
    - "Questions appear in sequential reading order (Q1, Q2, Q3...) regardless of which paragraph they belong to"
    - "Annotated passage container spans full available width of the results panel"
  artifacts:
    - path: src/components/MarkedScriptView.jsx
      provides: "Fixed paragraph numbering, sequential question display, heading differentiation"
    - path: src/App.css
      provides: "Heading styles and container width fixes for marked-script"
  key_links:
    - from: src/components/MarkedScriptView.jsx
      to: src/components/ReadingResults.jsx
      via: "MarkedScriptView imported and rendered in ReadingResults"
      pattern: "import.*MarkedScriptView"
---

<objective>
Fix MarkedScriptView paragraph numbering, question ordering, heading styling, and container width.

Purpose: The annotated passage display has 4 interconnected bugs — wrong paragraph numbers, questions not in reading order, headings indistinguishable from body text, and the container only taking half the screen width.

Output: Corrected MarkedScriptView.jsx with sequential paragraph numbering and reading-order question display, plus App.css updates for heading styles and container width.
</objective>

<execution_context>
@/home/terrence/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/terrence/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/03-notes-analysis-overhaul/03-01-SUMMARY.md
@.planning/phases/03-notes-analysis-overhaul/03-03-SUMMARY.md

MarkedScriptView.jsx (157 lines) — paragraph index bug at line 19: `index: i + 1` uses DOM child index instead of sequential numbering. Questions mapped by paragraph index at line 51: `map[ref]` uses DOM index as key. Paragraph rendering at lines 84-154 skips paragraphs without questions (line 86-99) and uses wrong gutter annotations.

App.css — marked-script section at lines 4905-5043. No H2/H3 styling exists. Container constrained by parent `.reading__results` layout.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fix paragraph numbering and sequential question display in MarkedScriptView</name>
  <files>src/components/MarkedScriptView.jsx</files>
  <read_first>
    @src/components/MarkedScriptView.jsx — current implementation with bugs at lines 18-19 (DOM index as paragraph number), lines 84-99 (skipping paragraphs without questions), line 51 (questionMap keyed by DOM index)
  </read_first>
  <behavior>
    - Paragraphs should be numbered 1..N sequentially based on actual paragraph count, not DOM child index
    - Questions should be displayed in reading order (Q1, Q2, Q3...) across all paragraphs, not grouped by paragraph index
    - Paragraphs without questions should still render with their correct sequential number
    - The gutter should show annotations in the order questions appear in the passage (by paragraphRef or sequential order)
  </behavior>
  <action>
    Rewrite MarkedScriptView.jsx to fix these issues:

    1. **Sequential paragraph numbering** (replaces line 18-19): Change the `paragraphs` memo to use sequential numbering starting from 1, independent of DOM child index. Each filtered block element gets `index: i + 1` where i is the filtered array index — this is already correct BUT the issue is that `questionMap` uses `para.index` as lookup key while paragraphs without questions are skipped in rendering.

    2. **Flatten questions into reading order**: Instead of grouping by paragraph index in `questionMap`, create a flat `sortedQuestions` array ordered by paragraph reference (questions with valid paragraphRef first, sorted by paragraphRef then by questionNumber; questions without paragraphRef fall back to proportional distribution). This ensures Q1, Q2, Q3... appear in reading order.

    3. **Render all paragraphs sequentially**: Remove the early-return skip at lines 86-99. Every paragraph renders with its gutter annotation. Paragraphs with no questions render an empty gutter div. The gutter for each paragraph shows only the annotations belonging to that paragraph, but the question numbers shown are the GLOBAL sequential numbers (Q1, Q2, etc.), not local indices.

    4. **Fix the heading rendering bug at line 95**: Change `<para.tagName dangerouslySetInnerHTML={{ ... }} />` to use dynamic tag creation: `React.createElement(para.tagName, { dangerouslySetInnerHTML: { __html: para.html } })` since JSX doesn't support dynamic tag names like `<para.tagName>`.

    Concrete implementation:
    - In the `paragraphs` memo (lines 12-26): keep `index: i + 1` but rename to `seqNum` for clarity
    - Create a new `sortedAnnotations` memo: flatten all questions across paragraphs in reading order, assigning sequential global question numbers
    - In the rendering map (line 84): iterate `paragraphs` and for each paragraph, collect annotations from `questionMap[para.seqNum]` (or the new flat structure)
    - Replace `<para.tagName` at lines 95 and 149 with `React.createElement(para.tagName, ...)`
  </action>
  <verify>
    <automated>node -e "
const fs = require('fs');
const code = fs.readFileSync('src/components/MarkedScriptView.jsx', 'utf8');
// Verify React.createElement is used instead of <para.tagName
const hasDynamicTagFix = code.includes('React.createElement(para.tagName');
// Verify sequential numbering is preserved
const hasSeqNumbering = code.includes('seqNum');
// Verify no early-return skip for empty paragraphs
const hasEarlyReturnSkip = code.match(/if\s*\(\s*!annotations/.source);
console.log('dynamic_tag_fix:', hasDynamicTagFix);
console.log('sequential_numbering:', hasSeqNumbering);
console.log('early_return_skip_removed:', !hasEarlyReturnSkip);
console.log(hasDynamicTagFix && hasSeqNumbering && !hasEarlyReturnSkip ? 'PASS' : 'FAIL');
process.exit(hasDynamicTagFix && hasSeqNumbering && !hasEarlyReturnSkip ? 0 : 1);
    "</automated>
  </verify>
  <done>
    - All paragraphs render sequentially with correct 1, 2, 3... numbering in gutter
    - Questions display in reading order (Q1, Q2, Q3...) regardless of paragraph grouping
    - Paragraphs without questions render cleanly with empty gutter
    - H2/H3 headings render as proper heading elements (not broken JSX)
    - Build passes: npm run build
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add heading styles and fix container width in App.css</name>
  <files>src/App.css</files>
  <read_first>
    @src/App.css lines 5013-5030 — current marked-script__text styles (only paragraph text-indent, no heading differentiation)
    @src/App.css lines 5223-5226 — reading__results container at tablet breakpoint
  </read_first>
  <behavior>
    - H2 elements inside marked-script__text should render as distinct headings (larger, bold, no text-indent, margin below)
    - H3 elements should be slightly larger than body but smaller than H2
    - The marked-script container should expand to full width of its parent (no artificial constraints)
  </behavior>
  <action>
    Add CSS to App.css after the existing `.marked-script__text p` rule (around line 5029):

    1. **Heading styles** — Add rules for `.marked-script__text h2` and `.marked-script__text h3`:
       - `h2`: `font-size: 1.15rem; font-weight: 700; text-indent: 0; margin: 0.8em 0 0.3em; color: var(--color-text);`
       - `h3`: `font-size: 1.05rem; font-weight: 600; text-indent: 0; margin: 0.6em 0 0.2em; color: var(--color-text-secondary);`
       - Both must override `text-indent: 2em` from the `p` selector

    2. **Container width fix** — The `.marked-script` is rendered inside a `<details>` element within `.reading__results`. Add `width: 100%` and `max-width: 100%` to `.marked-script` to ensure it fills the parent. Also ensure `.marked-script__para` has `width: 100%` and `overflow-wrap: break-word` to prevent horizontal overflow.

    3. **Flex layout fix** — On `.marked-script__para`, change `display: flex` to allow the text portion to expand fully: ensure `.marked-script__text` has `min-width: 0` (to allow flex child to shrink below content width) and `flex: 1 1 auto` (to grow and shrink properly).

    Insert the CSS rules in the marked-script section of App.css, after line 5029 (after `.marked-script__text p { ... }` block).
  </action>
  <verify>
    <automated>node -e "
const fs = require('fs');
const css = fs.readFileSync('src/App.css', 'utf8');
const hasH2Style = css.includes('.marked-script__text h2') && css.includes('text-indent: 0');
const hasH3Style = css.includes('.marked-script__text h3');
const hasFullWidth = css.includes('.marked-script') && css.match(/width:\s*100%/);
console.log('h2_heading_style:', hasH2Style);
console.log('h3_heading_style:', hasH3Style);
console.log('full_width_container:', hasFullWidth);
console.log(hasH2Style && hasH3Style ? 'PASS' : 'FAIL');
process.exit(hasH2Style && hasH3Style ? 0 : 1);
    "</automated>
  </verify>
  <done>
    - H2 headings in passage render larger and bolder than body text with no text-indent
    - H3 headings render distinctly from body text
    - MarkedScriptView container spans full width of results panel
    - Build passes: npm run build
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| passageHtml → DOM parsing | Trusted data from session (same threat model as existing dangerouslySetInnerHTML in ReadingModule line 442) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-gap01-01 | Tampering | MarkedScriptView dangerouslySetInnerHTML | accept | Passage HTML comes from trusted session data (same pattern as ReadingModule line 442). No user input enters passageHtml. |
| T-03-gap01-02 | Tampering | React.createElement dynamic tag | mitigate | Tag names come from DOM parsing of trusted passage HTML — only P/H2/H3/BLOCKQUOTE are ever rendered (filtered at line 17 of MarkedScriptView) |
</threat_model>

<verification>
- Build passes: npm run build
- MarkedScriptView renders paragraphs with correct sequential numbering (1, 2, 3...)
- Questions display in reading order across paragraphs
- H2/H3 headings visually distinct from body text
- Annotated passage container spans full panel width
</verification>

<success_criteria>
- All 4 MarkedScriptView gaps addressed: paragraph numbering, heading styling, sequential questions, container width
- No regression in existing MarkedScriptView behavior (annotations, highlights, empty state)
- Build passes with no errors
</success_criteria>

<output>
Create `.planning/phases/03-notes-analysis-overhaul/03-gap-01-SUMMARY.md` when done
</output>
