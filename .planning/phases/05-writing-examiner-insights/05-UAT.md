---
status: testing
phase: 05-writing-examiner-insights
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md
started: 2026-06-28T02:30:00Z
updated: 2026-06-28T02:30:00Z
---

## Current Test

number: 3
name: Part A Format Checklist
expected: |
  Format validation shows pass/fail checklist (Salutation ✓/✗, Closing Formula ✓/✗, Signature/Name ✓/✗) for Part A texts, with issues list.
awaiting: user response

## Tests

### 1. Rubric Score Bars Display
expected: Content/Organisation/Language score cards with colored percentage bars and feedback text render in correction results
result: pass

### 2. Inline Error Annotations
expected: Inline annotations appear in the essay text with color-coded marker spans for each error found by AI correction
result: pass

### 3. Part A Format Checklist
expected: Format validation shows pass/fail checklist (Salutation ✓/✗, Closing Formula ✓/✗, Signature/Name ✓/✗) for Part A texts, with issues list
result: issue
reported: "no, i cannot se"
severity: major
fix: "Added hasSalutation/hasClosingFormula/hasSignature to _preChecks in WritingModule.jsx:388"
fix_status: applied

### 4. Settings — IELTS→HKEAA Conversion
expected: Settings → DSE tab has collapsible "IELTS → HKEAA Conversion" section with range sliders for TA→Content and CC→Organisation mappings
result: [pending]

### 5. Conversion Settings Persist
expected: Dragging a slider changes value; refresh page shows persisted value
result: [pending]

### 6. No IELTS Scores in Writing UI
expected: Writing Module displays only HKEAA Content/Organisation/Language scores and DSE level — no IELTS band numbers visible
result: [pending]

## Summary

total: 6
passed: 2
issues: 1
pending: 3
skipped: 0

## Gaps

- truth: "Format validation shows pass/fail checklist for Part A texts"
  status: failed
  reason: "User reported: cannot see format checklist"
  severity: major
  test: 3
  root_cause: "_preChecks in WritingModule.jsx:388 missing hasSalutation/hasClosingFormula/hasSignature — FormatChecker received undefined for all format checks, causing early return null"
  artifacts:
    - path: "src/components/WritingModule.jsx"
      issue: "_preChecks missing format element booleans"
  missing:
    - "Add hasSalutation, hasClosingFormula, hasSignature to _preChecks object"
  fix_status: applied
