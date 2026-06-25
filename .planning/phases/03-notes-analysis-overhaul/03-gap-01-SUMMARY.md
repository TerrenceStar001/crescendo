---
phase: 03-notes-analysis-overhaul
plan: gap-01
type: execute
subsystem: reading-results
tags: [marked-script-view, css, gap-closure]
requires: []
provides: [fixed-paragraph-numbering, sequential-questions, heading-styles, container-width]
affects: [MarkedScriptView.jsx, App.css]
key-files:
  modified:
    - path: src/components/MarkedScriptView.jsx
      scope: "Renamed `index` to `seqNum`, flattened questions into reading order across all paragraphs, removed early-return skip for empty paragraphs, replaced `<para.tagName>` with `React.createElement`"
    - path: src/App.css
      additions: "h2/h3 heading styles, width/box-sizing fixes for .marked-script and .marked-script__para, min-width: 0 on .marked-script__text"
metrics:
  duration: ~10m
  completed_at: "2026-06-25"
---

# Gap Closure 01: MarkedScriptView Fixes — Summary

## Completed Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Fix paragraph numbering, sequential questions, heading rendering | `40766eb` |
| 2 | Add heading styles, fix container width | `378906d` |

## What Was Fixed

1. **Paragraph numbering** — Changed `index` to `seqNum` (sequential 1..N), all paragraphs render regardless of question count
2. **Sequential question display** — Questions now flattened into reading order across all paragraphs with global sequential numbering (Q1, Q2, Q3...)
3. **Heading rendering** — Replaced broken `<para.tagName>` JSX with `React.createElement(para.tagName, ...)` for dynamic tag resolution
4. **Heading styles** — Added `.marked-script__text h2` and `.marked-script__text h3` CSS with distinct sizing and no text-indent
5. **Container width** — `.marked-script` now has `width: 100% + box-sizing: border-box`, `.marked-script__para` has `width: 100% + overflow-wrap: break-word`, `.marked-script__text` has `min-width: 0` for proper flex shrink

## Verification
- ✅ `React.createElement(para.tagName, ...)` present
- ✅ `seqNum` field used for paragraph numbering
- ✅ No early-return skip for empty paragraphs
- ✅ `.marked-script__text h2` and `h3` styles present with text-indent: 0
- ✅ `.marked-script` container has width: 100%
- ✅ Build passes in 9.06s
