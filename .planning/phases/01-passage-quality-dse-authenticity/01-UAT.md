---
status: testing
phase: 01-passage-quality-dse-authenticity
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-UI-SPEC.md
started: 2026-06-23T11:00:00Z
updated: 2026-06-23T11:00:00Z
---

## Current Test

number: 1
name: DSE Booklet Passage Display
expected: |
  When viewing a reading passage in ReadingModule, the passage text should:
  - Be rendered in a paper-like card container (cream/soft background, subtle border/shadow)
  - Use serif font (Georgia or Times New Roman) for the passage body
  - Have justified text alignment
  - Show first-line paragraph indentation (2em)
  - Display a colored part badge (Part A/B1/B2) with section-specific colors
  - Show source attribution below the passage ("Adapted from {sourceName}, {date}" for RAG, "Adapted from a news article" for pure AI)
awaiting: user response

## Tests

### 1. DSE Booklet Passage Display
expected: |
  When viewing a reading passage in ReadingModule, the passage text should:
  - Be rendered in a paper-like card container (cream/soft background, subtle border/shadow)
  - Use serif font (Georgia or Times New Roman) for the passage body
  - Have justified text alignment
  - Show first-line paragraph indentation (2em)
  - Display a colored part badge (Part A/B1/B2) with section-specific colors
  - Show source attribution below the passage
result: [pending]

### 2. Passage Word Count Calibration
expected: |
  AI-generated passages should have word counts within HKDSE-calibrated ranges:
  - Part B1 (easy): 600-1000 words
  - Part A (compulsory): 900-1200 words
  - Part B2 (hard): 1000-1200 words
  Passages exceeding these ranges should be truncated or flagged.
result: [pending]

### 3. Text Type Diversity
expected: |
  Generated passages should cover multiple genres matching real DSE Paper 1:
  - B1: news report, blog post, webpage/guide, forum post, letter to editor, advertisement
  - A: news report, feature article, letter to editor, interview transcript, informational text
  - B2: opinion piece/editorial, literary excerpt, academic text, feature article, argumentative essay
  Different passages should not all be the same text type.
result: [pending]

### 4. RAG Fragment Blending
expected: |
  When backend RAG is available, generated passages should blend real article fragments with AI composition — not copy verbatim. The passage should read as original content informed by real sources.
result: [pending]

### 5. Source Attribution Accuracy
expected: |
  - RAG-generated passages show real source name and date from the backend article
  - Pure AI passages show generic attribution ("Adapted from a news article")
  - Bundled content shows source as "bundled"
result: [pending]

### 6. Pure AI Fallback
expected: |
  When backend is unavailable (no RAG, no DSE OCR), the system should generate a passage entirely from AI as a fallback — not immediately fall to bundled content. The passage should meet the same quality gates (word count, structure).
result: [pending]

### 7. Quality Gates (Truncation Detection)
expected: |
  Generated passages should be validated for:
  - Minimum paragraph count (based on word count target)
  - Last paragraph sentence count (>= 3 sentences)
  - No unclosed HTML tags
  - No mid-word truncation
  Passages failing these checks should either be retried or flagged with a warning.
result: [pending]

### 8. Structural Constraints Applied
expected: |
  Generated passages should follow structural constraints:
  - No neat resolutions or moral lessons at the end
  - Concrete, domain-specific nouns rather than abstract concepts
  - Short paragraphs (1-3 sentences)
  - Mixed formal/colloquial vocabulary
  - Generic role descriptions, not fabricated names
result: [pending]

### 9. Backend Fragments Endpoint
expected: |
  POST /api/rag/fragments should return fragments from real articles with source attribution when the backend is running. Input validation should reject invalid topic (non-string) and count (negative) values.
result: [pending]

### 10. Passage Display Matches DSE Booklet Layout
expected: |
  The overall passage display should feel like reading a real DSE exam booklet — serif text, justified paragraphs, paper-like card, line numbers, part badges. The experience should be distinguishable from casual web reading.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
