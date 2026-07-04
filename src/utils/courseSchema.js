/**
 * Course data model definitions and validators.
 * Implements D-24 through D-27 from the phase context.
 * Both imported (PDF) and auto-generated courses share this model (D-01).
 */

/**
 * COURSE_SCHEMA: Structural mapping of the course model.
 * Course → Topic → Lesson → Exercise hierarchy (D-24 through D-27).
 */
export const COURSE_SCHEMA = {
  Course: {
    fields: {
      id: { type: 'string', required: true },
      title: { type: 'string', required: true },
      description: { type: 'string', required: false },
      topics: { type: 'array', required: true },
      tags: { type: 'array', required: true },
      difficulty: { type: 'string', required: true, values: ['beginner', 'intermediate', 'advanced'] },
      source: { type: 'string', required: false }, // 'pdf-import' | 'auto-generated' | 'manual'
      sourceTaskId: { type: 'string', required: false },
      weaknessPattern: { type: 'string', required: false },
      generationDate: { type: 'string', required: false },
      createdAt: { type: 'string', required: false },
      published: { type: 'boolean', required: false },
      quality: { type: 'string', required: false, values: ['seed', 'reviewed', 'draft'] },
      draft: { type: 'object', required: false },
    },
  },
  Topic: {
    fields: {
      title: { type: 'string', required: true },
      learningObjectives: { type: 'array', required: false },
      lessons: { type: 'array', required: true },
    },
  },
  Lesson: {
    fields: {
      title: { type: 'string', required: true },
      exercises: { type: 'array', required: true },
      referenceContent: { type: 'string', required: false },
      unlocked: { type: 'boolean', required: false },
    },
  },
  Exercise: {
    fields: {
      question: { type: 'string', required: true },
      type: { type: 'string', required: true },
      answer: { type: 'string', required: true },
      explanation: { type: 'string', required: false },
      difficulty: { type: 'number', required: false },
      tags: { type: 'array', required: false },
    },
  },
};

/**
 * EXERCISE_TYPES: Topic domain to exercise type mapping (D-11).
 * Each topic domain supports specific exercise types best suited to that skill.
 */
export const EXERCISE_TYPES = {
  grammar: ['gap-fill', 'sentence-rewrite', 'mcq'],
  vocabulary: ['matching', 'cloze', 'mcq'],
  'sentence-structure': ['reordering', 'short-answer', 'mcq'],
};

/**
 * TAG_TAXONOMY: Pre-defined tag taxonomy (D-17).
 * Extensible by AI over time when new weakness patterns are detected.
 */
export const TAG_TAXONOMY = {
  grammar: ['articles', 'tenses', 'subject-verb-agreement', 'conditionals', 'passive-voice'],
  vocabulary: ['academic', 'idiomatic', 'collocations', 'phrasal-verbs', 'word-forms'],
  'sentence-structure': ['complex-sentences', 'relative-clauses', 'inversion', 'ellipsis', 'cohesion'],
};

/**
 * WEAKNESS_TO_TAG_MAP: Maps error pattern area names to course tags.
 * Used by the recommendation pipeline to match weak areas to courses.
 */
export const WEAKNESS_TO_TAG_MAP = {
  'Grammar': ['grammar:articles', 'grammar:tenses', 'grammar:subject-verb-agreement', 'grammar:conditionals', 'grammar:passive-voice'],
  'Vocabulary': ['vocab:academic', 'vocab:collocations', 'vocab:idiomatic', 'vocab:phrasal-verbs', 'vocab:word-forms'],
  'Inference': ['reading:inference'],
  'Main Idea': ['reading:main-idea'],
  'Sentence Structure': ['sentence-structure:complex-sentences', 'sentence-structure:relative-clauses', 'sentence-structure:inversion', 'sentence-structure:ellipsis', 'sentence-structure:cohesion'],
  'Detail Retrieval': ['reading:detail'],
  'Vocabulary in Context': ['vocab:context', 'reading:vocab-in-context'],
  'Tone & Attitude': ['reading:tone'],
  'Purpose': ['reading:purpose'],
};

/**
 * calculateCourseRecommendations: Maps weak areas to course tag sets, sorted by severity.
 * Excludes tags that completed courses already cover — unless weakness persists (D-14).
 *
 * @param {Array} weakAreas - Array from identifyWeakAreas() of { area, type, percentage, severity }
 * @param {Array} completedCourses - Array of completed course objects with tags[]
 * @returns {Array<{ tags: string[], confidence: number, source: string }>} Recommended tag sets
 */
export function calculateCourseRecommendations(weakAreas, completedCourses = []) {
  if (!weakAreas?.length) return [];

  // Collect all tags covered by completed courses
  const completedTags = new Set();
  completedCourses.forEach(c => {
    (c.tags || []).forEach(t => completedTags.add(t));
  });

  const recommendations = [];

  for (const wa of weakAreas) {
    const tags = WEAKNESS_TO_TAG_MAP[wa.area];
    if (!tags || tags.length === 0) continue;

    // D-14: Always recommend even if tags are covered — fresh courses may take different approach
    // But tag suggestions are still filtered to avoid recommending exactly the same content
    const newTags = tags.filter(t => !completedTags.has(t));
    const suggestedTags = newTags.length > 0 ? newTags : tags;

    const confidence = wa.severity === 'critical' ? 0.9 : 0.7;

    recommendations.push({
      tags: suggestedTags,
      confidence,
      source: wa.type === 'skill' ? 'weakness' : 'pattern',
      percentage: wa.percentage,
    });
  }

  // Sort by severity (critical first), then by percentage (lower = worse)
  return recommendations.sort((a, b) => {
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return (a.percentage || 100) - (b.percentage || 100);
  });
}

/**
 * DISMISSED_RECS_KEY: localStorage key for dismissed post-task recommendations.
 */
const DISMISSED_RECS_KEY = 'crescendo-dismissed-recs';
const DISMISS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * getDismissedRecommendations: Returns active (non-expired) dismissed tag sets from localStorage.
 * Filters out dismissals older than 7 days.
 * @returns {Array} Array of { tags: string[], dismissedAt: number }
 */
export function getDismissedRecommendations() {
  try {
    const raw = localStorage.getItem(DISMISSED_RECS_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return entries.filter(e => now - e.dismissedAt < DISMISS_EXPIRY_MS);
  } catch {
    return [];
  }
}

/**
 * dismissRecommendation: Stores a dismissed recommendation tag set in localStorage.
 * @param {string[]} tagSet - The recommended tags that were dismissed
 */
export function dismissRecommendation(tagSet) {
  try {
    const raw = localStorage.getItem(DISMISSED_RECS_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    entries.push({ tags: tagSet, dismissedAt: Date.now() });
    localStorage.setItem(DISMISSED_RECS_KEY, JSON.stringify(entries));
  } catch { /* silent */ }
}

/**
 * validateCourse: Validates the full course structure.
 * Returns { valid: boolean, errors: string[] }.
 * @param {object} courseObj
 * @param {object} [options] - { simplerContent?: boolean, isLegacy?: boolean }
 */
export function validateCourse(courseObj, options = {}) {
  const errors = [];

  if (!courseObj || typeof courseObj !== 'object') {
    return { valid: false, errors: ['Course must be an object'] };
  }

  // Check required fields
  if (!courseObj.id) errors.push('Course must have an id');
  if (!courseObj.title || typeof courseObj.title !== 'string') {
    errors.push('Course must have a title (string)');
  }

  // Validate topics array
  if (!Array.isArray(courseObj.topics) || courseObj.topics.length === 0) {
    errors.push('Course must have at least one topic');
  } else {
    // Validate each topic
    courseObj.topics.forEach((topic, ti) => {
      if (!topic || typeof topic !== 'object') {
        errors.push(`Topic ${ti}: must be an object`);
        return;
      }
      if (!topic.title || typeof topic.title !== 'string') {
        errors.push(`Topic ${ti}: must have a title (string)`);
      }
      if (!Array.isArray(topic.lessons) || topic.lessons.length === 0) {
        errors.push(`Topic ${ti} ("${topic.title || 'unnamed'}"): must have at least one lesson`);
      } else {
        // Validate each lesson
        topic.lessons.forEach((lesson, li) => {
          if (!lesson || typeof lesson !== 'object') {
            errors.push(`Topic ${ti}, Lesson ${li}: must be an object`);
            return;
          }
          if (!lesson.title || typeof lesson.title !== 'string') {
            errors.push(`Topic ${ti}, Lesson ${li}: must have a title (string)`);
          }
          if (!Array.isArray(lesson.exercises) || lesson.exercises.length === 0) {
            errors.push(`Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): must have at least one exercise`);
          } else {
            // Validate each exercise
            lesson.exercises.forEach((exercise, ei) => {
              if (!exercise || typeof exercise !== 'object') {
                errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: must be an object`);
                return;
              }
              if (!exercise.question || typeof exercise.question !== 'string') {
                errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: must have a question (string)`);
              }
              if (!exercise.type || typeof exercise.type !== 'string') {
                errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: must have a type (string)`);
              }
            });
          }
        });
      }
    });
  }

  // Validate tags
  if (!Array.isArray(courseObj.tags)) {
    errors.push('Course must have a tags array');
  }

  // Validate difficulty
  if (courseObj.difficulty && !['beginner', 'intermediate', 'advanced'].includes(courseObj.difficulty)) {
    errors.push(`Course difficulty must be one of: beginner, intermediate, advanced (got "${courseObj.difficulty}")`);
  }

  // Validate finalAssessment if present
  if (courseObj.finalAssessment) {
    if (!courseObj.finalAssessment.title || typeof courseObj.finalAssessment.title !== 'string') {
      errors.push('finalAssessment must have a title (string)');
    }
    if (!Array.isArray(courseObj.finalAssessment.exercises) || courseObj.finalAssessment.exercises.length === 0) {
      errors.push('finalAssessment must have at least one exercise');
    }
  }

  // Add semantic validation after structural checks (skip for legacy)
  if (!options.isLegacy) {
    const semanticResult = semanticValidate(courseObj, options);
    errors.push(...semanticResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * validateExercise: Validates exercise fields based on type.
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateExercise(exercise, type) {
  const errors = [];

  if (!exercise || typeof exercise !== 'object') {
    return { valid: false, errors: ['Exercise must be an object'] };
  }

  if (!exercise.question || typeof exercise.question !== 'string') {
    errors.push('Exercise must have a question (string)');
  }

  if (!exercise.type || typeof exercise.type !== 'string') {
    errors.push('Exercise must have a type (string)');
  }

  // Type-specific validations
  if (type === 'gap-fill') {
    if (typeof exercise.answer !== 'string') {
      errors.push('gap-fill exercise must have an answer as string');
    }
  } else if (type === 'matching') {
    if (!Array.isArray(exercise.pairs)) {
      errors.push('matching exercise must have a pairs array');
    }
  } else if (type === 'sentence-rewrite') {
    if (typeof exercise.answer !== 'string') {
      errors.push('sentence-rewrite exercise must have an answer as string');
    }
  } else if (type === 'cloze') {
    if (typeof exercise.answer !== 'string') {
      errors.push('cloze exercise must have an answer as string');
    }
  } else if (type === 'reordering') {
    if (!Array.isArray(exercise.correctOrder)) {
      errors.push('reordering exercise must have a correctOrder array');
    }
  } else if (type === 'short-answer') {
    if (typeof exercise.answer !== 'string') {
      errors.push('short-answer exercise must have an answer as string');
    }
  } else if (type === 'mcq') {
    if (!Array.isArray(exercise.options) || exercise.options.length < 2) {
      errors.push('mcq exercise must have at least 2 options');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * semanticValidate — Client-side semantic validation for course drafts.
 * Mirrors the server validator in server/utils/courseSemanticValidator.js.
 * CRITICAL: SYNCHRONIZE WITH SERVER COPY — both must implement the same 14 checks.
 * @param {object} courseDraft
 * @param {object} [options] - { simplerContent?: boolean }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function semanticValidate(courseDraft, options = {}) {
  const config = {
    minWords: options.simplerContent ? 150 : 250,
    minExercises: 3,
    requireStrategyNote: !options.simplerContent,
    requireTextTypeBlueprint: !options.simplerContent,
    requireLevelUpContrasts: !options.simplerContent,
    requireExerciseDiversity: !options.simplerContent,
    blameDepthMin: options.simplerContent ? 2 : 3,
    blockVerbatimRecall: !options.simplerContent,
    blockFormulaQuestion: !options.simplerContent,
  };

  const errors = [];
  if (!courseDraft || typeof courseDraft !== 'object') return { valid: false, errors: ['Course draft must be an object'] };
  if (!Array.isArray(courseDraft.topics)) return { valid: false, errors: ['Course draft must have a topics array'] };

  // Check topic count
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

      // Lesson-level checks
      const refContent = lesson.referenceContent;
      if (!refContent || typeof refContent !== 'string') {
        errors.push(`Topic ${ti}, Lesson ${li}: referenceContent missing or not a string`);
      } else {
        const wordCount = refContent.trim().split(/\s+/).length;
        if (wordCount < config.minWords) {
          errors.push(`Topic ${ti}, Lesson ${li}: referenceContent too short (${wordCount} words, minimum ${config.minWords})`);
        }
      }

      const exCount = lesson.exercises?.length || 0;
      if (exCount < config.minExercises) {
        errors.push(`Topic ${ti}, Lesson ${li}: insufficient exercises (${exCount}, minimum ${config.minExercises})`);
      }

      // Advanced lesson-level checks
      if (config.requireStrategyNote) {
        const text = [lesson.title || '', lesson.referenceContent || '', ...(lesson.exercises || []).map(e => e.question || '')].join(' ');
        const strategyRegex = /(##?\s*Tutor'?s\s*Strategy\s*Note|\n\s*Tutor'?s\s*Strategy\s*Note:)/i;
        if (!strategyRegex.test(text)) {
          errors.push(`Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): missing Tutor's Strategy Note with HKEAA examiner trap pattern`);
        }
      }

      if (config.requireTextTypeBlueprint) {
        const courseTags = courseDraft.tags || [];
        const isWritingCourse = courseTags.some(t => /^writing:(?:formal-)?(?:letter|report|speech|proposal|article|email|blog|diary)/i.test(t));
        if (isWritingCourse) {
          const text = [lesson.title || '', lesson.referenceContent || '', ...(lesson.exercises || []).map(e => e.question || '')].join(' ');
          const blueprintRegex = /(Text-Type Structural Blueprint|Structural Skeleton|-----+\s*(?:Structure|Format|Skeleton))[\s\S]{10,}(?:->|➔|Paragraph|\d\.|•|- )/i;
          if (!blueprintRegex.test(text)) {
            errors.push(`Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): missing Text-Type Structural Blueprint with structural skeleton`);
          }
        }
      }

      if (config.requireLevelUpContrasts) {
        const text = [lesson.title || '', lesson.referenceContent || '', ...(lesson.exercises || []).map(e => [e.question || '', e.explanation || '']).flat()].join(' ');
        const contrastRegex = /\*\*Level 3 Baseline:\*\*[\s\S]*?\*\*Level 5\*\* Elite:\*\*/g;
        const matches = text.match(contrastRegex) || [];
        if (matches.length < 3) {
          errors.push(`Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): insufficient Level-Up Contrasts (found ${matches.length}, minimum 3 L3→L5** transformations)`);
        }
      }

      if (config.requireExerciseDiversity) {
        const types = (lesson.exercises || []).map(e => e.type);
        const mcqCount = types.filter(t => t === 'mcq').length;
        const gfCount = types.filter(t => t === 'gap-fill').length;
        const saCount = types.filter(t => t === 'short-answer').length;
        const otherCount = types.filter(t => !['mcq', 'gap-fill', 'short-answer'].includes(t)).length;
        if (mcqCount !== 1 || gfCount !== 1 || saCount !== 1 || otherCount > 0) {
          errors.push(`Topic ${ti}, Lesson ${li} ("${lesson.title || 'unnamed'}"): exercise type mismatch — expected exactly 1 MCQ (found ${mcqCount}), 1 gap-fill (${gfCount}), 1 short-answer (${saCount})${otherCount > 0 ? `, unexpected types: ${otherCount}` : ''}`);
        }
      }

      // Exercise-level checks
      if (Array.isArray(lesson.exercises)) {
        lesson.exercises.forEach((exercise, ei) => {
          if (!exercise || typeof exercise !== 'object') return;

          // MCQ answer in options
          if (exercise.type === 'mcq' && Array.isArray(exercise.options) && exercise.options.length > 0) {
            const opts = exercise.options.map(o => String(o).toLowerCase().trim());
            const optsStripped = opts.map(o => o.replace(/^[a-d][.)\s]+/, ''));
            const ansRaw = String(exercise.answer || '').toLowerCase().trim();
            const ansStripped = ansRaw.replace(/^[a-d][.)\s]+/, '');
            const letterMatch = /^[a-d]$/.test(ansStripped) && exercise.options.some(o => String(o).toLowerCase().trim().startsWith(ansStripped));
            const textMatch = opts.includes(ansRaw) || optsStripped.includes(ansRaw) || optsStripped.includes(ansStripped);
            if (!letterMatch && !textMatch) {
              errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): answer "${exercise.answer}" not found in options [${exercise.options.join(', ')}]`);
            }
          }

          // MCQ option count
          if (exercise.type === 'mcq' && (!Array.isArray(exercise.options) || exercise.options.length !== 4)) {
            errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): must have exactly 4 options (found ${exercise.options?.length || 0})`);
          }

          // MCQ options labelled
          if (exercise.type === 'mcq' && Array.isArray(exercise.options) && exercise.options.length > 0) {
            const labelled = exercise.options.every(o => /^[a-d][.)\s]/i.test(String(o).trim()));
            if (!labelled) {
              errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): options should be labelled A/B/C/D (e.g. "A) option text")`);
            }
          }

          // MCQ answer not verbatim
          if (exercise.type === 'mcq' && config.blockVerbatimRecall && exercise.answer) {
            const content = lesson.referenceContent;
            if (content && typeof content === 'string') {
              const ans = String(exercise.answer || '').toLowerCase().trim();
              if (ans.length >= 4 && ans.length <= 120 && content.toLowerCase().includes(ans)) {
                const words = ans.split(/\s+/);
                if (words.length <= 4) {
                  errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei} (mcq): answer "${exercise.answer}" is a verbatim quote from reference content — rewrite to require reasoning, not recall`);
                }
              }
            }
          }

          // Gap-fill answer in referenceContent
          if ((exercise.type === 'gap-fill' || exercise.type === 'cloze') && exercise.answer) {
            const content = lesson.referenceContent;
            if (content && typeof content === 'string') {
              if (!content.toLowerCase().includes(String(exercise.answer).toLowerCase().trim())) {
                errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei} (${exercise.type}): answer "${exercise.answer}" not found in lesson referenceContent`);
              }
            }
          }

          // Explanation length
          const explLen = exercise.explanation?.trim().length || 0;
          if (explLen < 40) {
            errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: explanation too short (${explLen} chars, minimum 40)`);
          }

          // Bloom's depth
          if (exercise.question) {
            const stem = (exercise.question || '').toLowerCase();
            const recall = ['what is', 'what does', 'define', 'list', 'name', 'identify', 'when did', 'who wrote', 'according to', 'how many', 'what year', 'fill in the blank with'];
            const deep = ['compare', 'contrast', 'distinguish', 'differentiate', 'evaluate', 'judge', 'which is better', 'what is wrong', 'identify the problem', 'which strategy', 'diagnose', 'why does', 'what would happen', 'which best', 'most likely', 'which of the following best', 'choose the best'];
            let bloom = 3;
            for (const v of deep) if (stem.includes(v)) bloom = 4;
            for (const v of recall) if (stem.startsWith(v) || stem.includes(' ' + v) || stem.includes(v)) bloom = Math.min(bloom, 1);
            if (bloom < config.blameDepthMin) {
              errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: Bloom's depth ${bloom} (minimum ${config.blameDepthMin}) — exercise tests recall, rewrite to require understanding or application`);
            }
          }

          // Formula question detection
          if (config.blockFormulaQuestion && exercise.question) {
            const stem = (exercise.question || '').toLowerCase();
            const answer = String(exercise.answer || '');
            const prescriptiveCount = /how\s+(many|much)\s.*\b(should|typically|usually|must|does|do)\b/.test(stem);
            if (prescriptiveCount) {
              errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: formula question detected — "how many X should Y" tests memorised rules, not understanding`);
            } else if (/^\d+\s*[-–—to]+\s*\d+$/.test(answer.trim())) {
              errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: answer is a numeric range (${answer}) — tests formula recall, not understanding`);
            } else if (/^\d+$/.test(answer.trim()) && parseInt(answer) > 1) {
              const entityCount = /\b(how many|how much)\b/.test(stem);
              const structureEntity = /\b(sentences?|paragraphs?|words?|steps?|points?|stages?|phases?|parts?|sections?|marks?)\b/.test(stem);
              const prescriptive = /\b(should|typically|usually|must|always|every)\b/.test(stem);
              if (entityCount && structureEntity && prescriptive) {
                errors.push(`Topic ${ti}, Lesson ${li}, Exercise ${ei}: formula question detected — answer is a number (${answer}) for a prescriptive count, tests formula recall`);
              }
            }
          }
        });
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

/**
 * buildRetryFeedback — Formats validation errors into structured retry feedback for AI.
 * Groups errors by lesson for clearer correction instructions.
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

/**
 * safeMapLegacyCourse — Migration layer for backward compatibility.
 * Tags existing courses as legacy to skip advanced structural checks.
 * @param {object} course
 * @returns {object}
 */
export function safeMapLegacyCourse(course) {
  if (!course) return course;
  if (course.version >= 2) return course;
  return {
    ...course,
    version: 2,
    isLegacy: true,
    tag: course.tag || course.tags?.[0] || 'HKDSE-CORE',
  };
}
