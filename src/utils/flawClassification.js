export const FLAW_CATEGORIES = {
  vocabulary: {
    slug: 'vocabulary',
    label: 'Vocabulary',
    description: 'Wrong word choice, collocation errors, inappropriate register'
  },
  grammar: {
    slug: 'grammar',
    label: 'Grammar',
    description: 'Tense errors, subject-verb agreement, article misuse, preposition errors'
  },
  comprehension: {
    slug: 'comprehension',
    label: 'Comprehension',
    description: 'Failed to understand passage/question, selected wrong detail'
  },
  inference: {
    slug: 'inference',
    label: 'Inference',
    description: 'Drew unsupported conclusion, missed implicit meaning'
  },
  synthesis: {
    slug: 'synthesis',
    label: 'Synthesis',
    description: 'Failed to connect multiple ideas, missing comparative analysis'
  },
  expression: {
    slug: 'expression',
    label: 'Expression',
    description: 'Unclear phrasing, awkward structure, coherence gaps'
  }
};

export const FLAW_SEVERITY = {
  micro: { slug: 'micro', label: 'Micro', description: 'Single word/phrase error (1 mark lost, localized)' },
  meso: { slug: 'meso', label: 'Meso', description: 'Sentence/idea-level error (2-3 marks lost, affects partial understanding)' },
  macro: { slug: 'macro', label: 'Macro', description: 'Structural/conceptual error (4+ marks lost, fundamentally wrong approach)' }
};

const QUESTION_TYPE_CATEGORY_MAP = {
  mcq: 'comprehension',
  tfng: 'comprehension',
  'gap-fill': 'vocabulary',
  'short-answer': 'vocabulary',
  matching: 'comprehension',
  'open-ended': 'expression',
  'sentence-rewrite': 'grammar',
  'summary-cloze': 'synthesis',
  'pronoun-ref': 'comprehension',
  'semantic-connect': 'inference'
};

const KEYWORD_CATEGORY_MAP = [
  { keywords: ['tense', 'agreement', 'article', 'preposition', 'plural', 'singular', 'conjugation'], category: 'grammar' },
  { keywords: ['word choice', 'collocation', 'register', 'formal', 'informal', 'vocab'], category: 'vocabulary' },
  { keywords: ['infer', 'imply', 'suggest', 'conclude', 'assumption', 'implicit'], category: 'inference' },
  { keywords: ['coherence', 'cohesion', 'structure', 'flow', 'unclear', 'rephrase', 'awkward'], category: 'expression' },
  { keywords: ['connect', 'synthesize', 'compare', 'contrast', 'relationship', 'combine'], category: 'synthesis' },
  { keywords: ['comprehension', 'understanding', 'main idea', 'detail', 'passage'], category: 'comprehension' }
];

export function classifyFlaw(questionType, errorContext, marksLost) {
  const baseCategory = QUESTION_TYPE_CATEGORY_MAP[questionType] || 'comprehension';
  const matchedKeyword = (errorContext || '').toLowerCase();
  let refinedCategory = baseCategory;

  for (const rule of KEYWORD_CATEGORY_MAP) {
    if (rule.keywords.some(kw => matchedKeyword.includes(kw))) {
      refinedCategory = rule.category;
      break;
    }
  }

  let severity;
  if (marksLost >= 4) {
    severity = 'macro';
  } else if (marksLost >= 2) {
    severity = 'meso';
  } else {
    severity = 'micro';
  }

  const confidence = baseCategory === refinedCategory ? 0.6 : 0.85;

  return { category: refinedCategory, severity, confidence };
}

export function aggregateFlaws(flawRecords, windowDays = 7) {
  const now = Date.now();
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const windowed = flawRecords.filter(f => f.timestamp >= cutoff);

  const byCategory = {};
  const bySeverity = {};

  for (const f of windowed) {
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategories = sorted.slice(0, 3).map(([cat]) => cat);

  const midpoint = cutoff + (windowDays * 24 * 60 * 60 * 1000) / 2;
  let firstHalf = 0;
  let secondHalf = 0;
  for (const f of windowed) {
    if (f.timestamp < midpoint) {
      firstHalf++;
    } else {
      secondHalf++;
    }
  }
  let trend = 'stable';
  if (firstHalf > 0 && secondHalf > 0) {
    const ratio = secondHalf / firstHalf;
    if (ratio < 0.8) trend = 'improving';
    else if (ratio > 1.2) trend = 'declining';
  }

  return { byCategory, bySeverity, topCategories, trend };
}
