---
status: testing
phase: 06-courses-feature-transform-external-resources-ielts-vocab-gra
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
  - 06-04-SUMMARY.md
started: "2026-06-30T14:30:00Z"
updated: "2026-06-30T14:45:00Z"
---

## Current Test

number: 0
name: Cold Start Smoke Test (retry)
expected: |
  Kill any running server process. `npm run dev` starts without errors.
  App loads in browser without console errors.
awaiting: user response

## Tests

### 0. Cold Start Smoke Test
expected: |
  Kill any running server. Start from scratch with `npm run backend`. 
  Server boots without errors, courses SQLite table created, 
  health endpoint returns 200.
result: issue
reported: "console:App.jsx:168 Uncaught ReferenceError: Cannot access 'callAI' before initialization"
severity: blocker

### 1. Sidebar Courses Tab
expected: |
  Open app. Sidebar shows "Courses" tab with 📚 icon between Speaking and Graph. 
  Clicking it navigates to CatalogView with search bar and tag filter chips.
result: pending

### 2. CatalogView Structure
expected: |
  CatalogView shows search bar, tag filter chips (grammar, vocabulary, sentence-structure),
  and three sections: Recommended for You, In Progress, Completed. 
  Sections are initially empty.
result: pending

### 3. PDF Upload & Course Ingestion
expected: |
  CatalogView has Upload PDF button. Clicking opens CourseIngestion with 
  drag-and-drop area accepting .pdf files. After upload, AI structures content 
  into editable draft with title, description, tags, difficulty, topics accordion 
  with exercises (each showing question, type badge, answer, explanation, difficulty stars).
result: pending

### 4. Publish & Catalog Display
expected: |
  After reviewing draft, clicking Publish saves course. Published course appears 
  in catalog as card with title, description, tags, difficulty badge, 
  View Course and Enroll buttons.
result: pending

### 5. Course Overview & Enrollment
expected: |
  Clicking a course card (or Enroll) shows CourseOverview page with course title, 
  progress bar, sequential topic list (first unlocked, others locked), 
  and Start Course button.
result: pending

### 6. CoursePlayer Exercise-First Delivery
expected: |
  Starting a course enters CoursePlayer. Exercises are shown before reference content.
  All 7 exercise types render correctly (gap-fill, sentence-rewrite, matching, 
  cloze, reordering, short-answer, MCQ). Wrong answer / hint click / 3rd failed attempt 
  unlocks reference content.
result: pending

### 7. Auto-Save & Final Assessment
expected: |
  Progress auto-saves every ~10 seconds. Completing all topics triggers final assessment 
  with 2 exercises per topic. 60% pass threshold with up to 3 retry attempts.
result: pending

### 8. Dashboard Integration
expected: |
  Dashboard shows "Courses Completed: X" stat and "Browse Courses" 
  button in Quick Actions.
result: pending

### 9. Post-Task Course Recommendations
expected: |
  After completing a Reading or Writing session, results page shows PostTaskSuggestion 
  banner with up to 2 course recommendations, Enroll, Dismiss, and Browse All buttons. 
  Dismissal persists for 7 days.
result: pending

### 10. Difficulty Progression
expected: |
  Catalog shows advanced courses with lock overlay and tooltip when DSE level < 4,
  intermediate courses locked when DSE level < 3. Tooltip says "Reach DSE Level X to unlock".
result: pending

## Summary

total: 11
passed: 0
issues: 1
pending: 10
skipped: 0

## Gaps

- truth: "Server boots without errors, courses SQLite table created, health endpoint returns 200"
  status: failed
  reason: "User reported: console:App.jsx:168 Uncaught ReferenceError: Cannot access 'callAI' before initialization"
  severity: blocker
  test: 0
  root_cause: "const callAI = useCallback(...) at App.jsx:170 defined AFTER a useEffect at App.jsx:144-168 that references callAI in its dependency array. const declarations are in temporal dead zone until reached during execution, so evaluating the dependency array throws ReferenceError."
  artifacts:
    - path: "src/App.jsx"
      issue: "callAI useCallback defined after useEffect that references it in dependency array"
  missing:
    - "Reorder: move const callAI = useCallback(...) before the useEffect that depends on it"
  debug_session: ""
