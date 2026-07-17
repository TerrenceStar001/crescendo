export const DSE_EXAM_DATE = new Date(new Date().getFullYear(), 3, 7);

export const EXERCISE_CONSTRAINT_FIELDS = {
  difficulty: { type: 'enum', values: ['easy', 'medium', 'hard'], default: 'medium' },
  type: {
    type: 'enum',
    values: ['mcq', 'tfng', 'gap-fill', 'short-answer', 'matching', 'open-ended', 'sentence-rewrite', 'summary-cloze'],
    default: 'mcq'
  },
  timeLimit: { type: 'number', unit: 'minutes', default: 10, min: 2, max: 60 },
  theme: { type: 'string', description: 'Topic focus like "environment", "technology", "health"', default: 'general' },
  format: { type: 'enum', values: ['passage-based', 'standalone', 'vocab-drill', 'error-correction'], default: 'passage-based' },
  focus: { type: 'enum', values: ['vocabulary', 'grammar', 'comprehension', 'inference', 'synthesis', 'expression'], default: 'comprehension' }
};

const VALID_ENUMS = {};
for (const [key, field] of Object.entries(EXERCISE_CONSTRAINT_FIELDS)) {
  if (field.type === 'enum') {
    VALID_ENUMS[key] = new Set(field.values);
  }
}

export function calcDensity(examDate) {
  const target = examDate || DSE_EXAM_DATE;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  let density, sessionsPerWeek, dailyMinutes;
  if (daysRemaining > 180) {
    density = 'low';
    sessionsPerWeek = 2;
    dailyMinutes = 20;
  } else if (daysRemaining >= 90) {
    density = 'medium';
    sessionsPerWeek = 3;
    dailyMinutes = 30;
  } else if (daysRemaining >= 30) {
    density = 'high';
    sessionsPerWeek = 5;
    dailyMinutes = 45;
  } else {
    density = 'critical';
    sessionsPerWeek = 6;
    dailyMinutes = 60;
  }

  return { daysRemaining, density, sessionsPerWeek, dailyMinutes };
}

export function buildConstraints(overrides) {
  const merged = {};

  for (const [key, field] of Object.entries(EXERCISE_CONSTRAINT_FIELDS)) {
    const value = overrides && overrides[key] !== undefined ? overrides[key] : field.default;

    if (field.type === 'enum' && VALID_ENUMS[key] && !VALID_ENUMS[key].has(value)) {
      merged[key] = field.default;
    } else if (field.type === 'number' && typeof value === 'number') {
      merged[key] = Math.max(field.min, Math.min(field.max, value));
    } else {
      merged[key] = value;
    }
  }

  return merged;
}
