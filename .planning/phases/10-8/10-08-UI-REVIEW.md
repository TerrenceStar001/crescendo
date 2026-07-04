# Phase 10-08 — UI Review: CoursePlayer & CourseOverview

**Audited:** 2026-07-04
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md exists)
**Screenshots:** Not captured (dev server not available — code-only audit)
**Files Audited:**
- `src/components/CoursePlayer.jsx` (1137 lines)
- `src/components/CourseOverview.jsx` (206 lines)
- `src/App.css` (course__ classes at lines 8333–9992+, 10508 total)
- `src/hooks/useCourses.js` (637 lines)
- `src/App.jsx` (lines 150–159, 1130–1147)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Visual Consistency | 2/4 | **10+ missing CSS classes** — exercise actions, skip button, matching states, reorder arrows all lack styles; exercise type badges use hardcoded Material colors instead of design tokens |
| 2. Responsive Layout | 2/4 | No responsive breakpoints for player; matching 2-col grid breaks below ~600px; hardcoded `max-width: 800px` with no mobile adaptation; reorder arrows overlap on narrow screens |
| 3. Interaction Feedback | 2/4 | AI generation failure silently falls back; auto-submit on blur is aggressive; no skeleton loading; matching has no partial feedback; no retry button for failed AI generation |
| 4. Accessibility | 1/4 | No `aria-live` for feedback announcements; no `role="progressbar"`; matching exercise is keyboard-hostile; color-only indicators; no screen-reader support for exercise state |
| 5. User Control & Freedom | 2/4 | No exit mid-lesson button; skip has no confirmation; no visible resume mechanism; switch-course confirmation uses raw `window.confirm()`; no undo for accidental submissions |
| 6. Error Recovery | 2/4 | AI generation failure silently falls back to seed with only a `console.warn`; no user-facing retry mechanism; auto-save invisible; no progress restoration confirmation |

**Overall: 11/24**

---

## Top 3 Priority Fixes

1. **🔴 10+ CSS classes referenced in JSX but never defined in CSS** — `course__exercise-actions`, `course__btn--skip`, `course__btn--replay`, `course__matching-item--selected`, `course__matching-item--paired`, `course__matching-def--used`, `course__reorder-arrows`, `course__reorder-arrow`, `course__reorder-number`, `course__feedback-answer` all have zero CSS rules. These components render as unstyled HTML elements. **Fix:** Define or add utility classes for each; action buttons need `display: flex; gap: var(--space-2);` at minimum.

2. **🔴 Missing aria-live and role attributes for dynamic content** — Exercise feedback uses only color + emoji (✅/❌) without `aria-live="polite"` on the feedback container. Progress bars lack `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. Matching exercise requires precise click targeting with no keyboard alternative. **Fix:** Add `aria-live="polite"` to `.course__feedback`, `role="progressbar"` attributes to progress bars, and keyboard handlers to matching items.

3. **🟡 Auto-submit on blur + no undo causes data loss risk** — Text inputs and textareas submit on `onBlur`, meaning if a user clicks away accidentally their partially typed answer is locked in. Gap-fill cloze submits per-blank on blur rather than requiring a confirm action. **Fix:** Remove `onBlur` submission; use explicit Submit button only, or add a confirm dialog when submitting via blur.

---

## Detailed Findings

### Pillar 1: Visual Consistency (2/4)

**Finding 1.1 — BLOCKER: 10 CSS classes used in JSX with zero CSS definitions**

| Class Name | Used At | Component |
|---|---|---|
| `.course__exercise-actions` | CoursePlayer.jsx:870,880,889,898 | Exercise action button container |
| `.course__btn--skip` | CoursePlayer.jsx:871 | Skip button |
| `.course__btn--replay` | CourseOverview.jsx:188 | Replay button |
| `.course__feedback-answer` | CoursePlayer.jsx:861 | Correct answer reveal |
| `.course__matching-item--selected` | CoursePlayer.jsx:727 | Selected match term |
| `.course__matching-item--paired` | CoursePlayer.jsx:727 | Paired match term |
| `.course__matching-def--used` | CoursePlayer.jsx:746 | Used match definition |
| `.course__reorder-arrows` | CoursePlayer.jsx:815 | Reorder button container |
| `.course__reorder-arrow` | CoursePlayer.jsx:816,828 | Reorder ▲/▼ buttons |
| `.course__reorder-number` | CoursePlayer.jsx:813 | Reorder item number |

**Impact:** All these elements render with default browser styling — no padding, no flex layout, no visual distinction. The Skip button appears as a plain text link. The action button area has no flex container so buttons stack collapsed. Matching selected/paired states have no visual feedback. Reorder arrows sit inline with no spacing.

**Fix:** Add CSS for each class. Minimum viable:
- `.course__exercise-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }`
- `.course__btn--skip { color: var(--color-text-muted); background: none; border: 1px solid var(--color-border); }`
- `.course__btn--replay { ... }` (same as --secondary)
- `.course__matching-item--selected { border-color: var(--color-accent); background: var(--color-accent-bg); }`
- `.course__matching-item--paired { opacity: 0.6; }`
- `.course__matching-def--used { opacity: 0.5; text-decoration: line-through; }`
- `.course__reorder-arrows { display: flex; gap: var(--space-1); }`
- `.course__reorder-arrow { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; background: var(--color-surface); }`
- `.course__reorder-number { min-width: 20px; font-weight: 600; }`
- `.course__feedback-answer { font-size: var(--font-sm); margin-top: var(--space-1); color: var(--color-text-secondary); }`

**Finding 1.2 — WARNING: Exercise type badges use hardcoded Material Design colors**

CSS at lines 8959–8965:
```css
.course__exercise-type--gap-fill { background: #e3f2fd; color: #1565c0; }
.course__exercise-type--matching { background: #f3e5f5; color: #7b1fa2; }
/* ... etc */
```

These 7 color pairs are hardcoded Material 100/800 tones, not the app's design token system (`--color-accent`, `--color-success`, etc.). They work but are inconsistent with the rest of the app which uses CSS custom properties.

**Fix:** Replace with token-based colors, e.g. `background: var(--color-accent-bg); color: var(--color-accent);` with different opacity variants, or keep a curated palette in CSS variables.

**Finding 1.3 — WARNING: Lesson complete screen stats use `var(--space-5)` padding inside a flex container**

`Course__lesson-complete-stats` (CSS line 9789): `padding: var(--space-3) var(--space-5)` combined with `gap: var(--space-4)` — this is 24px + 16px = 40px between stat items on each side, which creates overly wide gaps on smaller screens and is inconsistent with the app's standard `var(--space-3)` or `var(--space-4)` gaps used elsewhere.

---

### Pillar 2: Responsive Layout (2/4)

**Finding 2.1 — BLOCKER: No responsive breakpoints for course player at all**

The `.course__player` has `max-width: 800px` (line 9394) but zero `@media` queries for mobile. On a 375px screen:
- The matching exercise uses `grid-template-columns: 1fr 1fr` — each column is ~165px, cramming long text
- The stat display on lesson-complete uses `var(--space-4)` gap + `var(--space-5)` padding — too wide for mobile
- The progress strip has `justify-content: space-between` with both lesson count and exercise counter — they collide on narrow screens
- The final assessment header with topic descriptions wraps poorly

**Fix:** Add breakpoints:
```css
@media (max-width: 600px) {
  .course__player { padding: var(--space-3); }
  .course__matching-columns { grid-template-columns: 1fr; }
  .course__lesson-complete-stats { flex-direction: column; gap: var(--space-2); padding: var(--space-3); }
  .course__progress-strip-info { flex-direction: column; align-items: flex-start; }
  .course__player-header { flex-direction: column; align-items: flex-start; }
  .course__overview-meta { flex-wrap: wrap; }
}
```

**Finding 2.2 — WARNING: Reorder exercise arrows have no responsive layout**

The reorder item (lines 811-841) has `.course__reorder-text` with no defined layout. The ▲ and ▼ buttons are inline elements with no wrapping. On narrow screens, the item number + text + arrows overlap or overflow. There's no `flex-wrap` or breakpoint for the reorder list.

**Finding 2.3 — INFO: CourseOverview uses inline `style={{ marginTop: 'var(--space-2)' }}` for tags**

While the token is correct, the course overview has mixed layout approaches: some spacing via CSS classes, some via inline styles. This makes responsive maintenance harder (e.g., if mobile needs different spacing, inline styles can't be overridden by media queries).

---

### Pillar 3: Interaction Feedback (2/4)

**Finding 3.1 — BLOCKER: AI generation failure silently falls back with no user awareness**

At lines 104-105:
```javascript
}).catch(e => {
  console.warn('[course] AI exercise generation failed:', e.message, '— using seed exercises');
})
```

When AI exercise generation fails:
1. User sees no error message
2. Seed exercises (if any exist) are used silently
3. If there are no seed exercises, `lessonExercises` returns empty array `[]`
4. User sees a blank exercise area with no explanation
5. There is no retry button for failed generation (the "🔄 New Practice" button only appears when NOT generating)

**Fix:** Add an error state variable `generationError` and show a UI message:
```jsx
{generationError && (
  <div className="course__feedback course__feedback--incorrect">
    <span>⚠️ Could not generate exercises. </span>
    <button className="course__btn course__btn--secondary" onClick={handleRegenerateExercises}>
      Try Again
    </button>
  </div>
)}
```

**Finding 3.2 — WARNING: Auto-submit on blur causes accidental submissions**

```javascript
// Line 658-662: gap-fill input
onBlur={e => {
  if (e.target.value.trim()) {
    handleExerciseAttempt(currentExerciseFromSet.question, e.target.value);
  }
}}
```

Same pattern for short-answer (line 675-678), cloze (line 780-784), and textareas. This means:
- Tabbing through fields submits the current answer immediately
- Clicking outside to check reference passage submits prematurely
- No way to cancel or undo a submission

**Fix:** Remove `onBlur` handlers entirely. Use explicit Submit button for all exercise types (already present for short-answer/sentence-rewrite). Add it for gap-fill and cloze too.

**Finding 3.3 — WARNING: Generating state text is low-contrast italic**

`.course__generating-text` (CSS line 8643-8647): `font-size: var(--font-xs); color: var(--color-text-muted); font-style: italic;` — this is `0.7rem` (11px) in muted gray. Hard to read and disappears into the background. Should use `var(--color-text-secondary)` and regular weight.

**Finding 3.4 — INFO: No skeleton/placeholder during initial course load**

The fallback at line 1132-1136 shows only "Loading course..." text. No skeleton, no shimmer, no progress indicator during IndexedDB reads or AI generation.

---

### Pillar 4: Accessibility (1/4)

**Finding 4.1 — BLOCKER: No aria-live for exercise feedback announcements**

The feedback div at line 854-866:
```jsx
<div className={`course__feedback${...}`}>
  <span className="course__feedback-icon">{exerciseFeedback.correct ? '✅' : '❌'}</span>
  <span className="course__feedback-text">...</span>
</div>
```

No `aria-live="polite"` or `role="alert"`. Screen reader users get no announcement when exercise feedback appears. The content is visually dynamic but invisible to assistive technology.

**Fix:** Add `aria-live="polite"` to the feedback container (or `role="status"`). For correct/incorrect feedback, this is essential.

**Finding 4.2 — BLOCKER: Progress bars lack ARIA progressbar role**

Both progress bar variants (`.course__progress-bar-fill` and `.course__progress-strip-fill`) render as plain `<div>` elements:
```jsx
<div className="course__progress-bar">
  <div className="course__progress-bar-fill" style={{ width: `${progressPct}%` }} />
</div>
```

Missing: `role="progressbar"`, `aria-valuenow={progressPct}`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Course progress"`.

**Fix:** Add ARIA attributes to all progress bar divs.

**Finding 4.3 — HIGH: Matching exercise is keyboard-inaccessible**

The matching exercise (lines 717-765) uses click-only interactions:
- Selecting a term: requires clicking the term button
- Matching a definition: requires clicking a definition button
- No keyboard support for navigating between terms and definitions
- No indication of current focus within the matching grid
- `aria-label` exists on reorder arrows (👍) but not on matching items

**Fix:** Add keyboard handlers (Enter/Space for selection, Tab navigation between columns, Escape to deselect). Add `aria-selected` and `aria-pressed` attributes to matching items.

**Finding 4.4 — WARNING: Color-only indicators for correct/wrong**

The feedback icon uses emoji (✅/❌) which has semantic meaning, but the exercise option states (`.course__exercise-option--correct`, `.course__exercise-option--wrong`) use color-only differentiation (green/red borders + backgrounds). Colorblind users cannot distinguish correct from wrong options.

**Fix:** Add icon indicators or checkmark/cross marks inside the option buttons, or use patterns in addition to color.

**Finding 4.5 — WARNING: Emoji icons used as primary communication without text alternatives**

The following emojis carry semantic meaning without accessible text:
- `✅` / `❌` for correct/incorrect feedback
- `🎉` for lesson complete
- `🔒` for locked topics
- `▶` for play/resume
- `📖` for reading passage

**Fix:** Add `aria-hidden="true"` to decorative emojis. For semantic emojis, add screen-reader-only text or `aria-label`.

---

### Pillar 5: User Control & Freedom (2/4)

**Finding 5.1 — HIGH: No exit button during lesson or exercise phase**

When in `phase === 'lesson'`, the only back button returns to catalog (line 567: `onBack`). There is no mechanism to:
- Return to the course overview
- Take a break and resume later
- Save and quit explicitly

The user is trapped in the linear flow until they either complete all exercises or use the browser's back button (which could lose state).

**Fix:** Add a "Exit Lesson" or "Save & Exit" button in the player header that saves progress and returns to catalog/overview.

**Finding 5.2 — WARNING: Skip has no confirmation dialog**

`handleSkipExercise` (line 312-328) immediately marks the exercise as skipped and advances after 800ms. No confirmation, no undo. If a user accidentally clicks Skip (especially since Skip button has no distinct styling — see Finding 1.1), they lose the opportunity to attempt that exercise.

**Fix:** Add a confirmation dialog for Skip, or at minimum require double-click / hold interaction.

**Finding 5.3 — WARNING: Switch course confirmation uses raw `window.confirm()`**

Line 356:
```javascript
if (window.confirm(`You have an active lesson in another course. Start this one anyway?`)) {
```

This uses the browser's native confirm dialog which varies across platforms and cannot be styled. No way to say "no, go back" with proper context — the dialog just says "this one" and "another course" without naming either.

**Fix:** Use a custom modal that shows both course names and uses the app's button styles.

**Finding 5.4 — MEDIUM: No undo for revealed answer**

Once the user clicks "Reveal Answer" (line 343-350) or "Show Correct Answer", the answer is permanently marked as revealed with no way to retract it and try again. This discourages using the feature for learning since it locks the exercise state.

**Fix:** Allow retry after revealing: reset the exercise state to unanswered when user clicks "Try Again" or navigates back.

---

### Pillar 6: Error Recovery (2/4)

**Finding 6.1 — BLOCKER: No user-facing recovery for AI generation failure**

As detailed in Finding 3.1, AI generation failure (which is expected given the `catch {}` pattern and `console.warn` only) provides no UI feedback. User sees either seed exercises (if available) or a blank exercise area with no explanation.

**Finding 6.2 — WARNING: Auto-save is invisible to user**

The save timer at lines 179-206 saves progress every 10 seconds, but:
- No visual indicator that save happened
- No "Saved" / "Draft saved" toast or status
- No confirmation that progress was loaded on mount
- No error notification if save fails (empty catch at line 199)

**Fix:** Add a subtle status indicator (e.g., "Saving..." → "Saved") similar to the note editor's save status pattern.

**Finding 6.3 — WARNING: No progress recovery confirmation on resume**

When the mount effect (lines 148-169) loads saved progress, there is no confirmation dialog. User could be:
- Resuming a course they thought they'd finished
- Accidentally loading old progress from a different browser session
- Getting conflicting progress if they used multiple tabs

**Fix:** Show a brief confirmation: "Resume where you left off? (Lesson X of Y)" with Resume / Start Over options.

**Finding 6.4 — MEDIUM: Final assessment score has no save-and-exit capability**

The final assessment (phase `final-assessment`) requires completing all exercises in one sitting before submission. There is no:
- Auto-save during assessment
- Partial submission
- Save progress in case of accidental page close

**Fix:** Add auto-save for final assessment answers (using the same 10s timer pattern) and show a warning before navigation.

---

## Summary of Issues by Severity

| Severity | Count | Key Areas |
|----------|-------|-----------|
| BLOCKER | 5 | Missing CSS (10+ classes), no aria-live, no progressbar role, AI failure invisible, no user-facing error recovery |
| HIGH | 4 | Matching keyboard-hostile, no exit button, auto-submit on blur, color-only indicators |
| WARNING | 8 | Hardcoded colors, no responsive breakpoints, switch course uses raw confirm, no undo for reveal, skip no confirmation, invisible auto-save, generating text low-contrast, no resume confirmation |
| MEDIUM | 2 | No skeleton loading, no final assessment save |
| INFO | 2 | Mixed inline/class styles, matching shuffle instability |

---

## Files Audited

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/CoursePlayer.jsx` | 1137 | Main exercise delivery engine (all phases) |
| `src/components/CourseOverview.jsx` | 206 | Course entry/overview with topic list |
| `src/App.css` | 10508 | All CSS including ~100 `course__` classes |
| `src/hooks/useCourses.js` | 637 | Course CRUD, enrollment, progress |
| `src/App.jsx` | 1407 | Integration point for CoursePlayer |
