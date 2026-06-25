# Phase 4: Writing Module DSE Authenticity — Validation

**Generated:** 2026-06-25
**Plans:** 4 plans in 2 waves

## Success Criteria Mapping

| # | Criterion | Plan Coverage | Verify Method |
|---|-----------|--------------|---------------|
| 1 | All 8 text types covered | 04-01 (prompt bank), 04-02 (Part B selector, 8 types) | `grep` prompt bank JSON for all 8 type values; check Part B options show type badges |
| 2 | AI correction with HKEAA rubric scores | 04-03 (Content/Organization/Language 7/7/7 per part) | Submit essay → verify JSON has `content.score`, `organization.score`, `language.score` (0-7) |
| 3 | Error analysis with line references | 04-03 (error list), 04-04 (inline annotations) | Verify errors have `location.paragraph`, `location.line`; annotations show hover tooltips |
| 4 | Timer + exam environment (2h, DSE-style) | 04-02 (WritingTimer, RuledLineEditor, ExamHeader) | Timer shows HH:MM:SS, color changes at thresholds, auto-submits at 0, no word count |
| 5 | DSE Paper 2 booklet UI/UX | 04-02 (exam components), 04-04 (history) | Visual inspection: ruled lines, exam header, distraction-free mode, responsive |

## Per-Plan Validation

### Plan 04-01: Foundation
- [ ] `writing-prompts.json` has ~20 entries covering all 8 text types, both parts, 5+ topic domains
- [ ] `writingPrompts.js` exports 8 functions including `getAvailablePrompts`, `markPromptUsed`
- [ ] `useDSEPapers.js` has `generateWritingSession()` (Part A/B + 4-option Part B)
- [ ] `useDSEPapers.js` has `buildCorrectionPrompt(part, essay, promptInfo, selfAssessment)`
- [ ] `useDSEPapers.js` has `parseCorrectionResponse(rawText)` with score validation 0-7
- [ ] `useIndexedDB.js` DSE_KEYS includes `WRITING_SESSIONS`
- [ ] App.css has Phase 4 Overhaul section header

Verify commands:
```bash
node -e "const p = require('./src/assets/writing-prompts.json'); console.log(p.length, 'prompts'); const types = new Set(p.map(e => e.type)); console.log('Types:', [...types].length);"
grep -c "WRITING_SESSIONS" src/hooks/useIndexedDB.js
grep -c "buildCorrectionPrompt\|parseCorrectionResponse" src/hooks/useDSEPapers.js
grep -c "generateWritingSession" src/hooks/useDSEPapers.js
grep -c "Phase 4 Overhaul" src/App.css
```

### Plan 04-02: Core Exam
- [ ] State machine phases: start → choosing → writingPartA → correctingPartA → correctionPartA → writingPartB → correctingPartB → correctionCombined
- [ ] Part B shows **4** option cards (post-2024 curriculum)
- [ ] Timer displays HH:MM:SS with color warnings at 30min/15min/5min and flash animation
- [ ] Ruled-line editor with no word count display
- [ ] Auto-save every 30s to sessionStorage + IndexedDB
- [ ] Crash recovery banner on page refresh
- [ ] Distraction-free mode hides sidebar during writing
- [ ] Sound alerts play at threshold intervals (configurable)
- [ ] Proceed to Part B button shown after correctionPartA

Verify commands:
```bash
grep -c "correctingPartA\|correctionPartA\|writingPartB\|correctingPartB\|correctionCombined" src/components/WritingModule.jsx
grep -c "formatExamTime\|HH.*MM.*SS" src/components/WritingModule.jsx
grep -c "setFocusMode" src/components/WritingModule.jsx
grep -c "SESSION_KEY\|sessionStorage" src/components/WritingModule.jsx
grep "writing__timer" src/App.css | head -5
```

### Plan 04-03: Correction Pipeline
- [ ] Part A submit → correctingPartA → correctionPartA (show Part A results)
- [ ] Part B submit → correctingPartB → correctionCombined (show combined results)
- [ ] Rubric scores: Content/7, Organization/7, Language/7 per part (two separate AI calls)
- [ ] `combineCorrections()` merges Part A + Part B into 42-mark total
- [ ] DSE level via `scoreToDseLevel(percentage, 'writing')`
- [ ] Error list with severity badges (Critical/Major/Minor), type colors, location references
- [ ] Good language use section
- [ ] Vocabulary upgrades with CEFR + DSE level labels
- [ ] Pitfalls avoided section
- [ ] Self-assessment tags before submission
- [ ] Session saved to IndexedDB (only after Part B complete)
- [ ] Skill analytics recorded on completion

Verify commands:
```bash
grep -c "correctingPartA\|correctionPartA\|correctingPartB\|correctionCombined" src/components/WritingModule.jsx
grep -c "combineCorrections" src/components/WritingModule.jsx
grep -c "buildCorrectionPrompt" src/components/WritingModule.jsx
grep -c "saveSessionToHistory\|WRITING_SESSIONS" src/components/WritingModule.jsx
grep -c "self-assessment\|Self-Assessment" src/components/WritingModule.jsx
```

### Plan 04-04: Advanced Features
- [ ] Inline annotations: color-coded underlines/highlights by error type (7 types)
- [ ] Hover tooltip shows original → correction → explanation
- [ ] Error frequency chart: horizontal bars by category
- [ ] Section breakdown: introduction, body, conclusion scored separately
- [ ] Re-submit and compare: revise → re-submit → side-by-side comparison
- [ ] Session history: browseable list, max 50 entries
- [ ] Side-by-side comparison: 2 sessions, score + error diff
- [ ] Cross-session error pattern: "in 3 of last 5 sessions"

Verify commands:
```bash
grep -c "writing__annotation--grammar\|writing__annotation--vocabulary\|writing__annotation--structure" src/App.css
grep -c "Error Frequency\|error-chart" src/components/WritingModule.jsx
grep -c "Section-by-Section\|sectionBreakdown" src/components/WritingModule.jsx
grep -c "Resubmit\|revise\|re-submit" src/components/WritingModule.jsx
grep -c "comparison\|Compare Sessions" src/components/WritingModule.jsx
grep -c "crossSession\|Error Pattern Across\|Recurring" src/components/WritingModule.jsx
```

## D-38 Flow Verification (Critical Path)
```
start → choosing (select Part B option)
  → writingPartA (write Part A essay, timer running)
  → correctingPartA (AI call for Part A only)
  → correctionPartA (view Part A results)
  → writingPartB (write Part B essay, same timer, Part A results visible)
  → correctingPartB (AI call for Part B with Part A context)
  → correctionCombined (view combined Part A + Part B results)
  → history (browseable)
  → comparison (side-by-side)
```

Each transition must be tested manually in browser.

## Nyquist Requirements
- All error handling follows existing pattern: `try/catch {}` for recoverable failures
- AI JSON parsing uses existing multi-level fallback strategy
- localStorage keys use `crescendo-*` prefix throughout
- CSS uses BEM naming with `.writing__*` namespace
- No modifications to existing `.reading__*` or `.dse-module__*` styles
