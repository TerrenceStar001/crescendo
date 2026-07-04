# AI Specification — Crescendo

> Design contract for AI features in the Crescendo DSE English learning platform.

---

## 1. System Overview

### 1a. System Type

**Primary classification**: Content Generation + Conversational (Hybrid)

The system generates HKDSE English Paper 2 Writing sessions (prompts and correction) on demand, with a pipeline that prioritizes curated human-written prompts and falls back to AI generation when the curated pool is insufficient. The AI also provides essay correction using IELTS Writing band descriptors.

| Subsystem | Type | Description |
|-----------|------|-------------|
| Session Generation | Content Generation | Produces Part A + 3 Part B writing prompts per session |
| Essay Correction | Conversational | Evaluates student essays using IELTS/DSE rubric criteria |
| Study Notes Generation | Content Generation | Creates post-practice analysis notes from correction results |
| Prompt Bank Rotation | Data-driven selection | Selects prompts from curated bank using freshness scoring |

### 1b. Domain Context

**Industry Vertical:** Hong Kong secondary education / examination preparation (HKDSE)

**User Population:** Hong Kong secondary school students (Form 4–6, ages 16–18) preparing for the HKDSE English Language examination. Users are native Cantonese speakers with intermediate to advanced English proficiency (CEFR B2–C1 target). They are digital-native teenagers who expect mobile-first, instant-feedback tools. Their primary motivation is exam score improvement (targeting Level 4 to 5**).

**Stakes Level:** High

Students practice with the system to build writing skills for a high-stakes public examination. Poor-quality prompts (inauthentic, off-topic, incorrectly formatted) waste limited preparation time. AI-generated correction errors (hallucinated mistakes, inflated grades, missed errors) can mislead students about their actual ability level. Downstream consequence: a student enters the real DSE exam with a false sense of their writing proficiency, potentially underperforming on exam day.

**Output Consequence:** When a student acts on AI-generated feedback (e.g., believing a grammar rule is correct when it isn't, or assuming their essay structure is fine when it needs work), they may reinforce bad habits or misallocate study time. When prompts are inauthentic, students practice the wrong task type or write at the wrong difficulty level.

---

#### What Domain Experts Evaluate Against

Domain experts in this context are: (a) experienced HKDSE English tutors/trackers, (b) HKEAA-examiner-adjacent teachers who have attended marking briefings, and (c) professional DSE curriculum developers. They evaluate the AI system against these dimensions:

**Dimension: Prompt Authenticity (DSE Fidelity)**
- Good (domain expert would accept): The prompt follows HKEAA Paper 2 conventions — Part A is a practical short task (~200 words, specific role + 2–3 things to cover without bullet hints); Part B option matches a real DSE elective, provides a realistic scenario, gives a clear task instruction without suggested points, and uses exam-standard phrasing ("You are a student who...", "Write an article for...", etc.)
- Bad (domain expert would flag): The prompt includes bullet-point hints or suggested points (real DSE Part B has none); uses non-DSE text types; the scenario is unrealistic for Hong Kong students; the task instruction is vague or impossible to complete in the word limit; AI-invented context that no real DSE paper would use
- Stakes: Critical
- Source: HKEAA past papers (2012–2025), HKEAA examiner reports, DSE curriculum guidelines

**Dimension: Topic & Domain Coverage**
- Good (domain expert would accept): Over any 10 consecutive sessions, Part B options cover at least 5 of the 8 DSE electives (Social Issues, Workplace Communication, Sports Communication, Popular Culture, Short Stories, Poems & Songs, Drama, Debating) and at least 6 different text types; no two options in the same session share a topic domain
- Bad (domain expert would flag): The same elective (e.g., Social Issues) appears in 3+ consecutive sessions; all 3 Part B options are the same text type (e.g., all articles); a DSE elective (e.g., Short Stories or Drama) never appears across 20+ sessions; prompts are clustered in only 2–3 topic domains
- Stakes: High
- Source: HKEAA examination report statistics on elective popularity, DSE Paper 2 marking schemes

**Dimension: Difficulty Appropriateness**
- Good (domain expert would accept): A student who scores consistently at Level 3 sees primarily easy-to-medium prompts; the system escalates difficulty as the student improves; difficulty is based on topic abstraction, vocabulary level, and cognitive demand (not just word count)
- Bad (domain expert would flag): A Level 1 student receives a prompt about workplace ethics requiring C1 vocabulary; a 5**-level student keeps getting "Describe your favourite hobby" prompts AI-labeled as "hard"; all prompts feel the same difficulty regardless of the tag
- Stakes: High
- Source: DSE curriculum mapping, CEFR vocabulary bands, Bloom's taxonomy applied to writing tasks

**Dimension: Rotation & Variety**
- Good (domain expert would accept): A student who practices 2 sessions/week does not see the same Part A prompt within 8 weeks or the same Part B topic within 12 weeks; when a prompt is reused after the freshness reset, at least 6 weeks have passed; the system tracks used prompts with metadata (last used, usage count)
- Bad (domain expert would flag): The same prompt appears 2 sessions in a row; after 5 sessions the student has cycled through all available prompts and starts seeing repeats; the "used prompt" reset happens mid-session because the bank is too small
- Stakes: Medium
- Source: Edtech UX research on question bank rotation, spaced repetition literature

**Dimension: Personalization Boundary**
- Good (domain expert would accept): Personalization selects topic domains matching the student's study notes (e.g., if notes are 60% technology-related, technology-related prompts appear more often but not exclusively); the student still encounters unrelated domains to simulate real DSE conditions; personalization is transparent ("2 of your 3 options are in domains you've studied — click here to see why")
- Bad (domain expert would flag): All prompts are about the student's note topics (narrow preparation); note content is injected into the prompt text (breaks authenticity); personalization creates a filter bubble where the student never practices domains they're weak in
- Stakes: Medium
- Source: Cognitive science on retrieval variety, DSE preparation best practices

---

#### Known Failure Modes in This Domain

These are domain-specific failure modes documented in DSE English education research and tutor experience — not generic AI failure modes:

1. **Inauthentic Part A formats**: AI-generated Part A prompts sometimes include bullet-point hints or structured tables ("Fill in Section A, B, C"), but real HKDSE Part A since ~2019 uses integrated task instructions without explicit bullet hints. Students trained on AI prompts with hints perform worse on real DSE because they lose the scaffolding. *Mitigation: Strict prompt template that bans "suggestedPoints" or "bulletHints".*

2. **Cultural context mismatch**: AI generates generic prompts set in "the UK" or "the US" without Hong Kong-specific context. DSE Paper 2 is explicitly Hong Kong-contextual. A prompt about "winter snow days" or "prom night" is instantly recognizable as inauthentic to HK students. *Mitigation: System prompt requires "realistic Hong Kong context" and provides examples of acceptable HK scenarios.*

3. **Elective blind spots**: The 8 DSE electives are not equally well-handled by AI. "Social Issues" and "Workplace Communication" generate well; "Poems & Songs" and "Drama" produce weaker prompts. The curated bank must intentionally over-represent underrepresented electives to compensate. *Mitigation: Elective coverage dashboard showing per-elective prompt counts, with AI generation only for covered electives.*

4. **Difficulty inflation in self-tagging**: When AI generates prompts with self-assigned difficulty tags, it systematically overestimates difficulty (an AI-labeled "hard" prompt is often medium). Students who select "hard" mode get frustrated by puzzles, not substantive difficulty. *Mitigation: Calibration by human expert; difficulty should be inherited from the prompt template/formula, not self-declared by AI.*

5. **False repetition when bank resets**: Current system clears all used prompts when pool is exhausted. This means a student who practices daily sees prompt #1 reappear on day 10, then every 10 days thereafter. The "reset" creates rhythmic repetition that students notice. *Mitigation: Freshness-scored selection with gradual release instead of hard reset.*

---

#### Regulatory / Compliance Context

**No direct education regulation applies** to this type of self-study tool in Hong Kong. However:

- **Copyright**: Curated prompts based on real DSE past papers are derivative works. HKEAA holds copyright on past paper content. The system should paraphrase prompt scenarios, not reproduce exact wording from HKEAA materials. AI-generated prompts designed to "mimic" DSE style without copying specific questions are in a legal grey area. *Recommendation: Source past-paper-inspired prompts at the scenario level only; never copy exact task wording.*

- **Data privacy**: User notes and writing samples are stored in IndexedDB (client-side only). No personal data (name, school, HKID) is collected. Session history is stored locally and never transmitted. The AI proxy (OpenCode serve) routes through the user's own session and does not log prompt/response content to external servers.

- **Misrepresentation**: The app must not claim that its AI correction is equivalent to HKEAA official marking. Current UI already disclaims this ("AI grading is reference only"). This must remain visible in correction results.

- **Age-appropriate content**: All prompts must be suitable for minors (16–18). AI generation system prompt should explicitly forbid sensitive topics (self-harm, substance abuse, sexual content, extreme violence).

---

#### Domain Expert Roles for Evaluation

| Role | Responsibility in Eval |
|------|----------------------|
| **HKDSE English Tutor** (3+ years experience) | Reference dataset labeling — tag prompts with difficulty, authenticity, and elective alignment; calibrate the rubric for prompt quality dimensions |
| **HKDSE Curriculum Developer** | Rubric calibration — validate that the difficulty tiers and topic domain taxonomy match real DSE curriculum requirements; review AI-generated prompts for structural correctness |
| **Experienced DSE Marker** (attended HKEAA marking briefings) | Edge case review — evaluate borderline-quality outputs (prompts that are "almost right") to define the quality threshold; validate correction output against real DSE candidate scripts |
| **Product Owner** (senior team member) | Production sampling — spot-check 5% of generated sessions monthly for quality drift; decide on bank expansion triggers (when to add more curated prompts vs. improve AI) |

---

#### Research Sources

- HKEAA DSE English Language past papers (2012–2025) and examiner reports — primary source for prompt structure and marking criteria
- EHLA (dse-english.org) — competitive analysis: topic bank of 80-100 curated hot topics, 3-tier difficulty, human + AI grading service
- thinka.ai DSE mock paper analysis — difficulty calibration and topic distribution data
- dse.best AI grading tool — reference for UI expectations around AI correction
- Mastering Grammar HKDSE Writing Topics collection — comprehensive catalog of 2012-2025 real exam topics
- QBank spaced repetition system (GitHub: haxx0rman/qBank) — reference for SM-2/ELO rating algorithm implementation in edtech
- RaftLabs test prep platform architecture — industry patterns for question bank management, adaptive tests, and performance analytics
- StudyCards AI (2026) — FSRS algorithm and dynamic interval research for spaced repetition
- HKEAA English Language FAQ — official guidance on marking process, word limits, and level descriptors
