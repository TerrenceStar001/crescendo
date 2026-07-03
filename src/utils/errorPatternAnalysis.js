// DSE reading error pattern analysis — pure aggregation functions.
// Groups session questions by skill, question type, and part, computing
// marks earned vs. total to identify weak areas and skill gaps.
// Deterministic, offline-capable, no side effects.

import { checkAnswer } from './answerChecking';
import { WEAKNESS_TO_TAG_MAP } from './courseSchema';

export const SKILL_LABELS = {
  mainIdea: 'Main Idea',
  detail: 'Detail Retrieval',
  inference: 'Inference',
  vocabInContext: 'Vocabulary in Context',
  tone: 'Tone & Attitude',
  purpose: 'Purpose',
};

const SKILL_RECOMMENDATIONS = {
  inference: 'Practice identifying implied meaning — look for clues the author suggests without stating directly.',
  detail: 'Scan more carefully. Try underlining key names, dates, and numbers as you read.',
  mainIdea: 'Focus on topic sentences — the first and last sentences of each paragraph often contain the main idea.',
  vocabInContext: 'Use context clues: look at surrounding words, synonyms, and antonyms to guess meaning.',
  tone: 'Pay attention to adjectives, adverbs, and figurative language that reveal the author\'s attitude.',
  purpose: 'Ask yourself WHY the author included this information — what effect is it intended to have?',
};

const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  tfng: 'True / False / Not Given',
  'gap-fill': 'Gap Fill',
  'summary-cloze': 'Summary Cloze',
  'short-answer': 'Short Answer',
  'open-ended': 'Open Ended',
  matching: 'Matching',
  'semantic-connect': 'Semantic Connect',
  'pronoun-ref': 'Pronoun Reference',
  reference: 'Reference',
  'table-chart': 'Table / Chart',
  cloze: 'Cloze',
  inferencing: 'Inferencing',
  comparison: 'Comparison',
  'views-attitudes': 'Views & Attitudes',
  'main-idea': 'Main Idea',
  sequencing: 'Sequencing',
  'figurative-language': 'Figurative Language',
  proofreading: 'Proofreading',
};

function aggregate(questions, answers, key, labels) {
  const groups = {};

  for (const q of questions) {
    const groupKey = q[key] || 'other';
    if (!groups[groupKey]) {
      groups[groupKey] = { total: 0, earned: 0, count: 0 };
    }
    groups[groupKey].total += q.marks || 1;
    const result = checkAnswer(q, answers?.[q.id]);
    groups[groupKey].earned += result.marksEarned;
    groups[groupKey].count += 1;
  }

  return Object.entries(groups)
    .map(([key, data]) => ({
      [key === 'skillTested' ? 'skill' : 'type']: key,
      label: (labels || {})[key] || key,
      percentage: Math.round((data.earned / data.total) * 100),
      total: data.total,
      earned: data.earned,
      count: data.count,
    }))
    .sort((a, b) => a.percentage - b.percentage); // Weakest first
}

/**
 * Group questions by skillTested and compute per-skill performance.
 * Returns array sorted weakest-first (ascending percentage).
 * Each entry: { skill, label, percentage, total, earned, count }.
 * Returns empty array if no questions have skillTested.
 */
export function analyzeBySkill(questions, answers) {
  if (!questions?.length) return [];

  const skills = questions.filter(q => q.skillTested);
  if (skills.length === 0) return [];

  return aggregate(skills, answers, 'skillTested', SKILL_LABELS);
}

/**
 * Group questions by type and compute per-type performance.
 * Returns array sorted weakest-first.
 * Each entry: { type, label, percentage, total, earned, count }.
 */
export function analyzeByType(questions, answers) {
  if (!questions?.length) return [];

  return aggregate(questions, answers, 'type', TYPE_LABELS);
}

/**
 * Group questions by part (A/B1/B2) using sections metadata.
 * Returns array: [{ part, total, earned, percentage }].
 */
export function analyzeByPart(questions, answers) {
  if (!questions?.length) return [];

  const byPart = {};
  for (const q of questions) {
    const part = q.part || 'A';
    if (!byPart[part]) byPart[part] = { total: 0, earned: 0 };
    byPart[part].total += q.marks || 1;
    const result = checkAnswer(q, answers?.[q.id]);
    byPart[part].earned += result.marksEarned;
  }

  return Object.entries(byPart)
    .map(([part, data]) => ({
      part,
      total: data.total,
      earned: data.earned,
      percentage: Math.round((data.earned / data.total) * 100),
    }));
}

/**
 * Identify weak areas from skill and type breakdowns.
 * Returns flat array of weak area objects (percentage < 60 triggers inclusion).
 * Each entry: { area, type, percentage, severity: 'critical'|'needs-work', recommendation }.
 * critical = percentage < 40, needs-work = percentage < 60.
 */
export function identifyWeakAreas(bySkill, byType) {
  const weakAreas = [];

  for (const s of bySkill || []) {
    if (s.percentage < 60) {
      weakAreas.push({
        area: s.label,
        type: 'skill',
        percentage: s.percentage,
        severity: s.percentage < 40 ? 'critical' : 'needs-work',
        recommendation: SKILL_RECOMMENDATIONS[s.skill] || 'Review this skill area with focused practice.',
      });
    }
  }

  for (const t of byType || []) {
    if (t.percentage < 60) {
      weakAreas.push({
        area: t.label,
        type: 'question-type',
        percentage: t.percentage,
        severity: t.percentage < 40 ? 'critical' : 'needs-work',
        recommendation: `Practice ${t.label.toLowerCase()} questions. Focus on understanding the question format and common pitfalls.`,
      });
    }
  }

  return weakAreas.sort((a, b) => a.percentage - b.percentage);
}

/**
 * QUESTION_TYPE_TO_AREA: Maps question type names (from getWeakAreas) to
 * WEAKNESS_TO_TAG_MAP area keys. getWeakAreas returns question types like
 * 'mcq', 'gap-fill' from subScores, but WEAKNESS_TO_TAG_MAP keys are skill
 * areas like 'Grammar', 'Vocabulary', 'Inference'.
 */
export const QUESTION_TYPE_TO_AREA = {
  'gap-fill': 'Grammar',
  'sentence-rewrite': 'Sentence Structure',
  cloze: 'Vocabulary',
  reordering: 'Sentence Structure',
  'short-answer': 'Grammar',
  matching: 'Vocabulary',
  'pronoun-ref': 'Sentence Structure',
  'semantic-connect': 'Sentence Structure',
  'summary-cloze': 'Main Idea',
  tfng: 'Detail Retrieval',
  'open-ended': 'Inference',
  mcq: 'Grammar',
};

/**
 * weaknessTagsToCourseTags: Maps weak areas from identifyWeakAreas() or
 * skillAnalytics.getWeakAreas() to course tags using WEAKNESS_TO_TAG_MAP.
 * Translates question type names to skill areas when needed.
 * Returns array of course tag strings (e.g., ['grammar:tenses', 'vocab:academic']).
 */
export function weaknessTagsToCourseTags(weakAreas) {
  if (!weakAreas?.length) return [];
  const tags = new Set();
  for (const wa of weakAreas) {
    const area = WEAKNESS_TO_TAG_MAP[wa.area] ? wa.area : QUESTION_TYPE_TO_AREA[wa.area];
    const mapped = WEAKNESS_TO_TAG_MAP[area];
    if (mapped) mapped.forEach(t => tags.add(t));
  }
  return [...tags];
}

/**
 * Calculate skill gaps relative to a target percentage.
 * Returns array of skills below target, with gap and priority.
 * Each entry: { skill, gap, priority: 'high'|'medium' }.
 * gap > 30 points from target → priority 'high', otherwise 'medium'.
 */
export function calculateSkillGap(bySkill, targetPercentage = 70) {
  if (!bySkill?.length) return [];

  return bySkill
    .filter(s => s.percentage < targetPercentage)
    .map(s => ({
      skill: s.label,
      gap: targetPercentage - s.percentage,
      priority: (targetPercentage - s.percentage) > 30 ? 'high' : 'medium',
    }));
}
