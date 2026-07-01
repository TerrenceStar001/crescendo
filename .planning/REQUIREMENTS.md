# Requirements: Crescendo

**Defined:** 2026-07-01
**Core Value:** Students can practice authentic DSE-style English exam papers with AI-generated passages and questions, get immediate feedback with detailed analysis, and track their progress across all four skills — all from a single offline-capable web app.

## v1.1 Requirements

Requirements for milestone v1.1 — Courses Quality Polish. Each maps to roadmap phases.

### PDF Ingestion Pipeline

- [ ] **COURSE-01**: PDF upload → course pipeline works end-to-end with reliable text extraction (positional sorting for multi-column layouts), proper chunking with heading detection, and AI structuring that produces usable courses
- [ ] **COURSE-05**: Failed uploads and generation failures show clear, user-facing error messages — no silent `catch {}` blocks hiding failures
- [ ] **COURSE-06**: Infrastructure fixes — server body size limit matches client limit (both at 10MB), dual storage (IndexedDB + SQLite) has consistent sync protocol

### Auto-Generation Improvements

- [ ] **COURSE-02**: Auto-generated courses from user practice sessions have sufficient quality — reasonable content depth, valid exercises, semantically correct answers
- [ ] **COURSE-04**: Generated course content is deep enough for meaningful learning (not thin template-like output) — uses lower AI temperature, adequate token limits, and proper timeout configuration

### Seed Catalog & Content Quality

- [ ] **COURSE-03**: Catalog has 8-10 useful seed courses available immediately on first launch, covering DSE prep (grammar, vocabulary, writing, reading strategy) and general English
- [ ] **COURSE-07**: Course quality indicators visible in the catalog — badges show draft/reviewed/seed quality level so users can judge course maturity

### Analytics & Tracking

- [ ] **COURSE-08**: Post-course tracking — system tracks whether user scores improve after completing courses (e.g., did grammar course reduce grammar errors in writing practice)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Miscellaneous

- **COURSE-09**: Admin dashboard for reviewing and approving auto-generated courses before publishing
- **COURSE-10**: Course authoring tool for teachers to create custom courses

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Course marketplace / sharing | Multi-user features out of scope for self-study tool |
| Video courses | Platform is text-based, video adds unnecessary complexity |
| Gamification (XP, levels, streaks) | Not core to learning value, deferred indefinitely |
| IELTS/TOEFL-specific courses | DSE-focused only per core value |
| Phase 5: IELTS Grading Pipeline | Separate feature deferred from v1.0, not part of this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COURSE-01 | Phase 7 | Pending |
| COURSE-02 | Phase 8 | Pending |
| COURSE-03 | Phase 9 | Pending |
| COURSE-04 | Phase 8 | Pending |
| COURSE-05 | Phase 7 | Pending |
| COURSE-06 | Phase 7 | Pending |
| COURSE-07 | Phase 9 | Pending |
| COURSE-08 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---

*Requirements defined: 2026-07-01*
*Last updated: 2026-07-01 after milestone v1.1 start*
