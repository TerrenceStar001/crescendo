---
status: testing
phase: 07-pdf-ingestion-pipeline-fix
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md
started: 2026-07-01T08:32:00Z
updated: 2026-07-01T08:40:00Z
---

## Current Test

number: 3
name: Quality block on bad PDF
expected: |
  Uploading a low-quality PDF (<500 chars or <70% English) shows red quality block with "Insufficient Content" error and "Try a Different File" button; no "Proceed" button.
awaiting: user response

## Tests

### 1. Upload PDF — File size limit
expected: Uploading a PDF >10MB shows error banner "File Too Large" with "Try a Different File" button
result: issue
reported: "file from Google Drive with suffix 「的副本" fails — .pdf is not at end of filename. Fixed: changed endsWith('.pdf') to includes('.pdf') on both client and server."
severity: major

### 2. Upload PDF — Quality preview screen
expected: After uploading a good PDF (500+ chars, 70%+ English), the quality preview screen shows per-page character counts, English %, and a quality score badge
result: issue
reported: "Standard PDF uploaded successfully to ingest step, quality passed, but PUT /ingest/generate returned 502 (AI proxy). Root cause: 'opencode serve --port 4010' not running. Fixed: improved error message to guide user."
severity: blocker

### 3. Quality block on bad PDF
expected: Uploading a low-quality PDF (<500 chars or <70% English) shows red quality block with "Insufficient Content" error and "Try a Different File" button; no "Proceed" button
result: [pending]

### 4. Error handling — Network failure
expected: When server is down during upload, EnhancedErrorBanner shows "Upload Failed" with a retry option
result: [pending]

### 5. Two-step generation flow
expected: After quality passes, clicking "Proceed to Course Draft" triggers AI generation and shows the course draft
result: pending

### 6. Refresh Courses button
expected: In Courses → Catalog, Refresh Courses button appears in search bar; clicking it shows spinner then success toast "Courses synced from server (N courses)"
result: [pending]

### 7. Offline behavior — Refresh button disabled
expected: When offline (DevTools → Network → Offline), Refresh Courses button is disabled with tooltip "Cannot refresh while offline"
result: [pending]

## Summary

total: 7
passed: 0
issues: 2
pending: 5
skipped: 0

## Gaps

- truth: "Uploading a PDF with non-standard filename (e.g. Google Drive suffix) accepts the file"
  status: failed
  reason: "User reported: file with suffix 「的副本" after .pdf is rejected by extension check"
  severity: major
  test: 1
  root_cause: "endsWith('.pdf') fails when .pdf is not the final characters"
  artifacts:
    - path: "src/components/CourseIngestion.jsx:57"
      issue: "endsWith('.pdf') too strict for Google Drive suffixes"
    - path: "server/routes/courses.js:287"
      issue: "endsWith('.pdf') too strict for Google Drive suffixes"
  missing:
    - "Change endsWith('.pdf') to includes('.pdf') on both client and server"
  debug_session: ""

- truth: "AI structuring completes without 502"
  status: failed
  reason: "User reported: AI structuring failed with 'fetch failed' after quality pass"
  severity: blocker
  test: 2, 5
  root_cause: "opencode serve --port 4010 not running; backend server-to-server fetch to 127.0.0.1:4010 fails"
  artifacts: []
  missing:
    - "User must run 'opencode serve --port 4010' in separate terminal"
  debug_session: ""
