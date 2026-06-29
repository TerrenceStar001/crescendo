# Phase 6: Courses Feature - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 6-Courses Feature
**Areas discussed:** Course Types & Lifecycle, Navigation & Placement, Course Delivery UI, Auto-generation Trigger, Weakness→Course Mapping, Content Ingestion, Course Structure Model, Course Completion & Scoring Impact, Offline Access, Catalog Organization, Feedback Loop, Difficulty Progression

---

## Course Types & Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Single type | All courses same data model, impored = different source only | ✓ |
| Two distinct types | Imported vs Generated with different behavior | |
| Three+ types | Multiple distinct courses types | |

| Option | Description | Selected |
|--------|-------------|----------|
| Browse → Enroll → Complete → Archived | Standard lifecycle | ✓ |
| Assigned → Attend → Graduate | System-assigned lifecycle | |
| Just-in-time → Do → Done | Lightweight lifecycle | |

| Option | Description | Selected |
|--------|-------------|----------|
| All lessons done | No assessment, just progress | |
| Lessons + final assessment | Complete all lessons + pass final test | ✓ |
| Mastery-based | Auto-unlock based on demonstrated understanding | |

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent — replay anytime | Completed courses stay in history | ✓ |
| Consumed — gone after completion | Ephemeral courses | |
| Frozen — read-only archive | View but can't re-submit | |

| Option | Description | Selected |
|--------|-------------|----------|
| Topics → Lessons → Exercises | Hierarchical composition | ✓ |
| Modules → Units | Different hierarchy | |
| Sessions (flat list) | No grouping | |

| Option | Description | Selected |
|--------|-------------|----------|
| Practice only — final score matters | Lesson exercises untracked | ✓ |
| Accumulated — all scores count | Every exercise contributes | |
| Checkpoint badges | Topic-level checkpoints | |

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple — catalog style | Free to switch between courses | |
| One at a time — focused | Only one active lesson at a time | ✓ (edited by user) |

**User's choice:** Single type. Browse→Enroll→Complete→Archived. Lessons + final assessment. Persistent replay. Topics→Lessons→Exercises. Practice only. One at a time (edited from initial answer).

---

## Navigation & Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New SidebarNav tab | Between Speaking and Graph | ✓ |
| Dashboard sub-section | Inside Dashboard | |
| Modal / overlay | Full-screen modal | |

| Option | Description | Selected |
|--------|-------------|----------|
| Catalog first | Recommended, In Progress, Completed | ✓ |
| My Courses | What I'm enrolled in | |
| Hybrid | Split recommended + enrolled | |

| Option | Description | Selected |
|--------|-------------|----------|
| Between Speaking and Graph | After 4 DSE modules | ✓ |
| Between Notes and Reading | Before DSE modules | |
| After Progress, before Settings | End of feature list | |

**User's choice:** New SidebarNav tab between Speaking and Graph. Catalog-first main view.

---

## Course Delivery UI

| Option | Description | Selected |
|--------|-------------|----------|
| Course overview page | Title, progress, topic list, Start/Continue | ✓ |
| Lessons list — jump right in | Action-first | |

| Option | Description | Selected |
|--------|-------------|----------|
| Content → Exercises → Done | Linear flow | |
| Interleaved — content + exercises mixed | Mixed on one page | |
| Exercise-first — test then learn | Active recall approach | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Mix of existing formats | Reuse MCQ, gap-fill, short-answer from Reading | |
| Primarily writing/submission | Short writing tasks with AI correction | |
| Varied per topic type | Grammar→gap-fill, vocab→matching, etc. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Composite — mix of all types | Final test from all topics | ✓ |
| Writing task — AI graded | Single synthesis essay | |
| Reading comprehension + questions | Passage + questions | |

**User's choice:** Course overview page entry. Exercise-first lesson flow. Varied exercise types per topic. Composite final assessment.

---

## Auto-generation Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| After every task submission | Generate after each task | |
| Pattern-based — only after repeated weakness | Detect pattern first | ✓ |
| User-initiated — click to generate | Student controls | |

| Option | Description | Selected |
|--------|-------------|----------|
| Generate a new course each time | Fresh course per detection | ✓ |
| Update existing course | Merge into existing | |
| Only one course per weakness | Prevent duplicates | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — re-generate | Generate new course if weakness persists | ✓ |
| No — mark weakness as known | Assume student has been taught | |

**User's choice:** Pattern-based detection, auto-generate every time a weakness pattern is detected. Generate new course each time (even if one exists). Re-generate after completion if weakness persists.

---

## Weakness→Course Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Tag-based mapping | Courses tagged, error analysis outputs tags, match | ✓ |
| AI recommendation on the fly | AI figures out which course | |
| Hybrid — tag base + AI fallback | Both approaches | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-defined skill taxonomy | Fixed tag set | |
| Dynamic — AI generates tags | No fixed taxonomy | |
| Pre-defined + extensible | Base set + AI can add | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Recommended prominently in catalog | Shows in catalog only | |
| Inline notification + one-click enroll | Post-task suggestion only | |
| Both — catalog + post-task | Two entry points | ✓ |

**User's choice:** Tag-based mapping. Pre-defined + extensible taxonomy. Both catalog recommendations AND post-task suggestions.

---

## Content Ingestion

| Option | Description | Selected |
|--------|-------------|----------|
| Manual developer process | Dev parses PDFs into JSON | |
| In-app upload + AI parsing | Any user uploads | |
| Hybrid — dev-curated with AI assist | Dev provides PDFs, AI parses, user reviews | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| In-app admin tool | Settings-like admin panel | ✓ (any user, not just admin) |
| Dev-side script | Separate CLI utility | |
| Backend endpoint | POST /api/courses/ingest | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — show draft to review | User edits before publishing | ✓ |
| No — instant conversion | Immediate availability | |

| Option | Description | Selected |
|--------|-------------|----------|
| Freeform — AI extracts what it can | Any PDF | ✓ |
| Structured — follow a template | Expected format | |
| Both — AI detects structure | Parse structure first | |

| Option | Description | Selected |
|--------|-------------|----------|
| Discard — course is standalone | PDF not kept | |
| Store as reference material | Linked to course | |
| Store and make searchable | Indexed for search | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Send PDF to AI directly | No server processing | |
| Backend parses PDF → AI processes | Use pdfjs-dist | ✓ |
| Client-side extraction | Browser reads PDF | |

**User's choice:** Hybrid (dev provides PDFs, AI parses, user reviews). In-app tool (any user). Draft review step. Freeform PDFs. PDF stored and searchable. Backend parses → AI structures.

---

## Course Structure Model

| Option | Description | Selected |
|--------|-------------|----------|
| Title, description, topics[], tags[], difficulty, source | Standard fields | |
| Same + duration, prerequisites | Add time estimate, prereqs | |
| Same + auto-generation metadata | Add sourceTaskId, weaknessPattern, generationDate | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Title, lessons[] | Topic is just a container | |
| Title, description, lessons[], checkpoint quiz | Topic has assessment | |
| Title, learning objectives, lessons[] | Topic has learning objectives | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Title, exercises[], referenceContent | Content unlocks on struggle | ✓ |
| Title, content, exercises[] | Content always visible | |
| Title, pre-test, content, exercises[] | Adaptive pre-test | |

| Option | Description | Selected |
|--------|-------------|----------|
| Question + expected answer(s) | Simple format | |
| Question, answer, explanation, hints | With hints | |
| Question, type, answer, explanations, difficulty, tags | Full metadata | ✓ |

**User's choice:** Course has auto-generation metadata. Topic has learning objectives. Lesson has referenceContent (unlocked on struggle). Exercise has full metadata (question, type, answer+explanations, difficulty, tags).

---

## Course Completion & Scoring Impact

**User's choice:** Partial integration — course completion count shown on Dashboard, but course scores do NOT mix with DSE skill analytics. Courses influence recommendations only.

---

## Offline Access

**User's choice:** Previously accessed courses cached locally. Enrolled courses work offline. Browsing, ingestion, and auto-generation need internet.

---

## Catalog Organization

**User's choice:** Sections (Recommended/In Progress/Completed) + search bar + tag filter chips + course grid.

---

## Feedback Loop

**User's choice:** Wait for next submitted reading/writing task. Then compare pre-course vs post-course error patterns to show improvement.

---

## Difficulty Progression

**User's choice:** Mixed — beginner courses always available. Advanced courses unlock as skill level improves (based on skill analytics).

---

## Agent's Discretion

- UI layout details (card sizes, grid vs list, breakpoints)
- Specific tag taxonomy categories and hierarchy
- Exact prompt engineering for PDF parsing and course generation
- PDF storage mechanism details
- Exercise difficulty calibration for different topic types
- Catalog search implementation specifics

## Deferred Ideas

- Multi-device sync for course progress
- Course marketplace / sharing generated courses between users
- Mobile native app (PWA sufficient)
- Admin/teacher dashboard with role-based access
- Course series / learning paths (chaining courses into curriculum)

---

*Phase: 6-Courses Feature*
*Discussion date: 2026-06-29*
