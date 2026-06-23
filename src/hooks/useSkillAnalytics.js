import { useState, useEffect, useCallback, useRef } from 'react';
import { useIndexedDB } from './useIndexedDB';
import {
  scoreToDseLevel, computeOverallDseLevel, computeWeightedScore,
  generateRecommendations, computeStreak, computeSubScores,
} from '../utils/dseGrading';

const DECAY_FACTOR = 0.3;

function createEmptyProfile() {
  return {
    reading: { overall: 0, dseLevel: '1', subScores: {}, questionTypeAccuracy: {}, totalSessions: 0, totalQuestions: 0, correctAnswers: 0, lastSessionDate: null },
    writing: { overall: 0, dseLevel: '1', subScores: {}, totalSessions: 0, averageWordCount: 0, lastSessionDate: null },
    listening: { overall: 0, dseLevel: '1', subScores: {}, totalSessions: 0, totalQuestions: 0, correctAnswers: 0, lastSessionDate: null },
    speaking: { overall: 0, dseLevel: '1', subScores: {}, totalSessions: 0, lastSessionDate: null },
    vocabularyMastery: { totalWordsLearned: 0, wordsByDifficulty: { basic: 0, intermediate: 0, advanced: 0 }, recentlyMistaken: [], recentlyMastered: [] },
    grammarMastery: { weakAreas: [], strongAreas: [], commonErrors: [] },
    _initialized: true,
  };
}

function updateAggregateScore(oldScore, newScore) {
  if (!oldScore && oldScore !== 0) return newScore;
  return Math.round(newScore * DECAY_FACTOR + oldScore * (1 - DECAY_FACTOR));
}

export default function useSkillAnalytics() {
  const { getItem, setItem, getKeys, DSE_KEYS } = useIndexedDB();
  const [profile, setProfile] = useState(() => createEmptyProfile());
  const [sessions, setSessions] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Promise.all([
      getItem(DSE_KEYS.PROFILE),
      getItem(DSE_KEYS.SESSIONS),
    ]).then(([savedProfile, savedSessions]) => {
      if (savedProfile?._initialized) setProfile(savedProfile);
      if (Array.isArray(savedSessions)) setSessions(savedSessions);
      setIsLoaded(true);
    });
  }, [getItem, DSE_KEYS]);

  const persist = useCallback(async (newProfile, newSessions) => {
    try {
      await setItem(DSE_KEYS.PROFILE, newProfile);
      await setItem(DSE_KEYS.SESSIONS, newSessions || sessions);
    } catch { /* silent */ }
  }, [setItem, DSE_KEYS, sessions]);

  const recordSession = useCallback(async (sessionData) => {
    const s = {
      id: `ses_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...sessionData,
      completedAt: sessionData.completedAt || new Date().toISOString(),
    };

    const newSessions = [s, ...sessions].slice(0, 500);
    setSessions(newSessions);

    const newProfile = { ...profile };
    const skill = s.skill;

    const percentage = s.totalQuestions > 0
      ? Math.round((s.score / s.totalQuestions) * 100)
      : s.percentage || 0;

    if (!newProfile[skill]) newProfile[skill] = { overall: 0, dseLevel: '1', subScores: {}, totalSessions: 0, lastSessionDate: null };

    const skillProfile = { ...newProfile[skill] };
    skillProfile.overall = updateAggregateScore(skillProfile.overall, percentage);
    skillProfile.totalSessions = (skillProfile.totalSessions || 0) + 1;
    skillProfile.lastSessionDate = s.completedAt;

    if (s.questions?.length) {
      const subs = computeSubScores(skill, s.questions, s.answers || {});
      for (const [key, val] of Object.entries(subs)) {
        skillProfile.subScores = { ...skillProfile.subScores, [key]: updateAggregateScore(skillProfile.subScores[key] || 0, val) };
      }
      if (skill === 'reading' || skill === 'listening') {
        const qta = { ...skillProfile.questionTypeAccuracy };
        for (const [key, val] of Object.entries(subs)) {
          qta[key] = updateAggregateScore(qta[key] || 0, val);
        }
        skillProfile.questionTypeAccuracy = qta;
      }
    }

    if (s.subScores) {
      for (const [key, val] of Object.entries(s.subScores)) {
        skillProfile.subScores = { ...skillProfile.subScores, [key]: updateAggregateScore(skillProfile.subScores[key] || 0, val) };
      }
    }

    skillProfile.dseLevel = scoreToDseLevel(skillProfile.overall, skill).level;

    if (s.totalQuestions) {
      skillProfile.totalQuestions = (skillProfile.totalQuestions || 0) + s.totalQuestions;
      skillProfile.correctAnswers = (skillProfile.correctAnswers || 0) + (s.score || 0);
    }

    if (skill === 'writing' && s.wordCount) {
      const prev = skillProfile.averageWordCount || 0;
      const n = skillProfile.totalSessions || 1;
      skillProfile.averageWordCount = Math.round(prev + (s.wordCount - prev) / n);
    }

    newProfile[skill] = skillProfile;

    const skillLevels = {};
    for (const sk of ['reading', 'writing', 'listening', 'speaking']) {
      skillLevels[sk] = newProfile[sk]?.dseLevel || '1';
    }
    newProfile._overallDse = computeOverallDseLevel(skillLevels);

    setProfile(newProfile);
    await persist(newProfile, newSessions);
    return s;
  }, [profile, sessions, persist]);

  const getSessionHistory = useCallback((skill, limit = 20) => {
    let filtered = sessions;
    if (skill) filtered = filtered.filter(s => s.skill === skill);
    return filtered.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, limit);
  }, [sessions]);

  const getGradeHistory = useCallback((skill, limit = 20) => {
    let filtered = sessions;
    if (skill) filtered = filtered.filter(s => s.skill === skill);
    return filtered
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .slice(-limit)
      .map(s => ({
        date: s.completedAt,
        level: s.dseLevel || scoreToDseLevel(s.percentage || (s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0), s.skill || skill).level,
        percentage: s.percentage || (s.totalQuestions > 0 ? Math.round((s.score / s.totalQuestions) * 100) : 0),
        skill: s.skill,
        paperId: s.paperId,
      }));
  }, [sessions]);

  const getSkillDistribution = useCallback(() => {
    return ['reading', 'writing', 'listening', 'speaking'].map(s => ({
      skill: s,
      percentage: profile[s]?.overall || 0,
      dseLevel: profile[s]?.dseLevel || '1',
    }));
  }, [profile]);

  const getWeakAreas = useCallback(() => {
    const areas = [];
    for (const [skill, data] of Object.entries(profile)) {
      if (data?.subScores && typeof data === 'object' && skill !== '_overallDse' && skill !== 'vocabularyMastery' && skill !== 'grammarMastery') {
        for (const [sub, score] of Object.entries(data.subScores)) {
          if (score < 60) areas.push({ skill, area: sub, score, severity: score < 40 ? 'critical' : 'weak' });
        }
      }
    }
    return areas.sort((a, b) => a.score - b.score);
  }, [profile]);

  const getRecommendedActions = useCallback(() => {
    return generateRecommendations(profile);
  }, [profile]);

  const predictedGrade = profile._overallDse?.level || '1';

  const skillLevels = {
    reading: profile.reading?.dseLevel || '1',
    writing: profile.writing?.dseLevel || '1',
    listening: profile.listening?.dseLevel || '1',
    speaking: profile.speaking?.dseLevel || '1',
  };

  const recommendations = useCallback(() => generateRecommendations(profile), [profile])();
  const streak = computeStreak(sessions);

  const getSessionCount = useCallback((skill) => {
    if (!skill) return sessions.length;
    return sessions.filter(s => s.skill === skill).length;
  }, [sessions]);

  const getAverageScore = useCallback((skill) => {
    const filtered = sessions.filter(s => s.skill === skill);
    if (!filtered.length) return 0;
    const total = filtered.reduce((sum, s) => sum + (s.percentage || (s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0)), 0);
    return Math.round(total / filtered.length);
  }, [sessions]);

  return {
    reading: profile.reading,
    writing: profile.writing,
    listening: profile.listening,
    speaking: profile.speaking,
    overallDseLevel: predictedGrade,
    overallScore: profile._overallDse?.score || 0,
    weakestSkill: ['reading', 'writing', 'listening', 'speaking']
      .reduce((min, s) => (profile[s]?.overall || 0) < (profile[min]?.overall || 0) ? s : min, 'reading'),
    weakestSubSkill: (() => {
      const weakest = ['reading', 'writing', 'listening', 'speaking']
        .reduce((min, s) => (profile[s]?.overall || 0) < (profile[min]?.overall || 0) ? s : min, 'reading');
      if (!profile[weakest]?.subScores) return { skill: weakest, sub: 'overall', score: profile[weakest]?.overall || 0 };
      const subs = Object.entries(profile[weakest].subScores);
      if (!subs.length) return { skill: weakest, sub: 'overall', score: profile[weakest]?.overall || 0 };
      const ws = subs.sort(([, a], [, b]) => a - b)[0];
      return { skill: weakest, sub: ws[0], score: ws[1] };
    })(),
    recommendations,
    streak,
    predictedGrade,
    isLoaded,
    recordSession,
    getSessionHistory,
    getGradeHistory,
    getSkillDistribution,
    getWeakAreas,
    getRecommendedActions,
    getSessionCount,
    getAverageScore,
    sessions,
    profile,
  };
}
