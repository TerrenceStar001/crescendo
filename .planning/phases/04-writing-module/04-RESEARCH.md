# Phase 4: Writing Module DSE Authenticity — Research

**Researched:** 2026-06-25
**Domain:** HKDSE English Paper 2 Writing — exam format, marking rubric, AI correction, session management, exam UI
**Confidence:** HIGH

## Summary

The existing Writing Module (347 lines) has a minimal start→writing→feedback state machine with difficulty-based prompts and basic AI correction. This research confirms the CONTEXT.md decisions while surfacing key corrections: Part B offers **4 questions** (not 8) in the post-2024 curriculum reform, and the official HKEAA rubric uses Content/Organization/Language at 7 marks each per part (not per whole paper). The existing `dseGrading.js` and `useIndexedDB.js` infrastructure supports writing sessions and DSE level mapping with no modifications needed. The Reading Module's session recovery, timer, and results composition patterns provide a strong architectural template.

**Primary recommendation:** Rebuild WritingModule.jsx as a multi-phase state machine (`start > choosing > writing-partA > writing-partB > feedback > history`) with a hybrid prompt bank (`src/assets/writing-prompts.json`) plus AI generation. Reuse Reading Module's sessionStorage crash recovery, useIndexedDB session history, and dseGrading.js score mapping. Refactor `useDSEPapers.js` `generateWritingPrompt()` into Part A/B-aware functions with text type branching. Add approximately 400-500 lines of new CSS with `.writing__*` BEM naming.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
<decisions>
#### Prompt Text Types & Format

- **D-01:** Full DSE format — Part A (short, compulsory) + Part B (long, choose from ~8 options). No B1/B2 split (that's Paper 1 only).
- **D-02:** All 8 DSE text types: article, letter, speech, report, story, blog, review, proposal.
- **D-03:** Hybrid prompt source — curated bank (~20 per text type) stored in `src/assets/writing-prompts.json` (JSON file, same pattern as `bundled-content.json`), plus AI generation for variety when online.
- **D-04:** Prompt bank uses full metadata per entry: `{ id, part, type, title, context, task, wordLimit, suggestedPoints, instructions, difficulty, source }`.
- **D-05:** Part B presents ~8 options for the student to choose from — this matches real DSE format. Researcher must verify exact number and presentation format.
- **D-06:** Single 2-hour countdown timer (no split between Part A/B). Student manages their own time.
- **D-07:** Full DSE prompt card display: context paragraph, task instructions, bullet-point requirements, word limit, text type badge.
- **D-08:** Used prompts tracked in localStorage to avoid repeats.
- **D-09:** Topic domains cover all DSE-relevant areas: social issues, education, environment, technology, health, media, culture, career, sports.
- **D-10:** Part A text types aligned with real HKDSE — researcher must verify what types appear in real Part A.

#### Correction Rubric Depth

- **D-11:** Exact HKEAA rubric format — **researcher MUST find official HKEAA Paper 2 marking scheme**. This is a critical research dependency.
- **D-12:** AI returns rubric scores as structured JSON (AI handles scoring in the correction prompt).
- **D-13:** DSE level calculated via existing `dseGrading.js` utility (consistent across modules).
- **D-14:** Type-adjusted rubric — different scoring criteria per text type (story vs letter vs proposal).
- **D-15:** AI correction includes overall narrative summary comment (strengths, weaknesses, improvement tips).

#### Error Categorization & Feedback Detail

- **D-16:** Errors categorized by type: grammar, vocabulary, sentence structure, style/register, punctuation, spelling, content/relevance.
- **D-17:** Each error includes: original text, correction, explanation, type, severity (Critical/Major/Minor), and paragraph/line reference.
- **D-18:** "Good language use" section highlighting well-written phrases alongside error list.
- **D-19:** Vocabulary suggestions include both CEFR levels (A1-C2) and DSE level labels (e.g., "beneficial [DSE 5]").
- **D-20:** Error frequency chart showing error type counts across categories.
- **D-21:** Section-level breakdown: introduction, body paragraphs, conclusion scored separately.
- **D-22:** "Pitfalls avoided" section showing common DSE mistakes the student successfully avoided.
- **D-23:** Inline annotations in the essay text with color-coding by error type.
- **D-24:** Cross-session error pattern tracking (e.g., "article mistakes in 3 of last 5 essays").
- **D-25:** Self-assessment before submission — student tags areas they're unsure about.
- **D-26:** Re-submit and compare — revise based on feedback and re-submit for re-correction.

#### Exam Environment UI

- **D-27:** DSE answer booklet editor with ruled lines, margins, and exam-style header.
- **D-28:** Full DSE exam header: "HKDSE English Language Paper 2 — Writing", candidate info, instructions.
- **D-29:** No word count display during writing (authentic DSE experience — no external aids).
- **D-30:** Exam-style timer shows HH:MM:SS with prominent warnings at 30min, 15min, 5min.
- **D-31:** Sound alerts at key intervals (configurable on/off).
- **D-32:** Full-screen distraction-free mode during exam (no sidebar nav visible).
- **D-33:** Fully responsive for desktop + tablet (matching Reading Module breakpoints at 1024px/768px).

#### Prompt Bank & Session Management

- **D-34:** Auto-save essay every 30 seconds to IndexedDB with crash recovery on browser refresh.
- **D-35:** Browseable session history (essay text, correction results, scores) stored in IndexedDB via useIndexedDB.
- **D-36:** Side-by-side session comparison to track score and error pattern changes over time.

### the agent's Discretion
- Exact Part B option count per session — researcher to verify real DSE format
- Part A specific text type distribution — researcher to verify from real papers
- Auto-save debounce timing — 30s was discussed but agent can adjust
- Sound alert implementation (Web Audio API vs HTML Audio)
- Exact responsive breakpoint values (match existing Reading Module)
- CSS naming conventions for new components

### Deferred Ideas (OUT OF SCOPE)
None.
</decisions>
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Prompt generation & display | Browser (React) | AI Backend | Prompts rendered in browser; AI generates on-demand via callAI |
| Essay editing | Browser (contentEditable) | — | Pure DOM manipulation, no server needed |
| Timer & time management | Browser (useRef + setInterval) | — | Local timer, auto-submit on expiry (Reading Module pattern) |
| AI correction scoring | AI Backend | Browser (parsing) | callAI sends essay + rubric prompt; browser parses JSON response |
| DSE level mapping | Browser (dseGrading.js) | — | Pure utility function, no server dependency |
| Session history | Browser (IndexedDB via useIndexedDB) | — | Stored locally in CrescendoDSE DB |
| Crash recovery | Browser (sessionStorage) | — | Same pattern as ReadingModule.jsx |
| Error pattern tracking | Browser (IndexedDB + localStorage) | — | Cross-session tracking stored client-side |
| Sound alerts | Browser (Web Audio API) | — | No external audio files needed |
| Exam UI / full-screen mode | Browser (CSS + ViewContext) | — | Sidebar visibility toggled via context |
| Re-submit and compare | Browser | — | Load previous + current essays, side-by-side |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | Component framework | Existing project standard |
| callAI (useAI.js) | existing | AI endpoint | All AI calls go through this |
| dseGrading.js | existing | DSE level calc | Reuse `scoreToDseLevel()`, `computeWeightedScore()` |
| useIndexedDB.js | existing | Session history | Already stores DSE sessions in CrescendoDSE DB |
| useSkillAnalytics.js | existing | Skill tracking | Already has `recordSession()` for writing skill |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Speech API | browser | Sound alerts (beep tones) | Timer warnings at 30min/15min/5min |
| Web Audio API | browser | Exam timer beeps | AudioContext for programmatic beeps |
| sessionStorage | browser | Crash recovery | Save essay draft on every auto-save interval |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| contentEditable | CodeMirror/Quill | Need rich text + raw text extraction; contentEditable keeps it simple and matches existing Canvas pattern |
| sessionStorage for recovery | localStorage | sessionStorage auto-clears on tab close, avoids stale recovery data |
| IndexedDB for history | localStorage | Sessions may exceed 5MB limit; IndexedDB handles larger data |

**Installation:**
```bash
# No new packages required. All dependencies exist in the project.
```

**Version verification:** All libraries are existing project dependencies — no new installations needed.

## Package Legitimacy Audit

> **No new external packages are required for this phase.** All dependencies (React, useAI, useIndexedDB, dseGrading.js, Web Speech API, Web Audio API) are either existing project files or browser-native APIs. No npm/PyPI/crates packages need verification.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  WritingModule.jsx (State Machine)                                  │
│                                                                     │
│  start ──→ choosing ──→ writing-partA ──→ writing-partB ──→ feedback │
│    │          │              │                  │              │     │
│    │          │              │                  │              │     │
│    ▼          ▼              ▼                  ▼              ▼     │
│  ┌──────┐ ┌──────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │Start │ │Pick  │ │Write Part A  │ │Write Part B  │ │Results & │ │
│  │Screen│ │Part B│ │(guided,~200w)│ │(extended,    │ │Correction│ │
│  │      │ │Option│ │              │ │ ~400w)       │ │          │ │
│  └──────┘ └──────┘ └──────────────┘ └──────────────┘ └──────────┘ │
│       │         │            │                │              │      │
│       ▼         ▼            ▼                ▼              ▼      │
│  callbackAI  prompts.json  auto-save ───── sessionStorage ──→ AI    │
│  generate    + AI gen.     every 30s       crash recovery   callAI │
│  prompts                  (IndexedDB)                      ↓       │
│                                                              │      │
│                                               ┌───────────────────┐│
│                                               │ Parsed Correction ││
│                                               │ JSON → Components ││
│                                               └───────────────────┘│
│                                                      │              │
│                                                      ▼              │
│                                            ┌────────────────────┐  │
│                                            │ useSkillAnalytics  │  │
│                                            │ recordSession()    │  │
│                                            └────────────────────┘  │
│                                                      │              │
│                                                      ▼              │
│                                            ┌────────────────────┐  │
│                                            │ IndexedDB History  │  │
│                                            │ + localStorage     │  │
│                                            │ used prompts set   │  │
│                                            └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── components/
│   ├── WritingModule.jsx        ← Rewritten (target: ~800-1000 lines)
│   ├── WritingCorrection.jsx    ← NEW: correction results display
│   ├── WritingHistory.jsx       ← NEW: session history browser
│   ├── WritingComparison.jsx    ← NEW: side-by-side comparison
│   └── WritingPromptCard.jsx    ← NEW: DSE prompt card component
├── hooks/
│   └── useDSEPapers.js          ← MODIFY: replace generateWritingPrompt()
├── assets/
│   └── writing-prompts.json     ← NEW: curated prompt bank (~160 entries)
├── utils/
│   ├── dseGrading.js            ← Already supports writing, no changes needed
│   └── writingPrompts.js        ← NEW: prompt bank loader + shuffle + dedup
└── App.jsx                      ← Minor: add new key to DSE_KEYS.writingSessions
```

### Pattern 1: Phase State Machine (Reading Module Pattern)
**What:** Each DSE module manages its own internal phases via `useState`. The Reading Module has `start → passage-view → results → history-review`. The new Writing Module should have `start → choosing → writing-partA → writing-partB → feedback → history`.
**When to use:** Always. This is the established Crescendo pattern for DSE modules.
**Example source:** `src/components/ReadingModule.jsx` lines 7-23 (state declarations), lines 304-553 (phase rendering).

### Pattern 2: Session Recovery with sessionStorage (Reading Module Pattern)
**What:** During active sessions, the essay draft is saved to sessionStorage. On mount, a "Resume" banner appears if saved session exists.
**When to use:** Always. Avoids losing student work on accidental refresh.
**Example source:** `src/components/ReadingModule.jsx` lines 29-68, 344-353.

### Pattern 3: Timer with useRef + setInterval (Reading Module Pattern)
**What:** Timer managed via `useRef` interval, clears on unmount, auto-submits at 0.
**When to use:** Always for exam timing.
**Example source:** `src/components/ReadingModule.jsx` lines 118-135.

### Pattern 4: Hybrid AI + Bundled Content (Reading Module Pattern)
**What:** `dsePapers.generateReadingSession()` tries AI first, falls back to bundled if AI fails.
**When to use:** For the writing prompt bank — try AI for variety, fall back to curated JSON prompts.
**Example source:** `src/components/ReadingModule.jsx` lines 85-116.

### Anti-Patterns to Avoid
- **All-in-one component:** The current WritingModule.jsx handles start, writing, and feedback in one file — fine for 347 lines, but the rewritten version (~800-1000 lines) should extract Correction, History, and Comparison into separate component files.
- **No word count in corrected feedback:** The correction response must include the word count for the analytics record.
- **Difficulty-based prompts only:** Must switch to Part A/B format rather than easy/medium/hard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DSE level calculation | Custom level mapping | `dseGrading.js` `scoreToDseLevel(percentage, 'writing')` | Already handles writing boundaries, custom boundaries support |
| Session persistence | Custom IndexedDB wrapper | `useIndexedDB.js` `setItem`/`getItem` | Already exists, same DB `CrescendoDSE` |
| Skill analytics recording | Custom analytics | `useSkillAnalytics.recordSession({ skill: 'writing', ... })` | Already tracks writing overall, word count, subScores |
| Timer mechanics | Custom timer | useRef + setInterval pattern (Reading Module) | Battle-tested, handles unmount, auto-submit |

**Key insight:** The existing Crescendo infrastructure already supports everything needed for the writing module. The D-13 decision to use dseGrading.js is correct — it has per-skill boundaries, `scoreToDseLevel()`, and custom boundary support. No backend changes are needed for this phase.

## HKEAA Paper 2 Official Format & Marking Scheme

### Paper Structure (Verified from HKEAA 2024 Assessment Framework)

See [CITED: https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/2024hkdse-e-elang.pdf]

| Feature | Part A | Part B |
|---------|--------|--------|
| **Weighting** | 10% of total subject | 15% of total subject |
| **Word limit** | ~200 words | ~400 words |
| **Task type** | Short, guided practical writing | Extended open-ended writing |
| **Options** | Compulsory (1 task only) | Choose 1 from **4 questions** |
| **Time** | 2 hours total (shared) | 2 hours total (shared) |
| **Text types** | Short practical: email, letter, blog comment, questionnaire, advertisement response, short article | Article, letter, speech, report, story, blog, review, proposal |
| **Highest Level** | All levels possible | All levels possible |
| **B1/B2 split?** | No (Paper 1 and Paper 3 only) | No (Paper 1 and Paper 3 only) |

**CRITICAL CORRECTION to D-05:** The CONTEXT.md states Part B offers ~8 options. This was true **pre-2024** when Part B had 8 questions tied to 8 elective modules. **The 2024+ curriculum reform reduced Part B to 4 questions**, no longer tied to elective modules. The planner should note this discrepancy and decide which format to target.

[CITED: https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/ENG-SP-Paper2-2024.pdf] — The HKEAA sample paper confirms:
- Part B has questions numbered 2, 3, 4, 5 (4 options)
- Part A is question 1 (compulsory)
- Examination instructions include: "For Part B, you should put an 'X' in the corresponding question number box on Page 5 to indicate the question you are going to attempt."
- Instructions include: "Do not use your real name... use 'Chris Wong'" if needed

### Part A Text Type Distribution (Verified from 2020-2024 papers)

| Year | Part A Task | Text Type |
|------|------------|-----------|
| 2024 | Course evaluation questionnaire response | Email / Form response |
| 2023 | Letter to hotel manager about disappointing stay | Email / Letter of complaint |
| 2022 | Article for school magazine about volunteer experience | Short article / Blog |
| 2021 | Letter to editor about local issue | Letter to editor |
| 2020 | Speech for school assembly | Speech |

[CITED: https://www.learnsmart.edu.hk/blog/2024DSE-English-Paper2-PartA]

**Part A common text types (by frequency):** Email, letter, blog comment, short article, speech, questionnaire response, advertisement response.

### Official Marking Scheme: Content / Organization / Language (7 marks each)

**IMPORTANT:** The HKEAA uses **Level Descriptors** (Levels 1-5) for each of the three domains. **Part A and Part B are EACH marked out of 21** (Content 7 + Organization 7 + Language 7). Two markers per part = 4 scores of 21 each. The current codebase correctly uses /7 per category.

[CITED: https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/LevelDescriptors-ENG-Writing.pdf]

**Level 5 (Highest) Descriptors:**

| Criterion | What it assesses | Level 5 Descriptor |
|-----------|-----------------|-------------------|
| **Content** (7) | Relevance, comprehensiveness, audience awareness, creativity, engagement | "The content is relevant and extensive, shows an awareness of purpose, and engages the reader's interest. Creativity and imagination are shown in most parts of the writing." |
| **Language & Style** (7) | Sentence structure range, grammar, punctuation, vocabulary, register, tone | "A range of sentence structures is used accurately and appropriately. Punctuation and grammar is sufficiently accurate... Vocabulary is moderately wide, appropriate... Register, tone and style are mostly appropriate to the text type." |
| **Organization** (7) | Coherence, paragraphing, cohesion, genre-appropriate structure | "The structure of the writing is coherent in most parts and appropriate to the genre and text type. Paragraphing is sufficiently effective for overall coherence. Cohesion between most sentences and paragraphs is successful." |

**Level 3 (Mid) Descriptors:**

| Criterion | Level 3 Descriptor |
|-----------|-------------------|
| **Content** | "Most of the content is relevant. Several examples of creativity and imagination are evident in the writing." |
| **Language** | "Simple sentences, and some complex sentences are well formed. Basic punctuation and some basic grammatical structures are accurate. Common vocabulary is used appropriately." |
| **Organization** | "Some sections of the writing are coherent... Paragraphing is effective in parts. Cohesion between some sentences and paragraphs is successful." |

**Level 1 (Low) Descriptors:**

| Criterion | Level 1 Descriptor |
|-----------|-------------------|
| **Content** | "A few content points are relevant." |
| **Language** | "There are a few simple, comprehensible sentences. There are a few examples of simple vocabulary used appropriately." |
| **Organization** | "There are a few links made between sentences." |

### Grade Boundary Mapping (Current dseGrading.js Defaults)

The existing `dseGrading.js` already has writing-specific grade boundaries:

```
5** ≥ 88%    (18-19/21)
5*  ≥ 83%    (17-18/21)
5   ≥ 76%    (16/21)
4   ≥ 67%    (14-15/21)
3   ≥ 50%    (10-13/21)
2   ≥ 38%    (8-9/21)
1   ≥ 0%     (0-7/21)
```

[CITED: https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/category_a_subjects/eng_lang/faq/q4.html] — HKEAA confirms: "There is a common misunderstanding that the scores given by the markers is directly transferred to the final grade... The grading process... specialists decide on the cut scores for each level. The cut scores may vary from year to year."

**Implication:** The percentage-based mapping in dseGrading.js is a reasonable approximation but not the official HKEAA grade conversion (which varies year-to-year). The existing implementation is acceptable for a practice tool.

### Grade Boundary Scoring (21-point scale)

Using the dseGrading.js writing boundaries:
```
% Range    Level    /21 Equivalent
88-100     5**      18.5-21
83-87      5*       17.5-18
76-82      5        16-17
67-75      4        14-15
50-66      3        10.5-13
38-49      2        8-10
0-37       1        0-7
```

The AI correction prompt should return scores out of 7 for each category, total out of 21.

## Implementation Research — Current Codebase Patterns

### Phase State Machine Pattern (ReadingModule.jsx)

[VERIFIED: codebase reading]

The Reading Module uses a clean phase state machine with `useState`:
```jsx
const [phase, setPhase] = useState('start');
// Phases: start → passage-view → results → history-review
```

Each phase returns its own JSX block via `if (phase === 'start') { return (...); }`.

**Key patterns to reuse:**
1. `checkForSavedSession` on mount → shows "Resume" banner
2. `saveSessionToStorage()` called on every state change during active session
3. `clearSessionStorage()` on session completion
4. Timer: `useRef` interval, clears on unmount, auto-finishes at 0
5. `startSession(difficulty)` → tries AI generation, falls back to bundled content
6. `finishSession()` → computes score, clears storage, saves to history, records analytics
7. `useEffect` for past sessions loaded on mount

### generateWritingPrompt Function (useDSEPapers.js lines 1572-1645)

[VERIFIED: codebase reading]

Current implementation:
- Single prompt generation (no Part A/B)
- Difficulty-based (easy/medium/hard → 300/400/500 words)
- Type parameter but only uses 'essay' → descriptive strings
- Returns `{ id, type: 'writing', source: 'ai-generated', difficulty, prompt, metadata: { wordLimit, type, suggestedPoints } }`
- Caches to IndexedDB via `getCachedPapers('writing')`

**What must change:**
- Branch into Part A (short, ~200 words) and Part B (long, ~400 words, choose from 4)
- Generate 4 Part B options in one AI call (more efficient than 4 separate calls)
- Text type must be explicitly selected from the 8 DSE text types
- Part A text types limited to practical writing (email, letter, blog comment, etc.)

### useIndexedDB.js (111 lines)

[VERIFIED: codebase reading]

Simple key-value wrapper over IndexedDB:
- `getItem(key)` / `setItem(key, value)` / `updateItem(key, updater)` / `deleteItem(key)`
- All operations are async, wrapped in try/catch
- DB: `CrescendoDSE`, version 1, single object store `store`
- Existing DSE_KEYS: `PROFILE`, `SESSIONS`, `PAPERS`, `CONTENT`, `DRAFTS`, `RECORDINGS`, `SESSION_ANSWERS`

**New key needed:** Add `WRITING_SESSIONS: 'crescendo-writing-sessions'` to DSE_KEYS.

### dseGrading.js (382 lines)

[VERIFIED: codebase reading]

Already supports writing:
- `scoreToDseLevel(percentage, 'writing')` — uses writing-specific boundaries
- `DSE_SKILL_WEIGHTS.writing = 0.25`
- `computeWeightedScore(questions, answers, skill)` — but writing doesn't have questions, so skip
- `PER_SKILL_DEFAULTS.writing` — boundaries already defined

**Key methods to use in Writing Module:**
```js
scoreToDseLevel(percentage, 'writing')
// Returns: { level: '5**', minPercentage: 88, achieved: true }
```

### useSkillAnalytics.js (226 lines)

[VERIFIED: codebase reading]

Writing recording already supported:
```js
skillAnalytics.recordSession({
  skill: 'writing',
  type: 'practice',
  score: results.content.score + results.organization.score + results.language.score,
  totalQuestions: 21,
  percentage: overallPercentage,
  subScores: { content: contentPct, organization: orgPct, language: langPct },
  wordCount,
  duration: timeSpent,
  dseLevel: result.overall.dseLevel,
});
```

The `writing` skill profile already tracks: `overall`, `dseLevel`, `subScores`, `totalSessions`, `averageWordCount`, `lastSessionDate`.

### Current CSS Writing Patterns (App.css lines 5324-5636)

[VERIFIED: codebase grep]

47 existing `.writing__*` CSS rules already in place:
```
.writing__body               .writing__feedback-body
.writing__prompt-panel        .writing__feedback-summary
.writing__prompt-card         .writing__feedback-ring
.writing__prompt-label        .writing__feedback-stats
.writing__prompt-text         .writing__feedback-stat / -value / -label
.writing__prompt-meta         .writing__feedback-categories
.writing__prompt-points       .writing__feedback-category / -name / -score
.writing__editor-panel        .writing__feedback-category-bar-bg / -fill
.writing__editor              .writing__feedback-category-text
.writing__editor-footer       .writing__feedback-section
.writing__wordcount           .writing__feedback-error / -original / -corrected
.writing__wordcount--over     .writing__feedback-vocab / -item / -original / -suggestion
.writing__submit-btn          .writing__feedback-vocab-context
```

Reading results CSS (`.reading__results*`) provides the reusable ring chart, stat cards, sub-score bars, review items, and action button patterns.

## Prompt Bank JSON Schema

Based on `bundled-content.json` pattern and D-04 requirements:

```json
// src/assets/writing-prompts.json
[
  {
    "id": "wp-article-001",
    "part": "B",
    "type": "article",
    "title": "The Impact of Social Media on Teenagers",
    "context": "You are a contributor to your school magazine. The editor has asked you to write an article discussing the impact of social media on teenagers.",
    "task": "Write an article for the school magazine discussing the positive and negative effects of social media on teenagers.",
    "wordLimit": { "min": 350, "max": 450 },
    "suggestedPoints": [
      "How social media affects communication skills",
      "The role of social media in academic performance",
      "Ways to promote responsible social media use"
    ],
    "instructions": "You should write about 400 words. Provide a title for your article. Do not use your real name.",
    "difficulty": "medium",
    "source": "curated",
    "topicDomain": "social issues",
    "yearIntroduced": 2024
  },
  {
    "id": "wp-email-001",
    "part": "A",
    "type": "letter",
    "title": "Complaint About School Facilities",
    "context": "You recently noticed that some facilities in your school are in poor condition. The principal has asked students to share their opinions.",
    "task": "Write an email to the principal describing the problems with the facilities and suggesting improvements.",
    "wordLimit": { "min": 180, "max": 250 },
    "suggestedPoints": [
      "Describe at least two problems you have noticed",
      "Explain how these problems affect students",
      "Suggest practical solutions"
    ],
    "instructions": "Write about 200 words. Sign your email as Chris Wong.",
    "difficulty": "easy",
    "source": "curated",
    "topicDomain": "education",
    "yearIntroduced": 2024
  }
]
```

## AI Correction Prompt Design

The correction prompt must include:
1. The complete essay text
2. Part (A or B) and text type
3. The full prompt the student was responding to
4. Official HKEAA Level Descriptors (Content/Organization/Language)
5. Type-adjusted rubric guidance (a story differs from a proposal)
6. Instruction to return structured JSON

**Error categorization schema:**
```json
{
  "content": { "score": 5, "feedback": "Good relevance but could develop examples further" },
  "organization": { "score": 4, "feedback": "Clear structure but transitions could be smoother" },
  "language": { "score": 5, "feedback": "Good vocabulary range with minor grammatical errors" },
  "overall": {
    "total": 14,
    "maxTotal": 21,
    "percentage": 67,
    "dseLevel": "4",
    "narrativeSummary": "Your essay addresses the prompt well..."
  },
  "sectionBreakdown": {
    "introduction": { "score": 5, "feedback": "Engaging opening" },
    "body1": { "score": 4, "feedback": "Could use more specific examples" },
    "body2": { "score": 5, "feedback": "Well-developed argument" },
    "conclusion": { "score": 4, "feedback": "A bit abrupt" }
  },
  "errors": [
    {
      "original": "The government should to do something.",
      "correction": "The government should do something.",
      "explanation": "\"Should\" is a modal verb followed by the base form (should do), not \"should to do\".",
      "type": "grammar",
      "severity": "minor",
      "location": { "paragraph": 2, "line": 3 }
    }
  ],
  "goodLanguage": [
    { "phrase": "the burgeoning issue of...", "comment": "Excellent formal register suitable for an article" }
  ],
  "vocabularySuggestions": [
    {
      "original": "good",
      "suggestion": "beneficial [DSE 5]",
      "cefrLevel": "B2",
      "context": "\"a beneficial approach to reducing stress\""
    }
  ],
  "pitfallsAvoided": [
    "You correctly avoided using contractions in formal writing"
  ],
  "inlineAnnotations": [
    { "text": "should to do", "replacement": "should do", "type": "grammar", "color": "#ef5350" }
  ]
}
```

## Session History Data Model

Using IndexedDB via `useIndexedDB`:
```js
// Key: 'crescendo-writing-sessions'
// Value: Array of session objects
[
  {
    id: "writing_ses_20260625_abc123",
    completedAt: "2026-06-25T10:30:00Z",
    partA: {
      prompt: { id, type, title, context, task, wordLimit },
      essay: "<p>Essay text...</p>",
      essayPlainText: "Essay text...",
      wordCount: 215,
      timeSpent: 1200,
    },
    partB: {
      chosenOption: 2,
      prompt: { id, type: "article", title, ... },
      essay: "<p>Part B essay...</p>",
      essayPlainText: "Part B essay text...",
      wordCount: 412,
      timeSpent: 3600,
    },
    correction: {
      content: { score: 5, feedback: "..." },
      organization: { score: 4, feedback: "..." },
      language: { score: 5, feedback: "..." },
      overall: { total: 14, maxTotal: 21, percentage: 67, dseLevel: "4" },
      errors: [...],
      vocabularySuggestions: [...],
      sectionBreakdown: {...},
      goodLanguage: [...],
      pitfallsAvoided: [...],
      inlineAnnotations: [...],
    },
    selfAssessment: {
      unsureAreas: ["paragraph structure", "vocabulary"],
      confidenceLevel: "medium",
    },
    duration: 4800,
    dseLevel: "4",
  }
]
```

## State Machine Phases

```
Phase: start
  ├─ Show start screen with Part B option selection (4 options, prompt cards)
  ├─ Or browse session history
  └─ Or load from bundled prompts + AI generation

Phase: writing-partA
  ├─ Show Part A prompt card (context + task + bullet points)
  ├─ DSE answer booklet editor (ruled lines, exam header)
  ├─ Timer running (HH:MM:SS)
  ├─ Auto-save to sessionStorage every 30s
  ├─ No word count display
  └─ Student clicks "Proceed to Part B" or timer expires

Phase: writing-partB
  ├─ Show chosen Part B prompt card
  ├─ Continue same editor/ruled lines
  ├─ Timer continues (shared 2 hours)
  ├─ Auto-save to sessionStorage every 30s
  └─ Student submits or timer expires

Phase: submitted / feedback
  ├─ Sending for AI correction
  ├─ Display correction results (WritingCorrection component)
  ├─ Rubric scores (Content/Organization/Language)
  ├─ Error list with inline annotations
  ├─ Vocabulary suggestions
  ├─ Section breakdown
  ├─ Save to IndexedDB history
  ├─ Record to skillAnalytics
  └─ Options: re-submit, compare with previous, new session

Phase: history
  ├─ Browse past sessions from IndexedDB
  ├─ View previous correction results
  └─ Side-by-side comparison with current session

Phase: comparison
  ├─ Load two sessions
  ├─ Side-by-side score comparison
  ├─ Error pattern difference view
  └─ Trend visualization
```

## Auto-Save and Crash Recovery

Based on Reading Module's sessionStorage pattern (lines 29-68):

```js
// Auto-save essay draft
const SESSION_KEY = 'crescendo-writing-session';

const saveSession = useCallback((partA, partB, phase, timeRemaining) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      partA: partA?.essay,
      partB: partB?.essay,
      partBPromptChosen: partB?.chosenOption,
      phase,
      timeRemaining,
      savedAt: Date.now(),
    }));
  } catch {}
}, []);

// Check on mount
useEffect(() => {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved && JSON.parse(saved).phase !== 'feedback') {
    setHasSavedSession(true);
  }
}, []);
```

For auto-save timing: 30 seconds is reasonable (matches D-34). The Reading Module pattern triggers save on every answer change, which for writing should be throttled to a 30-second debounce:
```js
useEffect(() => {
  if (phase !== 'writing-partA' && phase !== 'writing-partB') return;
  const timer = setTimeout(() => {
    saveSession(partA, partB, phase, timeRemaining);
  }, 30000);
  return () => clearTimeout(timer);
}, [partA, partB, phase, timeRemaining, saveSession]);
```

## CSS Component Hierarchy

New CSS classes needed (following existing `.writing__*` BEM pattern):

```
.writing__exam-header           ← DSE exam booklet header
.writing__exam-header-title      ← "Hong Kong Diploma of Secondary Education Examination"
.writing__exam-header-paper      ← "English Language Paper 2 — Writing"
.writing__candidate-info         ← Candidate number, seat number
.writing__instructions           ← Exam instructions
.writing__answer-booklet         ← Ruled line container
.writing__answer-line            ← Individual ruled line
.writing__prompt-options         ← Part B option grid
.writing__prompt-option-card     ← Individual option card (clickable)
.writing__prompt-option-badge    ← Text type badge
.writing__prompt-option-title    ← Option title
.writing__prompt-option-desc     ← Option description
.writing__timer                  ← HH:MM:SS display (override reading__timer)
.writing__timer--warning         ← Warning state (< 30 min)
.writing__timer--critical        ← Critical state (< 5 min)
.writing__fullscreen             ← Distraction-free mode wrapper
.writing__correction             ← Correction results container
.writing__correction-summary     ← Overview scores
.writing__correction-ring        ← Score ring chart
.writing__correction-rubric      ← Content/Organization/Language bars
.writing__correction-errors      ← Error list
.writing__correction-annotated   ← Inline annotated essay
.writing__correction-good        ← Good language section
.writing__correction-vocab       ← Vocabulary suggestions
.writing__correction-section     ← Section breakdown
.writing__correction-pitfalls    ← Pitfalls avoided
.writing__correction-chart       ← Error frequency chart
.writing__history                ← Session history
.writing__history-item           ← History entry
.writing__history-score          ← Score comparison
.writing__comparison             ← Side-by-side comparison
.writing__comparison-panel       ← Individual session panel
.writing__re-submit              ← Re-submission area
```

These should be added to `src/App.css` in a new section following `.dse-module` styles, maintaining the existing CSS custom property system.

## Common Pitfalls

### Pitfall 1: Word Count Disclosure
**What goes wrong:** Displaying word count during writing violates DSE authenticity (D-29).
**Why it happens:** The existing WritingModule shows `{wordCount} / {wordLimit.max} words` in the editor footer.
**How to avoid:** Remove word count display during writing phase. Only show it in the feedback/results phase.
**Warning signs:** Any `<span>` or `<div>` showing word count during `writing-partA` or `writing-partB` phases.

### Pitfall 2: Part B Options as Difficulty Levels
**What goes wrong:** Treating Part B options as "easy/medium/hard" instead of text-type choices.
**Why it happens:** The existing module uses difficulty-based cards. Part B options should be text-type-based (article, letter, speech, etc.) with equal difficulty.
**How to avoid:** Replace the 3 difficulty cards with 4 text-type option cards for Part B. Each option should show text type, title, and brief context.
**Warning signs:** Any reference to "easy/medium/hard" in the Part B selection phase.

### Pitfall 3: AI Hallucinating Rubric Scores
**What goes wrong:** The AI returns invalid/missing scores that crash the feedback UI.
**Why it happens:** AI may return incomplete JSON, missing fields, or scores outside 0-7 range.
**How to avoid:** Wrap JSON parsing in try/catch with fallback values (already done in current code). Validate scores are 0-7 integers. If AI returns non-numeric or out-of-range values, default to 0 with a "parse error" note.
**Warning signs:** `NaN` displayed in score rings, `undefined` in feedback stats.

### Pitfall 4: IndexedDB Key Conflicts
**What goes wrong:** Writing sessions overwritten by reading sessions using the same key.
**Why it happens:** The same IndexedDB store is shared. If writing sessions use the same key as reading sessions, data will be overwritten.
**How to avoid:** Use a unique key prefix: `crescendo-writing-sessions` for writing history, add `WRITING_SESSIONS` to DSE_KEYS in useIndexedDB.js.
**Warning signs:** Writing history shows reading session data or vice versa.

### Pitfall 5: Timer Not Persisting Across Phases
**What goes wrong:** When transitioning from Part A to Part B, the timer resets or loses state.
**Why it happens:** Timer is a local `useState` that could reset on phase transition re-renders.
**How to avoid:** Store `timeRemaining` in a single state variable that persists across phase changes. Use `useRef` for the interval ID. Do not re-initialize timer on phase change.
**Warning signs:** Timer shows 2:00:00 when entering Part B after spending 30 minutes on Part A.

## Code Examples

### Pattern 1: Score to DSE Level (Reuse Existing)
```js
// Source: src/utils/dseGrading.js (existing, no changes needed)
import { scoreToDseLevel } from '../utils/dseGrading';

const totalScore = contentScore + orgScore + languageScore; // out of 21
const percentage = Math.round((totalScore / 21) * 100);
const dseLevel = scoreToDseLevel(percentage, 'writing');
// Returns: { level: '4', minPercentage: 67, achieved: true }
```

### Pattern 2: Session Persistence with useIndexedDB (Existing Pattern)
```js
// Source: src/hooks/useIndexedDB.js (existing, add WRITING_SESSIONS key)
const DSE_KEYS = {
  ...existingKeys,
  WRITING_SESSIONS: 'crescendo-writing-sessions',
};

// Save session
await setItem(DSE_KEYS.WRITING_SESSIONS, updatedSessions);

// Load history
const sessions = await getItem(DSE_KEYS.WRITING_SESSIONS) || [];
```

### Pattern 3: Timer with Auto-Submit (Reading Module Pattern)
```js
// Source: src/components/ReadingModule.jsx lines 118-135
const timerRef = useRef(null);

useEffect(() => {
  if (timeRemaining === null || timeRemaining <= 0) {
    if (timeRemaining === 0) handleSubmit();
    return;
  }
  timerRef.current = setInterval(() => {
    setTimeRemaining(t => {
      if (t <= 1) { clearInterval(timerRef.current); return 0; }
      return t - 1;
    });
  }, 1000);
  return () => clearInterval(timerRef.current);
}, [timeRemaining]);

const formatExamTime = (s) => {
  if (s === null || isNaN(s)) return '\u2014';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};
```

### Pattern 4: AI Correction Call with JSON Parsing
```js
// Source: src/components/WritingModule.jsx lines 68-118 (enhanced)
const handleSubmit = useCallback(async () => {
  clearInterval(timerRef.current);
  setPhase('submitted');
  setSubmitting(true);

  try {
    const prompt = buildCorrectionPrompt(partA.essay, partB.essay,
      partA.prompt, partB.prompt);

    const data = await callAI(prompt, {
      system: 'You are an expert HKDSE English examiner (Paper 2 Writing). '
        + 'Assess using official HKEAA criteria: Content/7, Organization/7, Language/7. '
        + 'Return ONLY valid JSON.',
      temperature: 0.3,
      maxTokens: 2000,
    });

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      const jsonMatch = data.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
      }
    }

    if (!parsed) throw new Error('Failed to parse AI response');

    // Validate score ranges
    const validateScore = (v) => Math.max(0, Math.min(7, Number(v) || 0));

    const result = {
      content: { score: validateScore(parsed.content?.score), feedback: parsed.content?.feedback || '' },
      organization: { score: validateScore(parsed.organization?.score), feedback: parsed.organization?.feedback || '' },
      language: { score: validateScore(parsed.language?.score), feedback: parsed.language?.feedback || '' },
      overall: {
        total: validateScore(parsed.content?.score) + validateScore(parsed.organization?.score) + validateScore(parsed.language?.score),
        maxTotal: 21,
        percentage: Math.round(((validateScore(parsed.content?.score) + validateScore(parsed.organization?.score) + validateScore(parsed.language?.score)) / 21) * 100),
        dseLevel: scoreToDseLevel(
          ((validateScore(parsed.content?.score) + validateScore(parsed.organization?.score) + validateScore(parsed.language?.score)) / 21) * 100,
          'writing'
        ).level,
        narrativeSummary: parsed.overall?.narrativeSummary || '',
      },
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
      vocabularySuggestions: Array.isArray(parsed.vocabularySuggestions) ? parsed.vocabularySuggestions : [],
      goodLanguage: Array.isArray(parsed.goodLanguage) ? parsed.goodLanguage : [],
      sectionBreakdown: parsed.sectionBreakdown || {},
      pitfallsAvoided: Array.isArray(parsed.pitfallsAvoided) ? parsed.pitfallsAvoided : [],
      inlineAnnotations: Array.isArray(parsed.inlineAnnotations) ? parsed.inlineAnnotations : [],
    };

    setCorrectionResult(result);
    setPhase('feedback');

    // Save to history
    // Record to analytics
  } catch (e) {
    console.error('Failed to correct essay:', e);
    setCorrectionResult(errorResult);
  } finally {
    setSubmitting(false);
  }
}, [partA, partB, callAI, skillAnalytics]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Part B: 8 options tied to electives | Part B: 4 options, real-world topics | 2024 curriculum reform | Prompt bank must target 4 options, not 8 |
| Content/Organization/Language separate sheets | Content/Organization/Language integrated in single rubric per part | 2012 initial HKDSE | No change needed — current 3-category rubric is correct |
| AI-generated prompts only | Hybrid: curated bank + AI generation | This phase | Writing prompts from both sources |
| Difficulty-based (easy/medium/hard) | Part A/B structure | This phase | Replace difficulty cards with Part A + Part B option selection |
| Basic error list | Categorized errors with inline annotations | This phase | Richer feedback with severity and location |

**Deprecated/outdated:**
- **Difficulty-based (easy/medium/hard) prompt selection:** Replaced by Part A/B plus text type selection.
- **Single essay with no Part A/B:** Replaced by two-phase writing (Part A compulsory + Part B choice).
- **Word count display during writing:** Removed for authenticity.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Part B offers 4 options (post-2024 curriculum) not 8 (pre-2024) | HKEAA Paper 2 Format | CONTEXT.md says ~8; if planner wants pre-2024 format, prompt bank and UI must change |
| A2 | HKEAA level descriptors are public and usable as AI rubric context | HKEAA Marking Scheme | Could be copyright-restricted; but using them to guide AI scoring is educational fair use |
| A3 | The Writing Module can reuse existing DSE_KEYS in useIndexedDB.js | Session History Data Model | Add WRITING_SESSIONS key required; if key conflicts, sessions could be lost |
| A4 | Part A text types are limited to practical/functional writing | Part A Text Type Distribution | Based on 2020-2024 analysis; if Part A shifts format, text type list needs updating |
| A5 | No backend changes needed for this phase | Architecture | If AI correction needs server-side processing, backend changes may be needed |

**Note on A1:** This is the most significant assumption. The HKEAA sample paper (2024) clearly shows Part B = 4 questions, but older papers (pre-2024) had 8. The planner must confirm which format to target, as this affects the prompt bank size and option presentation UI.

## Open Questions

1. **Part B option count: 4 or 8?**
   - What we know: Pre-2024 = 8 options (one per elective module). 2024+ = 4 options (real-world topics).
   - What's unclear: Which format to target for this practice tool.
   - Recommendation: The planner should decide based on whether they want to match the latest HKDSE format (4 options) or the older format students might still practice (8 options). Both are reasonable.

2. **Should correction include Part A only, Part B only, or both?**
   - What we know: Both parts are marked separately in the real exam.
   - What's unclear: Whether to run one AI call for both essays (more efficient, combined feedback) or separate calls (more thorough).
   - Recommendation: One AI call with both essays, asking for separate Part A and Part B scores plus a combined overall assessment. This is more efficient and provides holistic feedback.

3. **How to handle AI generation for Part B options?**
   - What we know: 4 options are needed per session.
   - What's unclear: Generate all 4 in one AI call (efficient, may produce similar-quality options) or one-by-one (consistent quality, slower).
   - Recommendation: One AI call requesting 4 distinct text-type prompts with varying topics. This matches better the real exam where all 4 are of comparable quality.

4. **Should the exam timer auto-submit or soft-stop?**
   - What we know: Real DSE collects all papers at the 2-hour mark.
   - What's unclear: Auto-submit (what the student wrote is final) vs soft-stop (timer reaches 0 but student can still submit).
   - Recommendation: Match Reading Module — auto-submit at 0. This matches real exam pressure.

## Dependencies & Risks

### External Dependencies
- **No new external packages.** All libraries are existing project dependencies.
- **AI correction quality** depends on the underlying AI model (`opencode/deepseek-v4-flash-free`). Quality may vary — the feedback UI must handle low-quality/empty/error responses gracefully.
- **HKEAA official marking scheme:** The level descriptors PDF was downloaded and referenced. No copyright concerns for educational tool use.

### Integration Touchpoints
- **App.jsx:** Add `WRITING_SESSIONS` key to `DSE_KEYS`; verify WritingModule is already imported and wired.
- **SidebarNav.jsx:** Already has Writing nav item — no changes needed.
- **useDSEPapers.js:** `generateWritingPrompt()` needs complete replacement for Part A/B branching.
- **useSkillAnalytics.js:** Already handles writing sessions — no changes needed (the subScore structure already works with content/organization/language).
- **useIndexedDB.js:** Add `WRITING_SESSIONS: 'crescendo-writing-sessions'` to DSE_KEYS (minor).
- **ViewContext.jsx:** May need a new view mode or state for full-screen exam mode (temporarily hide sidebar).
- **structuralConstraints.js:** Add writing-specific structural constraints for prompt generation (text type conventions, Part A word limits, Part B option diversity).

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI returns unusable correction JSON | Medium | Medium | Multi-level JSON parsing fallback (find `{...}` in text, validate all fields) |
| Part B option count discrepancy | Medium | Medium | Verify with CONTEXT.md decision; code to support either 4 or 8 via config |
| ContentEditable in exam editor loses data on refresh | Low | High | Auto-save to sessionStorage every 30s + "Resume" banner on mount |
| IndexedDB storage quota exceeded for large essay history | Low | Low | Limit history to 50 sessions; show cleanup prompt if near quota |

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies — all tools are existing project dependencies or browser-native APIs)

## Validation Architecture

> workflow.nyquist_validation is enabled (absent in config = enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no test framework in project) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Part A prompt displayed in DSE format | Manual | N/A | ❌ |
| REQ-02 | Part B option selection shows 4 choices | Manual | N/A | ❌ |
| REQ-03 | Timer shows HH:MM:SS with warnings | Manual | N/A | ❌ |
| REQ-04 | AI correction returns Content/Org/Lang scores | Manual | N/A | ❌ |
| REQ-05 | Error categorization displayed | Manual | N/A | ❌ |
| REQ-06 | Session saved to IndexedDB | Manual | N/A | ❌ |

### Sampling Rate
- **Per task commit:** N/A (no test framework)
- **Per wave merge:** N/A
- **Phase gate:** Manual verification of all states and correction display

### Wave 0 Gaps
- [ ] No test framework exists in project
- [ ] No existing test files for any module
- [ ] Framework install would be project-wide, not phase-specific

*(Validation is manual-only for this project context)*

## Security Domain

> `security_enforcement` is absent from config.json — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | contentEditable input is user-generated; AI correction accepts any input; no injection risk as output is rendered via `dangerouslySetInnerHTML` only for passage content |
| V6 Cryptography | no | No secrets, PII, or encrypted data in this module |
| V8 Data Protection | no | All data stored client-side in IndexedDB/localStorage; no PII |

### Known Threat Patterns for React + AI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI prompt injection via essay content | Tampering | The AI correction prompt includes the essay; essay text could attempt prompt injection. Mitigation: system message is prepended and $temperature=0.3 limits variability |
| XSS via rendered AI correction JSON | Spoofing | AI returns JSON with `original`, `explanation` fields; HTML in AI response could inject scripts. Mitigation: render AI feedback text via textContent, not innerHTML |
| localStorage read/write errors | Denial of Service | Wrapped in try/catch (`catch {}` pattern), fallback to empty state |

## Sources

### Primary (HIGH confidence)
- [CITED: HKEAA 2024 Assessment Framework] — https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/2024hkdse-e-elang.pdf — Paper 2 format, Part A/B weighting, word limits
- [CITED: HKEAA Level Descriptors Writing] — https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/LevelDescriptors-ENG-Writing.pdf — Content/Organization/Language descriptors Levels 1-5
- [CITED: HKEAA Sample Paper 2 2024] — https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/ENG-SP-Paper2-2024.pdf — Exact exam paper format, instructions, Part B option count
- [VERIFIED: codebase] — `src/components/ReadingModule.jsx`, `src/hooks/useDSEPapers.js`, `src/hooks/useIndexedDB.js`, `src/utils/dseGrading.js`, `src/hooks/useSkillAnalytics.js`, `src/components/WritingModule.jsx`, `src/App.css`

### Secondary (MEDIUM confidence)
- [CITED: HKEAA FAQ — Paper 2] — https://www.hkeaa.edu.hk/en/hkdse/assessment/subject_information/category_a_subjects/eng_lang/faq/q4.html — Confirms marking is out of 21 per part, two markers, no direct percentage-to-grade conversion
- [CITED: GETUTOR DSE Guide] — https://www.getutor.com.hk/en/51367 — CLO rubric summary, Part A = 10%, Part B = 15%, Part A = 40 min suggested, Part B = 80 min
- [CITED: LearnSmart 2024 DSE Analysis] — https://learnsmart.edu.hk/blog/2024DSE-English-Paper2-PartA — Part A text type analysis, 2024 Paper 2 analysis

### Tertiary (LOW confidence)
- [ASSUMED] Part A text type frequency distribution — Based on five-year sample (2020-2024), may shift with future papers
- [ASSUMED] dseGrading.js writing boundaries (88% for 5**) — These are reasonable defaults but HKEAA cut scores vary yearly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries are existing project code
- Architecture: HIGH — Based on verified codebase patterns and HKEAA official format
- Pitfalls: HIGH — Derived from codebase analysis and known DSE practice tool issues

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (stable — React 18 + Vite 5, HKEAA format stable for 2026 exam)
