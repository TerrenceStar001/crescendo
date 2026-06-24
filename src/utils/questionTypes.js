// DSE Paper 1 question type distribution, mark allocation, and per-type configuration.
// These define HKDSE question type proportions, cognitive trap categories for
// MCQ distractors, and difficulty progression per part (A/B1/B2).

// ---------------------------------------------------------------------------
// 1. Question type distribution ranges per part (research-backed estimates)
//    Source: 02-RESEARCH.md — HKDSE Paper 1 analysis 2020-2024
//    Percentages serve as guidance ranges; specific values are picked via
//    getTypeDistributionForPart() using the midpoint of each range.
// ---------------------------------------------------------------------------
export const QUESTION_TYPE_DISTRIBUTIONS = {
  A: {
    'short-answer': { min: 25, max: 35 },
    'cloze': { min: 15, max: 25 },
    'mcq': { min: 10, max: 20 },
    'matching': { min: 8, max: 15 },
    'tfng': { min: 8, max: 12 },
    'reference': { min: 5, max: 10 },
    'table-chart': { min: 5, max: 10 },
  },
  B1: {
    'short-answer': { min: 25, max: 35 },
    'cloze': { min: 15, max: 25 },
    'mcq': { min: 10, max: 20 },
    'matching': { min: 10, max: 15 },
    'tfng': { min: 8, max: 12 },
    'reference': { min: 5, max: 8 },
    'table-chart': { min: 5, max: 10 },
    'summary-cloze': { min: 0, max: 8 },
  },
  B2: {
    'short-answer': { min: 20, max: 30 },
    'cloze': { min: 10, max: 20 },
    'mcq': { min: 8, max: 15 },
    'matching': { min: 5, max: 10 },
    'tfng': { min: 5, max: 10 },
    'reference': { min: 5, max: 10 },
    'inferencing': { min: 5, max: 10 },
    'summary-cloze': { min: 5, max: 10 },
    'pronoun-ref': { min: 0, max: 8 },
    'semantic-connect': { min: 0, max: 8 },
  },
};

// ---------------------------------------------------------------------------
// 2. Mark allocation — DSE Paper 1 conventions
//    Per D-02: total marks = exactly 42 per part.
//    Per D-03: question count range 19–27.
// ---------------------------------------------------------------------------
export const MARK_ALLOCATION = {
  /** Total marks per part — exact DSE requirement */
  marksPerPart: 42,
  /** Expected question count range per part */
  questionRange: { min: 19, max: 27 },
  /** Default marks per question (most sub-questions carry 1 mark) */
  defaultMarks: 1,
  /** Types that sometimes carry 2-3 marks in DSE marking schemes */
  multiMarkTypes: ['open-ended', 'short-answer'],
};

// ---------------------------------------------------------------------------
// 3. Cognitive trap taxonomy — 5 distractor categories (D-04)
//    Used by MCQ distractor generation. NO opposite traps included.
// ---------------------------------------------------------------------------
export const COGNITIVE_TRAP_TYPES = [
  {
    id: 'extreme-wording',
    label: 'Extreme Wording',
    description: 'Uses always/never/all/none/every to overgeneralize what the passage says',
    example: 'Passage says "some students prefer online learning" → distractor says "all students prefer online learning"',
  },
  {
    id: 'similar-sounding',
    label: 'Similar Sounding',
    description: 'Reuses exact keywords from the passage but in a different context that changes the meaning',
    example: 'Passage mentions "rising sea levels threaten coastal farming" → distractor says "rising sea levels threaten the fishing industry"',
  },
  {
    id: 'partial-truth',
    label: 'Partial Truth',
    description: 'Partially correct statement that contains a critical factual error',
    example: 'Passage says "GDP grew 2.3% in Q1 and 1.8% in Q2" → distractor says "GDP grew 2.3% in both Q1 and Q2"',
  },
  {
    id: 'out-of-scope',
    label: 'Out of Scope',
    description: 'Factually true statement that cannot be verified from the passage text',
    example: 'Passage discusses Hong Kong\'s public transport system → distractor introduces Tokyo\'s system as a comparison point not found in the text',
  },
  {
    id: 'numerical',
    label: 'Numerical Distraction',
    description: 'Uses similar numbers, dates, percentages, or statistics to confuse the reader',
    example: 'Passage mentions "72% of respondents agreed" → distractor says "82% of respondents agreed"',
  },
];

// ---------------------------------------------------------------------------
// 4. Question difficulty categories — mapped to DSE Levels
//    Source: 02-RESEARCH.md question type taxonomy
// ---------------------------------------------------------------------------
export const QUESTION_CATEGORIES = {
  /** Level 2–4 — Foundation types */
  foundation: [
    'short-answer',
    'cloze',
    'mcq',
    'reference',
    'matching',
    'tfng',
    'table-chart',
  ],
  /** Level 4–5 — Intermediate types */
  intermediate: [
    'inferencing',
    'comparison',
    'views-attitudes',
    'pronoun-ref',
  ],
  /** Level 5 — Advanced types */
  advanced: [
    'main-idea',
    'summary-cloze',
    'sequencing',
    'semantic-connect',
  ],
  /** Level 5** — Highest difficulty types */
  highest: [
    'figurative-language',
    'proofreading',
  ],
};

// ---------------------------------------------------------------------------
// 5. Difficulty progression by part — percentage breakdown
// ---------------------------------------------------------------------------
export const DIFFICULTY_PROGRESSION_BY_PART = {
  A: { foundation: 70, intermediate: 20, advanced: 10, highest: 0 },
  B1: { foundation: 80, intermediate: 20, advanced: 0, highest: 0 },
  B2: { foundation: 0, intermediate: 20, advanced: 40, highest: 40 },
};

// ---------------------------------------------------------------------------
// 6. Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a concrete percentage distribution for a given part by picking
 * the midpoint of each type's range. Percentages are normalised to sum to 100.
 *
 * @param {'A'|'B1'|'B2'} part
 * @returns {Record<string, number>} typeSlug → percentage
 */
export function getTypeDistributionForPart(part) {
  const dist = QUESTION_TYPE_DISTRIBUTIONS[part];
  if (!dist) return {};

  // Pick midpoint of each range
  const raw = {};
  for (const [slug, range] of Object.entries(dist)) {
    raw[slug] = (range.min + range.max) / 2;
  }

  // Normalise to sum to 100
  const total = Object.values(raw).reduce((s, v) => s + v, 0);
  if (total === 0) return raw;

  const normalised = {};
  for (const [slug, val] of Object.entries(raw)) {
    normalised[slug] = Math.round((val / total) * 100);
  }

  // Fix rounding drift so total is exactly 100
  const sum = Object.values(normalised).reduce((s, v) => s + v, 0);
  const diff = 100 - sum;
  if (diff !== 0) {
    // Adjust the largest bucket
    const keys = Object.keys(normalised);
    const largest = keys.reduce((a, b) => (normalised[a] > normalised[b] ? a : b));
    normalised[largest] += diff;
  }

  return normalised;
}

/**
 * Returns the mark allocation configuration for a given part.
 * Currently returns the fixed config; may vary per part in future.
 *
 * @param {'A'|'B1'|'B2'} part
 * @returns {{ marksPerPart: number, questionRange: { min: number, max: number } }}
 */
export function getMarkAllocationForPart(part) {
  return {
    marksPerPart: MARK_ALLOCATION.marksPerPart,
    questionRange: { ...MARK_ALLOCATION.questionRange },
  };
}

/**
 * Looks up a cognitive trap definition by its id.
 *
 * @param {string} trapId
 * @returns {{ id: string, label: string, description: string, example: string }|undefined}
 */
export function getCognitiveTrapForType(trapId) {
  return COGNITIVE_TRAP_TYPES.find(t => t.id === trapId);
}
