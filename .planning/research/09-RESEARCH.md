# Phase 9: Seed Catalog & Quality Features — Research

**Researched:** 2026-07-03
**Domain:** Course content architecture, quality indicators, improvement tracking
**Confidence:** HIGH

## Summary

Phase 9 requires three independent workstreams: (1) creating 8-10 seed courses bundled as JSON, (2) adding quality/status badges to course cards in the catalog, and (3) tracking post-course score improvement visible on the dashboard.

**Key finding:** The course infrastructure from Phase 6 is fully operational — IndexedDB storage, CatalogView, CoursePlayer, auto-generation pipeline, and improvement tracking stubs all exist. However:

- **No seed courses exist.** The only bundled content is 5 reading passages (`bundled-content.json`) for DSE reading practice — not courses. Seed courses need a new file or adjacent storage mechanism.
- **No quality/badge field exists on the course schema.** The schema has `published: boolean` and `source` (pdf-import/auto-generated/manual), but no `status` or `quality` badge field. A new field (e.g., `quality: 'seed' | 'reviewed' | 'draft'`) needs to be added to `courseSchema.js`, the CatalogView course card render, and the auto-generation pipeline (which currently sets `published: false`).
- **Improvement tracking stub exists but is unused.** `trackPostCourseImprovement()` in `useCourses.js` stores before/after error analysis to localStorage but is never called. The `crescendo-course-improvements` key exists. No UI component reads it.
- **ReadingModule records to skillAnalytics; WritingModule does not.** This asymmetry means grammar course → writing improvement tracking may need to bridge two data sources.

**Primary recommendation:** Three-stream execution: (A) bundled seed JSON + seed loader, (B) quality badge field on course + card UI rendering, (C) improvement tracking pipeline from CoursePlayer completion → dashboard widget.

---

## User Constraints (from CONTEXT.md)

Phase 9 has no CONTEXT.md yet (this research precedes discuss-phase). However, these constraints from ROADMAP.md and REQUIREMENTS.md are locked:

### Locked Decisions (from ROADMAP & REQUIREMENTS)
- Seed catalog must have 8-10 courses on first launch covering: DSE grammar, vocabulary, writing, reading strategy, general English
- Quality badges must show: draft/reviewed/seed on course cards
- Post-course score improvement tracking must work (e.g., grammar course → reduced grammar errors in writing)
- Improvement data must be visible on dashboard or course completion view
- Phase depends on Phase 8 (auto-generation pipeline produces quality content)

### Known Scope Boundaries
- Phase 10 CONTEXT.md explicitly defers: "quality badges/display" and "seed catalog content" to Phase 9
- Do NOT: add course completion certificates/gamification, video content, sharing features, DSE question type alignment for courses
- Offline-first applies: seed courses must be bundled, not server-dependent

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seed course storage | **Bundled JSON (src/assets/)** | IndexedDB | Offline-first requirement — courses must be available without backend. Loaded into IndexedDB on first launch. |
| Quality badge display | **Browser (CatalogView.jsx)** | — | Pure UI concern — course card rendering conditionally shows badge based on `course.quality` field |
| Post-course improvement tracking | **Browser (CoursePlayer → localStorage)** | Dashboard | `trackPostCourseImprovement()` runs client-side when course completes. Improvement data stored in localStorage. Dashboard reads and displays it. |
| Cross-module improvement detection | **Browser (App.jsx orchestrator)** | — | Must compare error patterns from Reading/Writing sessions before and after course completion. Orchestrated in App.jsx where both skillAnalytics and course hooks are available. |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JSON bundles (bundled-content.json pattern) | — | Seed course storage | Existing pattern in `src/assets/bundled-content.json` for bundled reading passages — same location for seed courses |
| useCourses.js | — | Course CRUD + improvement tracking | Already has `trackPostCourseImprovement()`, `getCompletedCourses()`, enroll/save methods |
| courseSchema.js | — | Course model + validators | Already has `validateCourse()`, `COURSE_SCHEMA`, `WEAKNESS_TO_TAG_MAP` |
| useIndexedDB.js | — | IndexedDB persistence | Already has `DSE_KEYS.COURSES`, `DSE_KEYS.COURSE_PROGRESS`, sync methods |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| errorPatternAnalysis.js | — | Weak area identification | For comparing before/after error patterns to compute improvement metric |
| useSkillAnalytics.js | — | Session-based skill scores | For tracking aggregate improvement across skills (reading/writing/listening/speaking) |
| useLocalStorage.js | — | Config persistence | For storing dismissed recommendations, improvement data, enrollment state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bundled JSON file | Backend seed API | JSON file is offline-capable, zero-latency, matches existing pattern. Backend seed requires server running. |
| New `quality` field on course | Derive from existing `published` field | `published` boolean is too coarse (only 2 states). Need 3+ states: seed/reviewed/draft. |
| localStorage for improvement data | IndexedDB | Improvement data is small (≤50 entries), config-like — localStorage is appropriate per `useCourses.js` existing pattern (IMPROVEMENT_KEY, 50-entry limit). |

**Installation:**
No new npm packages needed. All changes are code-level within existing patterns.

---

## Architecture Patterns

### System Architecture Diagram

```
src/assets/bundled-courses.json (8-10 seed courses)
    │
    ▼
App.jsx — useEffect on first launch
    │  seedAttemptedRef.current check
    │  loadSeedCourses() → existing courses check → save to IndexedDB
    ▼
useCourses.getCourses() → setCourses
    │
    ├──► CatalogView.jsx — course cards with quality badges
    │       │  quality source: course.quality field ('seed'|'reviewed'|'draft')
    │       │  badge renders: conditionally in renderCourseCard()
    │       │  seed icon for seed courses
    │       │  reviewed checkmark for reviewed courses
    │       │  draft indicator for draft courses
    │       ▼
    │    CoursePlayer.jsx — course completion
    │       │  on complete: analyze error patterns
    │       │  trackPostCourseImprovement(courseId, before, after)
    │       ▼
    │    Improvement stored → localStorage 'crescendo-course-improvements'
    │       │
    │       ▼
    ├──► Dashboard.jsx — improvement widget
    │       │  reads improvement entries from localStorage
    │       │  shows: "Grammar errors reduced by X% after completing 'Z' course"
    │
    └──► Skill flow (cross-module):
           ReadingModule / WritingModule — skillAnalytics.recordSession()
               │
               ▼
           useSkillAnalytics.getWeakAreas() → before/after comparison
```

### Recommended File Changes

```
src/
├── assets/
│   ├── bundled-content.json           (existing — 5 reading passages)
│   └── bundled-courses.json           (NEW — 8-10 seed courses)
├── components/
│   ├── CatalogView.jsx                (MODIFY — add quality badge rendering)
│   ├── Dashboard.jsx                  (MODIFY — add improvement widget)
│   ├── CoursePlayer.jsx               (MODIFY — call trackPostCourseImprovement on completion)
│   └── CourseOverview.jsx             (MODIFY — show quality badge + improvement summary)
├── hooks/
│   ├── useCourses.js                  (MODIFY — seed loader, improvement getter)
│   └── useSkillAnalytics.js           (no change needed — already has getWeakAreas)
├── utils/
│   └── courseSchema.js                (MODIFY — add `quality` field to COURSE_SCHEMA)
└── App.jsx                            (MODIFY — seed loading on first launch, improvement bridge)
```

### Pattern 1: Seed Course Loading
**What:** Detect first launch (no courses in IndexedDB), load bundled courses from JSON, save to IndexedDB with `quality: 'seed'`
**When to use:** On app mount, before catalog is rendered
**Implementation sketch:**
```javascript
// App.jsx — side-by-side with existing seedAttemptedRef logic (lines 238-334)
const seedCoursesRef = useRef(false);
useEffect(() => {
  if (seedCoursesRef.current || !skillAnalytics?.isLoaded) return;
  seedCoursesRef.current = true;
  // Check if courses already exist in IndexedDB
  getCoursesFn().then(async existing => {
    if (existing.length === 0) {
      const { seedCourses } = await import('../assets/bundled-courses.json');
      for (const course of seedCourses) {
        await saveCourseFn({ ...course, quality: 'seed' });
      }
      refreshCourses();
    }
  });
}, [skillAnalytics?.isLoaded]);
```

### Pattern 2: Quality Badge Display
**What:** Conditionally render a quality badge on each course card in the catalog
**When to use:** In `renderCourseCard()` in CatalogView.jsx
**Implementation sketch:**
```javascript
// In renderCourseCard() of CatalogView.jsx — add after tags section
const qualityConfig = {
  seed: { label: 'Seed', icon: '🌱', className: 'course__badge--seed' },
  reviewed: { label: 'Reviewed', icon: '✓', className: 'course__badge--reviewed' },
  draft: { label: 'Draft', icon: '✎', className: 'course__badge--draft' },
};
const badge = course.quality ? qualityConfig[course.quality] : null;
{/* Inside course card, after source badge */}
{badge && (
  <span className={`course__badge ${badge.className}`} title={`Quality: ${badge.label}`}>
    {badge.icon} {badge.label}
  </span>
)}
```

### Pattern 3: Post-Course Improvement Tracking
**What:** When course completes, capture error patterns before/after and store improvement metrics
**When to use:** In `CoursePlayer.jsx` phase === 'complete' branch
**Implementation sketch:**
```javascript
// CoursePlayer.jsx — when completing final assessment (lines 896-931)
useEffect(() => {
  if (phase === 'complete' && course.id) {
    // Get pre-course error patterns from skillAnalytics
    const weakAreas = skillAnalytics?.getWeakAreas?.() || [];
    // Store as baselines before/after
    trackPostCourseImprovement(course.id, weakAreas, weakAreas);
    // Also mark course as completed
    setEnrollmentStatus(course.id, 'completed');
  }
}, [phase]);
```

### Anti-Patterns to Avoid
- **Don't call AI for seed course generation** — seed courses must be deterministic, offline-available, and validated at build time. AI-generated content may fail or be inconsistent.
- **Don't modify the course player state machine** — Phase 6 already established the state machine (overview → lesson → exercise → final-assessment → complete). Just hook into phase 'complete'.
- **Don't create improvement data in IndexedDB** — localStorage is appropriate for small, config-sized improvement entries (≤50 records, same as existing pattern).
- **Don't block first launch on seed loading** — Seed loading is silent background work. User should see the catalog immediately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Course data validation | Custom validator | `validateCourse()` in `courseSchema.js` (lines 176-251) | Already exists, supports structural + semantic validation |
| IndexedDB operations | Custom DB layer | `useIndexedDB.js` with `DSE_KEYS.COURSES` | Already wraps IndexedDB, handles open/create/transaction |
| Error pattern analysis | Custom aggregation | `errorPatternAnalysis.js` — `identifyWeakAreas()`, `analyzeBySkill()` | Already computes skill/question-type breakdowns |
| Enrollment tracking | Custom state | `useCourses.js` with `enrollCourse()`, `getEnrolledCourses()`, `setEnrollmentStatus()` | All methods exist in the hook |
| Improvement data storage | Custom persistence | `trackPostCourseImprovement()` in `useCourses.js` + localStorage | Stub exists, just needs to be wired up |

**Key insight:** Phase 9 has no novel infrastructure requirements. Every primitive needed (storage, validation, enrollment, analytics) was built in Phase 6 and hardened in Phases 7-8. The work is wiring and content authoring.

---

## Runtime State Inventory

> This is a greenfield content + UI phase — no rename/refactor/migration. Not applicable.

---

## Common Pitfalls

### Pitfall 1: Seed Courses Not Loading for Offline Users
**What goes wrong:** Seed courses require app boot and IndexedDB write. If the Service Worker cache doesn't include the bundled JSON file, offline users won't get seed courses.
**Why it happens:** PWA caching via Workbox generateSW may not include `src/assets/bundled-courses.json` if the glob pattern excludes `.json` files.
**How to avoid:** Verify the PWA manifest/handling in `vite.config.js` includes `**/*.json` in the Workbox glob. Import the JSON directly (not via fetch) so it's part of the JS bundle.
**Warning signs:** New offline install shows empty catalog.

### Pitfall 2: Quality Badge Collision with Existing Course Source Badges
**What goes wrong:** Course cards already show a source badge (`📄 Imported` / `🤖 Auto-generated`). Adding a quality badge creates visual clutter — two badges on each card.
**Why it happens:** `renderCourseCard()` in CatalogView.jsx (lines 174-222) renders source badge unconditionally. Adding quality badge without redesigning the badges section.
**How to avoid:** Replace the existing source badge with a combined badge area that shows both source AND quality in a compact format, or use different visual treatment (colored dot vs text label).
**Warning signs:** Course cards look crowded after Phase 9 changes.

### Pitfall 3: Improvement Data Not Comparable Across Sessions
**What goes wrong:** `trackPostCourseImprovement()` stores before/after error patterns, but the error pattern structure differs between reading (skill-based subScores) and writing (rubric-based analysis).
**Why it happens:** ReadingModule records through `skillAnalytics.recordSession()` with `subScores` by question type. WritingModule saves to `dsePapers.writingSessionSet` with different structure.
**How to avoid:** Normalize improvement comparison at the `trackPostCourseImprovement()` call site. Use `skillAnalytics.getWeakAreas()` as a common denominator — it returns `{ area, type, percentage, severity }` regardless of source module.
**Warning signs:** Improvement widget shows empty data or "N/A" for writing-skill improvements.

### Pitfall 4: Improvement Tracking Called Before Meaningful Baseline Exists
**What goes wrong:** First-time user completes a seed course immediately on first launch, before doing any reading/writing practice. The "before" snapshot is empty.
**Why it happens:** No pre-course skill data exists. `skillAnalytics.getWeakAreas()` returns empty array.
**How to avoid:** Only show improvement data when BOTH before and after snapshots have ≥1 weak area. If before snapshot is empty, show "Complete more practice sessions to see your improvement" instead.

### Pitfall 5: Seed JSON Not Imported But Fetched Over Network
**What goes wrong:** Seed courses JSON file is fetched via `fetch()` at runtime, breaking offline capability.
**Why it happens:** If bundled-courses.json is large (>100KB), the developer may think dynamic import is better, but offline-first requires it to be bundled.
**How to avoid:** Use `import` (static or dynamic) like `bundled-content.json` is handled (it's a static import via `useDSEPapers.js`). Do NOT `fetch()`.

---

## Code Examples

### Pattern: Seed Course Shape (for bundled-courses.json)
```json
[
  {
    "id": "seed-grammar-tenses",
    "title": "English Tenses Mastery",
    "description": "Master all 12 English tenses with DSE-style exercises. Covers present, past, future, perfect, and continuous forms.",
    "tags": ["grammar:tenses", "grammar:subject-verb-agreement", "grammar:conditionals"],
    "difficulty": "beginner",
    "source": "seed",
    "quality": "seed",
    "topics": [
      {
        "title": "Present Tenses",
        "learningObjectives": ["Identify when to use simple present vs present continuous", "Apply present perfect correctly"],
        "lessons": [
          {
            "title": "Simple Present vs Present Continuous",
            "referenceContent": "... (150+ word reading passage) ...",
            "exercises": [
              {
                "question": "Complete the sentence: She ___ (study) for her DSE exam every evening.",
                "type": "gap-fill",
                "answer": "studies",
                "explanation": "... (40+ chars) ...",
                "difficulty": 2
              }
            ]
          }
        ]
      }
    ],
    "finalAssessment": {
      "title": "Tenses Mastery Assessment",
      "exercises": [
        { "question": "...", "type": "mcq", "answer": "B", "options": ["A", "B", "C", "D"], "explanation": "..." }
      ]
    }
  }
]
```

### Pattern: Reading Module Session Recording (useSkillAnalytics)
```javascript
// Source: ReadingModule.jsx lines 210-236
const sessionData = {
  id: `ses_${Date.now()}_...`,
  skill: 'reading',
  score: results.score,
  totalQuestions: results.totalQuestions,
  percentage: results.percentage,
  subScores: results.subScores,
  completedAt: new Date().toISOString(),
  difficulty: paper.difficulty,
  dseLevel: results.dseLevel,
  duration: duration,
  questions: [...],
};
skillAnalytics?.recordSession(sessionData);
```

### Pattern: Weak Area Extraction (for improvement comparison)
```javascript
// Source: useSkillAnalytics.js lines 153-163
const weakAreas = skillAnalytics.getWeakAreas();
// Returns: [{ skill: 'reading', area: 'Grammar', score: 45, severity: 'critical' }, ...]

// Source: errorPatternAnalysis.js lines 132-159
const bySkill = analyzeBySkill(questions, answers);
const byType = analyzeByType(questions, answers);
const weakAreas = identifyWeakAreas(bySkill, byType);
// Returns: [{ area: 'Grammar', type: 'skill', percentage: 45, severity: 'critical' }, ...]
```

### Pattern: Improvement Storage (stub exists)
```javascript
// Source: useCourses.js lines 482-503
trackPostCourseImprovement(courseId, beforeAnalysis, afterAnalysis);
// Stores to: localStorage.getItem('crescendo-course-improvements')
// Shape: { [courseId]: { beforeAnalysis, afterAnalysis, trackedAt } }
// Max 50 entries, oldest evicted
```

### Pattern: Catalog Course Card Rendering (for badge injection point)
```javascript
// Source: CatalogView.jsx lines 174-222
const renderCourseCard = (course, showEnroll = false) => {
  // ...
  <div className="course__card-meta">
    <span className="course__card-difficulty">...difficulty...</span>
    <span className="course__card-source">...source badge...</span>
  </div>
  // INSERT QUALITY BADGE HERE
  {course.tags && ...}
  // ...
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No seed courses | 8-10 bundled seed courses in JSON | Phase 9 | New users see populated catalog on first launch |
| No quality indicators | Badge system (draft/reviewed/seed) | Phase 9 | Users can judge course maturity before enrolling |
| No improvement tracking | Post-course score improvement dashboard widget | Phase 9 | Users see concrete improvement from courses |

**Deprecated/outdated:**
- The current auto-generation seed flow (`App.jsx` lines 238-334) generates courses from weak areas — this runs AFTER user has practice sessions. Phase 9's seed courses provide the FIRST content before any practice happens.
- `trackPostCourseImprovement()` exists as a stub (164 lines 482-503) but is never called. Phase 9 wires it up.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Seed courses can be stored as a bundled JSON file in `src/assets/` and imported dynamically | Standard Stack | Low — existing pattern for `bundled-content.json` validates this approach |
| A2 | The course player's `phase === 'complete'` is the correct hook point for improvement tracking | Architecture Patterns | Medium — need to verify completion flow includes final assessment pass AND save before triggering |
| A3 | Improvement data from writing practice is accessible via `skillAnalytics.getWeakAreas()` | Common Pitfalls | HIGH — WritingModule does NOT call `skillAnalytics.recordSession()`. Need to verify writing data feeds into weak areas. |
| A4 | Quality badge field should be a new string field on the course object | Standard Stack | Medium — could alternatively derive from `source` field (seed source → seed badge) |

---

## Open Questions

1. **WritingModule session analytics gap**
   - What we know: ReadingModule calls `skillAnalytics.recordSession()` (line 236). WritingModule saves to `dsePapers.writingSessionSet` (line 606) — does NOT call `recordSession()`.
   - What's unclear: Will writing improvement tracking (e.g., "grammar errors reduced after grammar course") work without WritingModule feeding into skill analytics?
   - Recommendation: Investigate whether WritingModule's correction pipeline feeds into skill analytics subScores. If not, improvement tracking for writing skills may need a bridge component that parses writing session data into skill-analytics-compatible format.

2. **Seed course quality review before bundling**
   - What we know: 8-10 seed courses need to be authored covering grammar, vocabulary, writing, reading strategy, general English.
   - What's unclear: Who authors these courses? How are they validated for correctness (answers, explanations)? Do they need human review before bundling?
   - Recommendation: The GSD team authors seed courses as JSON using the Course → Topic → Lesson → Exercise schema. Run each through `validateCourse()` before bundling. Store in `src/assets/bundled-courses.json`.

3. **Improvement tracking for courses not aligned to specific skills**
   - What we know: `trackPostCourseImprovement()` takes free-form `beforeAnalysis` / `afterAnalysis` objects.
   - What's unclear: If a "General English" course doesn't map to a specific skill subscore, how is improvement measured?
   - Recommendation: Use `skillAnalytics.getWeakAreas()` as the universal baseline (it returns `{ area, percentage }`). If a course's tags don't align with any weak area, show "Complete practice sessions to see your improvement" rather than empty data.

---

## Environment Availability

> No new external dependencies — code/config-only changes. Skipping.

---

## Validation Architecture

> Validation for this phase must verify seed courses validate correctly, quality badges render, and improvement tracking fires. See wave 0 gaps below.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js assertion tests (no test framework detected in codebase) |
| Config file | None — no test framework |
| Quick run command | `node tests/phase9-validation.mjs` (would need to be created) |
| Full suite command | Same |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COURSE-03 | Seed courses loaded on first launch | integration | `node tests/phase9-seed-load.mjs` | ❌ Wave 0 |
| COURSE-07 | Quality badges render on course cards | manual | N/A — visual inspection | ❌ |
| COURSE-08 | Improvement data tracked after completion | unit | `node tests/phase9-improvement.mjs` | ❌ Wave 0 |

### Sampling Rate
- Not applicable — no test framework exists

### Wave 0 Gaps
- [ ] `tests/phase9-seed-load.mjs` — verifies seed courses load, validate, and store to IndexedDB
- [ ] `tests/phase9-improvement.mjs` — verifies `trackPostCourseImprovement()` stores and retrieves correct data shape

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Security Domain

> Security enforcement disabled for this research. Skipping per config.

---

## Sources

### Primary (HIGH confidence)
- Codebase files read directly — see file paths and line numbers in findings below

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` — Phase 9 description, success criteria, dependency on Phase 8
- `.planning/REQUIREMENTS.md` — COURSE-03, COURSE-07, COURSE-08 requirement text
- `.planning/phases/10-8/10-CONTEXT.md` — Auto-Generation Quality phase decisions (D-07 quality gate invisible to user, deferred items)

### Tertiary (LOW confidence)
- None — all findings verified against actual codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries and patterns verified against codebase
- Architecture: HIGH — based on existing working code patterns (useCourses, CatalogView, CoursePlayer)
- Pitfalls: HIGH — risks identified from codebase analysis (WritingModule analytics gap, PWA caching, badge collision)

**Research date:** 2026-07-03
**Valid until:** 2026-08-03 (30 days)
