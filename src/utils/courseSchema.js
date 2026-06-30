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
 * validateCourse: Validates the full course structure.
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateCourse(courseObj) {
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
