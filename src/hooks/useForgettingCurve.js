import { useCallback, useEffect, useRef, useState } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { forgettingCurve, calcHalfLife, scheduleNextReview, DEFAULT_HALF_LIFE, RETRIEVABILITY_THRESHOLD } from '../utils/forgettingCurve';

export default function useForgettingCurve() {
  const { getItem, setItem, DSE_KEYS } = useIndexedDB();
  const loadedRef = useRef(false);

  const [reviewItems, setReviewItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [config, setConfigState] = useState({
    halfLife: DEFAULT_HALF_LIFE,
    threshold: RETRIEVABILITY_THRESHOLD,
  });

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const saved = await getItem(DSE_KEYS.REVIEW_DATA) || [];
      if (Array.isArray(saved)) {
        setReviewItems(saved);
      }
      const savedConfig = await getItem(DSE_KEYS.REVIEW_DATA + '-config');
      if (savedConfig?.halfLife) {
        setConfigState(savedConfig);
      }
      setIsLoaded(true);
    })();
  }, [getItem, DSE_KEYS.REVIEW_DATA]);

  const persist = useCallback(async (items) => {
    try {
      await setItem(DSE_KEYS.REVIEW_DATA, items);
    } catch { /* silent */ }
  }, [setItem, DSE_KEYS.REVIEW_DATA]);

  const getDueItems = useCallback(() => {
    const now = Date.now();
    return reviewItems.filter(item => {
      const elapsedDays = (now - new Date(item.lastReviewed).getTime()) / (1000 * 60 * 60 * 24);
      const recall = forgettingCurve(elapsedDays, item.halfLife || configRef.current.halfLife);
      return recall < configRef.current.threshold;
    });
  }, [reviewItems]);

  const recordReview = useCallback(async (itemId, correct, difficulty) => {
    const now = new Date().toISOString();
    setReviewItems(prev => {
      const next = prev.map(item => {
        if (item.id !== itemId) return item;
        const newHalfLife = calcHalfLife(
          item.halfLife || configRef.current.halfLife,
          correct,
          difficulty || item.difficulty || 1
        );
        const nextReviewIn = scheduleNextReview(newHalfLife, configRef.current.threshold);
        return {
          ...item,
          halfLife: newHalfLife,
          lastReviewed: now,
          nextReviewAt: new Date(Date.now() + nextReviewIn * 24 * 60 * 60 * 1000).toISOString(),
          correctCount: (item.correctCount || 0) + (correct ? 1 : 0),
          incorrectCount: (item.incorrectCount || 0) + (correct ? 0 : 1),
          lastCorrect: correct,
        };
      });
      persist(next);
      return next;
    });
  }, [persist]);

  const getRetrievability = useCallback((itemId) => {
    const item = reviewItems.find(i => i.id === itemId);
    if (!item) return null;
    const elapsedDays = (Date.now() - new Date(item.lastReviewed).getTime()) / (1000 * 60 * 60 * 24);
    return forgettingCurve(elapsedDays, item.halfLife || config.halfLife);
  }, [reviewItems, config.halfLife]);

  const addReviewItem = useCallback(async (item) => {
    const now = new Date().toISOString();
    const entry = {
      id: item.id,
      source: item.source || 'exercise',
      skill: item.skill || 'reading',
      label: item.label || 'Untitled',
      halfLife: item.halfLife || configRef.current.halfLife,
      difficulty: item.difficulty || 1,
      lastReviewed: now,
      nextReviewAt: new Date(Date.now() + configRef.current.halfLife * 24 * 60 * 60 * 1000).toISOString(),
      correctCount: 0,
      incorrectCount: 0,
      lastCorrect: null,
      tags: item.tags || [],
      context: item.context || null,
    };
    setReviewItems(prev => {
      const existing = prev.findIndex(i => i.id === entry.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], ...entry, lastReviewed: next[existing].lastReviewed };
        persist(next);
        return next;
      }
      const next = [...prev, entry];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeReviewItem = useCallback(async (itemId) => {
    setReviewItems(prev => {
      const next = prev.filter(i => i.id !== itemId);
      persist(next);
      return next;
    });
  }, [persist]);

  const updateConfig = useCallback(async (newConfig) => {
    const merged = { ...config, ...newConfig };
    setConfigState(merged);
    try {
      await setItem(DSE_KEYS.REVIEW_DATA + '-config', merged);
    } catch { /* silent */ }
  }, [config, setItem, DSE_KEYS.REVIEW_DATA]);

  const getStats = useCallback(() => {
    const total = reviewItems.length;
    const due = getDueItems().length;
    const avgHalfLife = total > 0
      ? reviewItems.reduce((s, i) => s + (i.halfLife || DEFAULT_HALF_LIFE), 0) / total
      : DEFAULT_HALF_LIFE;
    return { total, due, avgHalfLife: Math.round(avgHalfLife * 10) / 10, healthy: total - due };
  }, [reviewItems, getDueItems]);

  const getReviewSchedule = useCallback(() => {
    const items = getDueItems();
    return items.map(item => ({
      ...item,
      retrievability: getRetrievability(item.id),
    })).sort((a, b) => a.retrievability - b.retrievability);
  }, [getDueItems, getRetrievability]);

  return {
    reviewItems, isLoaded, config,
    getDueItems, recordReview, getRetrievability, addReviewItem, removeReviewItem,
    updateConfig, getStats, getReviewSchedule,
  };
}
