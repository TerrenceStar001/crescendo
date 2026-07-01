# Feature Landscape: Courses Quality Polish

**Domain:** Content Ingestion & AI Course Generation
**Researched:** 2026-07-01

## Table Stakes — Must Fix

Features that users expect to work reliably. Missing these = broken product.

| Feature | Why Expected | Current State | Fix Complexity |
|---------|--------------|---------------|----------------|
| PDF upload → structured course | Core ingestion path | Fails on multi-column layouts, no quality feedback to user | Medium |
| Generated exercises have correct answers | Core trust | AI invents answers for garbled PDF text | Medium |
| Course exercises are playable end-to-end | Core functionality | Works for valid courses, but exercises often lack options/answers | Low |
| Catalog has courses to browse | First user impression | Empty for first-time users | Low |
| Progress saves and restores | User expectation | Works but fragile (question-string keys) | Low |
| Course quality is consistent | User trust | Varies wildly between AI-generated and template fallback | Medium |

## Differentiators — Worth Adding

Features that set a course platform apart from generic quiz generators.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Post-generation quality score | Users can trust courses are vetted before practice | Low | Add `validation_warnings` field, show badge |
| "Regenerate lesson" button | User doesn't discard whole course for one bad lesson | Medium | Parallel lesson generation, idempotent replacement |
| Extraction quality preview | User sees PDF extraction result before AI spends time on garbage | Medium | Show extracted text preview in review UI |
| Course generation from any text | User pastes article/blog post → structured course | Low | Same pipeline as PDF, just skip extraction step |
| Difficulty-aware exercise ordering | Beginner → Advanced progression within course | Low | Order exercises by `difficulty` field during generation |

## Anti-Features — Explicitly Don't Build

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time collaborative course editing | Single-user PWA, no auth system | Keep course editing single-user + publish |
| Full WYSIWYG course builder | Massive UI complexity, low value vs PDF ingest | Keep existing review/edit phase + regen |
| User-submitted course marketplace | Moderation burden, spam risk | Focus on seeded + AI-generated content |
| Video-based courses | Offline-first PWA constraint, large storage | Stick to text + exercise format |

## Feature Dependencies

```
SQLite schema update (exercise_count, etc.)
    ↓
Deduplicate validation (courseValidation.js)
    ↓
Exercise ID generation in course model
    ↓
SQLite-first sync in useCourses
    ↓
PDF quality gate ──→ AI prompt improvements (parallel)
    ↓
Seed course deployment
    ↓
Polish & answer tracking fix
```

## MVP Recommendation (for this milestone)

**Must fix (blocking quality):**
1. Content quality gate after PDF extraction (prevent garbage→course)
2. Drop AI temperature to 0.1 + add few-shot examples (consistent JSON)
3. Remove 3-second timeout from autoGenerateCourse (actually let AI respond)
4. Seed 5 courses on first launch (never show empty catalog)

**Should fix (usability):**
5. Exercise ID standardization (fix answer tracking)
6. SQLite-first sync (prevent data loss)
7. Surface validation warnings in review UI

**Defer (nice-to-have):**
- SSE progress for PDF processing
- "Regenerate lesson" button
- Difficulty-aware ordering
