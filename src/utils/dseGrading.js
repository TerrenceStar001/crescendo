import { checkAnswer, isQuestionCorrect } from './answerChecking';
export { isQuestionCorrect };

const DSE_LEVEL_ORDER = ['1', '2', '3', '4', '5', '5*', '5**'];

const levelValues = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '5*': 6, '5**': 7 };

const DSE_SKILL_WEIGHTS = {
  reading: 0.30,
  writing: 0.25,
  listening: 0.20,
  speaking: 0.15,
};

// Real DSE per-paper cut-off percentages (averaged from HKEAA 2017-2021 data)
const PER_SKILL_DEFAULTS = {
  reading: [
    { level: '5**', minPercentage: 86 },
    { level: '5*', minPercentage: 80 },
    { level: '5', minPercentage: 74 },
    { level: '4', minPercentage: 64 },
    { level: '3', minPercentage: 50 },
    { level: '2', minPercentage: 38 },
    { level: '1', minPercentage: 0 },
  ],
  writing: [
    { level: '5**', minPercentage: 88 },
    { level: '5*', minPercentage: 83 },
    { level: '5', minPercentage: 76 },
    { level: '4', minPercentage: 67 },
    { level: '3', minPercentage: 50 },
    { level: '2', minPercentage: 38 },
    { level: '1', minPercentage: 0 },
  ],
  listening: [
    { level: '5**', minPercentage: 85 },
    { level: '5*', minPercentage: 78 },
    { level: '5', minPercentage: 74 },
    { level: '4', minPercentage: 63 },
    { level: '3', minPercentage: 52 },
    { level: '2', minPercentage: 38 },
    { level: '1', minPercentage: 0 },
  ],
  speaking: [
    { level: '5**', minPercentage: 92 },
    { level: '5*', minPercentage: 86 },
    { level: '5', minPercentage: 80 },
    { level: '4', minPercentage: 72 },
    { level: '3', minPercentage: 63 },
    { level: '2', minPercentage: 38 },
    { level: '1', minPercentage: 0 },
  ],
};

const BOUNDARIES_KEY = 'crescendo-dse-boundaries';
const SKILLS = ['reading', 'writing', 'listening', 'speaking'];

function isOldFormat(val) {
  return Array.isArray(val) && val.length > 0 && val[0].level;
}

function migrateOldToNew(oldArray) {
  const map = {};
  for (const skill of SKILLS) {
    map[skill] = oldArray.map(b => ({ ...b }));
  }
  return map;
}

export function getStoredBoundaries() {
  try {
    const raw = localStorage.getItem(BOUNDARIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isOldFormat(parsed)) {
        const migrated = migrateOldToNew(parsed);
        localStorage.setItem(BOUNDARIES_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    }
  } catch {}
  return PER_SKILL_DEFAULTS;
}

export function getSkillBoundaries(skill) {
  const all = getStoredBoundaries();
  return all[skill] || PER_SKILL_DEFAULTS[skill] || PER_SKILL_DEFAULTS.reading;
}

export function storeBoundaries(b) {
  localStorage.setItem(BOUNDARIES_KEY, JSON.stringify(b));
}

export function scoreToDseLevel(percentage, skill) {
  const boundaries = getSkillBoundaries(skill);
  for (const b of boundaries) {
    if (percentage >= b.minPercentage) {
      return { level: b.level, minPercentage: b.minPercentage, achieved: true };
    }
  }
  return { level: '1', minPercentage: 0, achieved: true };
}

export function dseLevelToScore(level) {
  return levelValues[level] || 1;
}

export function scoreToDseValue(percentage, skill) {
  const result = scoreToDseLevel(percentage, skill);
  return levelValues[result.level] || 1;
}

export function computeOverallDseLevel(skillLevels) {
  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown = {};

  for (const [skill, weight] of Object.entries(DSE_SKILL_WEIGHTS)) {
    const lv = skillLevels[skill] || '1';
    const val = levelValues[lv] || 1;
    weightedSum += val * weight;
    totalWeight += weight;
    breakdown[skill] = { level: lv, contribution: val * weight };
  }

  const average = weightedSum / totalWeight;

  const levelMap = [
    { max: 1.5, level: '1' },
    { max: 2.5, level: '2' },
    { max: 3.5, level: '3' },
    { max: 4.5, level: '4' },
    { max: 5.5, level: '5' },
    { max: 6.5, level: '5*' },
    { max: 7.0, level: '5**' },
  ];

  const overall = levelMap.find(l => average <= l.max)?.level || '1';

  return {
    level: overall,
    score: (average / 7) * 100,
    breakdown,
  };
}

export function computeGapToTarget(skillLevels, targetLevel = '5**') {
  const target = levelValues[targetLevel] || 7;
  const currentLevel = computeOverallDseLevel(skillLevels);
  const current = levelValues[currentLevel.level] || 1;

  if (current >= target) return null;

  const improvementNeeded = {};
  for (const [skill, weight] of Object.entries(DSE_SKILL_WEIGHTS)) {
    const cl = skillLevels[skill] || '1';
    const cv = levelValues[cl] || 1;
    const tv = target;
    const cs = ((cv - 1) / 6) * 100;
    const ts = ((tv - 1) / 6) * 100;
    const gap = Math.max(0, ts - cs);
    improvementNeeded[skill] = {
      currentLevel: cl,
      currentScore: Math.round(cs),
      targetScore: Math.round(Math.min(ts, 100)),
      improvement: Math.round(gap),
      priority: gap > 20 ? 'critical' : gap > 10 ? 'significant' : 'doable',
    };
  }

  return {
    currentLevel: currentLevel.level,
    targetLevel,
    overallGap: target - current,
    breakdown: improvementNeeded,
    requiredImprovement: Object.entries(improvementNeeded)
      .filter(([, v]) => v.improvement > 0)
      .map(([s, v]) => `${v.improvement} pts in ${s} (${v.currentLevel} → ${targetLevel})`)
      .join(', '),
  };
}

export function formatDseLevel(level) {
  if (!level) return '\u2014';
  return level;
}

// HKEAA benchmarking study: DSE writing percentage → approximate IELTS Writing band
const IELTS_WRITING_MAP = [
  { minPct: 95, band: '7.5' },
  { minPct: 88, band: '7.0' },
  { minPct: 83, band: '6.5' },
  { minPct: 76, band: '6.5' },
  { minPct: 67, band: '6.0' },
  { minPct: 50, band: '5.5' },
  { minPct: 0, band: '5.0' },
];

export function pctToIeltsWriting(pct) {
  for (const m of IELTS_WRITING_MAP) {
    if (pct >= m.minPct) return m.band;
  }
  return '5.0';
}

export function dseLevelToIelts(level) {
  const map = { '5**': '7.5', '5*': '7.0', '5': '6.5', '4': '6.0', '3': '5.5', '2': '5.0', '1': '4.5' };
  return map[level] || '—';
}

export function dseLevelColor(level) {
  const colors = {
    '1': '#ef5350',
    '2': '#ff7043',
    '3': '#ff9800',
    '4': '#ffc107',
    '5': '#8bc34a',
    '5*': '#4caf50',
    '5**': '#1b5e20',
  };
  return colors[level] || '#9e9e9e';
}

export function computeSubScores(skill, questions, answers) {
  if (!questions?.length) return {};

  const subScores = {};
  const counts = {};

  for (const q of questions) {
    const type = q.type || 'mcq';
    if (subScores[type] === undefined) { subScores[type] = 0; counts[type] = 0; }
    counts[type] += q.marks || 1;
    const result = checkAnswer(q, answers?.[q.id]);
    subScores[type] += result.marksEarned;
  }

  const result = {};
  for (const [type, earned] of Object.entries(subScores)) {
    result[type] = Math.round((earned / counts[type]) * 100);
  }
  return result;
}

export const QUESTION_WEIGHTS = {
  reading: {
    mainIdea: 1.0,
    inference: 1.2,
    vocabInContext: 0.8,
    detail: 0.9,
    tone: 1.3,
    purpose: 1.1,
  },
  listening: {
    mainIdea: 1.0,
    detailRecall: 0.9,
    inference: 1.2,
    fillBlank: 1.0,
    tableCompletion: 1.1,
  },
};

export function computeWeightedScore(questions, answers, skill) {
  const weights = QUESTION_WEIGHTS[skill] || {};
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const q of questions || []) {
    const w = (weights[q.type] || 1.0) * (q.marks || 1);
    totalWeight += w;
    if (isQuestionCorrect(q, answers?.[q.id])) {
      earnedWeight += w;
    }
  }

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}

export function generateRecommendations(profile) {
  const recs = [];

  const weakest = SKILLS.reduce((min, s) =>
    (profile[s]?.overall || 0) < (profile[min]?.overall || 0) ? s : min
  , SKILLS[0]);

  if (profile[weakest]?.subScores) {
    const subs = Object.entries(profile[weakest].subScores);
    const weakestSub = subs.sort(([, a], [, b]) => a - b)[0];
    if (weakestSub && weakestSub[1] < 70) {
      recs.push({
        skill: weakest,
        sub: weakestSub[0],
        score: weakestSub[1],
        action: `Practice ${weakest} — focus on ${weakestSub[0].replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        reason: `Current score: ${weakestSub[1]}% — target: 70%`,
        priority: 'high',
      });
    }
  }

  const weekAgo = Date.now() - 7 * 86400000;
  const recentSessions = Object.values(profile)
    .filter(p => p.lastSessionDate)
    .filter(p => new Date(p.lastSessionDate).getTime() > weekAgo).length;
  if (recentSessions < 3) {
    recs.push({
      skill: 'all',
      action: 'Study at least 3 times this week',
      reason: `Only ${recentSessions} session(s) this week`,
      priority: recentSessions === 0 ? 'high' : 'medium',
    });
  }

  const gap = computeGapToTarget({
    reading: profile.reading?.dseLevel || '1',
    writing: profile.writing?.dseLevel || '1',
    listening: profile.listening?.dseLevel || '1',
    speaking: profile.speaking?.dseLevel || '1',
  });
  if (gap) {
    recs.push({
      skill: 'all',
      action: `${gap.requiredImprovement}`,
      reason: `Current predicted: ${gap.currentLevel}, Target: ${gap.targetLevel}`,
      priority: 'high',
    });
  }

  return recs.sort((a, b) =>
    ({ high: 0, medium: 1, low: 2 }[a.priority]) -
    ({ high: 0, medium: 1, low: 2 }[b.priority])
  );
}

export function computeStreak(sessions) {
  if (!sessions?.length) return { streak: 0, todayActive: false };

  const activeDates = new Set();
  for (const s of sessions) {
    if (s.completedAt) activeDates.add(s.completedAt.slice(0, 10));
  }

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const todayActive = activeDates.has(todayKey);

  let streak = 0;
  for (let i = todayActive ? 0 : 1; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (activeDates.has(key)) streak++;
    else break;
  }

  return { streak, todayActive };
}

export { DSE_SKILL_WEIGHTS, PER_SKILL_DEFAULTS, SKILLS };
