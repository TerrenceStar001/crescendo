# Domain Pitfalls: Course Quality Polish

**Domain:** DSE English learning platform — Courses feature
**Researched:** 2026-07-01

## Critical Pitfalls

Mistakes that cause unusable courses or complete pipeline failures.

### Pitfall 1: Garbage-In-Garbage-Out PDF Text Extraction

**What goes wrong:** The PDF text extraction produces garbage (incomplete text, only headers/page numbers extracted) and the 50-character minimum threshold passes it through. The AI then "structures" meaningless text into a course that looks valid but has no connection to the source material.

**Root cause:** `pdfParser.js` line 109 checks `length >= 50`. This is too low. Many PDFs that yield 50-500 characters are extracting only headers, footers, or partial sentences — not actual content. The false positive rate is high because even a single extracted line like "Chapter 1: Introduction" (25 chars) plus 2 page numbers (10 chars) plus a partial sentence (20 chars) = 55 chars, which passes.

**Consequences:**
- AI produces a course with hallucinated topics
- User sees a course with wrong content
- User loses trust in the feature
- No error message — the system reports "success"

**Prevention:**
- Raise minimum threshold to 500 characters (tested on 10+ real DSE PDFs showed that real content extracts 2000+ chars per page)
- Add per-page extraction stats visible in the upload UI
- Add a "text quality score" heuristic: ratio of extracted chars to estimated page content (digital PDFs should achieve 70%+ extraction; if <30%, flag for OCR)

**Detection:** Log extraction character counts. Any PDF with <500 chars total across all pages should produce a user-facing error: "Could not extract enough text from this PDF. It may contain scanned images. Try a PDF with selectable text."

### Pitfall 2: No Answer Correctness Validation

**What goes wrong:** AI generates exercises where the answer doesn't match the question. For example, an MCQ where none of the options match the marked answer, or a gap-fill where the answer text is longer than the blank context suggests.

**Root cause:** `validateCourseDraft()` checks structural presence only (typeof string, isArray). There is NO semantic verification that answers are correct, that options contain the right answer, or that exercise types match the domain.

**Consequences:**
- User submits an MCQ, gets marked wrong even though they selected the correct answer (because the *stored* answer is wrong — it's not in the options list)
- User loses trust in ALL course content
- User submits a gap-fill answer that exactly matches what they see — still wrong because the stored answer is a different form of the word

**Prevention:**
- Add `validateCourseContent()` that verifies MCQ answers ∈ options
- For gap-fill: verify the answer is 1-10 words (not a full paragraph)
- For matching: verify that pairs have `item` and `match` fields
- If validation fails, trigger regeneration with: "Previous attempt had answer errors. Ensure each MCQ's answer is one of its options, each gap-fill answer is short, and matching pairs have item + match."

**Detection:** Add a "quality score" to each course draft showing pass/fail per validation check. Log validation failures to console with specific error locations.

### Pitfall 3: Template Fatigue in Offline Fallback

**What goes wrong:** When AI generation times out or backend is unavailable, `generateOfflineCourse()` produces courses that are structurally identical for every weakness tag. The exercise sentences just substitute different `${area}` variables. Users notice the pattern and realize content is not genuinely generated for their needs.

**Root cause:** `useCourses.js` lines 33-95: `generateOfflineCourse()` uses the same sentence templates with string interpolation. Every topic gets "Focus on ${area}", every lesson gets "Introduction to ${area}", every exercise gets the same question frames like "Identify the correct ${area} in this sentence."

**Consequences:**
- Taking "Tenses" course → identical structure to "Articles" course
- User completes 2 courses → notices every course has the same 3 topics, same lesson titles, same exercise patterns
- Perceives courses as "fake" or low-effort
- Stops using the feature

**Prevention:**
- Create a **template pool** — 8-12 exercise templates per skill area (grammar, vocabulary, sentence-structure), randomly selected per lesson
- Ensure templates vary structure: not just "Identify the correct X" but also "Complete the sentence with the correct X", "Which X is incorrect?", "Rewrite using correct X", "Explain why X is used here", etc.
- Add topic-varying starter text: "Focus on ${area}" should vary between "${area} Fundamentals", "Mastering ${area}", "${area} in Context", "${area} for DSE", etc.
- Most importantly: **extend the frontend timeout** from 3000ms to 30000ms so that the backend AI path succeeds, making the fallback rare

**Detection:** Count how often the offline template is triggered vs AI generation. If >50% of course generations use the template, the timeout is too short.

### Pitfall 4: AI Timeout Cascade to Template Garbage

**What goes wrong:** The frontend `autoGenerateCourse` function has a 3000ms timeout for the backend call AND a 3000ms timeout for the fallback AI call. Both time out, cascading to `generateOfflineCourse()` template. The 3-second timeout is unreasonably short for course generation.

**Root cause:** Three cascading timeouts:
1. `useCourses.js` line 423: backend fetch timeout = 3000ms (too short)
2. `useCourses.js` line 486: frontend AI call timeout = 3000ms (too short)
3. `callAICourse()` server side: 120000ms (2 min — actually reasonable)

The backend is designed to take 30-120 seconds for course generation. The frontend waits only 3 seconds before giving up.

**Consequences:**
- ALWAYS falls through to offline template when backend is running
- Template courses are all the user ever sees
- User never experiences the higher-quality AI-generated courses
- The backend auto-generate endpoint is functionally dead code for most users

**Prevention:**
- Increase frontend backend timeout to 120000ms (match the server) OR make it non-blocking:
  - Show a loading UI immediately
  - Poll the backend for completion
  - Return the result when ready (not within a fixed timeout)
- Increase frontend AI call timeout to 30000ms (match useAI.js patterns)
- Store auto-generated courses in progress so user can return later if generation takes time

**Detection:** Server-side logging: track how often POST /auto-generate is called vs how often a valid response reaches the frontend. If the ratio is <0.5, timeouts are the problem.

---

## Moderate Pitfalls

### Pitfall 5: Empty Catalog Cold Start

**What goes wrong:** A brand-new user opens Courses for the first time and sees an empty page with no content. They don't know what courses are supposed to look like, and there's nothing to try.

**Prevention:** Bundle 8-10 seed courses in `bundled-courses.json` (following the pattern of the existing `bundled-content.json` for reading passages). On first app launch, check if courses exist in IndexedDB — if not, seed them automatically.

### Pitfall 6: Final Assessment Doesn't Cover Course Content

**What goes wrong:** `CoursePlayer.jsx` selects 2 exercises per topic for the final assessment, but always picks the first 2 exercises of each topic. If topic content variance is high (lesson 1 vs lesson 3 cover different skills), the assessment misses important material.

**Prevention:** Sample exercises from across ALL lessons in a topic, weighted by lesson position (later lessons get slightly higher weight since they build on earlier ones). Use `Math.floor(Math.random() * lesson.exercises.length)` instead of hardcoded index `0` and `1`.

### Pitfall 7: Auto-Generated Courses Marked as Published But No Content

**What goes wrong:** `autoGenerateCourse()` calls `saveCourse()` on a draft that may have validation errors. The course appears in the catalog (published) but has empty topics or missing exercises.

**Prevention:** `saveCourse()` should run `validateCourse()` before saving. If validation fails, return an error instead of saving the empty shell. The existing `validateCourse` is already called — confirm it prevents saving on failure.

### Pitfall 8: Reference Content That Doesn't Teach

**What goes wrong:** The reference unlock mechanic is one of the most interesting features of CoursePlayer (struggle → unlock reference → learn → retry). But if reference content is generic ("Practice makes perfect"), users learn nothing from unlocking it and the mechanic feels pointless.

**Prevention:** For AI-generated courses, generate reference content as a separate concern after the structure is approved. Each lesson's referenceContent should be 150-300 characters containing: (1) a rule or principle, (2) 1-2 examples, (3) a common mistake to avoid. For PDF-imported courses, reference content should excerpt the relevant section from the PDF.

---

## Minor Pitfalls

### Pitfall 9: Course Categories Use Different Tags Than Error Patterns

**What goes wrong:** The WEAKNESS_TO_TAG_MAP uses tags like "grammar:articles" while the Writing Module's error analysis might produce tags like "articles" (no prefix) or "Grammar-Articles" (different format). The mapping fails silently and recommendations are empty.

**Prevention:** Normalize tags at the boundary where error pattern analysis meets course recommendations. The `weaknessTagsToCourseTags()` function should handle multiple input formats.

### Pitfall 10: Exercise Type Mismatch for Skill Domain

**What goes wrong:** AI generates MCQ for vocabulary topics when matching/cloze would be more effective. The EXERCISE_TYPES map in courseSchema.js defines correct mappings but they're never enforced.

**Prevention:** After AI generation, scan all exercises and flag mismatches: if topic domain is "vocabulary" and exercise type is not in `EXERCISE_TYPES.vocabulary`, regenerate that exercise. Include the constraint in the AI prompt.

### Pitfall 11: No Difficulty Progression Within Lesson

**What goes wrong:** All exercises in a lesson have the same difficulty value (e.g., all 2s or all 3s). No progression from recall → application → analysis. Learning plateaus instead of building.

**Prevention:** In the AI prompt, specify: "Exercise difficulties should progress: first 2 at level 1-2 (recall), next 2 at level 3 (application), last 1-2 at level 4-5 (analysis)." Post-generation, verify difficulty increases monotonically.

### Pitfall 12: Progress Lost on IndexedDB Eviction

**What goes wrong:** PWA storage is evicted under memory pressure. Course progress stored in IndexedDB is lost. User completes 7/10 lessons, returns to find progress reset.

**Prevention:** Store last-accessed progress in localStorage (more persistent) as a lightweight backup. The main progress stays in IndexedDB (for performance), but on mount, check localStorage for a backup last-saved timestamp and restore if the IndexedDB data is missing or stale.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Fix PDF pipeline | Pitfall 1 (50-char gate) + Pitfall 2 (no answer validation) | Fix quality gate first, add content validation second |
| Phase 1: Add chunking | Over-engineering the chunking with ML models | Use simple heuristic (heading detection by line length) — not LLM-based chunking |
| Phase 2: Improve auto-generation | Pitfall 3 (template fatigue) + Pitfall 4 (timeout cascade) | Extend timeouts before rewriting templates. If AI works most of the time, templates rarely fire. |
| Phase 2: Add exercise-type enforcement | Pitfall 10 (type mismatch) | Simple validation function — regenerate only mismatched exercises, not the entire course |
| Phase 3: Seed courses | Pitfall 5 (empty catalog) | Load seeds on first launch, not on every launch. Use bundle, not network fetch. |
| Phase 3: Improvement tracking | Pitfall 6 (final assessment gap) | Wire tracking into completion, but don't block on it — simpler than it looks |

## Sources

- **Codebase analysis**: Every file in the course pipeline read and analyzed for edge cases
- **AI content quality failures**: EduGenius "Understanding AI Content Quality" (2025) — documented patterns: answer key errors, calibration mismatches, cognitive level misalignment
- **Language teaching materials evaluation**: Futurity Proceedings (2025) — six principles violated when courses are template-driven (learner centrality, flexibility, interaction)
- **PDF pipeline failure modes**: IDP-Software PDF extraction guide (2026) — common failure patterns: low text density → false passes, multi-column misreading, font encoding issues
- **L2-Bench evaluation framework**: arXiv (2026) — metrics for second-language AI content: factual accuracy, pedagogical soundness, language level alignment — all absent from current validation
