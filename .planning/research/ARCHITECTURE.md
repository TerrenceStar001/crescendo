# Architecture Patterns: Course Quality Polish

**Domain:** DSE English learning platform — Courses feature
**Researched:** 2026-07-01

## Recommended Architecture Overview

```
PDF INGESTION PIPELINE (proposed fix flow)
═══════════════════════════════════════════

[File Upload] ──► [Text Extraction] ──► [Quality Gate] ──► [Chunking] ──► [AI Structuring]
     │                │                      │                  │               │
     │                ▼                      ▼                  ▼               ▼
     │          pdfjs-dist              ≥500 chars?        detect sections   generate JSON
     │          (text first)            YES → continue      by headings/      course structure
     │                │                 NO → OCR or fail     whitespace
     │                ▼                                        │
     │          tesseract.js                                   ▼
     │          (OCR fallback)                     [Semantic Validation]
     │                                                    │
     │                                                    ▼
     │                                          [Review UI] ──► [Publish]
     │                                               │
     │                                               ▼
     │                                        [IndexedDB + SQLite]
     │
     ▼
CURRENT STATE (broken path):
  File -> pdfjs-dist -> 50-char gate (too low) -> raw text blob -> AI (hallucinates structure)
                                                           -> no validation -> publish garbage


AUTO-GENERATION PIPELINE (proposed fix flow)
═══════════════════════════════════════════

[Weakness Tags] ──► [Backend AI] ──► [Type Validation] ──► [Answer Validation] ──► [Save]
      │                    │                │                       │
      ▼                    ▼                ▼                       ▼
  from error          120s timeout     verify exercise        verify MCQ answer in options
  pattern analysis    8192 max_tokens  types match            verify gap-fill answer fits
                                        EXERCISE_TYPES map

CURRENT STATE (broken path):
  Weakness Tags -> backend (3s frontend timeout -> falls through) -> offline template
  -> generateOfflineCourse (string substitution on hardcoded sentences)
  -> all courses look identical -> no validation


COURSE PLAYER (functional — no architectural changes needed)
═══════════════════════════════════════════

  Overview ──► Lesson ──► Exercise ──► Reference ──► Final Assessment ──► Complete
     │            │            │          Unlock            │                  │
     ▼            ▼            ▼            ▼                ▼                  ▼
  enroll/     breadcrumb   5 types:    shown after     60% threshold      trackPostCourse
  resume      nav          MCQ/gap/    wrong answer                      Improvement()
                            match/     or 3 attempts                         │
                            rewrite/                                        ▼
                            reorder                                  compare pre/post
                                                                     error patterns
```

---

## Pipeline Gaps and Fixes

### Gap 1: Missing Quality Gate in PDF Text Extraction

**Current state:** `parsePdf()` in `server/crawlers/pdfParser.js` returns text if ≥50 characters. This is too permissive — PDFs with only extracted headers, footers, or page numbers pass through.

**Fix:**
```javascript
// Before (pdfParser.js line 108-111):
if (textResult && textResult.length >= 50) {
  return { text: textResult, method: 'text' };
}

// After:
if (textResult && textResult.length >= 500) {
  return { text: textResult, method: 'text' };
}
// Optional: add per-page minimum content check
const pageLengths = textResult.split('\n\n').map(p => p.trim().length);
const viablePages = pageLengths.filter(len => len > 100).length;
if (viablePages < 2 && textResult.length < 1000) {
  // Fall through to OCR
}
```

**Also add:** Return per-page character counts to the frontend so the UI can display extraction warnings (e.g., "Only 80 characters extracted from page 2 — may be a scanned image").

### Gap 2: Missing Chunking Stage

**Current state:** Raw PDF text is sent as one blob to the AI structuring prompt. The AI has no awareness of where sections begin and end, what's a heading vs body, or what topics are covered.

**Fix:** Add a `chunkPdfText(text)` function in `server/crawlers/pdfParser.js` (or a new `server/crawlers/pdfChunker.js`):
```javascript
function chunkPdfText(text) {
  // Strategy: detect natural section boundaries
  const candidates = [];

  // 1. Try line-based chunking (lines that look like headings)
  const lines = text.split('\n');
  let currentSection = { heading: null, body: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heuristic: short lines (10-80 chars) without ending punctuation are likely headings
    if (trimmed.length >= 10 && trimmed.length <= 80
        && !trimmed.match(/[.!?]$/)
        && trimmed === trimmed.toUpperCase().slice(0, 3) + trimmed.slice(3)
        && currentSection.body.length > 3) {
      if (currentSection.heading || currentSection.body.length > 0) {
        candidates.push({ ...currentSection });
      }
      currentSection = { heading: trimmed, body: [] };
    } else {
      currentSection.body.push(trimmed);
    }
  }
  if (currentSection.body.length > 0) {
    candidates.push({ ...currentSection });
  }

  // 2. Fallback: paragraph-based chunking if no headings found
  if (candidates.length <= 1) {
    const paragraphs = text.split(/\n\n+/);
    return paragraphs.filter(p => p.trim().length > 100).map((p, i) => ({
      heading: `Section ${i + 1}`,
      body: [p],
    }));
  }

  return candidates;
}
```

**AI Prompt update:** Send chunked sections instead of raw text:
```
CONTENT STRUCTURE:
${chunks.map((c, i) => `[SECTION ${i + 1}]: ${c.heading || 'Introduction'}
CONTENT: ${c.body.slice(0, 3).join('\n')}...`).join('\n\n')}
Create topics matching these sections.
```

### Gap 3: Missing Semantic Validation

**Current state:** `validateCourseDraft()` only checks that required fields exist (strings, arrays). It does not verify that:
- MCQ options actually contain the `answer` value
- Gap-fill answers match the blank position
- Exercise types match the EXERCISE_TYPES mapping for the topic's tag domain

**Fix:** Add a `validateCourseContent()` function:
```javascript
function validateCourseContent(courseDraft) {
  const errors = [];

  courseDraft.topics.forEach((topic, ti) => {
    topic.lessons.forEach((lesson, li) => {
      lesson.exercises.forEach((ex, ei) => {
        // MCQ: answer must be in options
        if (ex.type === 'mcq') {
          if (!Array.isArray(ex.options) || !ex.options.includes(ex.answer)) {
            errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: MCQ answer '${ex.answer}' not in options`);
          }
        }
        // Gap-fill: answer should be short (1-5 words)
        if (ex.type === 'gap-fill' && ex.answer.length > 100) {
          errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: gap-fill answer too long (${ex.answer.length} chars)`);
        }
        // Difficulty must be 1-5
        if (typeof ex.difficulty === 'number' && (ex.difficulty < 1 || ex.difficulty > 5)) {
          errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: difficulty ${ex.difficulty} out of range 1-5`);
        }
      });
    });
  });

  // Validate exercise types against topic domain tags
  const tagTypes = {};
  courseDraft.tags.forEach(tag => {
    const domain = tag.split(':')[0];
    if (EXERCISE_TYPES[domain]) {
      tagTypes[domain] = true;
    }
  });
  // If tag is grammar:articles, prefer gap-fill, sentence-rewrite, mcq
  // Flag if ALL exercises are MCQ for a grammar topic (wrong type mixture)

  return errors;
}
```

### Gap 4: Empty Catalog (Cold Start)

**Current state:** No seed courses. First visit shows empty catalog.

**Fix:** Bundle seed courses in `src/assets/bundled-courses.json` (pattern follows existing `bundled-content.json`):
```javascript
// src/assets/bundled-courses.json
// Array of course objects matching the courseSchema.js Course shape.
// Loaded on first launch via useCourses hook — merged into IndexedDB
// if no courses exist yet.

[
  {
    "id": "seed-grammar-tenses",
    "title": "English Tenses: Present, Past & Future",
    "description": "Master the three core tense groups with 4 lessons covering form, usage, and common DSE mistakes.",
    "tags": ["grammar:tenses"],
    "difficulty": "intermediate",
    "source": "manual",
    "published": true,
    "topics": [...] // 4 topics, 3 lessons each, 5-6 exercises per lesson
  },
  // ... 8-10 total
]
```

**Loading logic** (in `useCourses.js` or `App.jsx`):
```javascript
const [coursesLoaded, setCoursesLoaded] = useState(false);
const [hasSeedCourses, setHasSeedCourses] = useState(false);

useEffect(() => {
  (async () => {
    const existing = await getCourses();
    if (existing.length === 0) {
      // First launch — seed the catalog
      const { default: seedCourses } = await import('../assets/bundled-courses.json');
      for (const course of seedCourses) {
        await saveCourse(course);
      }
      setHasSeedCourses(true);
    }
    setCoursesLoaded(true);
  })();
}, []);
```

---

## Component Boundary (unchanged, verified functional)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `CourseIngestion` | PDF upload, parsing, review, publish | Backend POST /ingest, onSave callback → useCourses.saveCourse |
| `CoursePlayer` | State machine: overview → lesson → exercise → final → complete | useIndexedDB for progress, onBack, course prop |
| `CourseOverview` | Catalog entry page, enrollment, progress display | useCourses hook, onStart callback |
| `useCourses` | Course CRUD, enrollment tracking, recommendations, auto-generation | useIndexedDB, localStorage for enrollment state |
| `courseSchema` | Data model definitions, validators, tag taxonomy, recommendation engine | Pure utility — no side effects |
| `server/routes/courses.js` | Backend: ingest, list, get, publish, auto-generate | SQLite via better-sqlite3, AI proxy via fetch |
| `server/crawlers/pdfParser.js` | PDF text extraction + OCR fallback | pdfjs-dist, tesseract.js, canvas |

## Data Flow (unchanged, verified)

**Ingestion:** Frontend (base64) → POST /ingest → Server (parse PDF → call AI → save to SQLite) → Return draft → Frontend (review UI) → onSave (IndexedDB) + PUT /publish (SQLite)

**Auto-generation:** Frontend (weaknessTags) → POST /auto-generate → Server (call AI → save to SQLite) → Return draft → Frontend (saveCourse to IndexedDB) → Navigate to course

**Playback:** Frontend (getCachedCourse from IndexedDB or GET /courses/:id) → CoursePlayer state machine → Progress auto-saved to IndexedDB every 10s

## Scalability Considerations

| Concern | Current (v1) | Growth Path |
|---------|--------------|-------------|
| Course storage | SQLite (<1000 courses) | SQLite handles this easily — no migration needed |
| PDF processing | Synchronous, single-threaded Node | Move to worker thread or queue for >2 concurrent uploads |
| Course content size | ~50KB per course JSON | Individually stored in IndexedDB — no per-call constraint |
| Catalog size | <100 courses | Flat list is fine. Add search/filter if >100 |
| Auto-generation concurrency | One at a time (sequential) | Acceptable for single-user. Add queue if multiple users. |

## Sources

- **Codebase analysis**: Every component and server file in the course pipeline examined
- **PDF chunking pattern**: LearnApp thesis (TU Graz, 2026) — semantic chunking via heading detection + LLM grouping
- **Education pipeline benchmark**: iQberry AI course generation case study — pipeline pattern: source analysis → course structuring → content generation → asset packaging → publishing
- **Semantic chunking reference**: `thomasplangger/learnapp-llm-pipeline` GitHub — topic-aware semantic chunking before AI-based course structuring
