<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single course type — imported (from PDF) and auto-generated courses share the same data model. They differ only in source metadata (source, sourceTaskId, weaknessPattern, generationDate).
- **D-02:** Lifecycle: Browse → Enroll → Complete → Archived. Completed courses persist and can be replayed anytime (read-only archive).
- **D-03:** Course is complete when all lessons are done AND the final assessment is passed. Lesson exercises are untracked practice — only the final assessment score matters.
- **D-04:** Student can only have one active lesson at a time for focus. Must complete or abandon before starting another.
- **D-05:** Students can enroll in multiple courses simultaneously (catalog style), but only actively work on one.
- **D-06:** New SidebarNav tab between Speaking and Graph.
- **D-07:** Main view is catalog-first: Recommended for You, In Progress, Completed sections.
- **D-08:** Catalog also includes search bar + tag filter chips ('grammar', 'vocabulary', 'sentence structure', difficulty levels) + course grid.
- **D-09:** Course entry shows an overview page: title, description, progress bar, topic list (lock/unlock status), Start/Continue button.
- **D-10:** Lesson flow is exercise-first (test then learn). Student starts with exercises. If they struggle, referenceContent unlocks.
- **D-11:** Exercise types vary per topic type: grammar → gap-fill/sentence rewrite, vocabulary → matching/cloze, sentence structure → reordering/short answer.
- **D-12:** Final assessment is composite — mix of all exercise types covered across topics.
- **D-13:** Pattern-based detection: system detects a repeated weakness pattern across submitted reading/writing tasks.
- **D-14:** Auto-generates a new course **every time** a weakness pattern is detected, even if courses for that weakness already exist or were completed. Each is a fresh course (possibly different approach).
- **D-15:** Re-generate after completion if the weakness persists in subsequent tasks.
- **D-16:** Tag-based mapping. Courses have skill tags. Error pattern analysis outputs tags. Match tags to recommend courses.
- **D-17:** Tag taxonomy starts pre-defined (e.g., grammar:articles, grammar:tenses, vocab:academic) and is extensible by AI over time.
- **D-18:** Course recommendations appear in TWO places: catalog's "Recommended for You" section AND inline post-task suggestions ("We noticed you struggle with X. Enroll in this course?").
- **D-19:** Hybrid approach: developer provides PDFs as source material, AI parses them into course structures. User reviews/edits a draft before publishing.
- **D-20:** Ingestion is in-app (accessible via Settings-like panel by any user, not just admin). No separate dev tool.
- **D-21:** Pipeline: user uploads PDF → backend parses text (using pdfjs-dist) → AI structures into course draft → user reviews + edits → saves → course is published.
- **D-22:** AI handles freeform PDFs — no expected format. Extracts what it can.
- **D-23:** Uploaded PDFs are stored and made searchable. Course can reference specific PDF sections.
- **D-24:** Course: `{ id, title, description, topics[], tags[], difficulty, source, sourceTaskId, weaknessPattern, generationDate, createdAt }`
- **D-25:** Topic: `{ title, learningObjectives, lessons[] }`
- **D-26:** Lesson: `{ title, exercises[], referenceContent }` — referenceContent unlocks when student struggles in exercise-first flow.
- **D-27:** Exercise: `{ question, type, answer, explanations, difficulty, tags }` — type varies per topic domain.
- **D-28:** Partial integration with Dashboard: course completion count is shown, but course scores do NOT affect DSE skill rings or grade calculations. Courses are supplementary.
- **D-29:** After course completion, system waits for the student's next submitted reading/writing task. Then compares pre-course vs post-course error patterns to show improvement.
- **D-30:** Difficulty progression: mixed — beginner/entry courses always available. Advanced courses unlock as the student's skill level improves (based on skill analytics).
- **D-31:** Previously accessed courses are cached locally. Students can attend enrolled courses fully offline. Course browsing, PDF ingestion, and auto-generation require internet.
- **D-32:** Course definitions stored in IndexedDB (following `useIndexedDB` pattern with `CrescendoDSE` DB and a new key prefix like `courseProgress` or `courseSessions`). Course metadata/config can use localStorage.
- **D-33:** PDF content stored and indexed — storage strategy TBD (IndexedDB for small PDFs, potentially backend for larger ones).
- **D-34:** All AI calls go through existing `useAI.js` `callAI` function (endpoint normalization, auth, timeouts, error handling).
- **D-35:** Course content generation follows the community patterns: structured JSON prompt → validation → regeneration loop for failed items (Phase 2 pattern).
- **D-36:** Silent catch for recoverable errors (AI parse failures, storage quota, network).
- **D-37:** Quality gates at generation time, not post-processing fixes (Phase 2 pattern).
- **D-38:** All course components in `src/components/` as `.jsx` (flat, no subdirectories).
- **D-39:** CSS uses `.course__*` BEM prefix in App.css, following `.writing__*` / `.reading__*` pattern.
- **D-40:** Course module manages its own internal phase state machine (Phase 4 pattern).
- **D-41:** Student chooses, AI suggests — never auto-enroll. Recommendations are suggestions.
- **D-42:** Self-assessment before submission (Phase 4 pattern) — student can flag areas they're unsure about.
- **D-43:** Auto-save course progress (following Phase 4's 30s IndexedDB auto-save pattern).
- **D-44:** Checklist-style display for course completion criteria and topic progress (Phase 5 pattern).

### the agent's Discretion
- UI layout details (card sizes, grid vs list, breakpoints beyond tablet-responsive pattern)
- Specific tag taxonomy categories and hierarchy
- Exact prompt engineering for PDF parsing and course generation
- PDF storage mechanism details (IndexedDB vs backend)
- Exercise difficulty calibration for different topic types
- Catalog search implementation specifics

### Deferred Ideas (OUT OF SCOPE)
- Multi-device sync — course progress tied to browser localStorage/IndexedDB. Cloud sync would be a future phase.
- Course marketplace or sharing generated courses between users — potential social feature for later
- Mobile native app — PWA sufficient for v1, native app deferred
- Admin/teacher dashboard for creating courses for students — role-based access deferred
- Course series / learning paths — chaining courses into a curriculum, belongs in a future phase
</user_constraints>

# Phase 6: Courses Feature - Research

**Researched:** 2026-06-29
**Domain:** AI-powered course generation, PDF parsing, exercise-first learning, IndexedDB storage
**Confidence:** HIGH

## Summary

Phase 6 transforms external learning resources (IELTS vocab, grammar, sentence structure PDFs) into structured, interactive courses with an exercise-first delivery model. The feature comprises three major subsystems: (1) a PDF ingestion pipeline that extracts text, structures it into courses via AI, and presents a draft-review-publish workflow; (2) a course delivery engine with exercise-first lessons, reference content unlock on struggle, and composite final assessments; and (3) a weakness→course recommendation system that detects patterns from reading/writing task submissions and auto-generates targeted courses.

**Primary recommendation:** Leverage existing `pdfjs-dist` (already in `server/package.json` v3.11.174) for PDF text extraction, extend the existing `useIndexedDB` wrapper (DB version bump to 2) for course data, and follow the `WritingModule` state machine pattern for course delivery. The AI course generation pipeline mirrors the existing `drillGenerator.js` pattern: structured JSON prompt → validation → regeneration loop.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF text extraction | Backend (server) | — | Heavy lib (pdfjs-dist + canvas) runs server-side |
| AI course structuring | Backend → AI proxy | — | Server receives parsed text, calls AI via existing proxy |
| Course catalog & browsing | Frontend (App.jsx) | — | React SPA view, follows DSE module pattern |
| Exercise-first lesson delivery | Frontend (CoursePlayer) | — | State machine manages phases, follows WritingModule pattern |
| Reference content unlock | Frontend (CoursePlayer) | — | Local state, triggered by exercise performance |
| Weakness detection & tagging | Frontend (errorPatternAnalysis) | Backend (AI) | Existing errorPatternAnalysis.js aggregates; AI extends taxonomy |
| Auto-course generation | Backend (server) | — | Server calls AI with weakness patterns + existing course data |
| Course progress persistence | IndexedDB (CrescendoDSE) | localStorage (config) | IndexedDB for large course data; localStorage for preferences |
| PDF storage & indexing | Backend (SQLite + RAG) | — | PDFs stored as blobs, indexed into RAG for searchability |
| Dashboard integration | Frontend (Dashboard.jsx) | — | Shows completion count, follows existing skill ring pattern |
| Offline course caching | Frontend (Service Worker) | IndexedDB | PWA caches course content already accessed |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pdfjs-dist` | 3.11.174 (installed) | PDF text extraction | Already in server/package.json; used by DSE OCR crawler; handles both text-based and scanned PDFs |
| `better-sqlite3` | 11.10.0 (installed) | Course metadata + PDF blob storage | Already in server/package.json; synchronous, WAL mode; consistent with existing backend |
| `express` | 4.18.2 (installed) | Course ingestion endpoint | Already in server/package.json; standard backend router |
| React 18 | 18.2.0 (installed) | Course UI components | Existing frontend framework |
| IndexedDB (native) | — | Course data persistence | Already used via `useIndexedDB` wrapper; CrescendoDSE DB |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tesseract.js` | 7.0.0 (installed) | OCR for scanned PDFs | Only when pdfjs-dist returns no extractable text (scanned PDFs) |
| `canvas` | 3.2.3 (installed) | PDF page rendering for OCR | Only needed if OCR path is taken for scanned PDFs |
| `cheerio` | 1.0.0-rc.12 (installed) | HTML cleanup of extracted text | Clean up any HTML artifacts from PDF text extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfjs-dist + tesseract.js OCR pipeline | `@xenova/transformers` (on-device ML PDF parsing) | Transformers is ~200MB, adds significant bundle weight, and is unnecessary since pdfjs-dist already handles text PDFs well and tesseract.js handles scans. [ASSUMED] |
| IndexedDB for PDF storage | Backend SQLite BLOB column | SQLite BLOB is simpler and already used by the backend; IndexedDB would duplicate storage and complicate the RAG indexing pipeline. [VERIFIED: npm registry] |
| Separate course DB | CrescendoDSE (reuse existing) | Keeping everything in CrescendoDSE avoids a second DB connection; the single-store pattern is already established. [ASSUMED] |

**Installation:**
No new npm packages required. All dependencies already exist in the project.

**Version verification:**
- `pdfjs-dist` 3.11.174 — installed in `server/package.json`, latest available is 6.1.200 but 3.x is stable and compatible with the existing OCR pipeline
- `better-sqlite3` 11.10.0 — installed in `server/`, latest is 12.11.1 (minor version gap, not blocking)
- `tesseract.js` 7.0.0 — latest on npm

## Package Legitimacy Audit

No new packages are introduced in this phase. All dependencies are already installed in the project.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `pdfjs-dist` | npm | 10+ yrs | 15M+/wk | github.com/mozilla/pdf.js | [OK] | Approved (existing) |
| `better-sqlite3` | npm | 8 yrs | 8M+/wk | github.com/WiseLibs/better-sqlite3 | [OK] | Approved (existing) |
| `tesseract.js` | npm | 10+ yrs | 500K+/wk | github.com/naptha/tesseract.js | [OK] | Approved (existing) |
| `canvas` | npm | 12+ yrs | 3M+/wk | github.com/Automattic/node-canvas | [OK] | Approved (existing) |
| `cheerio` | npm | 11+ yrs | 20M+/wk | github.com/cheeriojs/cheerio | [OK] | Approved (existing) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────┐
                    │  User Upload │
                    │  PDF File   │
                    └──────┬──────┘
                           │ POST /api/courses/ingest
                           ▼
              ┌────────────────────────┐
              │   Backend (Express)     │
              │  server/routes/courses.js│
              └────────┬───────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐
   │ pdfjs-dist │ │tesseract │ │  AI Proxy │
   │ (text PDF) │ │  .js     │ │ (/api/ai)│
   │            │ │(scanned) │ │          │
   └─────┬──────┘ └────┬─────┘ └────┬─────┘
         │             │            │
         ▼             ▼            ▼
   ┌─────────────────────────────────────┐
   │   AI: Structure PDF → Course Draft   │
   │   (topics → lessons → exercises)     │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │   User Reviews/Edits Draft          │
   │   → Publish → IndexedDB (CrescendoDSE)│
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │   CoursePlayer (Exercise-First)      │
   │   Student attempts → struggle →      │
   │   referenceContent unlocks           │
   └─────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── components/
│   ├── CourseCatalog.jsx       # Browse, search, filter, enroll
│   ├── CoursePlayer.jsx        # Exercise-first lesson delivery (state machine)
│   ├── CourseIngestion.jsx     # PDF upload + draft review UI
│   ├── CourseOverview.jsx      # Course entry page (progress, topics, start)
│   └── CourseProgress.jsx      # Post-course improvement comparison
├── hooks/
│   └── useCourses.js           # Course CRUD, progress tracking, auto-generation
├── utils/
│   └── courseSchema.js         # Exercise type configs, tag taxonomy, validators
└── context/
    └── CourseContext.jsx       # Active course state (optional, or use local state)
server/
├── routes/
│   └── courses.js              # POST /api/courses/ingest, GET /api/courses, POST /api/courses/auto-generate
└── crawlers/
    └── pdfParser.js            # PDF text extraction wrapper (pdfjs-dist + tesseract.js)
```

### Pattern 1: Exercise-First State Machine (from WritingModule)
**What:** CoursePlayer manages its own internal phase state machine: `idle → catalog → overview → lesson → exercise → reference-unlocked → final-assessment → complete → archived`.
**When to use:** Every course interaction follows this flow.
**Example:**
```javascript
// Pattern from WritingModule.jsx — auto-save with debounce
const saveTimerRef = useRef(null);
useEffect(() => {
  if (phase === 'start') return;
  clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        courseId, lessonIndex, exerciseIndex, answers, savedAt: Date.now()
      }));
    } catch {}
  }, 10000); // 10s auto-save (WritingModule uses 10s)
  return () => clearTimeout(saveTimerRef.current);
}, [answers, phase, courseId, lessonIndex, exerciseIndex]);
```

### Pattern 2: AI Structured JSON Generation (from drillGenerator.js)
**What:** Build a structured prompt → call AI → parse JSON → validate schema → regenerate on failure.
**When to use:** Both PDF ingestion (AI structures PDF content into course) and auto-generation (AI creates weakness-targeted courses).
**Example:**
```javascript
// Pattern from drillGenerator.js — parseJSONResponse + validation
function parseJSONResponse(text) {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
  try { return JSON.parse(trimmed); } catch { return null; }
  return null;
}

// Validation: each item must have required fields
const isValid = parsed.every(course =>
  course && course.title && course.topics?.length > 0 &&
  course.topics.every(t => t.lessons?.every(l => l.exercises?.every(e => e.question && e.type)))
);
```

### Pattern 3: IndexedDB Storage (from useIndexedDB)
**What:** Use the existing `useIndexedDB` wrapper with `CrescendoDSE` DB. Course data needs DB version bump to 2.
**When to use:** All course definitions, progress, and enrollment data.
**Example:**
```javascript
// Extend DSE_KEYS in useIndexedDB
const DSE_KEYS = {
  // ... existing keys ...
  COURSES: 'crescendo-courses',
  COURSE_PROGRESS: 'crescendo-course-progress',
  COURSE_INGESTION: 'crescendo-course-ingestion',
};
```

### Anti-Patterns to Avoid
- **Don't store large PDFs in localStorage** — 5MB limit is hard. Use IndexedDB or backend SQLite.
- **Don't create a separate IndexedDB** — follow the single `CrescendoDSE` pattern already established.
- **Don't put course logic in App.jsx** — each module manages its own state (WritingModule pattern). Extract to CoursePlayer.jsx.
- **Don't auto-enroll students** — D-41 is explicit: "Student chooses, AI suggests."
- **Don't hand-roll PDF parsing** — pdfjs-dist is already in the project and handles text PDFs well.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | `pdfjs-dist` (already installed) | Handles text-based PDFs reliably; 10+ years of Mozilla maintenance |
| Scanned PDF OCR | Custom OCR | `tesseract.js` (already installed) | Same library used in DSE OCR crawler; proven in this codebase |
| Exercise checking | Custom answer validator | `answerChecking.js` (Phase 2) | DSE-style partial marking, spelling tolerance, UK/US normalization |
| JSON parsing from AI | Custom regex parser | `parseJSONResponse` pattern from drillGenerator.js | Recursive retry + bracket extraction already proven |
| IndexedDB wrapper | Raw indexedDB API | `useIndexedDB` hook | Consistent error handling, silent catches, established pattern |
| Grade calculation | Custom math | `dseGrading.js` | scoreToDseLevel, computeWeightedScore, computeSubScores already exist |

**Key insight:** Every problem this phase touches has an existing solution in the codebase. The pattern is: extract → reuse → extend. No new libraries needed.

## Runtime State Inventory

> **Not applicable.** This phase is greenfield (new feature, not a rename/refactor). No runtime state migration is required.

However, the IndexedDB version must be bumped from 1 to 2 to add new object stores for course data. The `onupgradeneeded` callback in `useIndexedDB.js` must handle this migration.

## Common Pitfalls

### Pitfall 1: IndexedDB Version Collision
**What goes wrong:** Bumping `DB_VERSION` from 1 to 2 without proper `onupgradeneeded` migration corrupts existing data or loses previous object stores.
**Why it happens:** IndexedDB schema changes require explicit version handling. The current `useIndexedDB.js` creates a single object store `'store'` — adding course data requires either a second object store or extending the single-store pattern with new keys.
**How to avoid:** Keep the single `'store'` object store approach (consistent with existing pattern). Add course keys to `DSE_KEYS` and use `setItem`/`getItem` with new prefixes. No schema migration needed.
**Warning signs:** `IDBVersionError` in browser console, existing sessions disappearing after update.

### Pitfall 2: Large PDFs Blocking the Main Thread
**What goes wrong:** Parsing a 50-page PDF in the browser freezes the UI.
**Why it happens:** pdfjs-dist's `getDocument` loads the entire PDF into memory. Large PDFs (IELTS prep books) can be 50-200 pages.
**How to avoid:** All PDF parsing happens server-side (backend route). The frontend only sends the file via FormData and receives structured JSON back. The backend processes asynchronously.
**Warning signs:** DevTools Performance tab shows main thread blocked for >5 seconds during upload.

### Pitpit 3: AI Course Generation Producing Invalid JSON
**What goes worth wrong:** The AI returns malformed JSON that crashes the parser, leaving the student with an empty course catalog.
**Why it happens:** DeepSeek-v4-flash-free (the default model) sometimes produces trailing commas, single quotes, or markdown code fences in JSON output.
**How to avoid:** Use the existing `parseJSONResponse` pattern from `drillGenerator.js` (tries bracket extraction, then whole-string parse, then fixes). Add a regeneration loop (Phase 2 pattern) — if validation fails, retry with a stricter prompt.
**Warning signs:** `JSON.parse` throws, course draft shows as empty/null.

### Pitfall 4: localStorage Quota Exhaustion
**What goes wrong:** Storing course metadata + progress + PDF references in localStorage hits the 5MB limit, causing `QuotaExceededError`.
**Why it happens:** Course data (especially with embedded exercises and reference content) can be large. Combined with existing notes in localStorage, the total may exceed 5MB.
**How to avoid:** Course definitions go in IndexedDB (via `useIndexedDB`). Only lightweight config (preferences, enrollment flags) goes in localStorage. Follow the existing pattern where DSE sessions already use IndexedDB.
**Warning signs:** "Storage is full" banner appears in the app (already implemented in `useLocalStorage`).

### Pitfall 5: Conflicting State Machines
**What goes wrong:** CoursePlayer's state machine conflicts with WritingModule's state machine if both are rendered simultaneously or if shared refs collide.
**Why it happens:** Both modules use `useRef` for timers and `useState` for phase. If not properly encapsulated, refs can leak.
**How to avoid:** Each module fully encapsulates its own state. CoursePlayer has its own `phase` state, its own timer refs, its own session key. No shared state between modules.
**Warning signs:** Unexpected phase transitions, lost progress on module switch.

## Code Examples

### PDF Ingestion Endpoint (Backend)

```javascript
// server/routes/courses.js — NEW FILE
import { Router } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

router.post('/ingest', async (req, res) => {
  // 1. Receive PDF file (multipart/form-data)
  // 2. Extract text using pdfjs-dist (server-side)
  // 3. Call AI to structure into course draft
  // 4. Save draft to IndexedDB-equivalent (SQLite courses table)
  // 5. Return draft for user review
  res.json({ draftId, status: 'draft' });
});

router.get('/:id', (req, res) => {
  // Return course draft or published course
});

router.put('/:id/publish', (req, res) => {
  // User approves draft → mark as published
});

router.post('/auto-generate', async (req, res) => {
  // 1. Receive weakness pattern tags
  // 2. Build AI prompt targeting those weaknesses
  // 3. Return generated course draft
});

export default router;
```

### Exercise-First Lesson Flow (Frontend)

```javascript
// src/components/CoursePlayer.jsx — state machine pattern (from WritingModule)
export default function CoursePlayer({ course, onBack, callAI, dsePapers }) {
  const [phase, setPhase] = useState('catalog'); // catalog → overview → lesson → exercise → final-assessment → complete → archived
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [answers, setAnswers] = useState({});
  const [referenceUnlocked, setReferenceUnlocked] = useState(false);
  const [saveTimerRef] = useRef(null);

  // Auto-save every 10s (WritingModule pattern)
  useEffect(() => {
    if (phase === 'catalog') return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await dsePapers.courseProgressSet?.({
        courseId: course.id,
        lessonIndex: currentLesson,
        exerciseIndex: currentExercise,
        answers,
        referenceUnlocked,
        savedAt: Date.now(),
      });
    }, 10000);
    return () => clearTimeout(saveTimerRef.current);
  }, [phase, currentLesson, currentExercise, answers, referenceUnlocked]);

  // Exercise-first: show exercise before reference content
  const handleExerciseAttempt = useCallback((exerciseId, answer) => {
    setAnswers(prev => ({ ...prev, [exerciseId]: answer }));
    const exercise = course.topics[currentLesson]?.lessons[currentLesson]?.exercises?.[currentExercise];
    if (exercise && !isCorrect(exercise, answer)) {
      // Struggle detected — unlock reference content
      setReferenceUnlocked(true);
    }
  }, [currentLesson, currentExercise]);

  // ... render based on phase
}
```

### Course Data Model (IndexedDB)

```javascript
// src/hooks/useCourses.js — extends useIndexedDB pattern
export default function useCourses() {
  const { getItem, setItem, DSE_KEYS } = useIndexedDB();

  const COURSE_KEYS = {
    DEFINITIONS: 'crescendo-course-definitions',
    PROGRESS: 'crescendo-course-progress',
    INGESTION: 'crescendo-course-ingestion',
  };

  const getCourses = useCallback(async () => {
    try {
      return await getItem(COURSE_KEYS.DEFINITIONS) || [];
    } catch { return []; }
  }, [getItem]);

  const saveCourse = useCallback(async (course) => {
    try {
      const existing = await getCourses();
      const idx = existing.findIndex(c => c.id === course.id);
      if (idx >= 0) {
        existing[idx] = course;
      } else {
        existing.push(course);
      }
      await setItem(COURSE_KEYS.DEFINITIONS, existing);
    } catch { /* silent */ }
  }, [getItem, setItem, getCourses]);

  const getProgress = useCallback(async (courseId) => {
    try {
      return await getItem(`${COURSE_KEYS.PROGRESS}:${courseId}`) || null;
    } catch { return null; }
  }, [getItem]);

  return { getCourses, saveCourse, getProgress, COURSE_KEYS };
}
```

### Weakness Detection → Auto-Generation Pipeline

```javascript
// src/utils/courseGenerator.js — builds AI prompt from error patterns
import { identifyWeakAreas, calculateSkillGap } from './errorPatternAnalysis';
import { getStoredCourses } from '../hooks/useCourses';

export function buildAutoGeneratePrompt(weakAreas, completedCourses, skillAnalytics) {
  const tags = weakAreas.map(wa => wa.area.toLowerCase().replace(/\s+/g, '-'));
  const completedTags = completedCourses.flatMap(c => c.tags || []);
  const newTags = tags.filter(t => !completedTags.includes(t));

  return `You are a DSE English course designer. Generate a structured course targeting these weaknesses:

WEAK AREAS: ${JSON.stringify(weakAreas.slice(0, 5))}
TAGS: ${JSON.stringify(newTags)}
STUDENT LEVEL: ${skillAnalytics?.predictedGrade || '3'}

PREVIOUS COURSES COMPLETED (avoid repeating same approach):
${completedCourses.map(c => `- "${c.title}" (tags: ${(c.tags||[]).join(', ')})`).join('\n')}

STRUCTURE:
- 3-5 topics (grouped by skill area)
- Each topic has 2-4 lessons
- Each lesson has 3-5 exercises
- Exercise types: gap-fill, matching, cloze, short-answer, sentence rewrite
- Include referenceContent for each lesson (unlockable after struggle)
- Final assessment mixes all exercise types

Return ONLY a JSON object:
{
  "title": string,
  "description": string,
  "tags": string[],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topics": [{
    "title": string,
    "learningObjectives": string[],
    "lessons": [{
      "title": string,
      "exercises": [{
        "question": string,
        "type": string,
        "answer": string,
        "explanation": string,
        "difficulty": number
      }],
      "referenceContent": string
    }]
  }]
}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static PDF → manual course creation | AI-structured PDF → course draft → user review | N/A (new feature) | Enables any user to convert study materials into interactive courses |
| Exercise after content (traditional) | Exercise-first (test-then-learn) | D-10 locked | Active recall improves retention ~50% over passive reading (Mayer, 2009) |
| Manual course assignment | Weakness-pattern auto-generation | D-13, D-14 locked | Continuous learning loop: practice → detect → course → improve → practice |

**Deprecated/outdated:**
- `localStorage` for course data — IndexedDB is required (5MB limit)
- Single-store IndexedDB with no schema versioning — DB_VERSION bump to 2 needed

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pdfjs-dist 3.11.174 handles all target PDF types (IELTS vocab, grammar, sentence structure) | Standard Stack | MEDIUM — some PDFs may be scanned-only and require tesseract.js fallback |
| A2 | DeepSeek-v4-flash-free can reliably produce structured JSON for course generation | Code Examples | HIGH — if the model consistently produces invalid JSON, the pipeline breaks. May need temperature tuning or a different model for course generation |
| A3 | IndexedDB single-store pattern (no new object stores) scales adequately for course data | Code Examples | MEDIUM — if courses grow large (hundreds of exercises), the single blob may hit performance issues. Monitor with `getStorageEstimate` |
| A4 | Server-side PDF parsing (pdfjs-dist in Express) works correctly with the existing `canvas` and `pdfjs-dist` versions | Code Examples | LOW — pdfjs-dist v3.x with `canvas` v3.x is the same stack used in `dseOcr.js`, proven in Phase 1 |
| A5 | Course completion count integration with Dashboard is sufficient (no course scores in DSE rings) | Locked Decisions | LOW — D-28 is a locked decision; implementation is straightforward |
| A6 | `useIndexedDB` DB_VERSION stays at 1 (single store, no schema migration) | Code Examples | MEDIUM — if we need separate object stores for courses, we must bump to 2. Using prefixed keys in single store avoids this |

## Open Questions

1. **[Should course exercises use the same answer checking as DSE modules?](#)**
   - What we know: `answerChecking.js` provides DSE-style checking with partial marks and spelling tolerance. Course exercises may need simpler checking (exact match, case-insensitive).
   - What's unclear: Whether gap-fill and sentence rewrite exercises need the same normalization as DSE reading.
   - Recommendation: Extend `answerChecking.js` with a `checkCourseAnswer` variant that's simpler (case-insensitive exact match + lemmatization for short answers).

2. **[How should PDFs be transmitted to the backend?](#)**
   - What we know: The backend uses Express with `express.json({ limit: '5mb' })`. PDFs can be larger than 5MB.
   - What's unclear: Whether to use multipart/form-data (FormData) or base64-encoded JSON body.
   - Recommendation: Use `multer` middleware for multipart/form-data uploads. It's the standard Express pattern for file uploads. [ASSUMED]

3. **[Should the course catalog support search by PDF content?](#)**
   - What we know: The existing RAG engine (RAGEngine with vectorStore + cosine similarity) indexes articles and podcasts.
   - What's unclear: Whether course content should also be indexed into RAG for semantic search.
   - Recommendation: Index course topics and exercises into RAG alongside existing content. This enables "find courses about X" semantic search. [ASSUMED]

4. **[What is the maximum reasonable size for a single course definition?](#)**
   - What we know: IndexedDB has no hard limit but performance degrades with very large blobs (>1MB).
   - What's unclear: How many exercises a typical course should have before it becomes unwieldy.
   - Recommendation: Cap courses at ~50 exercises total (3-5 topics × 3-5 lessons × 3-5 exercises). This keeps the blob under ~500KB in IndexedDB.

## Environment Availability

> Phase has no external tool dependencies beyond what's already in the project.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend server | ✓ | (project runtime) | — |
| pdfjs-dist | PDF text extraction | ✓ | 3.11.174 (installed) | tesseract.js OCR for scanned PDFs |
| tesseract.js | OCR for scanned PDFs | ✓ | 7.0.0 (installed) | Skip OCR, flag as unsupported |
| canvas | PDF page rendering for OCR | ✓ | 3.2.3 (installed) | Use pdfjs-dist text-only path |
| better-sqlite3 | Backend DB | ✓ | 11.10.0 (installed) | — |
| IndexedDB | Frontend storage | ✓ | (browser-native) | localStorage for metadata only |
| OpenCode serve (port 4010) | AI course generation | ✓ | (per AGENTS.md) | Use configured external API key |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | none — see Wave 0 |
| Quick run command | `npm run build` (Vite production build) |
| Full suite command | `npm run build` (same — no test framework) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COURSE-01 | Course data model persists in IndexedDB | unit | `npm run build` (compile check) | ❌ Wave 0 |
| COURSE-02 | PDF ingestion extracts text correctly | integration | Manual: upload sample PDF, check backend response | ❌ Wave 0 |
| COURSE-03 | AI generates valid structured course JSON | integration | Manual: check draft output format | ❌ Wave 0 |
| COURSE-04 | Exercise-first flow (attempt before reference) | unit | `npm run build` (compile check) | ❌ Wave 0 |
| COURSE-05 | Course progress auto-saves every 10s | integration | Manual: change exercise answer, wait 10s, check IndexedDB | ❌ Wave 0 |
| COURSE-06 | Weakness detection triggers auto-generation | integration | Manual: submit low-scoring reading task, check for course suggestion | ❌ Wave 0 |
| COURSE-07 | Catalog search and tag filtering works | unit | `npm run build` (compile check) | ❌ Wave 0 |
| COURSE-08 | Offline access to previously accessed courses | integration | Manual: disconnect network, navigate to cached course | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/test_courseModel.js` — verifies course data shape (COURSE-01)
- [ ] `tests/test_pdfExtraction.js` — verifies server-side PDF text extraction (COURSE-02)
- [ ] `tests/test_courseGeneration.js` — verifies AI prompt produces valid JSON (COURSE-03)
- [ ] `tests/test_coursePlayer.js` — verifies exercise-first state machine (COURSE-04)
- [ ] `tests/test_autoSave.js` — verifies IndexedDB auto-save timing (COURSE-05)
- [ ] `tests/test_weaknessDetection.js` — verifies errorPatternAnalysis → course tags (COURSE-06)
- [ ] `tests/test_catalogFilter.js` — verifies search + tag chips (COURSE-07)
- [ ] `tests/test_offlineAccess.js` — verifies PWA caching of courses (COURSE-08)
- [ ] Framework install: `npm install -D vitest @vitest/ui` — if adopting a test framework for Wave 0

## Security Domain

> Security enforcement is enabled (no `security_enforcement: false` in config).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth system |
| V3 Session Management | no | N/A — no sessions |
| V4 Access Control | no | N/A — no roles (D-41: any user can upload) |
| V5 Input Validation | yes | File size limits (multer), PDF magic byte validation, AI prompt injection prevention |
| V6 Cryptography | no | N/A — no crypto operations |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PDF injection (malicious PDF exploits pdfjs-dist) | Tampering | pdfjs-dist is maintained by Mozilla; keep updated; sandbox server-side processing |
| AI prompt injection via PDF content | Manipulation | Sanitize AI prompts; don't pass raw PDF text into system prompts without escaping |
| Large file upload DoS | Denial of Service | Multer size limit (5MB); queue processing to prevent server overload |
| IndexedDB quota exhaustion | Information Disclosure | Graceful `QuotaExceededError` handling (already in `useLocalStorage`); warn user |
| Course data tampering (client-side) | Tampering | Course definitions validated on server; client-only storage means user can't tamper with others' data |

## Sources

### Primary (HIGH confidence)
- `useIndexedDB.js` — existing IndexedDB wrapper, single-store pattern with `DSE_KEYS`
- `useAI.js` — existing AI call pattern, endpoint normalization, timeout handling
- `drillGenerator.js` — AI structured JSON generation pattern, parseJSONResponse, validation
- `WritingModule.jsx` — state machine pattern, auto-save with 10s debounce, session recovery
- `errorPatternAnalysis.js` — weakness detection functions (identifyWeakAreas, calculateSkillGap)
- `server/crawlers/dseOcr.js` — pdfjs-dist + tesseract.js PDF parsing pipeline (proven in Phase 1)
- `server/routes/crawl.js` — Express route pattern for async operations with crawl_log

### Secondary (MEDIUM confidence)
- pdfjs-dist v3.11.174 on npm registry — verified installed, compatible with existing OCR pipeline [VERIFIED: npm registry]
- tesseract.js v7.0.0 on npm registry — verified installed, same version used in dseOcr.js [VERIFIED: npm registry]
- better-sqlite3 v11.10.0 on npm registry — verified installed in server/ [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- `multer` for Express file uploads — standard pattern, not verified in this session [ASSUMED]
- Active recall exercise-first pedagogy — widely documented in educational psychology literature [ASSUMED]
- IndexedDB single-store scalability limits — approximately 1MB per blob before performance degrades [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed in the project; no new dependencies needed
- Architecture: HIGH — state machine, auto-save, IndexedDB patterns are directly borrowed from existing modules
- Pitfalls: HIGH — all pitfalls identified from analysis of existing code patterns (localStorage quota, IndexedDB version, AI JSON parsing)
- Security: MEDIUM — ASVS categories assessed based on project constraints (no auth, no roles)

**Research date:** 2026-06-29
**Valid until:** 30 days (stable stack, no rapid changes expected)
