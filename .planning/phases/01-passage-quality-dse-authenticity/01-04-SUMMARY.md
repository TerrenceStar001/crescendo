---
phase: 01-passage-quality-dse-authenticity
plan: 04
subsystem: ui
tags: dse, reading, css, passage-display, exam-framework

# Dependency graph
requires:
  - phase: 01-passage-quality-dse-authenticity/01-01
    provides: Passage generation pipeline
  - phase: 01-passage-quality-dse-authenticity/01-02
    provides: ReadingModule base structure with passage-card

provides:
  - DSE booklet passage layout with line number gutter
  - DSE exam framework header (seat number, exam title, year)
  - Sterile DSE passage card styling (no radius, no shadow, no accent lines)
  - Removed AI badge from passage title for exam context authenticity
  - Single part badge (no duplication), simplified word count
  - Justified text with CSS hyphenation (including prefixed variants)
  - Solid black section header borders (no accent colors)
  - Page boundary indicators between multi-text passages

affects:
  - 01-passage-quality-dse-authenticity (satisfies gap-10 from UAT)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CSS counter-based line numbering for passage text
    - Static DSE exam framework header mimicking real booklet

key-files:
  created: []
  modified:
    - src/components/ReadingModule.jsx — cleaned passage card render block
    - src/App.css — added line gutter, exam framework, sterile CSS

key-decisions:
  - "CSS counter-based line numbers (no JS) for simplicity and performance"
  - "Static 2024 year in exam header — dynamic year would require prop drilling from config"
  - "Removed flexbox from .reading__passage-title since AI badge was the only child needing it"
  - "Replaced accent-colored section header borders with solid black (--color-text) for DSE booklet aesthetic"

requirements-completed: [READ-01]

# Metrics
duration: 3min
completed: 2026-06-24
---

# Phase 1 Plan 4: DSE Booklet Layout Summary

**DSE booklet passage display: line number gutter, exam framework header, removed AI badge, sterile styling, justified text with hyphenation, solid black borders**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-24T01:12:31Z
- **Completed:** 2026-06-24T01:15:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **Removed AI badge** from passage title — students no longer see "AI" on an exam passage (Gap 10, item 2)
- **Added DSE exam framework header** — seat number, "Hong Kong Diploma of Secondary Education Examination" title, year (2024) at top of passage card (Gap 10, item 6)
- **Single part badge** — only one Part A/B1/B2 badge above passage title, no duplication (Gap 10, item 3)
- **Line number gutter** — 40px left gutter with CSS counter-generated line numbers alongside passage text (Gap 10, item 1)
- **Justified text with full hyphenation** — `-webkit-hyphens` and `-moz-hyphens` added for cross-browser support (Gap 10, item 4)
- **Sterile passage card** — removed `border-radius` and `box-shadow`, keeping flat DSE booklet look (Gap 10, item 5)
- **Solid black section header borders** — replaced accent-colored and colored section header variants with `var(--color-text)` (Gap 10, item 5)
- **Simplified word count footer** — no redundant source attribution (already in its own block above)
- **Page boundary indicators** — subtle top border on `h3 + p` transitions between multi-text passages

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove AI badge, clean redundant badges, add exam framework header to ReadingModule.jsx** - `1045a6d` (feat)
2. **Task 2: Add DSE booklet CSS — line numbers, hyphenation, exam framework, sterile styling** - `6a4927c` (feat)

## Files Created/Modified

- `src/components/ReadingModule.jsx` — Passage card render block rewritten: exam framework header added at top, AI badge removed from title, line number gutter div added inside passage-body, word count simplified (no redundant source attribution)
- `src/App.css` — 83 lines added / 19 removed: exam framework header CSS (`.reading__exam-framework*`), line number gutter with CSS counters (`.reading__line-gutter`), prefixed hyphens on `.reading__passage-text`, sterile passage card (no radius/shadow), solid black section headers, page boundary indicators, removed AI badge styles and unused title flexbox

## Decisions Made

- **CSS counter-based line numbers**: Pure CSS, no JavaScript. The `.reading__line-gutter` uses `counter-reset` on the gutter and `counter-increment: line` on each passage `<p>`. This is simpler and more performant than JS-driven line numbering.
- **Static 2024 year in exam header**: The exam framework shows a static "2024" year. Dynamic year would require prop drilling from the paper metadata or a separate config, adding complexity without clear benefit for the current phase.
- **Removed unused flexbox from passage title**: The `display: flex; align-items: center; gap` on `.reading__passage-title` only existed to align the AI badge inline — now that the badge is gone, these properties are removed.
- **Solid black section header borders**: The `.reading__section-header` variants previously used accent/colored `border-bottom-color`. Changed to `var(--color-text)` matching real DSE booklet aesthetics.

## Deviations from Plan

**1. [Verification check variance] Part badge grep count differs from plan expectation**
- **Found during:** Task 1 (ReadingModule.jsx changes)
- **Issue:** Plan verification expected `grep -c 'reading__passage-part-badge' = 1` but actual count is 3 (1 for the partClasses object definition, 1 for the fallback constant, 1 for the badge div itself)
- **Fix:** Not a fix — the partClasses mapping is pre-existing data structure. Only one badge is rendered in the JSX, meeting the actual requirement "single Part A/B1/B2 badge displayed above passage title"
- **Files modified:** None (not a code change)
- **Verification:** No duplicate part badges in rendered output

---

**Total deviations:** 1 (verification check variance — no code impact)
**Impact on plan:** None. All six gap-10 items addressed correctly.

## Issues Encountered

None — execution was straightforward. Both tasks passed build verification on first attempt.

## User Setup Required

None — no external service configuration required.

## Threat Surface Scan

No new threat surface introduced. The exam framework header and line gutter are static JSX with no AI content flow. The existing `dangerouslySetInnerHTML` for passage content is unchanged. No new network endpoints, auth paths, or file access patterns.

## Next Phase Readiness

- Gap 10 (major) fully addressed: line numbers, no AI badge, single part badge, justified text with hyphenation, sterile styling, exam framework header
- Passage display visually matches real DSE booklet format
- Ready for further Reading Module refinements or cross-module consistency work

---

## Self-Check: PASSED

| Check | Status |
|-------|--------|
| No AI badge in JSX (`reading__source-badge--ai`) | PASS (0 matches) |
| Exam framework header in JSX | PASS (4 matches) |
| Line gutter in JSX | PASS (1 match) |
| Exam framework CSS in App.css | PASS (4 matches) |
| Line gutter CSS in App.css | PASS (2 matches) |
| CSS hyphenation (hyphens: auto) | PASS (3 matches) |
| Sterile passage card (border-radius: 0, box-shadow: none) | PASS |
| Section headers use solid black not accent colors | PASS |
| Page boundary indicators (h3 + p) | PASS (1 match) |
| Build compiles without errors | PASS |
| Commits exist for both tasks | PASS (1045a6d, 6a4927c) |

*Phase: 01-passage-quality-dse-authenticity*
*Completed: 2026-06-24*
