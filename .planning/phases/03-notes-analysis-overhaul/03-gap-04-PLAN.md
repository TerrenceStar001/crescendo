---
phase: 03-notes-analysis-overhaul
plan: gap-04
type: execute
wave: 2
depends_on:
  - 03-gap-01
  - 03-gap-02
files_modified:
  - src/App.css
autonomous: true
requirements:
  - READ-06
user_setup: []
must_haves:
  truths:
    - "Layout adapts correctly at tablet widths (1024px) — no horizontal scroll, gutters collapse inline"
    - "Cards stack vertically on tablets and phones"
    - "Drill buttons stack vertically at tablet widths"
  artifacts:
    - path: src/App.css
      provides: "Responsive breakpoints for tablet (1024px) and mobile (768px)"
  key_links:
    - from: src/App.css
      to: src/components/ReadingResults.jsx
      via: "CSS classes used by ReadingResults and sub-components"
      pattern: "\\.reading__results|\\.marked-script|\\.error-pattern|\\.drill-generator"
---

<objective>
Fix responsive layout at tablet and mobile widths.

Purpose: The current responsive CSS (lines 5193-5255) only handles basic stacking but doesn't address the 200px gutter being too wide at 1024px, flex layouts not collapsing properly, and missing breakpoints for smaller tablets (834px iPad) and mobile phones (480px).

Output: Comprehensive responsive CSS with proper breakpoints at 1024px, 834px, 768px, and 480px.
</objective>

<execution_context>
@/home/terrence/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/terrence/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-notes-analysis-overhaul/03-03-SUMMARY.md
@src/App.css lines 5193-5255 — current tablet responsive CSS
@src/App.css lines 4906-5043 — marked-script CSS (200px fixed gutter)
@src/App.css lines 5045-5127 — error pattern CSS (3-column flex)
@src/App.css lines 5129-5191 — drill generator CSS
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Rewrite responsive breakpoints for all components</name>
  <files>src/App.css</files>
  <read_first>
    @src/App.css lines 5193-5255 — current @media (max-width: 1024px) and @media (max-width: 768px) blocks
    @src/App.css lines 4937-4948 — marked-script__gutter fixed 200px width
    @src/App.css lines 5046-5059 — error-pattern 3-column flex layout
    @src/App.css lines 5186-5191 — drill-generator__actions flex layout
  </read_first>
  <behavior>
    - At 1024px: gutter shrinks from 200px to auto, error-pattern cards stack, drill buttons stack
    - At 834px (iPad): further tighten spacing, reduce font sizes slightly
    - At 768px: full vertical stacking of results summary stats, reduced padding
    - At 480px: minimum viable layout — single column, compact spacing
    - No horizontal scroll at any breakpoint
  </behavior>
  <action>
    Replace the existing responsive CSS block (lines 5193-5255 in App.css) with comprehensive breakpoints:

    **@media (max-width: 1024px):**
    ```css
    /* Marked Script — collapse gutter */
    .marked-script__gutter {
      width: auto;
      flex-shrink: 0;
      min-width: 120px;
      max-width: 160px;
      border-right: 1px solid var(--color-border);
      padding-right: var(--space-2);
    }
    .marked-script__para {
      gap: var(--space-2);
      padding: var(--space-2);
    }
    /* Error Pattern — 2-column instead of 3 */
    .error-pattern {
      grid-template-columns: repeat(2, 1fr);
      display: grid;
    }
    .error-pattern__card {
      min-width: 0;
    }
    /* Drill — stack buttons */
    .drill-generator__actions {
      flex-direction: column;
      align-items: stretch;
    }
    .drill-generator__actions button {
      width: 100%;
    }
    ```

    **@media (max-width: 834px) — iPad narrow:**
    ```css
    .marked-script {
      padding: var(--space-3);
    }
    .marked-script__gutter {
      min-width: 100px;
      max-width: 130px;
      font-size: 0.65rem;
    }
    .marked-script__annotation {
      padding: var(--space-1);
    }
    .error-pattern {
      grid-template-columns: 1fr;
      display: block;
    }
    .error-pattern__card {
      margin-bottom: var(--space-3);
    }
    .reading__results-summary {
      flex-direction: row;
      align-items: center;
      gap: var(--space-4);
    }
    ```

    **@media (max-width: 768px):**
    ```css
    .marked-script {
      padding: var(--space-2);
      font-size: 0.95rem;
    }
    .marked-script__gutter {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      min-width: unset;
      max-width: unset;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      padding-right: 0;
      padding-bottom: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .marked-script__annotation {
      display: inline-flex;
      margin-right: var(--space-1);
      margin-bottom: var(--space-1);
      font-size: 0.65rem;
    }
    .marked-script__annotation-marker {
      width: 14px;
      height: 14px;
      font-size: 0.55rem;
    }
    .error-pattern__card {
      padding: var(--space-3);
    }
    .reading__results-summary {
      flex-direction: column;
      text-align: center;
    }
    .reading__results-stats {
      justify-content: center;
      flex-wrap: wrap;
    }
    .reading__results-actions {
      flex-direction: column;
    }
    .reading__results-btn {
      width: 100%;
    }
    ```

    **@media (max-width: 480px):**
    ```css
    .marked-script {
      padding: var(--space-2);
      font-size: 0.9rem;
    }
    .marked-script__gutter {
      font-size: 0.6rem;
    }
    .marked-script__annotation-text {
      display: none;
    }
    .error-pattern__card {
      padding: var(--space-2);
    }
    .error-pattern__label {
      width: 80px;
    }
    .reading__results {
      padding: var(--space-2);
    }
    .drill-generator {
      padding: var(--space-2);
    }
    .drill-generator__card {
      padding: var(--space-3);
    }
    ```

    Insert these after the existing `@media (max-width: 768px)` block (after line 5255).
  </action>
  <verify>
    <automated>node -e "
const fs = require('fs');
const css = fs.readFileSync('src/App.css', 'utf8');
// Verify all 4 breakpoints exist
const has1024 = css.includes('@media (max-width: 1024px)');
const has834 = css.includes('@media (max-width: 834px)');
const has768 = css.includes('@media (max-width: 768px)');
const has480 = css.includes('@media (max-width: 480px)');
// Verify gutter collapse at 1024
const hasGutterCollapse = css.match(/@media.*1024[\\s\\S]*?marked-script__gutter/);
// Verify error-pattern grid at 1024
const hasGridLayout = css.includes('grid-template-columns');
console.log('breakpoint_1024:', has1024);
console.log('breakpoint_834:', has834);
console.log('breakpoint_768:', has768);
console.log('breakpoint_480:', has480);
console.log('gutter_collapse:', !!hasGutterCollapse);
console.log('grid_layout:', hasGridLayout);
const allBreakpoints = has1024 && has834 && has768 && has480;
console.log(allBreakpoints ? 'PASS' : 'FAIL');
process.exit(allBreakpoints ? 0 : 1);
    "</automated>
  </verify>
  <done>
    - 4 responsive breakpoints: 1024px, 834px, 768px, 480px
    - Gutter collapses to inline annotations at 768px
    - Error pattern cards stack vertically at 834px
    - Drill buttons stack at 1024px
    - No horizontal scroll at any breakpoint
    - Build passes: npm run build
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CSS-only changes | No new trust boundaries introduced |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-gap04-SC | Tampering | CSS responsive breakpoints | mitigate | slopcheck + blocking human checkpoint for [ASSUMED]/[SUS] |
</threat_model>

<verification>
- Layout works at 1024px (tablet landscape) — no horizontal scroll
- Layout works at 834px (iPad narrow) — cards stack
- Layout works at 768px (tablet portrait) — gutter inline, full stack
- Layout works at 480px (mobile) — compact spacing, no text overflow
- Build passes: npm run build
</verification>

<success_criteria>
- Gap 7 closed: responsive layout works correctly on all devices
- All 4 breakpoints tested and functional
- No regression in desktop layout
- Build passes with no errors
</success_criteria>

<output>
Create `.planning/phases/03-notes-analysis-overhaul/03-gap-04-SUMMARY.md` when done
</output>
