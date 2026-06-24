# Phase 2 Context: Question Quality & HKDSE Format

**Captured:** 2026-06-24
**Requirements:** READ-02, READ-03, READ-04, READ-07

## Decisions

### D-01: Question Type Proportions
**Choice:** Hybrid — research + fallback
- Attempt to analyze real 2020-2024 HKDSE Paper 1 papers for exact question type counts per part
- If research yields insufficient data, fall back to known approximate distributions
- **Action:** Research phase must include analysis of real paper patterns

### D-02: Mark Allocation
**Choice:** Research to confirm
- User recollection: every question carries 1 mark (one blank)
- Need to verify against real DSE papers whether marks vary (1-4) or are uniformly 1
- **Action:** Include mark-per-question analysis in research
- Must total exactly 42 marks per part with 19-27 questions

### D-03: Question Type Coverage
**Choice:** All HKDSE question types
- Confirmed types: Multiple Choice (MCQ), True/False/Not Given, Cloze/Gap-fill, Short Answer, Matching, Reference/Pronoun
- Include any additional types found in real HKDSE Paper 1 research
- **Action:** Research must identify full question type taxonomy from real papers

### D-04: MCQ Distractor Taxonomy
**Choice:** 5 cognitive trap categories (no Opposite traps)
- Extreme wording traps (always/never/all/none)
- Similar-sounding options
- Partial truth traps (mostly true, one detail wrong)
- Out-of-scope traps (factually true but not in passage)
- Numerical/distraction traps (similar numbers/dates/stats)
- Opposite traps intentionally excluded

### D-05: TFNG Not Given Distribution
**Choice:** Constraint during generation
- AI prompt must specify minimum NG count per TFNG set
- Reject and regenerate if NG count is insufficient
- No post-processing rebalance

### D-06: Partial Marking Scheme
**Choice:** DSE-style rubric
- Full DSE-style partial marking with acceptable alternatives
- Specific mark schemes per question type
- Include spelling tolerance as part of rubric

### D-07: Spelling Tolerance
**Choice:** Case + article tolerance
- Case-insensitive matching
- Ignore articles (a/an/the)
- Accept common UK/US spelling variants
- No Levenshtein distance fuzzy matching

### D-08: Generation Pipeline
**Choice:** Per-type prompts + validator
- Separate AI prompts for each question type
- Post-generation validation layer
- Re-generation loop for failed/quality-gate items

## Action Items from Discuss
1. Research real HKDSE Paper 1 papers for: question type proportions, mark-per-question patterns, full question type taxonomy
2. After research, run `/gsd-plan-phase 2`

## Next Steps
1. Run research for Phase 2 (question type data, mark schemes, DSE format details)
2. Proceed to `/gsd-plan-phase 2` to create plans
