---
status: testing
phase: 04-writing-module
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-06-25T09:00:00Z
updated: 2026-06-26T12:00:00Z
---

## Current Test

number: 1
name: Navigate to Writing Module
expected: |
  Click "Writing" in the sidebar. The Writing Module loads showing a "Choose a Prompt" screen with a Start button.
awaiting: user response

## Tests

### 1. Navigate to Writing Module
expected: Click "Writing" in the sidebar. The Writing Module loads showing a "Choose a Prompt" screen with a Start button.
result: pending

### 2. Choose Prompt and Start
expected: Clicking Start shows 3 Part B option cards (not 4) with text type badges. A practice mode selector appears: "Both Parts (Real DSE)", "Part A Only", "Part B Only". Selecting a Part B option highlights it. Clicking the corresponding start button proceeds to the correct phase.
result: issue
reported: "i cannot choose which part i will going to write, i can click the container, but no effect no change, when i click into start writing, it auto change to part b, also, part b is not authentic! in hkdse, part b only have 3 questions to choose"
severity: major

### 3. Part A Writing Phase
expected: After choosing a Part B option, Part A task appears with a ruled-line editor. A 2-hour HH:MM:SS timer counts down. Typing in the editor shows "Saved" indicator periodically. No word count is displayed.
result: pending

### 4. Submit Part A and View Correction
expected: After submitting Part A, a loading state appears, then correction results show: rubric scores (Content/Organization/Language each out of 7), DSE level, narrative summary, error list with severity, good language examples, vocabulary suggestions, and pitfalls avoided. A "Continue to Part B" button is shown.
result: pending

### 5. Part B Writing Phase
expected: Clicking "Continue to Part B" shows the selected Part B prompt with the same ruled-line editor and timer continuing to count down.
result: pending

### 6. Submit Part B and View Combined Correction
expected: After submitting Part B, correction results show Part B rubric scores. Then a "View Combined Results" option shows the combined score out of 42 (both parts averaged), with merged error lists and vocab suggestions.
result: pending

### 7. Self-Assessment Tags
expected: During the writing phase, 6 clickable tag chips appear (Content, Organization, Vocabulary, Grammar, Conventions, Style). Clicking them highlights them. Submitted tags are passed to the AI correction prompt.
result: pending

### 8. Timer Warnings and Alerts
expected: The timer shows color changes: normal → warning at 30 minutes remaining → critical at 15 minutes → danger at 5 minutes. At 30/15/5 minute marks, a sound alert plays and the timer flashes.
result: pending

### 9. Session History
expected: After completing a writing session, the session is saved. Navigating to history shows a list of past writing sessions with dates, Part A/Part B scores, and DSE levels.
result: pending

### 10. Session Comparison
expected: From history, selecting 2 sessions shows a side-by-side comparison with score diffs and error type changes.
result: pending

### 11. Cross-Session Error Patterns
expected: The comparison or results view shows error type frequency across the last 5 sessions (e.g., "Grammar errors appeared in 4 of last 5 sessions").
result: pending

### 12. Distraction-Free Mode
expected: During writing, the sidebar is hidden. Exiting writing phase restores the sidebar.
result: pending

### 13. Auto-Save Recovery
expected: If the page is refreshed during writing, the essay content is recovered from sessionStorage and the editor shows the previously typed text.
result: pending

### 14. AI Fallback for Prompts
expected: When no curated prompts are available (or forceAI=true), the module falls back to AI generation for Part A and all 4 Part B options in a single call.
result: pending

## Summary

total: 14
passed: 0
issues: 0
pending: 14
skipped: 0
blocked: 0

## Gaps

[none yet]
