import { useCallback, useEffect, useRef, useState } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { calcDensity, buildConstraints, DSE_EXAM_DATE } from '../utils/planConstraints';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function generateFallbackExercises(density, skill, count) {
  const exercises = [];
  const types = ['mcq', 'gap-fill', 'short-answer', 'matching', 'open-ended'];
  const foci = ['vocabulary', 'grammar', 'comprehension', 'inference', 'synthesis'];
  for (let i = 0; i < count; i++) {
    exercises.push({
      id: generateId(),
      skill,
      constraints: buildConstraints({
        type: types[i % types.length],
        focus: foci[i % foci.length],
        difficulty: density.density === 'low' ? 'easy' : density.density === 'critical' ? 'hard' : 'medium',
        timeLimit: density.dailyMinutes,
      }),
      description: `${skill.charAt(0).toUpperCase() + skill.slice(1)} practice — ${foci[i % foci.length]} focus}`,
      completed: false,
    });
  }
  return exercises;
}

function createFallbackPlan(density) {
  const skills = ['reading', 'writing', 'listening', 'speaking'];
  const shortTerm = {
    label: 'This Week',
    span: '7 days',
    sessionsPerWeek: density.sessionsPerWeek,
    focus: 'Build foundation across all skills',
    exercises: skills.flatMap(s => generateFallbackExercises(density, s, 2)),
  };
  const midTerm = {
    label: 'This Month',
    span: '30 days',
    sessionsPerWeek: Math.max(2, density.sessionsPerWeek - 1),
    focus: 'Deepen understanding and address weaknesses',
    exercises: skills.flatMap(s => generateFallbackExercises(density, s, 3)),
  };
  const longTerm = {
    label: 'Until Exam',
    span: `${density.daysRemaining} days`,
    sessionsPerWeek: Math.max(2, density.sessionsPerWeek - 1),
    focus: 'Mock exams and targeted revision',
    exercises: skills.flatMap(s => generateFallbackExercises(density, s, 5)),
  };
  return {
    _initialized: true,
    generatedAt: new Date().toISOString(),
    density,
    tiers: { shortTerm, midTerm, longTerm },
    sourceAssessment: null,
    sourceFlaws: null,
    version: 1,
    _isFallback: true,
  };
}

function parseJSONObject(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch { /* try extracting JSON block */ }
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* ignore */ }
  }
  return null;
}

export default function useStudyPlan() {
  const { getItem, setItem, DSE_KEYS } = useIndexedDB();
  const loadedRef = useRef(false);

  const [plan, setPlan] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const saved = await getItem(DSE_KEYS.STUDY_PLAN);
      if (saved && saved._initialized) {
        setPlan(saved);
      }
      setIsLoaded(true);
    })();
  }, [getItem, DSE_KEYS.STUDY_PLAN]);

  const persist = useCallback(async (p) => {
    try {
      await setItem(DSE_KEYS.STUDY_PLAN, p);
    } catch { /* silent */ }
  }, [setItem, DSE_KEYS.STUDY_PLAN]);

  const generatePlan = useCallback(async (assessmentProfile, flawSummary, callAI) => {
    if (isGenerating) return null;
    setIsGenerating(true);
    setError(null);

    try {
      const density = calcDensity();
      const levels = assessmentProfile?.finalLevels || {};
      const flaws = flawSummary?.topCategories || [];

      const skills = ['reading', 'writing', 'listening', 'speaking'];
      const levelStr = skills.map(s => `${s}: ${levels[s]?.final || 3}`).join(', ');

      const prompt = `Generate a DSE English study plan as a JSON object with this exact structure:
{
  "tiers": {
    "shortTerm": {
      "label": "This Week",
      "exercises": [
        { "skill": "reading", "constraints": { "difficulty": "medium", "type": "mcq", "timeLimit": 15, "theme": "general", "format": "passage-based", "focus": "comprehension" }, "description": "..." }
      ],
      "focus": "string"
    },
    "midTerm": { "label": "This Month", "exercises": [...], "focus": "string" },
    "longTerm": { "label": "Until Exam", "exercises": [...], "focus": "string" }
  }
}

Student levels: ${levelStr}
Top flaw areas: ${flaws.length ? flaws.join(', ') : 'none detected yet'}
Density: ${density.density} (${density.sessionsPerWeek} sessions/week, ${density.dailyMinutes} min/day)
Days until DSE: ${density.daysRemaining}

Generate 3-4 exercises per tier with varied skills and constraint fields. Each exercise MUST have all 6 constraint fields. Return ONLY valid JSON.`;

      const raw = await callAI(prompt, {
        system: 'You are a DSE English tutor creating personalized study plans. Return ONLY valid JSON.',
        temperature: 0.5,
        maxTokens: 3000,
        timeout: 60000,
      });

      const parsed = parseJSONObject(raw);
      if (!parsed || !parsed.tiers) {
        throw new Error('Failed to parse AI plan response');
      }

      const tiers = parsed.tiers;
      const newPlan = {
        _initialized: true,
        generatedAt: new Date().toISOString(),
        density,
        tiers: {
          shortTerm: {
            label: tiers.shortTerm?.label || 'This Week',
            span: '7 days',
            sessionsPerWeek: density.sessionsPerWeek,
            exercises: (tiers.shortTerm?.exercises || []).map(e => ({
              ...e,
              id: generateId(),
              completed: false,
              constraints: buildConstraints(e.constraints || {}),
            })),
            focus: tiers.shortTerm?.focus || 'General improvement',
          },
          midTerm: {
            label: tiers.midTerm?.label || 'This Month',
            span: '30 days',
            sessionsPerWeek: Math.max(2, density.sessionsPerWeek - 1),
            exercises: (tiers.midTerm?.exercises || []).map(e => ({
              ...e,
              id: generateId(),
              completed: false,
              constraints: buildConstraints(e.constraints || {}),
            })),
            focus: tiers.midTerm?.focus || 'Targeted practice',
          },
          longTerm: {
            label: tiers.longTerm?.label || 'Until Exam',
            span: `${density.daysRemaining} days`,
            sessionsPerWeek: Math.max(2, density.sessionsPerWeek - 1),
            exercises: (tiers.longTerm?.exercises || []).map(e => ({
              ...e,
              id: generateId(),
              completed: false,
              constraints: buildConstraints(e.constraints || {}),
            })),
            focus: tiers.longTerm?.focus || 'Exam preparation',
          },
        },
        sourceAssessment: assessmentProfile ? { assessmentDate: assessmentProfile.completedAt, levels: Object.fromEntries(skills.map(s => [s, levels[s]?.final || 3])) } : null,
        sourceFlaws: flawSummary ? { topCategories: flaws, severityBreakdown: flawSummary.bySeverity || {}, updatedAt: new Date().toISOString() } : null,
        version: (plan?.version || 0) + 1,
      };

      setPlan(newPlan);
      persist(newPlan);
      setIsGenerating(false);
      return newPlan;
    } catch (e) {
      setError(e.message || 'Plan generation failed');
      const fallback = createFallbackPlan(calcDensity());
      fallback.version = (plan?.version || 0) + 1;
      setPlan(fallback);
      persist(fallback);
      setIsGenerating(false);
      return fallback;
    }
  }, [isGenerating, persist, plan]);

  const regeneratePlan = useCallback(async (assessmentProfile, flawSummary, callAI) => {
    return generatePlan(assessmentProfile, flawSummary, callAI);
  }, [generatePlan]);

  const adaptPlan = useCallback(async (newAssessment, newFlawSummary, callAI) => {
    if (!plan) return null;
    const currentLevels = plan.sourceAssessment?.levels || {};
    const newLevels = newAssessment?.finalLevels || {};

    let assessmentChanged = false;
    for (const skill of ['reading', 'writing', 'listening', 'speaking']) {
      if (currentLevels[skill] !== newLevels[skill]?.final) {
        assessmentChanged = true;
        break;
      }
    }

    const oldFlaws = plan.sourceFlaws?.topCategories || [];
    const newFlaws = newFlawSummary?.topCategories || [];
    const flawChanged = JSON.stringify(oldFlaws.sort()) !== JSON.stringify([...newFlaws].sort());

    if (assessmentChanged || flawChanged) {
      return generatePlan(newAssessment, newFlawSummary, callAI);
    }
    return plan;
  }, [plan, generatePlan]);

  const updateExerciseCompleted = useCallback((exerciseId, tier, completed) => {
    if (!plan) return;
    const tierKey = tier === 'shortTerm' ? 'shortTerm' : tier === 'midTerm' ? 'midTerm' : 'longTerm';
    setPlan(prev => {
      if (!prev) return prev;
      const exercises = prev.tiers[tierKey].exercises.map(e =>
        e.id === exerciseId ? { ...e, completed } : e
      );
      const next = { ...prev, tiers: { ...prev.tiers, [tierKey]: { ...prev.tiers[tierKey], exercises } } };
      persist(next);
      return next;
    });
  }, [plan, persist]);

  const getPlanByTier = useCallback((tierName) => {
    if (!plan) return null;
    return plan.tiers[tierName] || null;
  }, [plan]);

  const exportPlan = useCallback(() => {
    if (!plan) return '';
    const lines = ['=== DSE Study Plan ===', `Generated: ${new Date(plan.generatedAt).toLocaleDateString()}`, `Density: ${plan.density.density} (${plan.density.sessionsPerWeek}/wk, ${plan.density.dailyMinutes}min/day)`];
    for (const [key, tier] of Object.entries(plan.tiers)) {
      lines.push(`\n--- ${tier.label} (${tier.span}) ---`, `Focus: ${tier.focus}`);
      for (const ex of tier.exercises) {
        lines.push(`  ${ex.completed ? '✓' : '○'} ${ex.skill}: ${ex.description} [${ex.constraints.difficulty}, ${ex.constraints.type}, ${ex.constraints.timeLimit}min]`);
      }
    }
    return lines.join('\n');
  }, [plan]);

  const clearPlan = useCallback(() => {
    setPlan(null);
    persist({ _initialized: false });
  }, [persist]);

  return {
    plan, isLoaded, isGenerating, error,
    generatePlan, regeneratePlan, adaptPlan,
    updateExerciseCompleted, getPlanByTier, exportPlan, clearPlan,
    hasPlan: plan !== null,
  };
}
