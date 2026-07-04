/**
 * courseSemanticValidator — Semantic validation for AI-generated course drafts.
 * Pure ES module with no state or side effects.
 * Checks content validity beyond structural JSON shape.
 *
 * Validation pipeline (4-phase):
 *   Phase A: Structural JSON shape (validateCourseDraft)
 *   Phase B: Algorithmic Semantics (this file — semanticValidate)
 *   Phase C: Heuristic Quality Gates (this file — advanced checks)
 *   Phase D: LLM-as-Judge (external, runs only if A+B+C pass)
 */

const DEFAULT_CONFIG = {
  minWords: 250,
  minExercises: 3,
  requireStrategyNote: true,
  requireTextTypeBlueprint: true,
  requireLevelUpContrasts: true,
  requireExerciseDiversity: true,
  blameDepthMin: 3,
  blockVerbatimRecall: true,
  blockFormulaQuestion: true,
  maxRetries: 3,
};

const SIMPLER_CONFIG = {
  minWords: 150,
  minExercises: 3,
  requireStrategyNote: false,  // warning only
  requireTextTypeBlueprint: false,
  requireLevelUpContrasts: false,
  requireExerciseDiversity: false, // any 3 exercises, types not enforced
  blameDepthMin: 2,
  blockVerbatimRecall: false,  // warning only
  blockFormulaQuestion: false,  // warning only
  maxRetries: 3,
};

/**
 * getConfig — Returns config based on mode.
 */
function getConfig(options = {}) {
  return options.simplerContent ? { ...SIMPLER_CONFIG } : { ...DEFAULT_CONFIG };
}

// ─── Existing checks (refactored with configurable thresholds) ───

export function checkMCQAnswer(exercise, ti, li, ei) {
  if (exercise.type !== 'mcq') return null;
  if (!Array.isArray(exercise.options) || exercise.options.length === 0) return null;
  // Check both full-text match and letter-label match
  const options = exercise.options.map(o => String(o).toLowerCase().trim());
  const optionsStripped = options.map(o => o.replace(/^[a-d][.)\s]+/, ''));
  const answerRaw = String(exercise.answer || '').toLowerCase().trim();
  const answerStripped = answerRaw.replace(/^[a-d][.)\s]+/, '');
  // Check: answer is a letter that matches an option label
  const letterMatch = /^[a-d]$/.test(answerStripped) && exercise.options.some(o => String(o).toLowerCase().trim().startsWith(answerStripped));
  // Check: answer text matches an option (with or without label prefix)
  const textMatch = options.includes(answerRaw) || optionsStripped.includes(answerRaw) || optionsStripped.includes(answerStripped);
  if (!letterMatch && !textMatch) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): answer "${exercise.answer}" not found in options [${exercise.options.join(', ')}]`;
  }
  return null;
}

export function checkGapFillAnswer(exercise, lesson, ti, li, ei) {
  if (exercise.type !== 'gap-fill' && exercise.type !== 'cloze') return null;
  const content = lesson.referenceContent;
  if (!content || typeof content !== 'string') return null;
  const answer = String(exercise.answer || '').toLowerCase().trim();
  if (!answer) return null;
  if (!content.toLowerCase().includes(answer)) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (${exercise.type}): answer "${exercise.answer}" not found in lesson referenceContent`;
  }
  return null;
}

export function checkExplanationLength(exercise, ti, li, ei) {
  const len = exercise.explanation?.trim().length || 0;
  if (len < 40) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei}: explanation too short (${len} chars, minimum 40)`;
  }
  return null;
}

export function checkReferenceContent(lesson, ti, li, config) {
  const content = lesson.referenceContent;
  if (!content || typeof content !== 'string') {
    return `Topic ${ti}, Lesson ${li}: referenceContent missing or not a string`;
  }
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount < config.minWords) {
    return `Topic ${ti}, Lesson ${li}: referenceContent too short (${wordCount} words, minimum ${config.minWords})`;
  }
  return null;
}

export function checkExerciseVolume(lesson, ti, li, config) {
  const count = lesson.exercises?.length || 0;
  if (count < config.minExercises) {
    return `Topic ${ti}, Lesson ${li}: insufficient exercises (${count}, minimum ${config.minExercises})`;
  }
  return null;
}

// ─── New Advanced Checks ───

/**
 * checkHasStrategyNote — Verify lesson contains "Tutor's Strategy Note" heading.
 */
export function checkHasStrategyNote(lesson, ti, li, config) {
  if (!config.requireStrategyNote) return null;
  const text = [
    lesson.title || '',
    lesson.referenceContent || '',
    ...(lesson.exercises || []).map(e => e.question || ''),
  ].join(' ');
  const strategyHeadingRegex = /(##?\s*Tutor'?s\s*Strategy\s*Note|\n\s*Tutor'?s\s*Strategy\s*Note:)/i;
  if (!strategyHeadingRegex.test(text)) {
    return `Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): missing Tutor's Strategy Note with HKEAA examiner trap pattern`;
  }
  return null;
}

/**
 * checkHasTextTypeBlueprint — Verify lesson contains structural skeleton markers.
 * Only applies when course tags cover writing text types.
 */
const TEXT_TYPE_TAG_PATTERN = /^writing:(?:formal-)?(?:letter|report|speech|proposal|article|email|blog|diary)/i;
export function checkHasTextTypeBlueprint(lesson, ti, li, config, courseTags) {
  if (!config.requireTextTypeBlueprint) return null;
  // Only apply check if course tags indicate a writing text type course
  const tags = courseTags || [];
  const isWritingCourse = tags.some(t => TEXT_TYPE_TAG_PATTERN.test(t));
  if (!isWritingCourse) return null;
  const text = [
    lesson.title || '',
    lesson.referenceContent || '',
    ...(lesson.exercises || []).map(e => e.question || ''),
  ].join(' ');
  const blueprintRegex = /(Text-Type Structural Blueprint|Structural Skeleton|-----+\s*(?:Structure|Format|Skeleton))[\s\S]{10,}(?:->|➔|Paragraph|\d\.|•|- )/i;
  if (!blueprintRegex.test(text)) {
    return `Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): missing Text-Type Structural Blueprint with structural skeleton`;
  }
  return null;
}

/**
 * checkHasLevelUpContrasts — Verify lesson has ≥3 Level 3 vs Level 5** contrasts.
 */
export function checkHasLevelUpContrasts(lesson, ti, li, config) {
  if (!config.requireLevelUpContrasts) return null;
  const text = [
    lesson.title || '',
    lesson.referenceContent || '',
    ...(lesson.exercises || []).map(e => [e.question || '', e.explanation || '']).flat(),
  ].join(' ');
  const contrastBlockRegex = /\*\*Level 3 Baseline:\*\*[\s\S]*?\*\*Level 5\*\* Elite:\*\*/g;
  const contrastMatches = text.match(contrastBlockRegex) || [];
  if (contrastMatches.length < 3) {
    return `Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): insufficient Level-Up Contrasts (found ${contrastMatches.length}, minimum 3 L3→L5** transformations)`;
  }
  return null;
}

/**
 * checkExerciseDiversity — Verify lesson has exactly 1 MCQ + 1 gap-fill + 1 short-answer.
 */
export function checkExerciseDiversity(lesson, ti, li, config) {
  if (!config.requireExerciseDiversity) return null;
  const exercises = lesson.exercises || [];
  const types = exercises.map(e => e.type);
  const mcqCount = types.filter(t => t === 'mcq').length;
  const gfCount = types.filter(t => t === 'gap-fill').length;
  const saCount = types.filter(t => t === 'short-answer').length;
  const otherCount = types.filter(t => !['mcq', 'gap-fill', 'short-answer'].includes(t)).length;

  if (mcqCount !== 1 || gfCount !== 1 || saCount !== 1 || otherCount > 0) {
    return `Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): exercise type mismatch — expected exactly 1 MCQ (found ${mcqCount}), 1 gap-fill (${gfCount}), 1 short-answer (${saCount})${otherCount > 0 ? `, unexpected types: ${otherCount}` : ''}`;
  }
  return null;
}

/**
 * checkMCQOptionCount — Verify MCQ has exactly 4 options.
 */
export function checkMCQOptionCount(exercise, ti, li, ei) {
  if (exercise.type !== 'mcq') return null;
  if (!Array.isArray(exercise.options) || exercise.options.length !== 4) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): must have exactly 4 options (found ${exercise.options?.length || 0})`;
  }
  return null;
}

/**
 * checkMCQOptionsLabelled — Verify MCQ options are labelled A/B/C/D.
 */
export function checkMCQOptionsLabelled(exercise, ti, li, ei) {
  if (exercise.type !== 'mcq') return null;
  if (!Array.isArray(exercise.options)) return null;
  const labelled = exercise.options.every(o => /^[a-d][.)\s]/i.test(String(o).trim()));
  if (!labelled) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): options should be labelled A/B/C/D (e.g. "A) option text")`;
  }
  return null;
}

/**
 * checkMCQAnswerNotVerbatim — Verify MCQ answer is not a direct verbatim quote from referenceContent.
 */
export function checkMCQAnswerNotVerbatim(exercise, lesson, ti, li, ei, config) {
  if (exercise.type !== 'mcq') return null;
  if (!config.blockVerbatimRecall) return null;
  const content = lesson.referenceContent;
  if (!content || typeof content !== 'string') return null;
  const answer = String(exercise.answer || '').toLowerCase().trim();
  if (answer.length < 4 || answer.length > 120) return null;
  if (!content.toLowerCase().includes(answer)) return null;
  const words = answer.split(/\s+/);
  if (words.length <= 4 && content.toLowerCase().includes(answer)) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): answer "${exercise.answer}" is a verbatim quote from reference content — rewrite to require reasoning, not recall`;
  }
  return null;
}

/**
 * checkBloomDepth — Estimate Bloom's depth for an exercise.
 */
export function checkBloomDepth(exercise, ti, li, ei, config) {
  const stem = (exercise.question || '').toLowerCase();
  const recall = ['what is', 'what does', 'define', 'list', 'name', 'identify', 'when did', 'who wrote', 'according to', 'how many', 'what year', 'fill in the blank with'];
  const deep = ['compare', 'contrast', 'distinguish', 'differentiate', 'evaluate', 'judge', 'which is better', 'what is wrong', 'identify the problem', 'which strategy', 'diagnose', 'why does', 'what would happen', 'which best', 'most likely', 'which of the following best', 'choose the best'];
  let bloom = 3;
  for (const v of deep) if (stem.includes(v)) bloom = 4;
  for (const v of recall) if (stem.startsWith(v) || stem.includes(' ' + v) || stem.includes(v)) bloom = Math.min(bloom, 1);
  if (bloom < config.blameDepthMin) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei}: Bloom's depth ${bloom} (minimum ${config.blameDepthMin}) — exercise tests recall, rewrite to require understanding or application`;
  }
  return null;
}

/**
 * checkNotFormulaQuestion — Detect "how many X should Y contain?" formula questions.
 */
export function checkNotFormulaQuestion(exercise, ti, li, ei, config) {
  if (!config.blockFormulaQuestion) return null;
  const stem = (exercise.question || '').toLowerCase();
  const answer = String(exercise.answer || '');
  const prescriptiveCount = /how\s+(many|much)\s.*\b(should|typically|usually|must|does|do)\b/.test(stem);
  if (prescriptiveCount) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei}: formula question detected — "how many X should Y" tests memorised rules, not understanding`;
  }
  if (/^\d+\s*[-–—to]+\s*\d+$/.test(answer.trim())) {
    return `Topic ${ti}, Lesson ${li}, Exercise ${ei}: answer is a numeric range (${answer}) — tests formula recall, not understanding`;
  }
  if (/^\d+$/.test(answer.trim()) && parseInt(answer) > 1) {
    const entityCount = /\b(how many|how much)\b/.test(stem);
    const structureEntity = /\b(sentences?|paragraphs?|words?|steps?|points?|stages?|phases?|parts?|sections?|marks?)\b/.test(stem);
    const prescriptive = /\b(should|typically|usually|must|always|every)\b/.test(stem);
    if (entityCount && structureEntity && prescriptive) {
      return `Topic ${ti}, Lesson ${li}, Exercise ${ei}: formula question detected — answer is a number (${answer}) for a prescriptive count, tests formula recall`;
    }
  }
  return null;
}

/**
 * checkFinalAssessment — Validate finalAssessment structure.
 */
export function checkFinalAssessment(courseDraft) {
  if (!courseDraft.finalAssessment) return null;
  if (!courseDraft.finalAssessment.title || typeof courseDraft.finalAssessment.title !== 'string') {
    return 'finalAssessment must have a title (string)';
  }
  if (!Array.isArray(courseDraft.finalAssessment.exercises) || courseDraft.finalAssessment.exercises.length < 3) {
    return `finalAssessment must have at least 3 exercises (found ${courseDraft.finalAssessment.exercises?.length || 0})`;
  }
  return null;
}

/**
 * semanticValidate — Run all semantic checks on a course draft.
 * Accepts options for mode configuration.
 * @param {object} courseDraft
 * @param {object} [options] - { simplerContent?: boolean }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function semanticValidate(courseDraft, options = {}) {
  const config = getConfig(options);
  const errors = [];

  if (!courseDraft || typeof courseDraft !== 'object') {
    return { valid: false, errors: ['Course draft must be an object'] };
  }
  if (!Array.isArray(courseDraft.topics)) {
    return { valid: false, errors: ['Course draft must have a topics array'] };
  }

  // Check topic count for normal mode (3 subtopics)
  if (!options.simplerContent && courseDraft.topics.length !== 3) {
    errors.push(`Course must have exactly 3 topics/sub-topics (found ${courseDraft.topics.length})`);
  }
  if (options.simplerContent && courseDraft.topics.length < 1) {
    errors.push('Course must have at least 1 topic');
  }

  courseDraft.topics.forEach((topic, ti) => {
    if (!topic || typeof topic !== 'object') return;
    if (!Array.isArray(topic.lessons)) return;

    topic.lessons.forEach((lesson, li) => {
      if (!lesson || typeof lesson !== 'object') return;

      // Lesson-level checks (with configurable thresholds)
      const refErr = checkReferenceContent(lesson, ti, li, config);
      if (refErr) errors.push(refErr);

      const volErr = checkExerciseVolume(lesson, ti, li, config);
      if (volErr) errors.push(volErr);

      // Advanced lesson-level checks
      const stratErr = checkHasStrategyNote(lesson, ti, li, config);
      if (stratErr) errors.push(stratErr);

      const blueprintErr = checkHasTextTypeBlueprint(lesson, ti, li, config, courseDraft.tags);
      if (blueprintErr) errors.push(blueprintErr);

      const contrastErr = checkHasLevelUpContrasts(lesson, ti, li, config);
      if (contrastErr) errors.push(contrastErr);

      const diversityErr = checkExerciseDiversity(lesson, ti, li, config);
      if (diversityErr) errors.push(diversityErr);

      // Exercise-level checks
      if (Array.isArray(lesson.exercises)) {
        lesson.exercises.forEach((exercise, ei) => {
          if (!exercise || typeof exercise !== 'object') return;

          // Existing exercise checks
          const mcqErr = checkMCQAnswer(exercise, ti, li, ei);
          if (mcqErr) errors.push(mcqErr);

          const gapErr = checkGapFillAnswer(exercise, lesson, ti, li, ei);
          if (gapErr) errors.push(gapErr);

          const explErr = checkExplanationLength(exercise, ti, li, ei);
          if (explErr) errors.push(explErr);

          // New advanced exercise checks
          const optCountErr = checkMCQOptionCount(exercise, ti, li, ei);
          if (optCountErr) errors.push(optCountErr);

          const optLabelErr = checkMCQOptionsLabelled(exercise, ti, li, ei);
          if (optLabelErr) errors.push(optLabelErr);

          const verbErr = checkMCQAnswerNotVerbatim(exercise, lesson, ti, li, ei, config);
          if (verbErr) errors.push(verbErr);

          const bloomErr = checkBloomDepth(exercise, ti, li, ei, config);
          if (bloomErr) errors.push(bloomErr);

          const formulaErr = checkNotFormulaQuestion(exercise, ti, li, ei, config);
          if (formulaErr) errors.push(formulaErr);
        });
      }
    });
  });

  // Final assessment check
  const faErr = checkFinalAssessment(courseDraft);
  if (faErr) errors.push(faErr);

  return { valid: errors.length === 0, errors };
}

/**
 * buildRetryFeedback — Formats validation errors into structured retry prompt.
 * Groups errors by lesson location for clearer AI correction.
 * @param {string[]} errors
 * @returns {string}
 */
export function buildRetryFeedback(errors) {
  if (!errors?.length) return '';
  const groups = {};
  for (const err of errors) {
    const match = err.match(/^Topic (\d+), Lesson (\d+)/);
    if (match) {
      const key = `Topic ${match[1]}, Lesson ${match[2]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(err);
    } else {
      if (!groups['_general']) groups['_general'] = [];
      groups['_general'].push(err);
    }
  }
  const parts = [];
  for (const [key, errs] of Object.entries(groups)) {
    if (key === '_general') {
      parts.push('General:\n  - ' + errs.join('\n  - '));
    } else {
      parts.push(`${key}:\n  - ` + errs.map(e => e.replace(/^Topic \d+, Lesson \d+: /, '').replace(/^Topic \d+, Lesson \d+/, '')).join('\n  - '));
    }
  }
  return parts.join('\n\n');
}
