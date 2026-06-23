---
status: complete
phase: 01-passage-quality-dse-authenticity
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-UI-SPEC.md
started: 2026-06-23T11:00:00Z
updated: 2026-06-23T14:00:00Z
---

## Current Test

[testing complete]

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
result: pass

### 2. Passage Word Count Calibration
expected: |
  AI-generated passages should have word counts within HKDSE-calibrated ranges:
  - Part B1 (easy): 600-1000 words
  - Part A (compulsory): 900-1200 words
  - Part B2 (hard): 1000-1200 words
  Passages exceeding these ranges should be truncated or flagged.
result: pass

### 3. Text Type Diversity
expected: |
  Generated passages should cover multiple genres matching real DSE Paper 1:
  - B1: news report, blog post, webpage/guide, forum post, letter to editor, advertisement
  - A: news report, feature article, letter to editor, interview transcript, informational text
  - B2: opinion piece/editorial, literary excerpt, academic text, feature article, argumentative essay
  Different passages should not all be the same text type.
result: issue
reported: "While the text attempts to split types, the overall tone remains homogenized under a unified storytelling voice. Text 2 should have been presented completely as a formal, dry, excerpted Environmental Impact Assessment Report with bullet points, project matrices, and executive summaries, rather than a narrative tracking a character's personal thoughts."
severity: minor

### 4. RAG Fragment Blending
expected: |
  When backend RAG is available, generated passages should blend real article fragments with AI composition — not copy verbatim. The passage should read as original content informed by real sources.
result: pass

### 5. Source Attribution Accuracy
expected: |
  - RAG-generated passages show real source name and date from the backend article
  - Pure AI passages show generic attribution ("Adapted from a news article")
  - Bundled content shows source as "bundled"
result: pass

### 6. Pure AI Fallback
expected: |
  When backend is unavailable (no RAG, no DSE OCR), the system should generate a passage entirely from AI as a fallback — not immediately fall to bundled content. The passage should meet the same quality gates (word count, structure).
result: issue
reported: "Pure AI path generates a passage (1205w, truncated: true) but then the system falls to bundled content anyway. The 1205w is just barely over the 1200 target, triggering truncation detection, and the retry may be failing or the result isn't being captured."
severity: major

### 7. Quality Gates (Truncation Detection)
expected: |
  Generated passages should be validated for:
  - Minimum paragraph count (based on word count target)
  - Last paragraph sentence count (>= 3 sentences)
  - No unclosed HTML tags
  - No mid-word truncation
  Passages failing these checks should either be retried or flagged with a warning.
result: pass

### 8. Structural Constraints Applied
expected: |
  Generated passages should follow structural constraints:
  - No neat resolutions or moral lessons at the end
  - Concrete, domain-specific nouns rather than abstract concepts
  - Short paragraphs (1-3 sentences)
  - Mixed formal/colloquial vocabulary
  - Generic role descriptions, not fabricated names
result: issue
reported: "Four specific problems: 1) Text 2 ends with moralizing (should be unresolved), 2) Text 2 uses abstract corporate vocab instead of concrete nouns, 3) Paragraphs are too long (5-8 sentences instead of 1-3), 4) Colloquial vocabulary is too weak — dialogue is hyper-grammatical"
severity: minor

### 9. Backend Fragments Endpoint
expected: |
  POST /api/rag/fragments should return fragments from real articles with source attribution when the backend is running. Input validation should reject invalid topic (non-string) and count (negative) values.
result: skipped

### 10. Passage Display Matches DSE Booklet Layout
expected: |
  The overall passage display should feel like reading a real DSE exam booklet — serif text, justified paragraphs, paper-like card, line numbers, part badges. The experience should be distinguishable from casual web reading.
result: issue
reported: "Multiple critical deviations: 1) Total absence of line numbers (left margin column for 'In line 8...' questions), 2) 'AI' tag badge breaks exam context, 3) Redundant part badges (two competing Part A indicators), 4) Justification gaps (no hyphenation/tracking adjustments causing awkward word spacing), 5) Modern CSS accent lines instead of solid black lines, 6) Missing exam framework (no seat number placeholder, no administrative text, no page boundaries)"
severity: major

## Summary

total: 10
passed: 4
issues: 4
pending: 0
skipped: 1

## Gaps

- truth: "Generated passages cover multiple text types with distinct voices per genre"
  status: failed
  reason: "User reported: tone remains homogenized under unified storytelling voice, Text 2 should be formal dry report with bullet points/matrices"
  severity: minor
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Pure AI fallback generates passages when backend is unavailable"
  status: failed
  reason: "User reported: pure AI generates passage but system falls to bundled content anyway"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Generated passages follow structural constraints (no moralizing, concrete nouns, short paragraphs, mixed vocabulary)"
  status: failed
  reason: "User reported: Text 2 ends with moralizing, uses abstract vocab, paragraphs too long, colloquial vocabulary too weak"
  severity: minor
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Passage display matches real DSE booklet layout (line numbers, sterile design, single part badge, no justification gaps, exam framework)"
  status: failed
  reason: "User reported: no line numbers, AI badge breaks context, redundant part badges, justification gaps, modern CSS styling, missing exam framework"
  severity: major
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
