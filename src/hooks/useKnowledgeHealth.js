import { useMemo } from 'react';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function useKnowledgeHealth(notes, halfLife = 30) {
  return useMemo(() => {
    const now = Date.now();
    const healthMap = {};
    const tagNotes = {};
    let totalScore = 0;
    const decaying = [];

    notes.forEach(note => {
      const updatedAt = new Date(note.updatedAt || note.createdAt).getTime();
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
      const retention = Math.exp(-daysSinceUpdate * Math.LN2 / halfLife);
      const score = Math.round(retention * 100);

      let color;
      if (score >= 80) color = 'var(--color-success)';
      else if (score >= 60) color = 'var(--color-warning)';
      else color = '#ff9800';

      healthMap[note.id] = { score, color, daysSinceReview: Math.round(daysSinceUpdate) };
      totalScore += score;

      if (score < 60) {
        decaying.push(note);
      }

      (note.tags || []).forEach(tag => {
        if (!tagNotes[tag]) tagNotes[tag] = [];
        tagNotes[tag].push(score);
      });
    });

    const overallHealth = notes.length > 0 ? Math.round(totalScore / notes.length) : 100;

    const tagHealth = {};
    Object.entries(tagNotes).forEach(([tag, scores]) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const decayingInTag = scores.filter(s => s < 60).length;
      tagHealth[tag] = { score: avg, count: scores.length, decaying: decayingInTag };
    });

    const sortedTags = Object.entries(tagHealth)
      .sort((a, b) => a[1].score - b[1].score);

    // Weekly trend: compare this week's average to last week's
    const thisWeekNotes = notes.filter(n => {
      const t = new Date(n.updatedAt || n.createdAt).getTime();
      return now - t < WEEK_MS;
    });
    const lastWeekNotes = notes.filter(n => {
      const t = new Date(n.updatedAt || n.createdAt).getTime();
      return now - t >= WEEK_MS && now - t < 2 * WEEK_MS;
    });

    const thisWeekAvg = thisWeekNotes.length > 0
      ? Math.round(thisWeekNotes.reduce((s, n) => {
          const days = (now - new Date(n.updatedAt || n.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return s + Math.round(Math.exp(-days * Math.LN2 / halfLife) * 100);
        }, 0) / thisWeekNotes.length)
      : 0;

    const lastWeekAvg = lastWeekNotes.length > 0
      ? Math.round(lastWeekNotes.reduce((s, n) => {
          const days = (now - new Date(n.updatedAt || n.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return s + Math.round(Math.exp(-days * Math.LN2 / halfLife) * 100);
        }, 0) / lastWeekNotes.length)
      : 0;

    const trend = thisWeekAvg - lastWeekAvg;

    return {
      healthMap,
      decayingNotes: decaying,
      overallHealth,
      tagHealth: sortedTags,
      trend,
    };
  }, [notes, halfLife]);
}
