# Random Writing Session Generation System — Architecture Plan

> Research and design for composing complete HKDSE English Paper 2 Writing sessions with intelligent prompt selection, rotation, and variety enforcement.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Session Generator Pipeline                        │
│                                                                     │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────────┐  │
│  │ Session Mode  │   │ Prompt Selector  │   │ Session Assembler    │  │
│  │ (both/partA/  │──▶│ (curated bank    │──▶│ (combine A + B,     │  │
│  │  partB)      │   │  → AI fallback   │   │  attach metadata)   │  │
│  └──────────────┘   └─────────────────┘   └──────────────────────┘  │
│                           │                        │                 │
│                           ▼                        ▼                 │
│                    ┌─────────────────┐   ┌──────────────────────┐  │
│                    │ Rotation Engine │   │ Session History Log  │  │
│                    │ (freshness +    │   │ (IndexedDB)          │  │
│                    │  diversity)     │   │                      │  │
│                    └─────────────────┘   └──────────────────────┘  │
│                           │                        │                 │
│                           ▼                        ▼                 │
│                    ┌─────────────────┐   ┌──────────────────────┐  │
│                    │ Difficulty      │   │ User Profile          │  │
│                    │ Calibrator      │   │ (weak areas,         │  │
│                    │ (easy/med/hard) │   │  past sessions)      │  │
│                    └─────────────────┘   └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary prompt source | Curated bank | Human-written prompts match DSE quality, avoid AI artifacts |
| AI role | Fallback + infinite variety | Generate when bank exhausted; also used for targeted weak-area prompts |
| Rotation strategy | Freshness-score + LRU | Track last-used timestamp for each prompt, prefer least-recently-used |
| Diversity enforcement | Domain coverage check | Ensure 3 Part B options span different topic domains |
| Difficulty system | Metadata-based filtering | Prompts tagged with difficulty at curation time |
| Storage | IndexedDB (history) + localStorage (used set) | Used-IDs need sync access; history needs large storage |
| Personalization | Domain selection from notes | Use user's study notes to select relevant topic domains (not content injection) |

---

## 2. Curated Bank Design

### 2.1 Target Scale

| Prompt Type | Minimum Viable | Target (infinite feel) | Stretch Goal |
|-------------|---------------|----------------------|--------------|
| Part A | 25 | 60 | 120+ |
| Part B | 30 | 200 | 500+ |
| **Total** | **55** | **260** | **620+** |

**Why these numbers:**
- Each session consumes 1 Part A + 3 Part B prompts = 4 prompts
- "Infinite feel" ≈ no repeat in 20+ sessions = 80 unique prompts minimum
- 200 Part B prompts = 66 full sessions without repeating any Part B option
- With 3 options per session, 60 Part A / 200 Part B → ~60 unique sessions before any repeat
- Real DSE history (2012–2025): ~14 years × 8 Part B questions = ~112 real prompts — our bank should exceed this

### 2.2 Prompt Data Model (Extended)

```js
{
  id: 'wp-partB-article-042',
  part: 'B',                    // 'A' | 'B'
  type: 'article',              // text type
  title: 'Digital Detox: Should Schools Ban Smartphones?',
  context: 'Your school principal is considering...',
  task: 'Write an article for your school magazine...',
  wordLimit: { min: 380, max: 450 },
  instructions: 'Give your article a title...',
  difficulty: 'medium',         // 'easy' | 'medium' | 'hard'
  source: 'curated',            // 'curated' | 'ai-generated' | 'fallback'
  
  // NEW METADATA FIELDS
  topicDomain: 'technology',    // Primary domain
  topicDomains: ['technology', 'education'],  // Secondary domains for overlap
  subTopic: 'smartphone addiction',
  
  // For Part B: which DSE elective it maps to
  elective: 'Learning English through Social Issues',
  
  // Difficulty breakout
  difficultyFactors: {
    cognitiveLevel: 'analyse',    // Bloom's: remember | understand | apply | analyse | evaluate | create
    abstractionLevel: 3,          // 1=concrete, 5=abstract
    vocabularyLevel: 'B2-C1',    // CEFR: B1 | B2 | C1
    requiredStructure: 'argue',   // argue | describe | narrate | persuade | explain
  },
  
  // Curation info
  createdAt: '2026-07-01',
  reviewedBy: 'examiner',
  qualityScore: 0.92,
}
```

### 2.3 Text Type Distribution (DSE-Aligned)

#### Part A Text Types
| Text Type | Share | Frequency in Real DSE |
|-----------|-------|----------------------|
| Email / Letter | 35% | Most common — formal/informal |
| Announcement / Speech | 25% | Assembly, event announcements |
| Article (short) | 15% | Magazine, newspaper |
| Blog post / Diary entry | 10% | Personal, reflective |
| Report (short) | 10% | Event report, survey findings |
| Review / Recommendation | 5% | Book, movie, restaurant |

#### Part B Text Types (per DSE Electives)
| Text Type | DSE Elective | Recommended Share |
|-----------|-------------|-------------------|
| Article | Social Issues / Popular Culture | 20% |
| Letter (formal) | Workplace Communication / Social Issues | 15% |
| Speech | Debating / Sports Communication | 15% |
| Report | Workplace Communication | 10% |
| Story | Short Stories | 10% |
| Blog | Popular Culture | 10% |
| Review | Popular Culture / Arts | 10% |
| Proposal | Workplace Communication | 5% |
| Journal/Diary | Poems & Songs / Drama | 5% |

### 2.4 Topic Domain Coverage

Primary domains (each should have 10-30 prompts):

1. **Education** — school life, exams, study methods, online learning
2. **Technology** — AI, social media, digital literacy, smartphones
3. **Environment** — climate change, pollution, conservation, sustainability
4. **Health & Wellbeing** — mental health, exercise, diet, stress
5. **Media & Culture** — pop culture, traditional arts, social media, journalism
6. **Social Issues** — inequality, urban development, diversity, community
7. **Work & Careers** — job market, workplace communication, entrepreneurship
8. **Sports & Recreation** — sports events, teamwork, hobbies
9. **Family & Relationships** — intergenerational, friendship, community
10. **Global Affairs** — international cooperation, travel, cultural exchange

Diversity constraint: A generated session must have Part B options spanning ≥2 different domains.

---

## 3. Rotation Engine

### 3.1 Prompt Selection Algorithm

```
Session Generation:
  1. Read used-prompts set from localStorage (crescendo-used-writing-prompts)
  2. Read session history from IndexedDB (last 50 sessions)
  3. Calculate freshness score for each prompt:
     freshness = (daysSinceLastUsed × 2) + (usageCount × -1)
     Higher = more likely to be selected next
  4. For Part A: pick 1 prompt with highest freshness score matching difficulty filter
  5. For Part B: pick 3 prompts with highest freshness scores, enforcing:
     - Each must have different topicDomain (span ≥2 domains)
     - Each must have different text type (or at minimum 2 different types)
     - All must match difficulty filter
  6. If pool is too small for constraints → clear used-prompts set and retry
  7. If still insufficient → fall back to AI generation
```

### 3.2 LRU Cache with Freshness Scoring

```js
// In writingPrompts.js — upgrade from simple Set to scored system

function calculateFreshness(promptId, usedSet, sessionHistory) {
  const lastUsed = usedSet.get(promptId)?.lastUsed; // timestamp
  const usageCount = usedSet.get(promptId)?.count || 0;
  
  if (!lastUsed) return 1000; // Never used = maximum freshness
  
  const daysSinceUse = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
  return (daysSinceUse * 10) - (usageCount * 5);
}

function getBestPrompts(part, count, options = {}) {
  const {
    difficulty = null,
    excludeDomains = [],
    excludeTypes = [],
    requireDiversity = true,
  } = options;
  
  const used = getUsedPromptMetadata(); // Map<id, {lastUsed, count}>
  let available = getPromptsByPart(part);
  
  // Apply filters
  if (difficulty) available = available.filter(p => p.difficulty === difficulty);
  if (excludeDomains.length) available = available.filter(p => !excludeDomains.includes(p.topicDomain));
  if (excludeTypes.length) available = available.filter(p => !excludeTypes.includes(p.type));
  
  // Score and sort
  available.sort((a, b) => calculateFreshness(b.id, used) - calculateFreshness(a.id, used));
  
  // Diversity filter (Part B only)
  if (requireDiversity && part === 'B' && count > 1) {
    return selectDiverseSubset(available, count);
  }
  
  return available.slice(0, count);
}
```

### 3.3 Diversity Selection Algorithm (Part B)

```js
function selectDiverseSubset(candidates, count) {
  // Greedy selection: pick highest-scored, then enforce diversity on rest
  const selected = [candidates[0]];
  const usedDomains = new Set([candidates[0].topicDomain]);
  const usedTypes = new Set([candidates[0].type]);
  
  for (let i = 1; i < candidates.length && selected.length < count; i++) {
    const c = candidates[i];
    const domainOk = c.topicDomain !== candidates[0].topicDomain; // must differ from first
    const typeOk = c.type !== candidates[0].type || selected.length >= 2;
    
    if (domainOk || typeOk) {
      selected.push(c);
      usedDomains.add(c.topicDomain);
      usedTypes.add(c.type);
    }
  }
  
  // If still short, fill with best remaining regardless
  for (let i = 1; i < candidates.length && selected.length < count; i++) {
    if (!selected.includes(candidates[i])) {
      selected.push(candidates[i]);
    }
  }
  
  return selected.slice(0, count);
}
```

### 3.4 Used-Prompt Metadata Storage

```js
// Upgrade from Set to Map with metadata
const USED_METADATA_KEY = 'crescendo-used-writing-prompts-meta';

function getUsedPromptMetadata() {
  try {
    const raw = localStorage.getItem(USED_METADATA_KEY);
    return raw ? new Map(Object.entries(JSON.parse(raw))) : new Map();
  } catch { return new Map(); }
}

function markPromptUsed(id) {
  const meta = getUsedPromptMetadata();
  const existing = meta.get(id) || { count: 0, firstUsed: Date.now() };
  meta.set(id, {
    lastUsed: Date.now(),
    count: existing.count + 1,
    firstUsed: existing.firstUsed,
  });
  // Convert Map to object for JSON serialization
  localStorage.setItem(USED_METADATA_KEY, JSON.stringify(Object.fromEntries(meta)));
}

function clearUsedPrompts() {
  localStorage.removeItem(USED_METADATA_KEY);
}
```

---

## 4. Difficulty Scaling

### 4.1 Difficulty Tiers

| Tier | Label | Characteristics | Prompt Difficulty Tags | Target User |
|------|-------|----------------|----------------------|-------------|
| 1 | Easy | Concrete topics (school life, hobbies), simple text types (email, blog), B1-B2 vocabulary | easy | New users, weak writers, Form 4-5 |
| 2 | Medium | Mixed topics, standard text types (article, letter, speech), B2 vocabulary | medium | Most users, Form 5-6 |
| 3 | Hard | Abstract topics (ethics, global affairs), complex types (proposal, report), C1 vocabulary | hard | Advanced users, targeting 5*/5** |

### 4.2 Difficulty Calibration Logic

```js
function getRecommendedDifficulty(userProfile) {
  const { writing } = userProfile;
  if (!writing || writing.totalSessions < 3) return 'easy';
  const avgScore = writing.overall;
  if (avgScore >= 80) return 'hard';
  if (avgScore >= 50) return 'medium';
  return 'easy';
}

function getDifficultyOptions(userProfile) {
  const recommended = getRecommendedDifficulty(userProfile);
  // Offer adjacent levels for mixing
  if (recommended === 'easy') return ['easy', 'medium'];
  if (recommended === 'hard') return ['medium', 'hard'];
  return ['easy', 'medium', 'hard'];
}
```

### 4.3 UI Integration

```
┌──────────────────────────────────────────┐
│  Select Difficulty:                       │
│  ○ Easy (F4-F5 level)                     │
│  ● Medium (Standard DSE)  ← default      │
│  ○ Hard (5*+ challenge)                   │
│                                          │
│  Or: [🎯 Smart Difficulty] (auto-adapt)   │
└──────────────────────────────────────────┘
```

---

## 5. Session Metadata

### 5.1 Session Data Model

```js
{
  // Core session identifier
  id: 'writing_ses_20260701_abc123',
  type: 'practice',              // 'practice' | 'exam' | 'custom'
  practiceMode: 'both',          // 'both' | 'partA' | 'partB'
  difficulty: 'medium',          // 'easy' | 'medium' | 'hard' | 'auto'
  
  // Timestamps
  createdAt: '2026-07-01T10:00:00Z',
  startedAt: '2026-07-01T10:00:00Z',
  completedAt: '2026-07-01T12:00:00Z',
  duration: 7200,                // seconds
  
  // Part A tracking
  partA: {
    promptId: 'wp-partA-email-001',
    source: 'curated',           // 'curated' | 'ai-generated' | 'fallback'
    type: 'email',
    topicDomain: 'education',
    difficulty: 'easy',
    wordCount: 245,              // user's actual word count
    correctionId: 'corr_a_001',  // link to correction result
  },
  
  // Part B tracking
  partB: {
    chosenOption: 1,             // 0, 1, or 2
    options: [
      { promptId: 'wp-partB-article-042', source: 'curated', type: 'article', topicDomain: 'technology', difficulty: 'medium' },
      { promptId: 'wp-partB-letter-018', source: 'curated', type: 'letter', topicDomain: 'environment', difficulty: 'medium' },
      { promptId: 'ai_partB_1719800000_a1b2', source: 'ai-generated', type: 'speech', topicDomain: 'education', difficulty: 'medium' },
    ],
    wordCount: 420,
    correctionId: 'corr_b_001',
  },
  
  // Combined AI correction result
  dseLevel: '4',
  
  // Personalization info
  personalizedFromNotes: false,
  matchedDomains: ['technology'],  // domains matched to user's notes
  
  // Quality tracking
  generationAttempts: 1,
  generationErrors: [],
}
```

### 5.2 Storage Strategy

| Data | Storage | Key | Retention |
|------|---------|-----|-----------|
| Used prompt metadata | localStorage | `crescendo-used-writing-prompts-meta` | Permanent |
| Session history | IndexedDB | `crescendo-writing-sessions` | Last 100 sessions |
| Active session | sessionStorage | `crescendo-writing-session` | Until completed |
| Correction results | IndexedDB | `crescendo-writing-corrections` | Last 100 corrections |

---

## 6. AI Generation Fallback

### 6.1 When AI Generation Triggers

1. **Curated bank exhausted** — all prompts have been used and freshness reset would produce same results
2. **Difficulty gap** — insufficient curated prompts at requested difficulty level
3. **Domain gap** — cannot find prompts matching user's weak areas from notes
4. **Freshness reset loop** — bank is small enough that resetting used-set produces same old prompts
5. **User requests "AI Only"** — power user option for maximum variety

### 6.2 Quality Improvements for AI-Generated Prompts

Current issues with AI-generated prompts (from code analysis):
- Temperature 0.8-0.9 produces creative but sometimes unrealistic prompts
- Text type selection is random, not diversity-aware
- No validation of generated prompt quality
- JSON parsing is fragile

Improvements:

```js
async function generateWritingSessionWithAI(options) {
  const { difficulty, preferDomains = [], callAI } = options;
  
  // Select text types with diversity constraint
  const partAType = selectBestType('A', []);
  const partBTypes = selectDiverseTypes('B', 3, []); // Ensure 3 distinct types
  
  const prompt = buildAIPrompt({
    partAType,
    partBTypes,
    difficulty,
    preferDomains,
    // Inject constraints, NOT note content
    constraints: {
      realisticHKContext: true,
      noBulletHints: true,
      dseFormatStrict: true,
      difficulty,
    },
    // Only include domain preferences from notes, not note text
    domainHints: preferDomains.length ? 
      `Suggested domains: ${preferDomains.join(', ')}. Choose at least one prompt from these domains.` 
      : '',
    // Reference real DSE patterns for authenticity
    dsePatternReference: getRecentDSETrends(),
  });
  
  const raw = await callAI(prompt, {
    system: getWritingGenerationSystemPrompt(difficulty),
    temperature: 0.4, // Reduced from 0.8 for more reliable output
    maxTokens: 2000,
  });
  
  const parsed = validateGeneratedPrompts(raw);
  if (!parsed.valid) {
    // Retry with stricter prompt
    return retryWithStricterPrompt(raw.errors);
  }
  
  return parsed.session;
}
```

### 6.3 AI Generation System Prompt (Improved)

```
You are an expert HKDSE English examiner who has set Paper 2 Writing papers for 15+ years.

Generate a REALISTIC HKDSE Paper 2 Writing session with:

PART A (1 task):
- Text type: {type}
- A practical, real-world scenario relevant to Hong Kong students
- The student has a clear role (e.g., "You are a Form 6 student...")
- 2-3 specific things to cover (incorporated naturally into the task, NOT as bullet hints)
- Word limit: ~200 words
- Difficulty level: {difficulty}

PART B (3 tasks, all different text types and topic domains):
- Text types: {type1}, {type2}, {type3}
- Each must have a DIFFERENT topic domain
- Each provides a realistic scenario with clear task instruction
- NO bullet points or suggested points (real DSE gives NO hints)
- Word limit: ~400 words each
- Hong Kong context preferred but global topics acceptable
- Difficulty level: {difficulty}

{domainHints}

CRITICAL RULES:
- Do NOT include "suggestedPoints" array — real DSE has no bullet hints
- Each Part B task must be completable in 400 words
- Topics must be appropriate for 17-18 year old students
- Scenarios should feel authentic to Hong Kong secondary school life
- Return ONLY valid JSON — no markdown, no code blocks, no extra text

DSE PART B ELECTIVE REFERENCE:
The 8 DSE electives are: Social Issues, Workplace Communication, Sports Communication, 
Popular Culture, Short Stories, Poems & Songs, Drama, Debating. 
At least 2 of the 3 Part B tasks should clearly map to these electives.
```

---

## 7. User Note Integration (Personalization)

### 7.1 Approach: Domain Matching, NOT Content Injection

**Problem with current approach**: Injecting raw note content into AI prompts risks:
- AI plagiarizing from user's notes
- Prompts that feel irrelevant because they reference obscure notes
- Breaking the authentic DSE feel (real DSE doesn't add "inspiration")

**Better approach**: Determine topic domain preferences from notes, then select or generate prompts in those domains.

```
┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│ User's Notes     │───▶│ Domain Extractor    │───▶│ Prompt Filter       │
│ (tagged content) │    │ (analyze tags +     │    │ (select prompts in  │
│                  │    │  content keywords)  │    │  preferred domains) │
└──────────────────┘    └────────────────────┘    └─────────────────────┘
                                │                           │
                                ▼                           ▼
                         ┌────────────────────┐    ┌─────────────────────┐
                         │ Domain Rankings     │    │ AI Domain Hint      │
                         │ 1. technology  45%  │    │ (inject as soft     │
                         │ 2. environment 30%  │    │  preference, not    │
                         │ 3. health      25%  │    │  hard constraint)   │
                         └────────────────────┘    └─────────────────────┘
```

### 7.2 Implementation

```js
function extractPreferredDomains(notes) {
  // Score domains by weighted note analysis
  const domainKeywords = {
    technology: ['AI', 'computer', 'digital', 'smartphone', 'social media', 'internet', 'app'],
    environment: ['climate', 'pollution', 'plastic', 'green', 'sustainable', 'recycle'],
    health: ['exercise', 'mental health', 'stress', 'diet', 'wellness'],
    education: ['study', 'exam', 'school', 'university', 'learning', 'teacher'],
    // ... more domains
  };
  
  const scores = {};
  notes.forEach(note => {
    const text = (note.title + ' ' + note.content).toLowerCase();
    // Check tags first (stronger signal)
    (note.tags || []).forEach(tag => {
      Object.entries(domainKeywords).forEach(([domain, keywords]) => {
        if (keywords.some(kw => tag.toLowerCase().includes(kw))) {
          scores[domain] = (scores[domain] || 0) + 3; // tag match = high weight
        }
      });
    });
    // Check content (weaker signal)
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      const matches = keywords.filter(kw => text.includes(kw)).length;
      if (matches > 0) {
        scores[domain] = (scores[domain] || 0) + matches * 0.5;
      }
    });
  });
  
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)
    .map(([domain]) => domain)
    .slice(0, 3);
}
```

### 7.3 Personalization Strength Settings

| Level | Behavior | Use Case |
|-------|----------|----------|
| Off | No personalization, pure random | Standard practice |
| Light | Prefer domains matching notes but still ensure variety | Default — balanced |
| Medium | Strongly prefer matching domains, use AI to fill gaps | Targeted weak-area practice |
| Custom | User manually selects domains from a list | User-directed practice |

---

## 8. Practice Mode Integration

### 8.1 Mode Behavior Matrix

| Mode | Part A | Part B | Timer | Workflow |
|------|--------|--------|-------|----------|
| Both Parts (Full DSE) | Generate 1 prompt | Generate 3 options | 2 hours | Part A → Part B → Submit Both |
| Part A Only | Generate 1 prompt | None | 30 min | Part A → Submit |
| Part B Only | None | Generate 3 options | 90 min | Select → Part B → Submit |
| Custom | User writes own | User writes own | Untimed | Submit for correction |

### 8.2 Generation Cost Savings by Mode

| Mode | Part A calls | Part B calls | Total AI calls |
|------|-------------|-------------|----------------|
| Both (curated) | 0 (from bank) | 0 (from bank) | 0 |
| Both (fallback) | 1 | 1 | 2 |
| Part A Only | 0 (from bank) | N/A | 0 |
| Part B Only | N/A | 0 (from bank) | 0 |

---

## 9. Competitive Analysis

### Competitor Landscape

| Tool | Prompt Generation | AI Grading | Prompt Rotation | Difficulty Scaling | Personalization |
|------|------------------|------------|-----------------|-------------------|-----------------|
| **AfterSchool** | ❌ (static resources) | ❌ | ❌ | ❌ | ❌ |
| **EHLA** | ✅ (80-100 curated topics) | ✅ (AI + human) | ❌ (fixed set) | ✅ (3 tiers) | ❌ (batch) |
| **dse.best** | ❌ (user provides prompt) | ✅ (AI grading) | ❌ | ❌ | ❌ |
| **thinka.ai** | ✅ (AI-generated papers) | ✅ | ❌ | ❌ | ❌ |
| **Crescendo (current)** | ✅ (20 curated + AI) | ✅ | ✅ (basic LRU) | ❌ (ignores difficulty) | ⚠️ (basic note injection) |
| **Crescendo (target)** | ✅ (60+ curated + AI) | ✅ | ✅ (freshness-scored) | ✅ (3-tier) | ✅ (domain matching) |

### Gap Analysis

| What competitors don't do well | Our opportunity |
|------------------------------|-----------------|
| Smart rotation to avoid repeats | Freshness-scored selection with diversity enforcement |
| Difficulty-aware prompt selection | 3-tier tagging + auto-recommendation |
| Personalization from study data | Domain matching from user's notes |
| Session history tracking for analytics | Full session metadata in IndexedDB |
| Multi-mode practice (both/partA/partB) | Already implemented but can improve generation |
| Diversity in Part B options | Domain + text-type diversity constraint |

---

## 10. Scale Planning

### 10.1 How Many Prompts to Feel "Infinite"

Based on common edtech UX research and spaced repetition literature:

| Usage Frequency | Sessions/Week | Weeks Before Repeat (200 prompts) | Weeks Before Repeat (60 prompts) |
|----------------|--------------|----------------------------------|----------------------------------|
| Light | 1 session | 50 weeks | 15 weeks |
| Moderate | 2 sessions | 25 weeks | 7.5 weeks |
| Heavy | 3 sessions | 16.7 weeks | 5 weeks |
| Exam cram | 5 sessions | 10 weeks | 3 weeks |

**Recommendation for "infinite" feel:**
- **Target**: No repeat within 12 weeks of moderate use (2 sessions/week)
- **Formula**: 2 sessions/week × 12 weeks × 4 prompts/session = 96 prompts
- **Minimum viable bank**: 100 prompts (25 Part A + 75 Part B)
- **Target bank**: 260 prompts (60 Part A + 200 Part B)
- **With AI fallback**: Can feel infinite even with smaller bank

### 10.2 Prompt Acquisition Strategy

| Source | Quantity | Quality Level | Effort |
|--------|----------|--------------|--------|
| Real DSE past papers (2012-2025) | ~50 prompts | ★★★★★ (authentic) | Low (curation only) |
| Human-written by tutor | ~100 prompts | ★★★★☆ (high) | Medium (needs review) |
| AI-generated + human reviewed | ~100 prompts | ★★★☆☆ (good with fixes) | Medium |
| Pure AI generation (fallback) | Unlimited | ★★☆☆☆ (variable) | None |

---

## 11. Data Flow Summary

```
User clicks "Start Writing Practice"
  │
  ├─▶ Read practice mode (both/partA/partB)
  ├─▶ Read user profile for difficulty recommendation
  ├─▶ Read user notes for domain preferences
  │
  ├─▶ Generate Part A prompt:
  │     ├─▶ GetAvailablePrompts('A', 1, {difficulty, excludeDomains})
  │     ├─▶ If found → markUsed, cache
  │     └─▶ If NOT found → AI generate with domain hints → validate → cache
  │
  ├─▶ Generate Part B options (3):
  │     ├─▶ GetAvailablePrompts('B', 3, {difficulty, requireDiversity: true})
  │     ├─▶ If found (3 options with diversity) → markUsed each, cache
  │     └─▶ If NOT found → AI generate 3 with diversity constraint → validate → cache
  │
  ├─▶ Assemble session:
  │     ├─▶ Create session metadata object
  │     ├─▶ Set 2-hour timer
  │     └─▶ Present to user for choosing/editing
  │
  └─▶ User confirms → Writing phase begins
```

---

## 12. Migration Path (from Current to Target)

| Step | Change | Effort | Impact |
|------|--------|--------|--------|
| 1 | Add `topicDomain` field to existing 20 prompts | 1 hour | ✅ Enables diversity tracking immediately |
| 2 | Add `difficulty` field to existing prompts | 30 min | ✅ Enables difficulty filtering |
| 3 | Replace `Set` with `Map` in `markPromptUsed` | 2 hours | ✅ Better rotation analytics |
| 4 | Implement `selectDiverseSubset` for Part B | 3 hours | ✅ Eliminates same-domain options |
| 5 | Expand curated bank to 60 prompts | 2-3 days | ✅ Core improvement |
| 6 | Add difficulty UI selector | 4 hours | ✅ User-facing feature |
| 7 | Implement domain extraction from notes | 4 hours | ✅ Personalization |
| 8 | Add session history with full metadata | 4 hours | ✅ Analytics foundation |
| 9 | Improve AI generation prompt with constraints | 2 hours | ✅ Better fallback quality |

---

## 13. Open Questions for Domain Experts

1. **Difficulty calibration**: How do real DSE examiners differentiate easy vs hard prompts? Is it topic, vocabulary, or expected structure? We need a DSE tutor to validate our 3-tier tagging.

2. **Personalization boundary**: How much domain matching is too much? If a student always writes about technology, real DSE could have an unrelated topic. Should we cap same-domain sessions?

3. **Prompt reuse threshold**: After a student has used all prompts, how long before prompts should become available again? 1 month? 3 months? Never for used prompts?

4. **AI generation evaluation**: What criteria should a domain expert use to evaluate AI-generated prompts for authenticity? We need a structured review rubric.
