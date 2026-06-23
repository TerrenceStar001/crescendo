# NodeMind → HKDSE English 5** Platform

## Transformation Plan

**Current state**: Note-taking PWA with AI features, knowledge graph, tag generation, knowledge health tracking

**Target state**: Comprehensive HKDSE English learning platform targeting 5** results, with 4 skill modules (Reading, Writing, Listening, Speaking), personalized analytics, RAG-based content generation, and speech assessment — while preserving existing notes, graph, tags, and AI infrastructure.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Models](#2-data-models)
3. [Phase 1 — Core Transformation](#3-phase-1--core-transformation)
4. [Phase 2 — Reading & Writing](#4-phase-2--reading--writing)
5. [Phase 3 — Listening](#5-phase-3--listening)
6. [Phase 4 — Speaking](#6-phase-4--speaking)
7. [Backend Service](#7-backend-service)
8. [File Structure (Full)](#8-file-structure-full)
9. [Component Specifications](#9-component-specifications)
10. [Hook Specifications](#10-hook-specifications)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Analytics Engine Details](#12-analytics-engine-details)
13. [RAG Pipeline Details](#13-rag-pipeline-details)
14. [DSE Grading System](#14-dse-grading-system)
15. [Web Speech API Integration](#15-web-speech-api-integration)
16. [Storage Strategy](#16-storage-strategy)
17. [PWA Considerations](#17-pwa-considerations)
18. [Deployment](#18-deployment)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PWA Frontend (React 18)                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    App Shell (App.jsx)                           │  │
│  │  ┌──────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │  │
│  │  │SidebarNav │ │   ContextPanel      │ │   Main Area          │ │  │
│  │  │  📝 Notes │ │  (switches based     │ │  (switches based     │ │  │
│  │  │  📖 Read  │ │   on navTab)         │ │   on viewMode)       │ │  │
│  │  │  ✍️ Write │ │                      │ │                      │ │  │
│  │  │  🎧 Listen│ │  NoteList / Tags /   │ │  Dashboard / Editor /│ │  │
│  │  │  🎤 Speak │ │  Tasks / Trash       │ │  ReadingModule /     │ │  │
│  │  │  🔗 Graph │ │                      │ │  WritingModule /     │ │  │
│  │  │  ⚙️ Set.  │ │                      │ │  ListeningModule /   │ │  │
│  │  └──────────┘ └──────────────────────┘ │  SpeakingModule /      │ │  │
│  │                                        │  Canvas / Graph        │ │  │
│  │                                        └──────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                        Hooks Layer                               │  │
│  │  ┌────────────┐  ┌───────────────┐  ┌────────────────────────┐  │  │
│  │  │ useNotes    │  │ useAI         │  │ useSkillAnalytics      │  │  │
│  │  │ useKnowledge│  │ useStudyMode  │  │ useDSEPapers           │  │  │
│  │  │ useGraphData│  │ useSynthesis  │  │ useSpeech              │  │  │
│  │  │ useLocalSt. │  │ useViewContext│  │ useAudioRecorder       │  │  │
│  │  └────────────┘  └───────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                         Storage Layer                            │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │  │
│  │  │ localStorage     │  │ IndexedDB         │  │ Cache API    │  │  │
│  │  │ (config, prefs)  │  │ (notes, content,  │  │ (SW, offline) │  │  │
│  │  │                  │  │  performance)     │  │              │  │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ REST API (fetch)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Express)                          │
│                                                                       │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────────┐  │
│  │ Crawlers       │  │ Content API   │  │ RAG Engine               │  │
│  │ ├ SCMP         │  │ ├ GET /content│  │ ├ chunk + embed text     │  │
│  │ ├ Youth Post   │  │ ├ GET /papers │  │ ├ vector search (cosine) │  │
│  │ ├ DSE Past     │  │ ├ GET /topics │  │ ├ retrieve context       │  │
│  │ └ Podcast RSS  │  │ └ POST /paper │  │ └ generate questions     │  │
│  └───────────────┘  └───────────────┘  └──────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                         Storage (SQLite)                          │ │
│  │  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │ │
│  │  │ articles     │  │ papers      │  │ embeddings              │ │ │
│  │  │ podcasts     │  │ questions   │  │ audio_metadata          │ │ │
│  │  └──────────────┘  └─────────────┘  └─────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                           │ AI API (NVIDIA NIM / OpenAI)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│              External AI API (configurable provider)                  │
│  - Title generation          - Tag generation                         │
│  - MCQ generation (Reading)  - Writing correction (rubric)           │
│  - Speaking analysis         - Content summarization                 │
│  - Question generation       - Embedding generation (RAG)            │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | React 18 PWA (existing) | Reuse all existing infrastructure, offline-capable |
| Backend | Node.js + Express | Simple, JavaScript reuse, easy free-tier deployment |
| Backend DB | SQLite via `better-sqlite3` | Zero-config, file-based, good enough for single-user |
| Content Storage (client) | IndexedDB via `idb-keyval` | Large unstructured data, async, works in SW |
| Config Storage (client) | localStorage (existing) | Small key-value, synchronous, already used |
| AI API | Existing NVIDIA NIM / OpenAI configurable | Already integrated, can switch providers |
| Speech (TTS) | Web Speech API (`speechSynthesis`) | Free, built-in, no API key needed |
| Speech (STT) | Web Speech API (`SpeechRecognition`) | Free, built-in, reasonable accuracy |
| Caching | Workbox (existing PWA config) | Already configured via vite-plugin-pwa |
| Crawling | Cheerio + node-fetch (backend) | Lightweight, no browser dependency |
| Embeddings | AI API (NVIDIA NIM embed model) | Leverage existing provider, no extra infra |

---

## 2. Data Models

### 2.1 User Skill Profile (IndexedDB — `nodemind-skill-profile`)

```js
{
  // Per-skill aggregate scores (computed from session history)
  reading: {
    overall: 72,              // 0-100
    dseLevel: '4',            // Mapped DSE level
    subScores: {
      vocabulary: 68,
      grammar: 75,
      comprehension: 70,
      readingSpeed: 65,       // wpm
      inference: 72,
      detail: 80
    },
    questionTypeAccuracy: {
      mainIdea: 0.75,
      inference: 0.68,
      vocabInContext: 0.82,
      detail: 0.79,
      tone: 0.60,
      purpose: 0.71
    },
    totalSessions: 24,
    totalQuestions: 192,
    correctAnswers: 138,
    lastSessionDate: '2026-06-16T10:30:00Z'
  },

  writing: {
    overall: 65,
    dseLevel: '4',
    subScores: {
      content: 62,            // Ideas, relevance, development
      organization: 68,       // Structure, coherence, cohesion
      language: 60,           // Grammar, sentence structure
      vocabulary: 70,         // Lexical range, appropriacy
      mechanics: 55           // Spelling, punctuation
    },
    totalSessions: 12,
    averageWordCount: 420,
    lastSessionDate: '2026-06-15T14:00:00Z',
    recentPrompts: ['Should schools ban smartphones?', ...]
  },

  listening: {
    overall: 70,
    dseLevel: '4',
    subScores: {
      comprehension: 72,
      noteTaking: 65,
      detailRecall: 68,
      inference: 70,
      accentAdaptation: 60,    // How well user understands different accents
      speedTolerance: 75       // How well user handles fast speech
    },
    totalSessions: 8,
    totalQuestions: 64,
    correctAnswers: 45,
    lastSessionDate: '2026-06-10T09:00:00Z'
  },

  speaking: {
    overall: 55,
    dseLevel: '3',
    subScores: {
      pronunciation: 60,
      fluency: 50,              // Smoothness, hesitations
      grammar: 55,
      vocabulary: 65,
      structure: 48,            // Organization of ideas
      intonation: 52
    },
    totalSessions: 5,
    lastSessionDate: '2026-06-12T16:00:00Z'
  },

  // Cross-skill parameters
  vocabularyMastery: {
    // Tracks vocabulary acquisition across all skills
    totalWordsLearned: 340,
    wordsByDifficulty: { basic: 150, intermediate: 120, advanced: 70 },
    recentlyMistaken: ['ubiquitous', 'paradigm', 'empirical'],
    recentlyMastered: ['mitigate', 'substantiate', 'ambiguous']
  },

  grammarMastery: {
    // Tracks grammar weakness patterns across all skills
    weakAreas: ['conditional sentences', 'relative clauses', 'passive voice'],
    strongAreas: ['tenses', 'prepositions', 'articles'],
    commonErrors: [
      { pattern: 'subject-verb agreement', count: 12, trend: 'improving' },
      { pattern: 'article usage', count: 8, trend: 'stable' }
    ]
  }
}
```

### 2.2 Session Record (IndexedDB — `nodemind-skill-sessions`)

```js
{
  id: 'ses_abc123',
  skill: 'reading',           // 'reading' | 'writing' | 'listening' | 'speaking'
  type: 'practice',            // 'practice' | 'exam' | 'review'
  startedAt: '2026-06-16T10:00:00Z',
  completedAt: '2026-06-16T10:30:00Z',
  duration: 1800,              // seconds

  // Reading-specific
  paperId: 'dse-2024-reading-paper1',
  passageTitle: 'The Future of AI in Healthcare',
  passageSource: 'scmp',
  wordCount: 850,
  difficulty: 'medium',
  questions: [
    {
      id: 'q1',
      type: 'mcq',              // 'mcq' | 'fill-blank' | 'matching' | 'true-false'
      stem: 'What is the main argument of paragraph 3?',
      options: ['A...', 'B...', 'C...', 'D...'],
      correctAnswer: 'B',
      userAnswer: 'B',
      isCorrect: true,
      questionType: 'mainIdea',  // Categorization for analytics
      timeSpent: 45              // seconds
    }
  ],
  score: 14,                    // raw correct count
  totalQuestions: 20,
  percentage: 70,
  dseLevel: '4',
  subScores: { ... },           // Sub-parameter scores calculated from this session
  feedback: 'Your inference skills need improvement...'  // AI-generated summary
}
```

### 2.3 DSE Paper (IndexedDB + Backend — `nodemind-dse-papers`)

```js
{
  id: 'dse-2024-reading-paper1',
  type: 'reading',              // 'reading' | 'writing' | 'listening' | 'speaking'
  source: 'dse-2024',
  year: 2024,
  paper: 1,
  section: 'B1',               // For reading: B1 or B2
  difficulty: 'medium',

  // Reading-specific
  passages: [
    {
      id: 'p1',
      title: 'Virtual Reality in Education',
      content: '<p>HTML content of the passage...</p>',
      wordCount: 850,
      source: 'Adapted from SCMP, 2023'
    }
  ],
  questions: [
    {
      id: 'q1',
      passageId: 'p1',
      type: 'mcq',
      questionType: 'mainIdea',   // mainIdea | inference | vocabInContext | detail | tone | purpose
      stem: 'What is the main idea of paragraph 2?',
      options: [
        { label: 'A', text: 'VR technology is too expensive for schools' },
        { label: 'B', text: 'VR creates immersive learning experiences' },
        { label: 'C', text: 'Teachers prefer traditional methods' },
        { label: 'D', text: 'Students dislike VR headsets' }
      ],
      correctAnswer: 'B',
      explanation: 'Paragraph 2 discusses how VR ...',
      difficulty: 'easy'          // easy | medium | hard
    }
  ],

  // Writing-specific
  prompt: 'You are a student representative. Write a letter to the principal arguing for or against the use of AI in classrooms.',
  wordLimit: { min: 400, max: 500 },
  rubricCategories: ['content', 'organization', 'language'],

  // Listening-specific
  audioUrl: 'https://cdn.example.com/dse-2024-listening.mp3',
  audioDuration: 3600,            // seconds
  transcript: 'Full transcript text...',
  speed: 'normal',

  // Speaking-specific
  topic: 'Technology',
  preparationTime: 60,            // seconds
  speakingTime: 60,
  modelAnswer: 'Model answer transcript...'
}
```

### 2.4 DSE Grade Boundaries (Config — localStorage `nodemind-grade-boundaries`)

```js
{
  reading: {
    paper1: {                     // Paper 1 accounts for 30% of total
      weight: 0.3,
      // Score out of 40 → DSE level
      boundaries: [
        { level: '5**', minScore: 37 },
        { level: '5*',  minScore: 34 },
        { level: '5',   minScore: 30 },
        { level: '4',   minScore: 25 },
        { level: '3',   minScore: 19 },
        { level: '2',   minScore: 13 },
        { level: '1',   minScore: 0 }
      ]
    },
    paper2: {
      weight: 0.3,
      boundaries: [ ... ]
    }
  },
  writing: {
    paper1: {
      weight: 0.25,
      categories: [
        { name: 'content', maxScore: 7, weight: 0.35 },
        { name: 'organization', maxScore: 7, weight: 0.30 },
        { name: 'language', maxScore: 7, weight: 0.35 }
      ],
      boundaries: [
        { level: '5**', minPercentage: 90 },
        { level: '5*',  minPercentage: 82 },
        { level: '5',   minPercentage: 73 },
        { level: '4',   minPercentage: 62 },
        { level: '3',   minPercentage: 50 },
        { level: '2',   minPercentage: 38 },
        { level: '1',   minPercentage: 0 }
      ]
    }
  },
  listening: {
    weight: 0.2,
    boundaries: [ ... ]
  },
  speaking: {
    weight: 0.15,
    boundaries: [ ... ]
  }
}
```

---

## 3. Phase 1 — Core Transformation

### Goal
Restructure the PWA from a general note-taking app to a focused HKDSE English learning platform, preserving existing features while adding the DSE framework.

### Steps

#### 3.1 New Sidebar Navigation (`SidebarNav.jsx`)

Replace the current 7-item nav with DSE-focused navigation:

| Icon | Label | Tab Key | Action |
|------|-------|---------|--------|
| 📝 | Notes | `notes` | Show note list (existing) |
| 📖 | Reading | `reading` | Show Reading Module |
| ✍️ | Writing | `writing` | Show Writing Module |
| 🎧 | Listening | `listening` | Show Listening Module |
| 🎤 | Speaking | `speaking` | Show Speaking Module |
| 🔗 | Graph | `graph` | Show Constellation/Canvas (existing) |
| 📊 | Progress | `progress` | Show Analytics Dashboard |
| ⚙️ | Settings | `settings` | Show Settings (existing) |

Navigation state managed in `ViewContext`: add `dseTab` for the DSE module switcher, keep existing `navTab` for notes panel.

```js
// ViewContext additions
const [dseTab, setDseTab] = useState(() => localStorage.getItem('nodemind-dse-tab') || 'reading');
```

#### 3.2 HKDSE Dashboard (`Dashboard.jsx` — Rewritten)

Replace the current knowledge-health dashboard with a HKDSE performance dashboard.

**Layout** (top to bottom):

```
┌─────────────────────────────────────────────────┐
│  Good morning, Terrence!  🔥 7-day streak        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ 📖   │ │ ✍️   │ │ 🎧   │ │ 🎤   │          │
│  │ 72%  │ │ 65%  │ │ 70%  │ │ 55%  │          │
│  │ 4    │ │ 4    │ │ 4    │ │ 3    │          │
│  │ Read │ │Write │ │Listen│ │Speak │          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                 │
│  📈 Overall Target: 5**  |  Predicted: 4        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│                                                 │
│  🎯 Weakest Area: Speaking — Pronunciation      │
│  💡 Recommendation: Practice 10 mins daily      │
│                                                 │
│  ┌──────────────────────────────────────┐      │
│  │ Grade History (Last 8 sessions)       │      │
│  │ 📊 [bar chart with DSE levels]       │      │
│  └──────────────────────────────────────┘      │
│                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Sub-skills  │ │ Vocab      │ │ Grammar     │ │
│  │ breakdown   │ │ mastery    │ │ weak areas  │ │
│  │ per skill   │ │ chart      │ │ list        │ │
│  └────────────┘ └────────────┘ └────────────┘ │
│                                                 │
│  Recent Sessions  |  Quick Actions               │
│  ┌──────────────┐ ┌──────────────────────────┐ │
│  │ ✅ Reading   │ │ 🆕 New Reading Practice  │ │
│  │ ✅ Writing   │ │ 🆕 New Writing Prompt    │ │
│  │ ❌ Listening │ │ 🆕 Speaking Drill        │ │
│  └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Component breakdown** (`SkillRing.jsx`):

```jsx
// props: skill, percentage, dseLevel, color, onClick
<SkillRing
  skill="reading"
  percentage={72}
  dseLevel="4"
  color="#4CAF50"
  onClick={() => switchToModule('reading')}
/>
```

The ring is an SVG circle with animated stroke-dashoffset, DSE level displayed in center, percentage below.

**Section visibility**: Persisted like current dashboard sections in `nodemind-dse-dashboard-sections`.

#### 3.3 Skill Analytics Engine (`useSkillAnalytics.js`)

Central analytics hook that:
- Computes skill profiles from session history
- Tracks sub-parameters per skill
- Maps scores to DSE levels
- Identifies weak areas and generates recommendations
- Persists to IndexedDB

```js
// Hook API
const {
  // Computed profiles
  reading, writing, listening, speaking,  // Skill profiles
  overallDseLevel,                        // Predicted overall DSE level
  weakestSkill,                           // 'reading' | 'writing' | ...
  weakestSubSkill,                        // { skill: 'speaking', sub: 'pronunciation', score: 52 }
  recommendations,                        // [{ skill, action, reason }]

  // Actions
  recordSession,                          // (sessionData) → updates all profiles
  getSessionHistory,                      // (skill?, limit?) → sessions[]
  getGradeHistory,                        // (skill?) → [{ date, dseLevel, percentage }]
  getQuestionTypeAccuracy,               // (skill) → { type: accuracy }
  getWeakAreas,                          // () → [{ area, count, trend }]

  // DSE predictions
  predictedGrade,                        // Overall predicted DSE level
  gradeConfidence,                        // How confident (0-1)
  requiredImprovement,                    // What's needed to reach 5**
} = useSkillAnalytics();
```

**Data flow**:
1. User completes a practice session in any skill
2. Module calls `recordSession(sessionData)` with full results
3. Engine computes sub-scores from question-level breakdown
4. Updates aggregate skill profile
5. Recalculates DSE level mappings
6. Updates recommendations

**Sub-score calculation rules**:

```
Reading:
  vocabulary    = accuracy on vocabInContext questions × 100
  grammar       = accuracy on grammar-related questions
  comprehension = weighted avg of mainIdea + detail + purpose accuracy
  inference     = accuracy on inference questions
  readingSpeed  = min(wpm / 200 * 100, 100)   // 200 wpm = 100%
  detail        = accuracy on detail questions

Writing:
  content       = AI rubric score / 7 × 100
  organization  = AI rubric score / 7 × 100
  language      = AI rubric score / 7 × 100
  vocabulary    = lexical diversity (unique words / total words × 100)
  mechanics     = (1 - errors / totalWords) × 100

Listening:
  comprehension     = accuracy on main idea questions
  noteTaking        = accuracy on fill-in-blank questions
  detailRecall      = accuracy on specific detail questions
  inference         = accuracy on inference questions
  accentAdaptation  = tracked per audio source accent
  speedTolerance    = accuracy degradation as speed increases

Speaking:
  pronunciation = AI score from transcript analysis (word-level errors)
  fluency       = (1 - hesitations / totalPhrases) × 100
  grammar       = AI grammar error count / total sentences
  vocabulary    = lexical diversity
  structure     = AI score for speech organization
  intonation    = pitch variance measurement
```

#### 3.4 DSE Grading Engine (`dseGrading.js`)

```js
// Utils exports
export function scoreToDseLevel(percentage, boundaries) {
  // boundaries: [{ level, minPercentage }]
  // Returns: { level: '5**', minPercentage: 90, achieved: true }
  for (const boundary of boundaries) {
    if (percentage >= boundary.minPercentage) {
      return { ...boundary, achieved: true };
    }
  }
  return { level: '1', minPercentage: 0, achieved: true };
}

export function computeOverallDseLevel(skillLevels, weights) {
  // skillLevels: { reading: '4', writing: '5', listening: '3', speaking: '4' }
  // weights: { reading: 0.30, writing: 0.25, listening: 0.20, speaking: 0.15 }
  // Returns: { level: '4', score: 72.5, breakdown: {...} }
  const levelScores = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '5*': 6, '5**': 7 };
  // ... weighted average
}

export function formatDseLevel(level) {
  // '5**' → '5**'
  // '5*' → '5*'
  // '4' → '4'
  return level;
}
```

#### 3.5 App Restructure (`App.jsx`)

Changes:
- Add skill-related state variables (current DSE module, skill session state)
- Add DSE module rendering in main area
- Add progress/analytics view
- Keep existing note/canvas/graph views intact
- New view modes: `'reading'`, `'writing'`, `'listening'`, `'speaking'`, `'progress'`
- New nav tab handler in `SidebarNav`

```js
// New state in App.jsx
const [dseModule, setDseModule] = useState('dashboard'); // 'dashboard' | 'reading' | 'writing' | 'listening' | 'speaking' | 'practice' | 'exam'

// DSE module routing
const renderMainArea = () => {
  switch (viewMode) {
    case 'list':
      if (!activeId && dseModule === 'dashboard') return <Dashboard ... />;
      if (dseModule === 'reading') return <ReadingModule ... />;
      if (dseModule === 'writing') return <WritingModule ... />;
      if (dseModule === 'listening') return <ListeningModule ... />;
      if (dseModule === 'speaking') return <SpeakingModule ... />;
      return <NoteEditor ... />;
    case 'canvas':
      return <CanvasView ... />;
    case 'constellation':
      return <ConstellationGraph ... />;
  }
};
```

#### 3.6 IndexedDB Setup

Add `idb-keyval` (lightweight IndexedDB wrapper) for storing:
- `nodemind-skill-profile` — full skill analytics
- `nodemind-skill-sessions` — all practice session records
- `nodemind-dse-papers` — downloaded DSE papers and content

```js
// hooks/useIndexedDB.js
import { get, set, keys, del, clear } from 'https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm';

// OR bundle via npm: npm install idb-keyval

export function useIndexedDB() {
  const getItem = async (key) => {
    try { return await get(key); } catch { return null; }
  };

  const setItem = async (key, value) => {
    try { await set(key, value); } catch (e) { console.error('IndexedDB write error:', e); }
  };

  return { getItem, setItem, keys, del, clear };
}
```

---

## 4. Phase 2 — Reading & Writing

### 4.1 Reading Module (`ReadingModule.jsx`)

**States**: `idle` | `passage-view` | `answering` | `review` | `completed`

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Reading  📖  [Select Paper ▼]  [Random Practice]  [Exam]   │
├──────────────────────────┬──────────────────────────────────┤
│  Passage Panel           │  Question Panel                   │
│  ┌────────────────────┐  │  ┌────────────────────────────┐  │
│  │ Title + Source     │  │  │ Question 3/10              │  │
│  │                    │  │  │ ──────────────────────     │  │
│  │ Passage content    │  │  │ What is the main idea of   │  │
│  │ (scrollable)       │  │  │ paragraph 2?               │  │
│  │                    │  │  │                            │  │
│  │ Word count: 850    │  │  │ ○ A. VR is too expensive   │  │
│  │                   │  │  │ ● B. VR creates immersive   │  │
│  │ Highlighted text   │  │  │ ○ C. Teachers prefer ...   │  │
│  │ on selection       │  │  │ ○ D. Students dislike ...  │  │
│  └────────────────────┘  │  │                            │  │
│                          │  │ [Previous] [Next] [Submit] │  │
│                          │  └────────────────────────────┘  │
│                          │  ┌────────────────────────────┐  │
│                          │  │ Progress: ▓▓▓▓░░░░ 3/10   │  │
│                          │  │ Timer: 12:34               │  │
│                          │  └────────────────────────────┘  │
├──────────────────────────┴──────────────────────────────────┤
│  Results panel (after submit): score, DSE level, breakdown   │
└─────────────────────────────────────────────────────────────┘
```

**Component breakdown**:

```jsx
// ReadingModule.jsx structure
function ReadingModule({ notes, updateNote, ...props }) {
  const [state, setState] = useState('idle');  // idle | passage-view | answering | results
  const [paper, setPaper] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(null);
  const [results, setResults] = useState(null);

  // Passages and questions from DSE papers or AI-generated
  const { getPaper, generateReadingSession } = useDSEPapers();
  const { recordSession } = useSkillAnalytics();

  // Start practice: pick paper or AI-generated
  const startPractice = async (difficulty) => {
    const paper = await getPaper('reading', difficulty);
    setPaper(paper);
    setState('passage-view');
  };

  const submitAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const finishSession = () => {
    const sessionData = computeSessionData(paper, answers, timer);
    recordSession(sessionData);
    setResults(sessionData);
    setState('results');
  };

  // Render passage, questions, results...
}
```

**MCQ Generation Prompts** (for AI-generated practice):

```
System: You are an expert HKDSE English examiner. Generate reading comprehension
questions based on the given passage. Follow DSE Paper 1 format strictly.

For each question:
- Type: multiple choice with 4 options (A-D)
- Question categories: main idea, inference, vocabulary in context, detail, tone, purpose
- Difficulty level provided
- Each question must have a clear correct answer and detailed explanation
- Distractors must be plausible but incorrect

Return as JSON array:
[{ "id": 1, "type": "mainIdea", "stem": "...", "options": [{"label":"A","text":"..."}],
   "correctAnswer": "B", "explanation": "...", "difficulty": "easy" }]
```

**Passage Retrieval**: RAG pipeline fetches relevant content from:
1. Local IndexedDB cache (previously downloaded papers)
2. Backend API (for full DSE paper sets and SCMP articles)
3. AI-generated passages (when no cached content matches)

**Question Type Distribution** (DSE-aligned):
- Main Idea: 20%
- Inference: 20%
- Vocabulary in Context: 15%
- Detail: 25%
- Tone/Purpose: 10%
- Writer's Viewpoint: 10%

### 4.2 Writing Module (`WritingModule.jsx`)

**States**: `idle` | `planning` | `writing` | `submitted` | `feedback`

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Writing  ✍️  [Select Prompt ▼]  [Random Topic]  [Exam Mode]│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Task Prompt                                           │   │
│  │ ──────────────────────────────────────                │   │
│  │ "You are a student representative. Write a letter to  │   │
│  │  the principal arguing for or against the use of AI   │   │
│  │  in classrooms. Provide specific reasons and examples."│   │
│  │                                                       │   │
│  │ Word limit: 400-500 words    ⏱ 45:00                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Essay Editor (contentEditable, same as Canvas.jsx)   │   │
│  │                                                       │   │
│  │ [User types here...]                                  │   │
│  │                                                       │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Words: 245/400-500   |   📊 Check Grammar           │   │
│  │ [Submit for Correction]  [Save Draft]               │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Feedback Panel (after submission)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Content  │ │ Organiz. │ │ Language │ │ DSE Level     │  │
│  │  5/7   │ │  5/7    │ │  4/7    │ │    4          │  │
│  │ ██████░  │ │ ██████░  │ │ █████░░  │ │ Overall: 14/21 │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                                                             │
│  Detailed Comments:                                         │
│  ------------------------------------------                │
│  Content: Good arguments but could use more specific        │
│  examples from current AI developments.                     │
│                                                             │
│  Language: Some subject-verb agreement errors in para 3.    │
│  "The use of AI in schools have..." → "has"                 │
│                                                             │
│  Vocabulary: Try using: "pedagogical", "implement",         │
│  "controversial" instead of basic alternatives.             │
│                                                             │
│  Improvements:                                              │
│  1. Add a counter-argument paragraph                        │
│  2. Use more cohesive devices (however, moreover, etc.)    │
│  3. Vary sentence structure                                 │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │ View Sample Answer │  │ Try Again          │            │
│  └────────────────────┘  └────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**Writing Correction Prompts**:

```
System: You are an expert HKDSE English writing examiner. Evaluate the
student's essay using the official DSE marking criteria.

Assess these categories on a scale of 1-7:
1. Content (relevance, development of ideas, use of examples)
2. Organization (coherence, cohesion, paragraph structure)
3. Language (grammar, sentence structure, vocabulary range)

For each category:
- Score with justification
- Specific error examples from the text
- Suggestions for improvement

Additionally:
- Highlight 3-5 specific grammar/vocabulary errors with corrections
- Suggest 3-5 advanced vocabulary replacements
- Identify the overall DSE level (1-5**)
- Provide a sample improved paragraph

Return as JSON: { "content": { "score": 5, "feedback": "...", "subScores": {...} },
  "organization": {...}, "language": {...}, "overall": { "total": 14, "dseLevel": "4" },
  "errors": [{"original": "...", "correction": "...", "type": "grammar", "explanation": "..."}],
  "vocabularySuggestions": [{"original": "good", "suggestion": "beneficial", "context": "..."}],
  "improvedParagraph": "...",
  "sampleAnswer": "..." }
```

### 4.3 DSE Paper Retrieval Hook (`useDSEPapers.js`)

```js
const {
  // State
  papers,                         // Cached papers from IndexedDB
  isLoading,                      // Loading state
  error,                          // Error message

  // Actions
  getPaper,                       // (type, difficulty?) → paper object (cached or generated)
  getRandomPaper,                  // (type) → random paper
  getPapersBySource,              // (source) → papers[]
  generateReadingSession,         // (difficulty) → { passage, questions } (AI-generated)

  // Crawler control (backend)
  fetchLatestContent,             // () → triggers backend crawl
  getAvailableSources,            // () → ['scmp', 'youth-post', 'dse-2024', ...]
  syncFromBackend,                // () → syncs latest papers from backend

  // Cache management
  clearCache,                     // () → clears IndexedDB cache
  getCacheSize,                   // () → number of cached items
} = useDSEPapers();
```

---

## 5. Phase 3 — Listening

### 5.1 Listening Module (`ListeningModule.jsx`)

**States**: `idle` | `listening` | `answering` | `results`

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Listening  🎧  [Track List ▼]  [Random]  [DSE Exam Mode]  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Current: BBC 6 Minute English - "The Future of Work" │   │
│  │                                                        │   │
│  │  ┌────────────────────────────────────────┐           │   │
│  │  │  ▶ [==========●==========] 01:23 / 06:00│           │   │
│  │  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │           │   │
│  │  │  │◀◀│ │▶▶│ │⏸│ │⏹│ │0.75│ │1.0│ │1.5│ │           │   │
│  │  │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │           │   │
│  │  └────────────────────────────────────────┘           │   │
│  │                                                        │   │
│  │  Transcript (synced highlight):                        │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │ Hello and welcome to 6 Minute English...       │   │   │
│  │  │ Today we're discussing *the future of work*    │   │   │
│  │  │ in a world where artificial intelligence...     │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Questions (hidden during first listen, unlock after)   │   │
│  │                                                        │   │
│  │ 1. What percentage of jobs will be affected by AI?    │   │
│  │    ○ A. 10%  ○ B. 30%  ○ C. 50%  ○ D. 70%           │   │
│  │                                                        │   │
│  │ 2. Fill in the blank: "Workers need to develop        │   │
│  │    ______ skills to stay relevant."                    │   │
│  │    [__________________]                                │   │
│  │                                                        │   │
│  │ [Submit Answers]  [Listen Again]  [Show Transcript]   │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Results: Score, DSE level, comprehension breakdown,         │
│  recommended next difficulty level                           │
└─────────────────────────────────────────────────────────────┘
```

**Audio Sources**:
1. **DSE Listening Past Papers** — if available, exact exam format
2. **BBC 6 Minute English** — RSS feed, curated for difficulty
3. **TED Talks Daily** — 5-15 min talks with transcripts
4. **SCMP Podcasts** — local Hong Kong context, DSE-relevant
5. **AI-generated audio** — TTS reading of articles from Reading corpus

**Crawling Strategy** (backend):

```js
// server/crawlers/podcast.js
// For each RSS feed:
// 1. Fetch feed XML
// 2. Parse episodes (title, description, audio URL, duration, transcript URL)
// 3. Download or stream audio → store URL reference
// 4. Fetch transcript if available
// 5. Categorize by difficulty (word count, vocabulary complexity, speech rate)
// 6. Store in database
```

### 5.2 Adaptive Difficulty System

```js
// In useSkillAnalytics.js — listening section

// After each listening session:
const getRecommendedDifficulty = (listeningProfile) => {
  const { accuracy, speedTolerance, totalSessions } = listeningProfile;

  if (totalSessions < 3) return 'easy';      // Warm-up phase
  if (accuracy > 85 && speedTolerance > 70) return 'hard';   // Ready for challenge
  if (accuracy > 70) return 'medium';          // Comfortable
  if (accuracy > 50) return 'easy';            // Still building
  return 'easy';                                // Need fundamentals
};

const getRecommendedSpeed = (listeningProfile) => {
  const { accuracy } = listeningProfile;
  if (accuracy > 80) return 1.25;     // Slightly faster
  if (accuracy > 60) return 1.0;      // Normal
  return 0.75;                         // Slower
};
```

### 5.3 DSE Listening Simulation

**DSE Paper 3 Format**:
- Part A: Short tasks (note-taking, form-filling, table completion)
- Part B: Longer tasks (MCQ, matching, short answer)
- Questions played twice with pauses
- Timing matches actual DSE exam

---

## 6. Phase 4 — Speaking

### 6.1 Speaking Module (`SpeakingModule.jsx`)

**States**: `idle` | `preparing` | `recording` | `analyzing` | `feedback`

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Speaking  🎤  [Topic List ▼]  [Random Topic]  [DSE Mode]  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Your Topic:                                           │   │
│  │                                                        │   │
│  │   "TECHNOLOGY"                                         │   │
│  │                                                        │   │
│  │   "Discuss the impact of technology on modern          │   │
│  │    education. You have 1 minute to prepare and         │   │
│  │    1 minute to speak."                                 │   │
│  │                                                        │   │
│  │  ⏱ Preparation: 00:45                                  │   │
│  │  ████████████░░░░░░░░░░░░░░░░░░                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                       OR                               │   │
│  │  [▶ Listen to Sample]  (TTS reads model answer)       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Recording Panel                                       │   │
│  │                                                        │   │
│  │  ⏺ [Start Recording]  ⏹ [Stop]  ▶ [Playback]        │   │
│  │                                                        │   │
│  │  ⏱ Speaking: 00:32 / 01:00                             │   │
│  │  ████████████████░░░░░░░░░░░░░░                        │   │
│  │                                                        │   │
│  │  Waveform visualization:                               │   │
│  │  ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿                              │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Feedback Panel                                             │
│  ┌────────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│  │ Pronunc.   │ │Fluency │ │Grammar │ │Vocab   │ │Struct│ │
│  │ 60%        │ │ 50%    │ │ 55%    │ │ 65%    │ │ 48%  │ │
│  │ ██████░░░░ │ │█████░░░│ │█████░░░│ │██████░░│ │████░░│ │
│  └────────────┘ └────────┘ └────────┘ └────────┘ └──────┘ │
│                                                             │
│  Your Transcript:                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Technology is very important in education because    │   │
│  │ [uhm] it helps students [uhm] learn better. For      │   │
│  │ example, using iPads in classroom can make...        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Feedback:                                                  │
│  • Fluency: Too many filler words ("uhm", "like").         │
│    Try pausing silently instead.                            │
│  • Grammar: "classroom" → "classrooms" (plural needed)     │
│  • Vocabulary: Add topic-specific words like "pedagogical", │
│    "digital literacy", "interactive learning"               │
│  • Structure: Use a clear intro → body → conclusion         │
│                                                             │
│  DSE Level: 3    |    [Practice Again]  [New Topic]        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Web Speech API Integration

**Speech Synthesis (TTS)** — `hooks/useSpeech.js`:

```js
export function useSpeech() {
  const speak = (text, options = {}) => {
    // options: { rate, pitch, voice, onEnd }
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.voice = options.voice || getDefaultVoice();
      utterance.onend = resolve;
      speechSynthesis.speak(utterance);
    });
  };

  const getVoices = () => {
    return speechSynthesis.getVoices().filter(v =>
      v.lang.startsWith('en')  // English voices only
    );
  };

  const getDefaultVoice = () => {
    // Prefer UK female voice for DSE standard
    const voices = getVoices();
    return voices.find(v => v.lang === 'en-GB' && v.name.includes('Female'))
      || voices.find(v => v.lang === 'en-GB')
      || voices[0];
  };

  const stop = () => speechSynthesis.cancel();
  const pause = () => speechSynthesis.pause();
  const resume = () => speechSynthesis.resume();

  return { speak, stop, pause, resume, getVoices, getDefaultVoice, isSpeaking };
}
```

**Speech Recognition (STT)** — `hooks/useAudioRecorder.js`:

```js
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startRecording = () => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';  // or 'en-GB' for DSE

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(prev => prev + final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Also capture audio for waveform visualization
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Analyze audio levels for waveform
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        // ... animation loop for waveform
      });

    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    audioLevel,       // 0-1 for waveform visualization
  };
}
```

### 6.3 Speaking Analysis Pipeline

1. **Capture**: User speaks for 60 seconds → `transcript` + `audioLevel` data
2. **Analyze transcript**:
   - Count filler words (uhm, uh, like, you know, well) → fluency
   - Count unique words / total words → lexical diversity → vocabulary
   - Sentence count, average length → grammar complexity
   - Spell-check against expected → pronunciation errors
3. **Analyze audio**:
   - Speech rate (words per minute) → fluency
   - Volume variance → intonation / expression
   - Pause duration → fluency
4. **Send to AI** for detailed assessment:

```
System: You are an expert HKDSE English speaking examiner. Analyze the
student's speech transcript for the topic: "{topic}".

Assess on a scale of 0-100:
1. Pronunciation (based on likely spoken errors visible in transcript)
2. Fluency (filler words, hesitations, speech rate)
3. Grammar (sentence structure, tense, agreement)
4. Vocabulary (range, appropriateness, topic-specific terms)
5. Structure (coherence, logical flow, opening/closing)

Provide:
- Score for each category
- Specific error examples
- 3 actionable improvement suggestions
- Model answer (what a 5** student would say)

Return as JSON: { "pronunciation": { "score": 60, "errors": [...], "feedback": "..." },
  "fluency": {...}, "grammar": {...}, "vocabulary": {...}, "structure": {...},
  "overall": { "score": 55, "dseLevel": "3" },
  "improvements": [...], "modelAnswer": "..." }
```

### 6.4 Topic Generator

Curated list of 150+ DSE-style speaking topics organized by:

```
// utils/dseSpeakingTopics.js

const topics = {
  education: ['Examinations', 'Online Learning', 'Study Abroad', 'School Uniform', ...],
  technology: ['AI', 'Social Media', 'Smartphones', 'Gaming', ...],
  environment: ['Climate Change', 'Pollution', 'Recycling', 'Conservation', ...],
  society: ['Hong Kong', 'Tradition', 'Multiculturalism', 'Volunteering', ...],
  health: ['Exercise', 'Mental Health', 'Diet', 'Healthcare', ...],
  economy: ['Money', 'Career', 'Entrepreneurship', 'Consumerism', ...],
  culture: ['Art', 'Music', 'Movies', 'Reading', 'Travel', ...],
  personal: ['Friendship', 'Family', 'Ambition', 'Role Models', ...]
};

// Generate full prompt
const generateSpeakingPrompt = (topic) => {
  return `"${topic}"

Discuss the impact and importance of ${topic.toLowerCase()} in modern society.
You have 1 minute to prepare and 1 minute to speak.

Consider:
- What is ${topic.toLowerCase()} and why does it matter?
- How does it affect people's daily lives?
- What are the benefits and challenges?
- What is your personal opinion or experience?

Structure your answer with a clear introduction, main points, and conclusion.`;
};
```

### 6.5 Waveform Visualization

Simple canvas-based waveform renderer that shows:
- User's speech waveform (real-time during recording)
- Silence/hesitation gaps highlighted in red
- Volume peaks for emphasis/intonation

```jsx
// components/WaveformDisplay.jsx
function WaveformDisplay({ audioLevel, isRecording, transcript, className }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    if (!isRecording) return;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      historyRef.current.push(audioLevel);
      if (historyRef.current.length > 200) historyRef.current.shift();

      // Draw waveform
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      historyRef.current.forEach((level, i) => {
        const x = (i / historyRef.current.length) * canvas.width;
        const height = level * canvas.height * 0.8;
        const y = (canvas.height - height) / 2;
        // Color: green for normal, red for silence (< 0.05)
        ctx.fillStyle = level < 0.05 ? '#ff4444' : '#4CAF50';
        ctx.fillRect(x, y, 2, height);
      });
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRecording, audioLevel]);

  return <canvas ref={canvasRef} width={600} height={100} className={className} />;
}
```

---

## 7. Backend Service

### 7.1 Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Node.js 18+ | Same JS stack, easy to maintain |
| Framework | Express.js | Minimal, well-known, good perf |
| Database | SQLite via `better-sqlite3` | Zero-config, file-based, single-user app, ~50MB max for content |
| Crawling | Cheerio + `node-fetch` | Lightweight, no Puppeteer overhead |
| RSS Parser | `rss-parser` | Standard podcast feed format |
| Auth | None (personal PWA) | Single-user, or simple API key |
| Deployment | Railway / Render / Fly.io | Free tier, HTTPS, always-on |

### 7.2 Server Structure

```
server/
├── index.js                  # Express app entry
├── package.json              # Dependencies
├── .env                      # API keys, config
│
├── db/
│   ├── schema.js             # SQLite schema creation
│   └── connection.js         # DB connection singleton
│
├── crawlers/
│   ├── index.js              # Crawler orchestrator
│   ├── scmp.js               # SCMP article scraper
│   ├── youthPost.js          # Young Post scraper
│   ├── dsePapers.js          # DSE past paper collector
│   └── podcast.js            # Podcast RSS feed fetcher
│
├── rag/
│   ├── engine.js             # Chunk + embed + search pipeline
│   ├── chunker.js            # Text splitting strategies
│   └── vectorStore.js        # In-memory cosine similarity search
│
├── routes/
│   ├── content.js            # GET /api/content, /api/papers
│   ├── analyze.js            # POST /api/analyze/writing, /speaking
│   └── crawl.js              # POST /api/crawl/trigger
│
└── data/                     # SQLite DB, cached content
    └── nodemind.db
```

### 7.3 API Endpoints

```
GET  /api/papers?type=reading&difficulty=medium&limit=10
  → Returns list of available DSE papers/passages

GET  /api/papers/:id
  → Returns full paper with passages and questions

GET  /api/content/scmp?topic=education&limit=5
  → Returns SCMP articles (title, content, date, word count)

GET  /api/content/podcasts?difficulty=easy&limit=5
  → Returns podcast episodes (title, audioUrl, duration, transcript, difficulty)

POST /api/crawl/trigger
  → Triggers on-demand content crawl (SCMP + podcasts)

POST /api/analyze/writing
  Body: { essay, prompt }
  → Returns AI writing correction with rubric scores

POST /api/analyze/speaking
  Body: { transcript, topic }
  → Returns AI speaking assessment with feedback

POST /api/rag/generate-reading
  Body: { difficulty, topic?, count? }
  → Returns: { passage, questions } generated via RAG + AI

POST /api/rag/search
  Body: { query, type, limit }
  → Returns: relevant content chunks from vector store
```

### 7.4 Database Schema

```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,        -- 'scmp' | 'youth-post' | 'dse'
  title TEXT NOT NULL,
  content TEXT NOT NULL,       -- HTML or plain text
  url TEXT,
  date TEXT,                   -- ISO date
  word_count INTEGER,
  difficulty TEXT,             -- 'easy' | 'medium' | 'hard'
  topics TEXT,                 -- JSON array of topic tags
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE papers (
  id TEXT PRIMARY KEY,         -- 'dse-2024-reading-p1'
  type TEXT NOT NULL,          -- 'reading' | 'writing' | 'listening' | 'speaking'
  year INTEGER,
  paper INTEGER,               -- 1 | 2 | 3
  section TEXT,                -- 'A' | 'B1' | 'B2'
  difficulty TEXT,
  metadata TEXT,               -- JSON blob for type-specific data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE podcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration INTEGER,            -- seconds
  transcript TEXT,
  source TEXT,                 -- 'bbc' | 'ted' | 'scmp'
  difficulty TEXT,
  topics TEXT,
  published_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,    -- 'article' | 'paper' | 'podcast'
  source_id TEXT NOT NULL,
  chunk_index INTEGER,
  chunk_text TEXT NOT NULL,
  embedding BLOB,              -- Float32 array stored as binary
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crawl_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,         -- 'running' | 'complete' | 'error'
  items_found INTEGER DEFAULT 0,
  error TEXT,
  started_at TEXT,
  completed_at TEXT
);
```

### 7.5 RAG Engine

```js
// server/rag/engine.js

class RAGEngine {
  constructor(db, aiClient) {
    this.db = db;
    this.ai = aiClient;       // AI API client for embeddings + generation
    this.dimension = 768;     // Embedding dimension (adjust per model)
  }

  // 1. Chunk text into segments
  chunkText(text, maxTokens = 500) {
    // Split by paragraphs, then merge up to maxTokens
    // Return [{ index, text }]
  }

  // 2. Generate embedding via AI API
  async embed(text) {
    const response = await this.ai.createEmbedding({
      model: 'nvidia/nv-embed-qa-4',  // or 'text-embedding-ada-002'
      input: text
    });
    return response.data[0].embedding;
  }

  // 3. Index a document
  async indexDocument(sourceType, sourceId, text) {
    const chunks = this.chunkText(text);
    for (const chunk of chunks) {
      const embedding = await this.embed(chunk.text);
      // Store in SQLite
      this.db.prepare(`INSERT INTO embeddings (id, source_type, source_id,
        chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(`${sourceId}-${chunk.index}`, sourceType, sourceId,
             chunk.index, chunk.text, Buffer.from(new Float32Array(embedding).buffer));
    }
  }

  // 4. Search for similar content
  async search(query, limit = 5) {
    const queryEmbedding = await this.embed(query);
    const queryVector = new Float32Array(queryEmbedding);

    // Load all embeddings (simple approach for small DBs)
    const rows = this.db.prepare('SELECT * FROM embeddings').all();

    // Compute cosine similarity
    const scored = rows.map(row => {
      const storedVector = new Float32Array(
        new Uint8Array(row.embedding).buffer
      );
      const similarity = cosineSimilarity(queryVector, storedVector);
      return { ...row, similarity };
    });

    // Sort by similarity, return top-k
    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  // 5. Generate reading practice from RAG
  async generateReadingSession(difficulty, topic) {
    // Get relevant content
    const results = await this.search(`${difficulty} ${topic} English`, 3);

    // Combine into passage
    const passage = results.map(r => r.chunk_text).join('\n\n');

    // Call AI to generate questions
    const questions = await this.generateQuestions(passage, difficulty);

    return { passage, questions, sources: results.map(r => r.source_id) };
  }
}

function cosineSimilarity(a, b) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Note**: For a simpler deployment (no SQLite dependency), the RAG engine can use a JSON file-based approach:
- Store chunks in a JSON file
- Load into memory at startup
- Compute cosine similarity in-memory
- Works for up to ~10,000 chunks (reasonable for a personal learning app)

---

## 8. File Structure (Full)

```
NodeMind/
├── index.html                      # PWA entry (updated meta, title)
├── package.json                    # Updated deps (+ idb-keyval)
├── vite.config.js                  # Updated proxy for backend
├── manifest.json                   # PWA manifest (updated name/description)
│
├── src/
│   ├── main.jsx                    # Entry (updated storage cleanup keys)
│   ├── App.jsx                     # Major rewrite: DSE nav + module routing
│   ├── App.css                     # Major additions: DSE module styles, themes
│   │
│   ├── context/
│   │   └── ViewContext.jsx         # Updated: add dseTab, progress state
│   │
│   ├── hooks/
│   │   ├── useLocalStorage.js      # Unchanged
│   │   ├── useNotes.js             # Unchanged (notes still core)
│   │   ├── useAI.js                # Updated: new generation prompts
│   │   ├── useKnowledgeHealth.js   # UNCHANGED (kept for reference, not main dashboard)
│   │   ├── useStudyMode.js         # Unchanged
│   │   ├── useGraphData.js         # Unchanged
│   │   ├── useSynthesis.js         # Unchanged
│   │   ├── useSkillAnalytics.js    # NEW: 4-skill analytics engine
│   │   ├── useDSEPapers.js         # NEW: paper/content retrieval + caching
│   │   ├── useSpeech.js            # NEW: Web Speech API (TTS)
│   │   ├── useAudioRecorder.js     # NEW: MediaRecorder + SpeechRecognition
│   │   └── useIndexedDB.js         # NEW: IndexedDB wrapper
│   │
│   ├── utils/
│   │   ├── corpusIndex.js          # Unchanged
│   │   ├── topics.js               # Unchanged
│   │   ├── extractKeyphrases.js    # Unchanged
│   │   ├── noteParser.js           # Unchanged
│   │   ├── dseGrading.js           # NEW: DSE level mapping
│   │   └── dseSpeakingTopics.js    # NEW: 150+ speaking topics
│   │
│   ├── components/
│   │   ├── SidebarNav.jsx          # REWRITTEN: DSE-focused nav
│   │   ├── Dashboard.jsx           # REWRITTEN: HKDSE 4-skill dashboard
│   │   ├── ContextPanel.jsx        # MODIFIED: add DSE panel content
│   │   ├── NoteList.jsx            # Unchanged
│   │   ├── NoteCard.jsx            # Unchanged
│   │   ├── NoteHeader.jsx          # Unchanged
│   │   ├── Canvas.jsx              # Unchanged (used for Writing module)
│   │   ├── ActionBar.jsx           # Unchanged
│   │   ├── FloatingToolbar.jsx     # Unchanged (used for Writing module)
│   │   ├── TheVoid.jsx             # Unchanged
│   │   ├── SettingsPage.jsx        # MODIFIED: add DSE settings tab
│   │   ├── CanvasView.jsx          # Unchanged
│   │   ├── NoteNode.jsx            # Unchanged
│   │   ├── ConstellationGraph.jsx  # Unchanged
│   │   ├── CommandPalette.jsx      # Unchanged
│   │   ├── ErrorBoundary.jsx       # Unchanged
│   │   ├── AISettings.jsx          # Unchanged (legacy)
│   │   │
│   │   ├── ReadingModule.jsx       # NEW: Reading practice
│   │   ├── WritingModule.jsx       # NEW: Writing practice + correction
│   │   ├── ListeningModule.jsx     # NEW: Audio player + questions
│   │   ├── SpeakingModule.jsx      # NEW: Speech recording + analysis
│   │   ├── SkillRing.jsx           # NEW: DSE level ring gauge
│   │   ├── PerformanceChart.jsx    # NEW: Grade history chart
│   │   ├── MCQQuestion.jsx         # NEW: Reusable MCQ component
│   │   ├── WaveformDisplay.jsx     # NEW: Speech waveform visualization
│   │   └── CodeBlock.jsx           # Unchanged
│   │
│   └── assets/
│       ├── favicon.svg             # Unchanged (or update for DSE theme)
│       ├── icon-192.png            # Unchanged
│       └── icon-512.png            # Unchanged
│
├── server/                         # NEW: Backend service
│   ├── index.js                    # Express entry point
│   ├── package.json                # Dependencies
│   ├── .env.example                # Environment config template
│   │
│   ├── db/
│   │   ├── schema.js               # SQLite schema
│   │   └── connection.js           # DB connection
│   │
│   ├── crawlers/
│   │   ├── index.js                # Crawler orchestrator
│   │   ├── scmp.js                 # SCMP scraper
│   │   ├── youthPost.js            # Young Post scraper
│   │   ├── dsePapers.js            # DSE paper collector
│   │   └── podcast.js              # Podcast RSS fetcher
│   │
│   ├── rag/
│   │   ├── engine.js               # RAG pipeline
│   │   ├── chunker.js              # Text chunking
│   │   └── vectorStore.js          # Vector similarity search
│   │
│   ├── routes/
│   │   ├── content.js              # Content API
│   │   ├── analyze.js              # AI analysis API
│   │   ├── crawl.js                # Crawl trigger API
│   │   └── rag.js                  # RAG endpoints
│   │
│   └── data/                       # Runtime data
│       └── .gitkeep
│
└── HKDSE_TRANSFORMATION_PLAN.md    # This document
```

---

## 9. Component Specifications

### 9.1 `ReadingModule.jsx`

```jsx
Props:
  - notes, updateNote, activeId, setActive    (from App, for note integration)
  - skillAnalytics: { recordSession }           (from useSkillAnalytics)
  - dsePapers: { getPaper, generateReadingSession }  (from useDSEPapers)
  - callAI                                        (from useAI)

State:
  - phase: 'select' | 'reading' | 'answering' | 'results'
  - paper: object | null
  - currentQuestionIndex: number
  - answers: { [questionId]: string }
  - timeRemaining: number (seconds)
  - showTimer: boolean
  - results: object | null
  - isAI: boolean (true if AI-generated, false if from paper bank)

Sub-components:
  - PassageDisplay: shows passage with highlight capability
  - MCQQuestion: renders single MCQ with options, handles selection
  - QuestionProgress: progress bar with question numbers
  - Timer: countdown display
  - ResultsPanel: score, DSE level, breakdown by question type

Key behaviors:
  - Can start from saved paper or AI-generated session
  - Auto-saves progress to IndexedDB on answer
  - Timer auto-pauses when switching tabs (visibility API)
  - Results feed into useSkillAnalytics
  - Creates a note in the background with session summary
```

### 9.2 `WritingModule.jsx`

```jsx
Props:
  - notes, createNote, updateNote, activeId
  - skillAnalytics, dsePapers, callAI

State:
  - phase: 'select' | 'writing' | 'submitted' | 'feedback'
  - prompt: object | null
  - essay: string (HTML)
  - wordCount: number
  - timeRemaining: number (seconds)
  - correctionResult: object | null
  - isLoading: boolean

Sub-components:
  - PromptDisplay: task description with word limit, timer
  - EssayEditor: contentEditable (reuses Canvas.jsx pattern or the component itself)
  - WordCounter: live word count with target indicator
  - WritingTimer: countdown with warning colors
  - CorrectionPanel: rubric scores, error list, suggestions

Key behaviors:
  - Prompt from DSE paper bank or AI-generated
  - Auto-saves drafts to localStorage/IndexedDB
  - On submit: calls AI for correction (or offline grammar check)
  - Correction includes: rubric scores, error highlights, suggestions, sample answer
  - Saves as note in background
  - Retry: generates new prompt or edits same essay
```

### 9.3 `ListeningModule.jsx`

```jsx
Props:
  - skillAnalytics, dsePapers, callAI

State:
  - phase: 'select' | 'listening' | 'answering' | 'results'
  - track: object | null
  - audioRef: useRef(Audio)
  - isPlaying: boolean
  - currentTime: number
  - speed: number (0.75, 1.0, 1.25, 1.5)
  - showTranscript: boolean
  - questions: array
  - answers: object
  - results: object | null

Sub-components:
  - TrackSelector: list of available audio tracks with difficulty badges
  - AudioPlayer: custom controls (play/pause, seek, speed, volume)
  - TranscriptDisplay: synced scrolling with current time highlight
  - ListeningQuestions: MCQ + fill-in-blank questions
  - ResultsPanel: score, comprehension breakdown

Key behaviors:
  - Audio can be from DSE papers, podcasts, or TTS-generated
  - First listen: no questions visible, just audio
  - Second listen: questions appear, audio plays again
  - DSE mode: strict timing, two plays only
  - Tracks listening history for adaptive difficulty
  - Creates note with session summary
```

### 9.4 `SpeakingModule.jsx`

```jsx
Props:
  - skillAnalytics, callAI

State:
  - phase: 'select' | 'prepare' | 'record' | 'analyzing' | 'feedback'
  - topic: string | null
  - fullPrompt: string
  - preparationTime: number (seconds)
  - speakingTime: number (seconds)
  - isRecording: boolean
  - transcript: string
  - audioBlob: Blob | null
  - analysis: object | null
  - showSampleAnswer: boolean

Sub-components:
  - TopicDisplay: shows topic with preparation countdown
  - SampleAnswerPlayer: TTS reads model answer
  - RecordingPanel: start/stop, waveform, countdown
  - TranscriptEditor: editable transcript for correction
  - FeedbackPanel: scores, error list, improvement suggestions

Key behaviors:
  - Topic randomly selected from 150+ curated topics
  - Preparation: 60s countdown with tip display
  - Recording: 60s max, auto-stop, waveform visualization
  - Speech-to-text via Web Speech API
  - Analysis: local + AI (if online) for comprehensive feedback
  - Saves recording as note attachment (audio URL, transcript, analysis)
```

### 9.5 `SkillRing.jsx`

```jsx
Props:
  - skill: 'reading' | 'writing' | 'listening' | 'speaking'
  - percentage: number (0-100)
  - dseLevel: string ('1'-'5**')
  - size: number (default 120)
  - strokeWidth: number (default 8)
  - onClick: function
  - animated: boolean (default true)

Renders:
  - SVG circle with gradient stroke
  - Center: DSE level in large text, percentage below
  - Color: red → yellow → green based on percentage
  - Subtle glow effect for DSE level text
  - Hover: expands to show sub-scores
```

### 9.6 `PerformanceChart.jsx`

```jsx
Props:
  - sessions: array of session data
  - skill: string (optional, for color)
  - height: number (default 200)
  - showTarget: boolean (default true)

Renders:
  - SVG bar chart showing grade history
  - X-axis: dates, Y-axis: DSE level (1-5**)
  - Bars colored by skill
  - Target line (5**) across the chart
  - Trend line overlay
  - Hover: detailed session tooltip
```

### 9.7 `MCQQuestion.jsx`

```jsx
Props:
  - question: { id, stem, options: [{label, text}], type, explanation? }
  - selectedAnswer: string | null
  - onSelect: (questionId, answerLabel) => void
  - showResult: boolean (show correct/wrong after submission)
  - correctAnswer: string (only when showResult is true)
  - disabled: boolean

Renders:
  - Question stem with type badge (Main Idea / Inference / etc.)
  - 4 option buttons (A-D), styled as radio buttons
  - Selected state: highlighted
  - Result state: green for correct, red for wrong, shows correct answer
  - Keyboard navigation: 1-4 keys to select
```

---

## 10. Hook Specifications

### 10.1 `useSkillAnalytics.js`

```js
// Full API reference

const {
  // Computed state (derived from session history)
  reading,           // { overall, dseLevel, subScores, questionTypeAccuracy, totalSessions }
  writing,           // { overall, dseLevel, subScores, totalSessions, averageWordCount }
  listening,         // { overall, dseLevel, subScores, totalSessions, averageAccuracy }
  speaking,          // { overall, dseLevel, subScores, totalSessions, averageFluency }
  overallDseLevel,   // '4' - predicted overall DSE level
  overallScore,      // 68 - weighted percentage
  weakestSkill,      // { skill: 'speaking', score: 55 }
  weakestSubSkill,   // { skill: 'speaking', sub: 'fluency', score: 48 }
  recommendations,   // [{ skill, action, reason, priority }]

  // Actions
  recordSession: (sessionData) => void,
    // sessionData: { skill, type, paperId, questions: [{...}], score, totalQuestions,
    //   subScores: {...}, duration, timestamp }
    // Stores session, updates aggregate profile, recalculates all derived state

  getSessionHistory: (skill, limit) => Session[],
  getGradeHistory: (skill, limit) => [{ date, level, percentage }],
  getSkillDistribution: () => [{ skill, percentage, dseLevel }],
  getWeakAreas: () => [{ area, count, trend: 'improving'|'declining'|'stable' }],
  getRecommendedActions: () => [{ action, reason, expectedImpact }],
    // e.g. "Practice inference questions — currently at 60%, 5% below target"

  // Internal computation
  computeSubScores: (skill, questions) => subScores,
    // Calculates sub-parameter scores from question-level data
  computeDseLevel: (percentage, skill) => dseLevel,
  computeOverallDseLevel: (skillProfiles) => dseLevel,

  // State management
  exportData: () => JSON.stringify(allData),
  importData: (json) => void,
  resetData: () => void,
} = useSkillAnalytics();
```

### 10.2 `useDSEPapers.js`

```js
const {
  // State
  papers: [],                  // Cached papers from IndexedDB
  recentPapers: [],            // Recently accessed
  availableSources: [],        // ['scmp', 'youth-post', 'dse-2024', ...]
  isLoading: false,
  error: null,
  lastSyncTime: null,          // ISO timestamp

  // Paper retrieval
  getPaper: (type, options) => Promise<Paper>,
    // options: { difficulty, topic, year, paperNumber }
    // Returns from cache or fetches from backend / AI-generates
    // Fallback chain: IndexedDB cache → backend API → AI generate

  getRandomPaper: (type, options) => Promise<Paper>,
    // Random selection from available papers

  getPapersBySource: (source) => Promise<Paper[]>,
  getPapersByDifficulty: (type, difficulty) => Promise<Paper[]>,

  // AI generation
  generateReadingSession: (options) => Promise<{ passage, questions }>,
    // options: { difficulty, topic?, questionCount? }
    // Uses AI API to generate content + questions
    // Stores result in IndexedDB for reuse

  generateWritingPrompt: (options) => Promise<WritingPrompt>,
    // options: { difficulty, type? (letter/essay/article/report) }

  generateListeningSession: (options) => Promise<ListeningSession>,
    // Uses TTS to create audio from articles, generates questions

  // Backend sync
  syncFromBackend: () => Promise<number>,
    // Fetches latest papers from backend, stores in IndexedDB
    // Returns count of new items

  syncPodcasts: () => Promise<number>,

  // Cache management
  clearCache: () => Promise<void>,
  getCacheSize: () => Promise<number>,     // items count
  getCacheStorageSize: () => Promise<string>, // '2.3 MB'

  // Offline fallback
  getBundledContent: (type) => Paper[],
    // Returns bundled starter content (5-10 papers shipped with app)
    // Guaranteed to work offline
} = useDSEPapers();
```

### 10.3 `useSpeech.js`

```js
const {
  // State
  isSupported: boolean,         // Browser supports SpeechSynthesis
  isSpeaking: boolean,
  isPaused: boolean,
  voices: SpeechSynthesisVoice[],
  selectedVoice: SpeechSynthesisVoice | null,
  currentUtterance: SpeechSynthesisUtterance | null,

  // Actions
  speak: (text, options) => Promise<void>,
    // options: { rate, pitch, voice, volume, onBoundary, onWord }
    // Returns promise that resolves when speech ends

  stop: () => void,
  pause: () => void,
  resume: () => void,

  // Voice management
  setVoice: (voice) => void,
  setRate: (rate) => void,           // 0.1 - 10, default 1
  setPitch: (pitch) => void,         // 0 - 2, default 1

  // Utilities
  getVoicesByLang: (lang) => SpeechSynthesisVoice[],
    // lang: 'en-GB', 'en-US', 'en-AU'
    // Returns voices filtered by language

  getVoicesByName: (name) => SpeechSynthesisVoice[],
    // Find voice by partial name match

  getDefaultVoice: () => SpeechSynthesisVoice,
    // Prefers en-GB female for DSE standard
} = useSpeech();
```

### 10.4 `useAudioRecorder.js`

```js
const {
  // State
  isSupported: boolean,           // Browser supports getUserMedia + SpeechRecognition
  isRecording: boolean,
  transcript: string,             // Final transcript
  interimTranscript: string,      // Live partial transcript
  audioLevel: number,             // 0-1 for waveform visualization
  duration: number,               // Seconds recorded
  audioBlob: Blob | null,         // Recorded audio for playback
  audioUrl: string | null,        // Object URL for <audio> playback
  error: string | null,
  isSpeaking: boolean,            // User is currently vocalizing

  // Actions
  startRecording: (options) => void,
    // options: { lang, continuous, maxDuration, onComplete }
    // lang: 'en-HK' | 'en-GB' | 'en-US'
    // Starts: microphone + SpeechRecognition + audio level analysis

  stopRecording: () => void,
    // Stops everything, finalizes transcript + audio blob

  pauseRecording: () => void,     // Pause recognition but keep mic
  resumeRecording: () => void,    // Resume recognition

  clear: () => void,              // Reset all state

  // Playback
  playRecording: () => void,
  stopPlayback: () => void,

  // Analysis (post-recording)
  getSpeechRate: () => number,    // words per minute
  getPauseCount: () => number,    // number of pauses > 500ms
  getFillerWordCount: () => number,
  getFillerWords: () => [{ word: 'uhm', count: 5 }],
  getLexicalDiversity: () => number,  // unique/total words ratio
} = useAudioRecorder();
```

### 10.5 `useIndexedDB.js`

```js
const {
  getItem: (key) => Promise<any>,
  setItem: (key, value) => Promise<void>,
  updateItem: (key, updater) => Promise<any>,
    // updater: (currentValue) => newValue
  deleteItem: (key) => Promise<void>,
  getKeys: () => Promise<string[]>,
  clearAll: () => Promise<void>,
  getSize: () => Promise<number>,
    // Approximate storage used in bytes

  // Batch operations
  getMany: (keys) => Promise<Map<string, any>>,
  setMany: (entries: [key, value][]) => Promise<void>,

  // Storage estimation
  getStorageEstimate: () => Promise<{ usage: number, quota: number }>,
    // Uses navigator.storage.estimate()

  // Specific DSE keys
  DSE_KEYS: {
    PROFILE: 'nodemind-skill-profile',
    SESSIONS: 'nodemind-skill-sessions',
    PAPERS: 'nodemind-dse-papers',
    CONTENT: 'nodemind-dse-content',
    DRAFTS: 'nodemind-writing-drafts',
    RECORDINGS: 'nodemind-speech-recordings',
    SESSION_ANSWERS: 'nodemind-session-answers',
  }
} = useIndexedDB();
```

---

## 11. Data Flow Diagrams

### 11.1 Session Flow (all skills)

```
User starts practice
        │
        ▼
Module calls useDSEPapers.getPaper(type, options)
        │
        ├── IndexedDB cache hit? → Return cached paper
        │
        ├── Backend available? → Fetch from backend API
        │                          → Store in IndexedDB cache
        │                          → Return paper
        │
        └── AI generate (no cache, no backend)
                 → callAI with generation prompt
                 → Store in IndexedDB
                 → Return paper
        │
        ▼
User interacts with module (reads, writes, listens, speaks)
        │
        ▼
User submits / finishes
        │
        ▼
Module computes sessionData:
  { skill, paperId, questions[], answers[], score,
    totalQuestions, subScores, duration, timestamp }
        │
        ▼
useSkillAnalytics.recordSession(sessionData)
        │
        ├── Append session to IndexedDB 'nodemind-skill-sessions'
        │
        ├── Compute sub-scores from question-level data
        │     (see Sub-score calculation rules above)
        │
        ├── Update aggregate profile in IndexedDB
        │     'nodemind-skill-profile'
        │     - Recalculate overall skill score (weighted average)
        │     - Update sub-scores (exponential moving average)
        │     - Update DSE level mapping
        │
        ├── Update vocabularyMastery
        │     - Extract new words from session content
        │     - Check against vocabulary lists
        │     - Update mastery status
        │
        ├── Update grammarMastery
        │     - Extract error patterns from session
        │     - Update weak/strong area tracking
        │
        └── Recalculate recommendations
              - Identify weakest areas
              - Generate actionable suggestions
              - Predict required improvement for 5**
        │
        ▼
Module displays results + feedback
        │
        ▼
Dashboard re-renders with updated analytics
```

### 11.2 RAG Content Flow

```
Crawler trigger (daily cron or manual)
        │
        ▼
Crawlers fetch:
  ├── SCMP: article list → individual articles → extract text
  ├── Youth Post: same pattern
  ├── DSE papers: parse PDF or structured data
  └── Podcasts: RSS feed → episode list → audio URL + transcript
        │
        ▼
For each content item:
        │
        ├── Store raw content in SQLite
        │
        ├── RAGEngine.chunkText(content)
        │     Split into 500-token chunks with overlap
        │
        ├── RAGEngine.embed(chunk)
        │     Call AI embedding API
        │
        └── Store chunk + embedding in SQLite
        │
        ▼
User requests practice session
        │
        ▼
Frontend requests /api/rag/generate-reading
        │
        ▼
Server:
        ├── RAGEngine.search(query, 3)
        │     Embed query → cosine similarity → top 3 chunks
        │
        ├── Combine chunks into coherent passage
        │
        ├── Call AI to generate MCQ questions from passage
        │
        └── Return { passage, questions, sources }
        │
        ▼
Frontend displays to user
```

### 11.3 Speaking Analysis Flow

```
User clicks "Start Recording"
        │
        ▼
useAudioRecorder.startRecording()
        │
        ├── getUserMedia({ audio: true }) → mic stream
        │     → AudioContext + AnalyserNode → audioLevel updates
        │
        ├── SpeechRecognition.start()
        │     → onresult: interimTranscript (live), transcript (final)
        │
        └── Performance.now() → duration tracking
        │
        ▼
User clicks "Stop" or 60s auto-stop
        │
        ▼
useAudioRecorder.stopRecording()
        │
        ├── Stop recognition → finalize transcript
        │
        ├── Stop mic stream
        │
        └── Store audioBlob
        │
        ▼
Local analysis:
        ├── getSpeechRate() = transcript.words / duration
        ├── getPauseCount() = pause events from audio level
        ├── getFillerWordCount() = count filler words
        ├── getLexicalDiversity() = unique words / total words
        └── Basic pronunciation check via word-level matching
        │
        ▼
If online → AI analysis:
        callAI({
          system: speaking analysis prompt,
          user: `Topic: "${topic}"\n\nTranscript: "${transcript}"`
        })
        │
        ▼
Combine local + AI analysis into final assessment
        │
        ├── pronunciation: weighted average of local + AI scores
        ├── fluency: (local) filler words, pauses, speed
        ├── grammar: (AI) error count
        ├── vocabulary: (local) lexical diversity + (AI) range rating
        └── structure: (AI) coherence assessment
        │
        ▼
useSkillAnalytics.recordSession({ skill:'speaking', ... })
        │
        ▼
Display feedback panel with scores, transcript, improvements
```

---

## 12. Analytics Engine Details

### 12.1 Score Computation

**Question-type weighted scoring** (Reading/Listening):

```js
const QUESTION_WEIGHTS = {
  reading: {
    mainIdea: 1.0,
    inference: 1.2,        // Harder, higher weight
    vocabInContext: 0.8,
    detail: 0.9,
    tone: 1.3,             // Most challenging
    purpose: 1.1
  },
  listening: {
    mainIdea: 1.0,
    detailRecall: 0.9,
    inference: 1.2,
    fillBlank: 1.0,
    tableCompletion: 1.1
  }
};

function computeWeightedScore(questions, answers, skill) {
  const weights = QUESTION_WEIGHTS[skill];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const q of questions) {
    const w = weights[q.questionType] || 1.0;
    totalWeight += w;
    if (answers[q.id] === q.correctAnswer) {
      earnedWeight += w;
    }
  }

  return (earnedWeight / totalWeight) * 100;
}
```

**Sub-score decay** (for aggregate profile):

```js
const DECAY_FACTOR = 0.3;  // New session accounts for 30% of updated score

function updateAggregateScore(oldScore, newSessionScore) {
  // Exponential moving average: new × α + old × (1 - α)
  return newSessionScore * DECAY_FACTOR + oldScore * (1 - DECAY_FACTOR);
}
```

**Minimum sessions for reliable score**: Require ≥3 sessions before displaying a skill score. Before that, show "Insufficient data" with a tint of the raw average.

### 12.2 Recommendation Engine

```js
function generateRecommendations(profile) {
  const recommendations = [];

  // Find weakest skill
  const skills = ['reading', 'writing', 'listening', 'speaking'];
  const weakest = skills.reduce((min, s) => profile[s].overall < profile[min].overall ? s : min);

  // Find weakest sub-skill within weakest skill
  const weakestSub = Object.entries(profile[weakest].subScores)
    .sort(([,a], [,b]) => a - b)[0];

  // Generate recommendation
  if (profile[weakest].overall < 70) {
    recommendations.push({
      skill: weakest,
      sub: weakestSub[0],
      score: weakestSub[1],
      action: `Practice ${weakest} — focus on ${weakestSub[0].replace(/([A-Z])/g, ' $1')}`,
      reason: `Current score: ${weakestSub[1]}% — target: 70%`,
      expectedImpact: '+1 DSE level',
      priority: 'high',
      suggestedModule: weakest,     // Direct link to module
      suggestedDuration: 15,       // minutes
    });
  }

  // Check question type weaknesses (reading/listening)
  if (profile.reading.questionTypeAccuracy) {
    const worstType = Object.entries(profile.reading.questionTypeAccuracy)
      .sort(([,a], [,b]) => a - b)[0];
    if (worstType[1] < 0.6) {
      recommendations.push({
        skill: 'reading',
        sub: worstType[0],
        score: worstType[1] * 100,
        action: `Practice ${worstType[0].replace(/([A-Z])/g, ' $1')} questions`,
        reason: `Accuracy: ${(worstType[1] * 100).toFixed(0)}% — critical weakness`,
        priority: 'high',
        suggestedModule: 'reading',
        suggestedType: worstType[0],  // Filter questions by type
      });
    }
  }

  // Check study consistency
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = profile._sessions.filter(s => s.timestamp > weekAgo).length;
  if (sessionsThisWeek < 3) {
    recommendations.push({
      skill: 'all',
      action: 'Study at least 3 times this week',
      reason: `Only ${sessionsThisWeek} session(s) this week`,
      priority: sessionsThisWeek === 0 ? 'high' : 'medium',
      suggestedDuration: 20,
    });
  }

  // 5** gap analysis
  const gap = computeGapToTarget(profile, '5**');
  if (gap > 0) {
    recommendations.push({
      skill: 'all',
      action: `${gap.requiredImprovement} needed for 5**`,
      reason: `Current predicted: ${gap.currentLevel}, Target: 5**`,
      details: gap.breakdown,
      priority: 'high',
    });
  }

  return recommendations.sort((a, b) =>
    ({ high: 0, medium: 1, low: 2 }[a.priority]) -
    ({ high: 0, medium: 1, low: 2 }[b.priority])
  );
}
```

### 12.3 5** Target Analysis

```js
function computeGapToTarget(profile, targetLevel = '5**') {
  const levelScores = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '5*': 6, '5**': 7 };

  const target = levelScores[targetLevel];       // 7
  const current = levelScores[profile.overallDseLevel]; // e.g., 4 (DSE level 4)

  if (current >= target) return null;  // Already at target

  // For each skill, calculate points needed
  const weights = { reading: 0.30, writing: 0.25, listening: 0.20, speaking: 0.15 };
  const improvementNeeded = {};

  for (const [skill, weight] of Object.entries(weights)) {
    const currentLevel = levelScores[profile[skill].dseLevel];
    const targetLevel = levelScores[targetLevel];
    const currentScore = profile[skill].overall;
    const targetScore = currentScore + ((targetLevel - currentLevel) / 7) * 100;

    improvementNeeded[skill] = {
      currentLevel: profile[skill].dseLevel,
      currentScore: currentScore,
      targetScore: Math.min(targetScore, 100),
      improvement: Math.min(targetScore - currentScore, 100 - currentScore),
      priority: targetScore - currentScore > 20 ? 'critical' : 'doable'
    };
  }

  return {
    currentLevel: profile.overallDseLevel,
    targetLevel,
    overallGap: target - current,
    breakdown: improvementNeeded,
    requiredImprovement: Object.values(improvementNeeded)
      .filter(i => i.improvement > 0)
      .map(i => `${i.improvement.toFixed(0)} pts in ${i.currentLevel} → ${targetLevel}`)
      .join(', '),
    estimatedSessions: Object.values(improvementNeeded)
      .reduce((sum, i) => sum + Math.ceil(i.improvement / 5), 0)
      // ~5% improvement per focused session
  };
}
```

---

## 13. RAG Pipeline Details

### 13.1 Chunking Strategy

```js
// server/rag/chunker.js

function chunkText(text, maxTokens = 500, overlap = 50) {
  // Step 1: Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/);

  // Step 2: Estimate tokens per paragraph (rough: 1 token ≈ 4 chars)
  const chunks = [];
  let currentChunk = [];
  let currentTokenCount = 0;

  for (const para of paragraphs) {
    const paraTokens = Math.ceil(para.length / 4);

    if (currentTokenCount + paraTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join('\n\n'));

      // Start new chunk with overlap (last paragraph)
      const overlapTokens = Math.ceil(overlap * 4);
      let overlapText = '';
      let overlapCount = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const t = Math.ceil(currentChunk[i].length / 4);
        if (overlapCount + t > overlapTokens) break;
        overlapText = currentChunk[i] + '\n\n' + overlapText;
        overlapCount += t;
      }
      currentChunk = overlapText ? [overlapText] : [];
      currentTokenCount = overlapCount;
    }

    currentChunk.push(para);
    currentTokenCount += paraTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks.map((text, i) => ({ index: i, text }));
}
```

### 13.2 Embedding Generation

```js
// server/rag/engine.js — using NVIDIA NIM API

async function embed(text) {
  // Option 1: NVIDIA NIM (existing provider)
  const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nvidia/nv-embed-qa-4',
      input: text,
      input_type: 'query',  // or 'passage' for documents
      truncate: 'END'
    })
  });

  const data = await response.json();
  return data.data[0].embedding; // Float32Array of 768 or 1024 dimensions
}

// Option 2: OpenAI
// Option 3: Simple TF-IDF vectors (no external API needed — offline fallback)

function computeTFIDFVector(tokens, idfMap) {
  // Count term frequencies
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  // Normalize by document length
  const maxFreq = Math.max(...Object.values(tf));
  const vector = {};
  for (const [token, count] of Object.entries(tf)) {
    const tfValue = 0.5 + 0.5 * (count / maxFreq);  // Augmented frequency
    const idfValue = idfMap[token] || Math.log(100);  // Default IDF for unknown
    vector[token] = tfValue * idfValue;
  }
  return vector;
}
```

### 13.3 Search and Retrieval

```js
// server/rag/vectorStore.js

class VectorStore {
  constructor() {
    this.vectors = [];       // [{ id, sourceType, sourceId, chunkIndex, text, vector }]
  }

  add(id, sourceType, sourceId, chunkIndex, text, vector) {
    this.vectors.push({ id, sourceType, sourceId, chunkIndex, text, vector });
  }

  search(queryVector, topK = 10) {
    const scores = this.vectors.map(v => ({
      ...v,
      score: cosineSimilarity(queryVector, v.vector)
    }));
    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  searchBySource(sourceType, topK = 10) {
    return this.vectors
      .filter(v => v.sourceType === sourceType)
      .slice(0, topK);
  }

  remove(id) {
    this.vectors = this.vectors.filter(v => v.id !== id);
  }

  clear() {
    this.vectors = [];
  }

  get size() {
    return this.vectors.length;
  }
}
```

### 13.4 Notes as User Resources (Auto-RAG)

A key insight: **user notes ARE the content corpus.** Every note the user creates or imports is treated as a resource that feeds into content generation.

**How it works:**

```
User pastes SCMP article into note
        │
        ▼
Note tagged with #reading #scmp #climate
        │
        ▼
corpusIndex.analyze() extracts keyphrases, entities, topics
        │
        ▼
Note content chunked + indexed in local vector store (IndexedDB)
        │
        ▼
When user starts Reading practice:
    → RAG searches notes + bundled content + backend content
    → Top-k relevant chunks retrieved
    → AI generates passage + MCQ questions from combined context
```

**Tag-based routing for generation:**
- Notes tagged `#reading` → fed into Reading question generation context
- Notes tagged `#writing` → used as Writing sample/reference
- Notes tagged with topic tags (`#climate`, `#technology`) → used when user practices that topic
- Untagged notes → fallback for general practice

**User workflow:**
1. Browse SCMP / Youth Post / DSE paper
2. Copy-paste interesting passages into a new note (or use Quick Capture)
3. App auto-generates title, tags, and kind via existing AI pipeline
4. Note content is automatically chunked, embedded, and indexed
5. When practicing, the system retrieves relevant notes as source material
6. AI generates questions/prompts based on the user's own curated content

**Benefits:**
- The more notes the user takes, the richer the practice content becomes
- Content is personalized to the user's interests and reading habits
- No need for a backend to crawl — user curates their own corpus
- Backend crawling is supplemental (adds breadth), notes provide depth

### 13.5 Offline Fallback (No Backend)

When the backend is unavailable:

1. **User notes** (IndexedDB): The user's own notes are always available as source material — this is the primary content source offline
2. **Bundled content**: Ship 5-10 sample DSE reading passages with MCQs in `src/assets/bundled-content.json`
3. **AI-only generation**: Use `callAI()` directly without RAG — passages are entirely AI-generated (less accurate but functional)
4. **Client-side TF-IDF**: For content users import themselves (e.g., paste articles), compute simple TF-IDF vectors client-side for basic similarity search

```js
// Bundled content format
const bundle = [
  {
    id: 'bundled-001',
    type: 'reading',
    source: 'bundled',
    difficulty: 'medium',
    passages: [{ title: '...', content: '...', wordCount: 700 }],
    questions: [
      { id: 'b1q1', type: 'mcq', questionType: 'mainIdea',
        stem: '...', options: [...], correctAnswer: 'B', explanation: '...' }
    ]
  }
];
```

---

## 14. DSE Grading System

### 14.1 Grade Boundary Configuration

Default grade boundaries (DSE English Language):

```js
const DSE_GRADE_BOUNDARIES = {
  reading: {
    paper1: { maxScore: 40, weight: 0.30, boundaries: generateBoundaries(
      { '5**': 93, '5*': 85, '5': 75, '4': 63, '3': 48, '2': 33, '1': 0 }
    )},
    paper2: { maxScore: 40, weight: 0.30, boundaries: generateBoundaries(
      { '5**': 93, '5*': 85, '5': 75, '4': 63, '3': 48, '2': 33, '1': 0 }
    )}
  },
  writing: {
    paper1: { categories: [
      { name: 'content', maxScore: 7, weight: 0.35 },
      { name: 'organization', maxScore: 7, weight: 0.30 },
      { name: 'language', maxScore: 7, weight: 0.35 }
    ], weight: 0.25, boundaries: generateBoundaries(
      { '5**': 90, '5*': 82, '5': 73, '4': 62, '3': 50, '2': 38, '1': 0 }
    )}
  },
  listening: {
    paper: { maxScore: 30, weight: 0.20, boundaries: generateBoundaries(
      { '5**': 92, '5*': 83, '5': 73, '4': 60, '3': 47, '2': 33, '1': 0 }
    )}
  },
  speaking: {
    paper: { categories: [
      { name: 'pronunciation', maxScore: 20, weight: 0.25 },
      { name: 'fluency', maxScore: 20, weight: 0.25 },
      { name: 'vocabulary', maxScore: 20, weight: 0.25 },
      { name: 'structure', maxScore: 20, weight: 0.25 }
    ], weight: 0.15, boundaries: generateBoundaries(
      { '5**': 90, '5*': 82, '5': 73, '4': 62, '3': 50, '2': 38, '1': 0 }
    )}
  }
};

function generateBoundaries(levelPercentages) {
  // { '5**': 93, '5*': 85, ... } → [{ level, minPercentage }, ...]
  return Object.entries(levelPercentages).map(([level, minPercentage]) => ({
    level, minPercentage
  }));
}
```

**Note**: These boundaries are estimates based on typical DSE grading. HKEAA does not publish exact grade boundaries; they vary yearly. Users can customize boundaries in Settings.

### 14.2 Overall DSE Level Computation

```js
function computeOverallDseLevel(skillLevels) {
  const levelValues = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '5*': 6, '5**': 7 };
  const weights = { reading: 0.30, writing: 0.25, listening: 0.20, speaking: 0.15 };
  const electives = 0.10;  // For elective modules (future)

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [skill, weight] of Object.entries(weights)) {
    const levelValue = levelValues[skillLevels[skill]] || 1;
    weightedSum += levelValue * weight;
    totalWeight += weight;
  }

  const averageLevelValue = weightedSum / totalWeight;

  // Map back to DSE level
  const levelMap = [
    { max: 1.5, level: '1' },
    { max: 2.5, level: '2' },
    { max: 3.5, level: '3' },
    { max: 4.5, level: '4' },
    { max: 5.5, level: '5' },
    { max: 6.5, level: '5*' },
    { max: 7.0, level: '5**' },
  ];

  const overallLevel = levelMap.find(l => averageLevelValue <= l.max)?.level || '1';

  return {
    level: overallLevel,
    score: (averageLevelValue / 7) * 100,
    breakdown: Object.fromEntries(
      Object.keys(weights).map(s => [s, { level: skillLevels[s], contribution: weightedSum }])
    )
  };
}
```

### 14.3 Per-Paper Analysis

```js
function analyzePaperSession(session, boundaries) {
  // Analyze performance on a specific paper
  const result = {
    paperId: session.paperId,
    date: session.completedAt,
    score: session.score,
    total: session.totalQuestions,
    percentage: (session.score / session.totalQuestions) * 100,
    dseLevel: scoreToDseLevel(
      (session.score / session.totalQuestions) * 100,
      boundaries
    ),
    duration: session.duration,
    readingSpeed: session.totalQuestions > 0
      ? session.paperPassageWordCount / (session.duration / 60)
      : null,
    questionBreakdown: {}
  };

  // Group accuracy by question type
  for (const q of session.questions) {
    if (!result.questionBreakdown[q.questionType]) {
      result.questionBreakdown[q.questionType] = { correct: 0, total: 0 };
    }
    result.questionBreakdown[q.questionType].total++;
    if (q.isCorrect) result.questionBreakdown[q.questionType].correct++;
  }

  // Convert to percentages
  for (const [type, stats] of Object.entries(result.questionBreakdown)) {
    stats.accuracy = (stats.correct / stats.total) * 100;
  }

  // Trend analysis (compare to last 3 similar papers)
  result.trend = computeTrend(session.paperType, session.difficulty);

  return result;
}
```

---

## 15. Web Speech API Integration

### 15.1 SpeechSynthesis (TTS) — Text-to-Speech

| API | Purpose | Implementation |
|-----|---------|----------------|
| `window.speechSynthesis` | Read model answers, instructions, passages | `useSpeech.js` hook |

Voice selection for DSE:
- Default: UK English female (matches DSE listening exam standard)
- Options: US English, Australian English, Indian English (optional)
- Rate: 0.9 (slightly slower for learning)

Usage in modules:
- **Reading**: Read passage aloud while user follows along
- **Writing**: Read prompt aloud for accessibility
- **Listening**: TTS can read transcript (not for exam simulation, but for review)
- **Speaking**: Read sample answer / model answer after user speaks

### 15.2 SpeechRecognition (STT) — Speech-to-Text

| API | Purpose | Implementation |
|-----|---------|----------------|
| `window.SpeechRecognition` / `webkitSpeechRecognition` | Transcribe user's speech for Speaking module | `useAudioRecorder.js` hook |

Configuration for DSE:
```js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;          // Keep listening for full minute
recognition.interimResults = true;      // Show live transcription
recognition.lang = 'en-HK';             // Hong Kong English (if supported)
// Fallback: 'en-GB' (British English, closest to DSE standard)
```

Limitations:
- `en-HK` locale may not be supported — fallback to `en-GB`
- Accuracy depends on user's accent and microphone quality
- Background noise affects results
- Best results with headset microphone

### 15.3 getUserMedia — Audio Recording

| API | Purpose | Implementation |
|-----|---------|----------------|
| `navigator.mediaDevices.getUserMedia` | Capture audio stream for waveform + analysis | `useAudioRecorder.js` |

```js
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000     // Optimal for speech recognition
  }
});
```

### 15.4 AudioContext — Waveform Analysis

```js
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
source.connect(analyser);

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

function getAudioLevel() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    const value = (dataArray[i] - 128) / 128;
    sum += value * value;
  }
  return Math.sqrt(sum / bufferLength);  // RMS → 0-1
}
```

---

## 16. Storage Strategy

### 16.1 What Goes Where

| Data Type | Storage | Key | Reason |
|-----------|---------|-----|--------|
| AI config | `localStorage` | `nodemind-ai-config` | Small, sync, already there |
| Theme, prefs | `localStorage` | `nodemind-theme`, etc. | Sync, tiny |
| Notes (existing) | `localStorage` | `nodemind-notes` | Already implemented, but should migrate to IndexedDB if notes grow large |
| Skill profile | `IndexedDB` | `nodemind-skill-profile` | ~10KB, but async operations are fine |
| Session history | `IndexedDB` | `nodemind-skill-sessions` | Can grow to MBs over time |
| DSE papers | `IndexedDB` | `nodemind-dse-papers` | Large documents, need async |
| Content cache | `IndexedDB` | `nodemind-dse-content` | Articles, passages, audio metadata |
| Writing drafts | `IndexedDB` | `nodemind-writing-drafts` | Multiple drafts, auto-save |
| Speech recordings | `IndexedDB` (audio as blob) | `nodemind-speech-recordings` | Audio blobs can be large (60s = ~500KB) |
| Session answers | `IndexedDB` | `nodemind-session-answers` | Per-question data for detailed analysis |
| Backend content | Backend SQLite | — | Full article database, embeddings |
| Service worker cache | Cache API | — | Static assets, API responses |

### 16.2 IndexedDB vs localStorage Decision

| Criteria | localStorage | IndexedDB |
|----------|-------------|-----------|
| Capacity | ~5MB | ~50MB-1GB (depends on browser) |
| Data type | String only | Any structured data, Blobs |
| Sync/Async | Sync | Async |
| Performance | Fast reads, blocking writes | Async, no blocking |
| Complexity | Simple | More complex (but `idb-keyval` helps) |

**Strategy**: Keep `localStorage` for small config, migrate all DSE/app data to IndexedDB.

### 16.3 Migration Path

For existing users upgrading from old NodeMind:

1. `main.jsx` cleanup remains unchanged for `localStorage` keys
2. On first launch of new DSE version:
   - Check if `nodemind-skill-profile` exists in IndexedDB
   - If not, initialize with empty profile
   - Existing notes in `localStorage` remain untouched
   - Notes system unchanged (still uses `nodemind-notes`)
3. Future: Optional migration of notes from `localStorage` to IndexedDB if users have many notes

---

## 17. PWA Considerations

### 17.1 Offline Capabilities

| Feature | Offline? | How |
|---------|----------|-----|
| Note-taking | ✅ Full | Existing localStorage-based (unchanged) |
| Dashboard | ✅ Full | Cached profile in IndexedDB |
| Reading practice | ✅ Basic | Bundled content (5-10 papers shipped with app) |
| Reading practice | ❌ Advanced | RAG + AI generation needs backend/API |
| Writing practice | ✅ Basic | Prompts from bundled content, local grammar check |
| Writing correction | ❌ | AI API needed for rubric scoring |
| Listening practice | ✅ Basic | Bundled audio (small samples) or TTS |
| Listening practice | ❌ Advanced | Backend podcast crawling |
| Speaking practice | ✅ Full | Web Speech API works offline! |
| Speaking analysis | ❌ Detailed | AI analysis needs API |
| Speaking analysis | ✅ Basic | Local analysis (filler words, speed, diversity) |
| Graph/Canvas | ✅ Full | Existing (unchanged) |
| Settings | ✅ Full | Config in localStorage (unchanged) |

### 17.2 Service Worker Strategy

Updated `vite-plugin-pwa` config:

```js
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
  manifest: {
    name: 'HKDSE English 5**',
    short_name: 'DSE English',
    description: 'HKDSE English learning platform — practice Reading, Writing, Listening, Speaking',
    theme_color: '#1a1a2e',
    background_color: '#fdfcfc',
    display: 'standalone',
    orientation: 'portrait',
    categories: ['education', 'english', 'exam'],
    screenshots: [  // Optional: for Play Store / app install
      { src: 'screenshot-1.png', sizes: '1080x1920', type: 'image/png' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,wasm,svg,png,ico,json}'],
    runtimeCaching: [
      {
        // Cache API responses from backend
        urlPattern: /^https?:\/\/.*\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },  // 1 week
          networkTimeoutSeconds: 5
        }
      },
      {
        // Cache audio files
        urlPattern: /\.(mp3|wav|ogg)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'audio-cache',
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }  // 30 days
        }
      }
    ]
  }
})
```

### 17.3 App Shell Architecture

```
Initial load
    │
    ▼
Service Worker install → cache static assets (HTML, JS, CSS, icons)
    │
    ▼
App loads → show shell (sidebar + placeholder content)
    │
    ├── IndexedDB → load cached profile, session history, papers
    │
    ├── If online → fetch latest from backend (silent update)
    │   └── Update IndexedDB cache
    │
    └── If offline → use cached data only
    │
    ▼
Ready → user interaction
```

### 17.4 Install Prompt

```jsx
// In App.jsx — register beforeinstallprompt event
useEffect(() => {
  const handler = (e) => {
    e.preventDefault();
    // Save event for later use
    deferredPromptRef.current = e;
    // Show install banner (optional)
    setShowInstallBanner(true);
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);
```

---

## 18. Deployment

### 18.1 Frontend (PWA)

Deployed as static files to any hosting:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Vercel | ✅ | Automatic from GitHub, custom domain |
| Netlify | ✅ | Automatic from GitHub, form handling |
| Cloudflare Pages | ✅ | Global CDN, fast |
| GitHub Pages | ✅ | Free, but manual deploy |

**Build command**: `npm run build` (unchanged, produces `dist/`)

### 18.2 Backend

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Railway | ✅ | $5 credit/month, easy deploy, PostgreSQL optional |
| Render | ✅ | 750 hours/month, sleeps after inactivity |
| Fly.io | ✅ | Up to 3 shared VMs, 3GB storage |
| Cloudflare Workers | ✅ | 100k requests/day, but no SQLite (use D1) |

**Recommended**: Railway — simplest setup, auto-deploy from GitHub, free PostgreSQL (for future), easy env config.

**Backend deploy steps**:
1. Push `server/` to GitHub
2. Connect to Railway as new service
3. Set environment variables in Railway dashboard
4. Railway auto-detects Node.js, runs `npm start`
5. Frontend Vite config proxies `/api` → Railway URL in production

### 18.3 Environment Variables

```bash
# server/.env.example

# Port (Railway sets this automatically)
PORT=3001

# AI API Configuration (same as frontend)
AI_API_KEY=your-nvidia-or-openai-key
AI_ENDPOINT=https://integrate.api.nvidia.com/v1
AI_MODEL=meta/llama-3.1-8b-instruct
AI_EMBED_MODEL=nvidia/nv-embed-qa-4

# Crawler Configuration
CRAWL_INTERVAL=86400   # Seconds between automatic crawls (24h)
SCMP_BASE_URL=https://www.scmp.com
YOUTH_POST_BASE_URL=https://www.yp.scmp.com

# Podcast RSS Feeds (comma-separated)
PODCAST_FEEDS=https://feeds.bbci.co.uk/learningenglish/features/6minuteenglish/rss.xml,https://feeds.simplecast.com/tEDDYpRw

# CORS (for development)
CORS_ORIGIN=http://localhost:5173
```

### 18.4 Docker (Optional)

```dockerfile
# server/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

---

## Appendix A: Implementation Order

### Phase 1 — Foundation (Week 1-2)

| Day | Tasks |
|-----|-------|
| 1-2 | App restructure: new SidebarNav, ViewContext updates, DSE module routing in App.jsx |
| 3-4 | `useSkillAnalytics.js` + `dseGrading.js` — analytics engine |
| 5-6 | `useIndexedDB.js` — IndexedDB wrapper, migration |
| 7-8 | Dashboard rewrite — `Dashboard.jsx` → HKDSE dashboard |
| 9-10 | `SkillRing.jsx`, `PerformanceChart.jsx` — dashboard components |
| 11 | Integration testing: all existing features still work |
| 12 | Bug fixes, polish |

### Phase 2 — Reading & Writing (Week 3-4)

| Day | Tasks |
|-----|-------|
| 13-14 | `useDSEPapers.js` — paper retrieval, caching, generation |
| 15-17 | `ReadingModule.jsx` — passage display, MCQ, timer, results |
| 18-19 | `MCQQuestion.jsx` — reusable MCQ component |
| 20-21 | AI prompt engineering for MCQ generation |
| 22-24 | `WritingModule.jsx` — prompt, editor, submission |
| 25-26 | AI correction prompt, rubric scoring integration |
| 27-28 | Bundled content creation (5-10 sample papers) |

### Phase 3 — Backend (Week 5)

| Day | Tasks |
|-----|-------|
| 29-30 | Express server, SQLite schema, content API routes |
| 31-32 | SCMP + Young Post crawlers |
| 33 | Podcast RSS crawler |
| 34-35 | RAG engine — chunker, embedder, vector search |
| 36 | Frontend-backend integration, proxy config |
| 37-38 | Docker setup, Railway deployment prep |

### Phase 4 — Listening (Week 6)

| Day | Tasks |
|-----|-------|
| 39-40 | Audio player component (custom controls, speed) |
| 41-42 | `ListeningModule.jsx` — full listening flow |
| 43 | Transcript sync + highlighting |
| 44 | DSE listening simulation mode |
| 45-46 | Adaptive difficulty system |
| 47 | Podcast content integration |

### Phase 5 — Speaking (Week 7)

| Day | Tasks |
|-----|-------|
| 48 | `useSpeech.js` — TTS integration |
| 49-50 | `useAudioRecorder.js` — recording, STT, waveform |
| 51 | `WaveformDisplay.jsx` — visualization component |
| 52-54 | `SpeakingModule.jsx` — full speaking flow |
| 55 | Speaking analysis pipeline (local + AI) |
| 56 | Topic generator (150+ topics) |

### Phase 6 — Polish (Week 8)

| Day | Tasks |
|-----|-------|
| 57-58 | PWA manifest update, service worker caching strategy |
| 59-60 | Offline testing — verify all bundled content works |
| 61-62 | Performance optimization (memo, lazy loading) |
| 63-64 | Settings page — DSE grade boundaries, voice selection |
| 65 | Final integration testing |
| 66 | Bug fixes, edge case handling |

---

## Appendix B: AI Prompts Reference

### B1. Reading MCQ Generation

```
System: You are an expert HKDSE English Reading examiner. Generate
comprehension questions based on the given passage. Follow DSE Paper 1 format.

Key requirements:
- Question types: mainIdea, inference, vocabInContext, detail, tone, purpose
- Each question must have 4 options (A-D), one correct answer
- Distractors must be plausible — students who read carelessly would choose them
- Include a clear explanation for the correct answer
- Total questions: {count} (mix of types)

Return format (JSON only):
[{
  "id": 1,
  "type": "mainIdea",
  "stem": "What is the main argument...?",
  "options": [
    { "label": "A", "text": "..." },
    { "label": "B", "text": "..." },
    { "label": "C", "text": "..." },
    { "label": "D", "text": "..." }
  ],
  "correctAnswer": "B",
  "explanation": "Paragraph 2 states that...",
  "difficulty": "medium"
}]

Passage:
{passage}
```

### B2. Writing Correction

```
System: You are an expert HKDSE English Writing examiner. Evaluate the
student's essay using official DSE marking criteria.

Assess three categories on a scale of 1-7:
1. Content (relevance to prompt, development of ideas, use of examples, awareness of audience/purpose)
2. Organization (coherence, cohesion, paragraphing, logical progression)
3. Language (grammatical accuracy, sentence structure variety, vocabulary range, appropriacy)

For each category provide:
- Score (1-7)
- Justification (2-3 sentences)
- Specific examples from the essay

Additionally:
- List 3-5 specific errors with corrections and explanations
- Suggest 3-5 vocabulary upgrades (original → advanced)
- Provide a DSE level (1-5**)
- Write a 2-3 sentence model opening paragraph

Return JSON:
{
  "content": { "score": 5, "feedback": "...", "subScores": { "relevance": 6, "development": 4, "examples": 5 } },
  "organization": { "score": 5, "feedback": "...", "subScores": { "coherence": 5, "paragraphing": 6, "progression": 4 } },
  "language": { "score": 4, "feedback": "...", "subScores": { "grammar": 4, "vocabulary": 5, "sentenceVariety": 3 } },
  "overall": { "total": 14, "maxTotal": 21, "percentage": 67, "dseLevel": "4" },
  "errors": [
    { "original": "The government should to do more", "correction": "The government should do more",
      "type": "grammar", "rule": "Modal verbs take bare infinitive", "severity": "minor" }
  ],
  "vocabularySuggestions": [
    { "original": "good", "suggestion": "beneficial", "context": "beneficial for students' development" }
  ],
  "modelOpening": "In an era of rapid technological advancement, the integration of artificial intelligence in educational settings has sparked considerable debate..."
}

Prompt: {prompt}
Essay: {essay}
```

### B3. Speaking Analysis

```
System: You are an expert HKDSE English Speaking examiner. Analyze the
student's speech transcript for the topic: "{topic}".

Assess on a scale of 0-100:
1. Pronunciation and Delivery (based on transcript patterns, likely spoken errors)
2. Fluency and Coherence (filler words, logical flow, hesitation patterns)
3. Grammatical Range and Accuracy (sentence structures, errors)
4. Lexical Resource (vocabulary range, topic-specific terms, appropriacy)
5. Ideas and Organization (relevance, structure, development)

Provide:
- Score for each category with 1-2 sentence justification
- 3 specific improvement suggestions
- A model answer (5** level, ~150 words)

Return JSON:
{
  "pronunciation": { "score": 60, "feedback": "Some word-level errors suggest unclear articulation..." },
  "fluency": { "score": 50, "feedback": "Excessive filler words (uhm, like) disrupt flow..." },
  "grammar": { "score": 65, "feedback": "Generally accurate but limited to simple structures..." },
  "vocabulary": { "score": 55, "feedback": "Basic vocabulary, lacks topic-specific terms..." },
  "ideas": { "score": 60, "feedback": "Relevant points but lacks clear structure..." },
  "overall": { "score": 58, "dseLevel": "3" },
  "improvements": [
    "Reduce filler words by pausing silently instead of saying 'uhm'",
    "Use topic-specific vocabulary like 'pedagogical', 'digital literacy', 'interactive learning'",
    "Structure your answer: introduction → 2 main points with examples → conclusion"
  ],
  "modelAnswer": "Technology has fundamentally transformed modern education..."
}

Topic: {topic}
Transcript: {transcript}
```

### B4. Listening Question Generation

```
System: You are an expert HKDSE English Listening examiner. Generate
comprehension questions based on the given transcript.

Key requirements:
- Question types: mainIdea, detailRecall, inference, fillBlank
- MCQs must have 4 options (A-D)
- Fill-in-blank questions must have clear, unambiguous answers (1-3 words)
- Questions should test understanding of key information, not trivial details
- Difficulty: {difficulty}

Return JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "questionType": "mainIdea",
      "stem": "What is the main topic of the talk?",
      "options": [{"label":"A","text":"..."}],
      "correctAnswer": "C",
      "explanation": "The speaker introduces..."
    },
    {
      "id": 2,
      "type": "fillBlank",
      "questionType": "detailRecall",
      "stem": "According to the speaker, ______ is the biggest challenge.",
      "correctAnswer": "funding",
      "acceptableAnswers": ["lack of funding", "insufficient funding"],
      "explanation": "The speaker states: 'The biggest challenge we face is funding'"
    }
  ]
}

Transcript:
{transcript}
```

---

## Appendix C: Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bundle size (initial load) | < 200KB JS + CSS | Vite build report |
| IndexedDB storage (typical user) | < 10MB | `navigator.storage.estimate()` |
| Session save latency | < 100ms | `performance.now()` |
| AI generation latency (reading MCQ) | < 10s | User-perceived wait with loading state |
| Audio recording quality | 16kHz, mono | getUserMedia constraints |
| Speech recognition accuracy (quiet) | > 80% WER | Internal testing |
| Offline functionality | Notes + 5 sample papers + basic speaking | Manual test |
| PWA Lighthouse score | > 90 | Lighthouse audit |
| First Contentful Paint | < 2s | Lighthouse / Web Vitals |

---

**End of transformation plan.**
