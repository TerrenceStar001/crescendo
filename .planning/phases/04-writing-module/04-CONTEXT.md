# Phase 4: Writing Module DSE Authenticity — Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Overhaul the Writing Module (HKDSE Paper 2) to match real DSE in prompt variety, AI correction quality, rubric scoring, and exam experience. Covers: prompt generation (Part A + Part B, all text types), AI correction with exact HKEAA rubric, detailed categorized error feedback, DSE-authentic exam UI, and session history.

**Scope:** Writing Module only. Listening/Speaking modules are separate phases. The existing Reading Module patterns should be reused where applicable (e.g., dseGrading.js, useIndexedDB, CSS theming).

</domain>

<decisions>
## Implementation Decisions

### Prompt Text Types & Format

- **D-01:** Full DSE format — Part A (short, compulsory) + Part B (long, choose from ~8 options). No B1/B2 split (that's Paper 1 only).
- **D-02:** All 8 DSE text types: article, letter, speech, report, story, blog, review, proposal.
- **D-03:** Hybrid prompt source — curated bank (~20 per text type) stored in `src/assets/writing-prompts.json` (JSON file, same pattern as `bundled-content.json`), plus AI generation for variety when online.
- **D-04:** Prompt bank uses full metadata per entry: `{ id, part, type, title, context, task, wordLimit, suggestedPoints, instructions, difficulty, source }`.
- **D-05:** Part B presents **4 options** for the student to choose from — matches post-2024 DSE curriculum reform. 8-option format was pre-2024 (tied to elective modules). Use 4 options for authenticity.
- **D-06:** Single 2-hour countdown timer (no split between Part A/B). Student manages their own time.
- **D-07:** Full DSE prompt card display: context paragraph, task instructions, bullet-point requirements, word limit, text type badge.
- **D-08:** Used prompts tracked in localStorage to avoid repeats.
- **D-09:** Topic domains cover all DSE-relevant areas: social issues, education, environment, technology, health, media, culture, career, sports.
- **D-10:** Part A text types are practical/functional: email, letter, blog comment, questionnaire response, short article, speech (confirmed from 2020-2024 past papers).

### Correction Rubric Depth

- **D-11:** Exact HKEAA rubric format — **researcher MUST find official HKEAA Paper 2 marking scheme**. This is a critical research dependency.
- **D-12:** AI returns rubric scores as structured JSON (AI handles scoring in the correction prompt).
- **D-13:** DSE level calculated via existing `dseGrading.js` utility (consistent across modules).
- **D-14:** Type-adjusted rubric — different scoring criteria per text type (story vs letter vs proposal).
- **D-15:** AI correction includes overall narrative summary comment (strengths, weaknesses, improvement tips).

### Error Categorization & Feedback Detail

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

### Exam Environment UI

- **D-27:** DSE answer booklet editor with ruled lines, margins, and exam-style header.
- **D-28:** Full DSE exam header: "HKDSE English Language Paper 2 — Writing", candidate info, instructions.
- **D-29:** No word count display during writing (authentic DSE experience — no external aids).
- **D-30:** Exam-style timer shows HH:MM:SS with prominent warnings at 30min, 15min, 5min.
- **D-31:** Sound alerts at key intervals (configurable on/off).
- **D-32:** Full-screen distraction-free mode during exam (no sidebar nav visible).
- **D-33:** Fully responsive for desktop + tablet (matching Reading Module breakpoints at 1024px/768px).

### Prompt Bank & Session Management

- **D-34:** Auto-save essay every 30 seconds to IndexedDB with crash recovery on browser refresh.
- **D-35:** Browseable session history (essay text, correction results, scores) stored in IndexedDB via useIndexedDB.
- **D-36:** Side-by-side session comparison to track score and error pattern changes over time.

### Planning Resolved Decisions

- **D-37:** Part B: generate all 4 options in a single AI call into one JSON array.
- **D-38:** Correction: separate AI calls per part (Part A → submit → correct → Part B → submit → correct → combined results).
- **D-39:** Timer expiry: auto-submit at 0 (matches Reading Module pattern). No soft-stop or grace period.

### the agent's Discretion

- Part A specific text type distribution — researcher to verify from real papers
- Auto-save debounce timing — 30s was discussed but agent can adjust
- Sound alert implementation (Web Audio API vs HTML Audio)
- Exact responsive breakpoint values (match existing Reading Module)
- CSS naming conventions for new components

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, phase boundary
- `.planning/REQUIREMENTS.md` — Any new Writing requirements to be added
- `.planning/PROJECT.md` — Core project context, constraints, existing feature list

### Existing Writing Module Code
- `src/components/WritingModule.jsx` — Current 347-line implementation. Target for rewrite.
- `src/hooks/useDSEPapers.js` — Contains `generateWritingPrompt()` — needs refactoring for Part A/B + text types
- `src/hooks/useAI.js` — AI endpoint management, `callAI` function
- `src/hooks/useIndexedDB.js` — IndexedDB wrapper for session history storage
- `src/utils/dseGrading.js` — DSE level calculation utility (to reuse for writing)
- `src/utils/structuralConstraints.js` — DSE structural rules (may need writing-specific additions)
- `src/components/ReadingModule.jsx` — Reference pattern for phase state machine, timer, results display
- `src/components/ReadingResults.jsx` — Reference for results composition pattern
- `src/App.css` — All styles. Needs new `.writing__*` sections matching BEM naming.

### Research Sources (to consult)
- Official HKEAA Paper 2 marking scheme (rubric criteria, score distribution)
- HKDSE 2020-2024 Paper 2 past papers (Part A/B format, option count, text type distribution)
- HKEAA examiner reports for Paper 2 (common errors, marking guidelines)

### Bundled Content Pattern
- `src/assets/bundled-content.json` — Reference pattern for the writing prompts JSON file

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/dseGrading.js` — `scoreToDseLevel()`, `computeWeightedScore()` — reuse for writing score→level mapping
- `src/hooks/useIndexedDB.js` — `setItem`/`getItem` for session history storage (same DB `CrescendoDSE`)
- `src/components/ReadingModule.jsx` — Phase state machine pattern (`start`→`writing`→`submitted`→`feedback`), timer, results display, flagging
- `src/components/QuestionRenderer.jsx` — Could potentially be adapted for drill-type writing prompts
- `src/App.css` — CSS custom properties (`--color-*`), `.reading__*` BEM patterns to replicate for `.writing__*`
- `src/assets/bundled-content.json` — File structure pattern for the writing prompts bank

### Established Patterns
- **Phase state machine:** Each DSE module manages its own internal phases. Writing Module should follow same pattern with start→writing→feedback states.
- **Timer via useRef + setInterval:** Reading Module pattern (clearInterval on unmount, auto-submit at 0).
- **AI via callAI:** All AI calls go through `useAI.js` — correction prompt must follow same pattern.
- **IndexedDB sessions:** `useIndexedDB` already used for Reading sessions — Writing sessions can use the same DB with a different key prefix.
- **CSS custom properties:** All styling uses `--color-*` tokens. New writing CSS must follow BEM with `.writing__*` naming.
- **Silent error handling:** `try/catch {}` pattern for recoverable failures (AI parse errors, storage quota).

### Integration Points
- `App.jsx` — Sidebar nav item already exists ("Writing"), WritingModule is already imported and rendered
- `SidebarNav.jsx` — Writing nav item already wired
- `useDSEPapers.js` — `generateWritingPrompt()` function needs Part A/B branching + text type awareness
- `useSkillAnalytics.js` — Writing session recording already exists (recording skills analytics for writing)
- `useIndexedDB.js` — New `DSE_KEYS.writingSessions` key for session history storage

### Creative Options
- The "re-submit and compare" feature opens the door to a progress-over-time view (like Reading's error pattern tracking but for writing)
- The curated prompt bank could be contributed by teachers as a community resource

</code_context>

<specifics>
## Specific Ideas

- Part B must present multiple options for the student to choose from — AI pick is NOT authentic. Researcher must verify exact format from real DSE papers.
- B1/B2 difficulty split is Paper 1 only — Writing Paper 2 has Part A (short, compulsory) and Part B (long, choose from options).
- No word count display during writing to match real DSE exam conditions.
- The correction experience should feel like a real DSE examiner's feedback — detailed, rubric-referenced, with specific examples from the essay.
- Inline annotations in the essay text should use color coding: red=grammar, orange=vocabulary, blue=structure.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Writing Module DSE Authenticity*
*Context gathered: 2026-06-25*
