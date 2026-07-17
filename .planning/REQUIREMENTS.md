# Requirements — v1.2 Adaptive Study Engine

## Assessment (ASMT)
- [ ] **ASMT-01**: Student can self-rate skill level for Reading, Writing, Listening, Speaking
- [ ] **ASMT-02**: Student takes 3-question verification quiz per skill
- [ ] **ASMT-03**: System confirms/adjusts self-assessment based on quiz results
- [ ] **ASMT-04**: Assessment profile stored in IndexedDB

## Study Plan (PLAN)
- [ ] **PLAN-01**: AI generates personalized 3-tier plan (short/mid/long-term)
- [ ] **PLAN-02**: Plan density auto-calculates from DSE exam date
- [ ] **PLAN-03**: Each exercise has constraint fields (difficulty, type, time, theme, format, focus)
- [ ] **PLAN-04**: Student can view/regenerate plan
- [ ] **PLAN-05**: Plan adapts from new assessment or flaw data

## Flaw Detection (FLAW)
- [ ] **FLAW-01**: Errors classified into 6 cognitive categories (Vocabulary, Grammar, Comprehension, Inference, Synthesis, Expression)
- [ ] **FLAW-02**: Sliding window (7 days) for pattern detection
- [ ] **FLAW-03**: Severity: Micro/Meso/Macro
- [ ] **FLAW-04**: Flaw data aggregated across sessions

## Adaptive Exercise (EXER)
- [ ] **EXER-01**: AI generates exercises targeting flaw patterns
- [ ] **EXER-02**: Exercises respect constraint fields from plan
- [ ] **EXER-03**: Covers all 4 DSE skills

## Timeline (TIME)
- [ ] **TIME-01**: Horizontal calendar with color-coded exercises by skill
- [ ] **TIME-02**: Exercise cards with constraint badges
- [ ] **TIME-03**: Day/week navigation

## Forgetting Curve (FORGET)
- [ ] **FORGET-01**: Recall probability via half-life model
- [ ] **FORGET-02**: Reviews scheduled when recall < threshold (default 50%)
- [ ] **FORGET-03**: Half-life adjusts from correct/incorrect responses
- [ ] **FORGET-04**: Configurable half-life (30-day default)

## Traceability
| Phase | Requirements |
|-------|-------------|
| 11 | ASMT-01..04, PLAN-01..05, FLAW-01..04 |
| 12 | TIME-01..03, EXER-01..03, FORGET-01..04 |
