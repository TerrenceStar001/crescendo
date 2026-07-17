import { useCallback, useEffect, useRef, useState } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { classifyFlaw, aggregateFlaws } from '../utils/flawClassification';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function extractWrongAnswers(session) {
  const wrongs = [];
  if (!session.questions || !session.answers) return wrongs;
  for (const q of session.questions) {
    const answerKey = `q${q.id}`;
    const userAnswer = session.answers[answerKey];
    if (userAnswer === undefined || userAnswer === null) continue;
    const isCorrect = String(userAnswer).toUpperCase() === String(q.correctAnswer).toUpperCase();
    if (!isCorrect) {
      wrongs.push({
        questionId: q.id,
        questionType: q.type || 'mcq',
        marksLost: q.marks || (q.type === 'mcq' ? 1 : 2),
        context: q.stem || q.question || '',
      });
    }
  }
  return wrongs;
}

export default function useFlawDetection() {
  const { getItem, setItem, DSE_KEYS } = useIndexedDB();
  const processedSessionsRef = useRef(new Set());
  const loadedRef = useRef(false);

  const [flawRecords, setFlawRecords] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const saved = await getItem(DSE_KEYS.FLAW_DATA);
      if (saved && Array.isArray(saved.records)) {
        setFlawRecords(saved.records);
        if (saved.processedIds && Array.isArray(saved.processedIds)) {
          processedSessionsRef.current = new Set(saved.processedIds);
        }
      }
      setIsLoaded(true);
    })();
  }, [getItem, DSE_KEYS.FLAW_DATA]);

  const persistFlaws = useCallback(async (records, processedIds) => {
    try {
      await setItem(DSE_KEYS.FLAW_DATA, {
        records,
        processedIds: Array.from(processedIds),
        updatedAt: new Date().toISOString(),
      });
    } catch { /* silent */ }
  }, [setItem, DSE_KEYS.FLAW_DATA]);

  const processSessions = useCallback((sessionList) => {
    if (!sessionList || !sessionList.length) return 0;
    const newRecords = [];
    for (const session of sessionList) {
      if (!session.id || !session.questions || !session.answers) continue;
      if (processedSessionsRef.current.has(session.id)) continue;
      const wrongs = extractWrongAnswers(session);
      for (const w of wrongs) {
        const result = classifyFlaw(w.questionType, w.context, w.marksLost);
        newRecords.push({
          id: generateId(),
          sessionId: session.id,
          skill: session.skill || 'reading',
          questionId: w.questionId,
          category: result.category,
          severity: result.severity,
          questionType: w.questionType,
          marksLost: w.marksLost,
          confidence: result.confidence,
          timestamp: session.completedAt || new Date().toISOString(),
        });
      }
      processedSessionsRef.current.add(session.id);
    }
    if (newRecords.length > 0) {
      setFlawRecords(prev => {
        const updated = [...prev, ...newRecords];
        persistFlaws(updated, processedSessionsRef.current);
        return updated;
      });
    }
    return newRecords.length;
  }, [persistFlaws]);

  const refresh = useCallback((sessionList) => {
    return processSessions(sessionList || []);
  }, [processSessions]);

  const getFlawSummary = useCallback(() => {
    const summary = aggregateFlaws(flawRecords, 7);
    return {
      ...summary,
      totalFlaws: flawRecords.length,
      windowFlaws: Object.values(summary.byCategory).reduce((a, b) => a + b, 0),
    };
  }, [flawRecords]);

  const getFlawsBySkill = useCallback((skill) => {
    return flawRecords.filter(f => f.skill === skill);
  }, [flawRecords]);

  const getCriticalFlaws = useCallback((threshold = 'micro') => {
    const levels = ['micro', 'meso', 'macro'];
    const minIdx = levels.indexOf(threshold);
    if (minIdx === -1) return [];
    return flawRecords.filter(f => levels.indexOf(f.severity) >= minIdx);
  }, [flawRecords]);

  const clearFlawData = useCallback(() => {
    setFlawRecords([]);
    processedSessionsRef.current = new Set();
    persistFlaws([], new Set());
  }, [persistFlaws]);

  return {
    flawRecords, isLoaded,
    getFlawSummary, getFlawsBySkill, getCriticalFlaws,
    processSessions, refresh, clearFlawData,
    flawCount: flawRecords.length,
  };
}
