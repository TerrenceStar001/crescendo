---
phase: 3
slug: notes-analysis-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project — manual/visual verification only) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Build must be green

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Marked-script annotations display | READ-05 | Visual UI — no test framework | Start a reading session, complete it, verify annotations show highlighted errors + margin comments |
| Error pattern analysis | READ-05 | Visual UI — no test framework | Complete a session with mixed answers; verify error patterns show by skill and type |
| Drill recommendations | READ-05 | Visual UI + AI output quality | Verify 2-3 drills appear based on mistake patterns |
| DSE booklet UI | READ-06 | Visual styling — no test framework | Verify part-specific colors, instruction language, answer format, tablet layout |
| Tablet responsive layout | READ-06 | Visual/CSS — no test framework | Verify layout works at 768px and 1024px widths |

---

## Validation Sign-Off

- [ ] All planned files created and importable
- [ ] Build passes (`npm run build`)
- [ ] No console errors during reading session flow
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
