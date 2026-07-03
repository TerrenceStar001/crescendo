/**
 * courseSemanticValidator — Semantic validation for AI-generated course drafts.
 * Pure ES module with no state or side effects.
 * Checks content validity beyond structural JSON shape:
 *  - MCQ answers exist in options
 *  - Gap-fill/cloze answers appear in reference content
 *  - Explanations are substantive (>= 40 chars)
 *  - Reference content is deep (>= 150 words)
 *  - Lesson has sufficient exercises (>= 3)
 */

/**
 * checkMCQAnswer — Verify MCQ answer matches one of the options (case-insensitive).
 * @param {object} exercise
 * @param {number} ti Topic index
 * @param {number} li Lesson index
 * @param {number} ei Exercise index
 * @returns {string|null} Error string or null if valid
 */
export function checkMCQAnswer(exercise, ti, li, ei) {
  if (exercise.type !== 'mcq') return null;
  if (!Array.isArray(exercise.options) || exercise.options.length === 0) return null;
  const options = exercise.options.map(o => String(o).toLowerCase().trim());
  const answer = String(exercise.answer || '').toLowerCase().trim();
  if (!answer || !options.includes(answer)) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): answer "${exercise.answer}" not found in options [${exercise.options.join(', ')}]`;
  }
  return null;
}

/**
 * checkGapFillAnswer — Verify gap-fill/cloze answer appears in lesson referenceContent.
 * @param {object} exercise
 * @param {object} lesson
 * @param {number} ti Topic index
 * @param {number} li Lesson index
 * @param {number} ei Exercise index
 * @returns {string|null} Error string or null if valid
 */
export function checkGapFillAnswer(exercise, lesson, ti, li, ei) {
  if (exercise.type !== 'gap-fill' && exercise.type !== 'cloze') return null;
  const content = lesson.referenceContent;
  if (!content || typeof content !== 'string') return null; // Skip — no reference content to check against
  const answer = String(exercise.answer || '').toLowerCase().trim();
  if (!answer) return null; // No answer to check
  if (!content.toLowerCase().includes(answer)) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (${exercise.type}): answer "${exercise.answer}" not found in lesson referenceContent`;
  }
  return null;
}

/**
 * checkExplanationLength — Verify exercise explanation is at least 40 characters.
 * @param {object} exercise
 * @param {number} ti Topic index
 * @param {number} li Lesson index
 * @param {number} ei Exercise index
 * @returns {string|null} Error string or null if valid
 */
export function checkExplanationLength(exercise, ti, li, ei) {
  const len = exercise.explanation?.trim().length || 0;
  if (len < 40) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei}: explanation too short (${len} chars, minimum 40)`;
  }
  return null;
}

/**
 * checkReferenceContent — Verify lesson referenceContent has at least 150 words.
 * @param {object} lesson
 * @param {number} ti Topic index
 * @param {number} li Lesson index
 * @returns {string|null} Error string or null if valid
 */
export function checkReferenceContent(lesson, ti, li) {
  const content = lesson.referenceContent;
  if (!content || typeof content !== 'string') {
    return `Topic ${ti}, Lesson ${li}: referenceContent missing or not a string`;
  }
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount < 150) {
    return `Topic ${ti}, Lesson ${li}: referenceContent too short (${wordCount} words, minimum 150)`;
  }
  return null;
}

/**
 * checkExerciseVolume — Verify lesson has at least 3 exercises.
 * @param {object} lesson
 * @param {number} ti Topic index
 * @param {number} li Lesson index
 * @returns {string|null} Error string or null if valid
 */
export function checkExerciseVolume(lesson, ti, li) {
  const count = lesson.exercises?.length || 0;
  if (count < 3) {
    return `Topic ${ti}, Lesson ${li}: insufficient exercises (${count}, minimum 3)`;
  }
  return null;
}

/**
 * semanticValidate — Run all semantic checks on a course draft.
 * Iterates all topics, lessons, and exercises to validate content semantics.
 * @param {object} courseDraft
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function semanticValidate(courseDraft) {
  const errors = [];

  if (!courseDraft || typeof courseDraft !== 'object') {
    return { valid: false, errors: ['Course draft must be an object'] };
  }

  if (!Array.isArray(courseDraft.topics)) {
    return { valid: false, errors: ['Course draft must have a topics array'] };
  }

  courseDraft.topics.forEach((topic, ti) => {
    if (!topic || typeof topic !== 'object') return;
    if (!Array.isArray(topic.lessons)) return;

    topic.lessons.forEach((lesson, li) => {
      if (!lesson || typeof lesson !== 'object') return;

      // Lesson-level checks
      const refErr = checkReferenceContent(lesson, ti, li);
      if (refErr) errors.push(refErr);

      const volErr = checkExerciseVolume(lesson, ti, li);
      if (volErr) errors.push(volErr);

      // Exercise-level checks
      if (Array.isArray(lesson.exercises)) {
        lesson.exercises.forEach((exercise, ei) => {
          if (!exercise || typeof exercise !== 'object') return;

          const mcqErr = checkMCQAnswer(exercise, ti, li, ei);
          if (mcqErr) errors.push(mcqErr);

          const gapErr = checkGapFillAnswer(exercise, lesson, ti, li, ei);
          if (gapErr) errors.push(gapErr);

          const explErr = checkExplanationLength(exercise, ti, li, ei);
          if (explErr) errors.push(explErr);
        });
      }
    });
  });

  return { valid: errors.length === 0, errors };
}
