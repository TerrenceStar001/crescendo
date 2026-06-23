---
phase: 01
slug: passage-quality-dse-authenticity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-23
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npm run dev` (manual visual check) |
| **Full suite command** | N/A |
| **Estimated runtime** | N/A |

---

## Sampling Rate

- **After every task commit:** Manual verification via `npm run dev` (visual + terminal log inspection)
- **After every plan wave:** Manual review of generated passage output
- **Before `/gsd-verify-work`:** All success criteria must be manually verifiable
- **Max feedback latency:** N/A (no automated tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | READ-01 | — | N/A | manual | `npm run dev` | ⬜ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | READ-01 | — | N/A | manual | `npm run dev` | ⬜ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | READ-01 | — | N/A | manual | `npm run dev` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.
- No test framework exists in the project — test framework installation is out of scope for Phase 1.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Passage matches DSE genre variety | SC-1 | Qualitative — no test oracle for genre authenticity | Visual review: generated passages should match expected text types (news, feature, opinion, literary, informational) |
| Difficulty calibration per part | SC-2 | Quantitative but no test framework | Run generation for each difficulty — verify word count ranges and lexical complexity tiering |
| Quality gate pass rate >95% | SC-3 | Statistical — requires N>20 sample | Generate 20+ passages, count passes vs regens, verify >95% passes |
| Passage display formatting | SC-4 | Visual — matches DSE booklet conventions | Visual check: serif font, text-indent paragraphs, justified text, source attribution |
| Indistinguishable from real DSE | SC-5 | Turing-test style — user survey | Blind test: mix AI + real DSE passages, user should identify ≤2/10 as AI |

---

## Validation Sign-Off

- [ ] All tasks have manual verify steps or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without verify step
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < N/A
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
