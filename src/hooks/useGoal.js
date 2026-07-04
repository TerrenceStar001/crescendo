import { useState, useCallback } from 'react';

const GOAL_KEY = 'crescendo-dse-goal';

const DEFAULT_GOAL = {
  targetLevel: '5**',
  examDate: null,
  createdAt: null,
};

export default function useGoal() {
  const [goal, setGoal] = useState(() => {
    try {
      const saved = localStorage.getItem(GOAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_GOAL, ...parsed };
      }
    } catch {}
    return { ...DEFAULT_GOAL, createdAt: new Date().toISOString() };
  });

  const updateGoal = useCallback((updates) => {
    const next = { ...goal, ...updates };
    setGoal(next);
    try {
      localStorage.setItem(GOAL_KEY, JSON.stringify(next));
    } catch {}
  }, [goal]);

  const resetGoal = useCallback(() => {
    const cleared = { ...DEFAULT_GOAL, createdAt: goal.createdAt };
    setGoal(cleared);
    try {
      localStorage.setItem(GOAL_KEY, JSON.stringify(cleared));
    } catch {}
  }, [goal.createdAt]);

  const daysUntilExam = useCallback(() => {
    if (!goal.examDate) return null;
    const exam = new Date(goal.examDate);
    const now = new Date();
    const diff = exam.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [goal.examDate]);

  const weeksUntilExam = useCallback(() => {
    const days = daysUntilExam();
    if (days === null) return null;
    return Math.ceil(days / 7);
  }, [daysUntilExam]);

  return { goal, updateGoal, resetGoal, daysUntilExam, weeksUntilExam };
}
