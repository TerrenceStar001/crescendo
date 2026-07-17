import React, { useState, useMemo, useCallback } from 'react';

const SKILL_ICONS = { reading: '📖', writing: '✍️', listening: '🎧', speaking: '🎤' };
const SKILL_COLORS = { reading: '#4f8ef7', writing: '#e8a838', listening: '#6bca6b', speaking: '#e86b6b' };

export default function TimelineView({ weekPlan, dailyPlan }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    if (!weekPlan || !Array.isArray(weekPlan)) return [];
    if (weekOffset === 0) return weekPlan;
    const shifted = [];
    const now = new Date();
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d + weekOffset * 7);
      shifted.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        items: [],
      });
    }
    return shifted;
  }, [weekPlan, weekOffset]);

  const handlePrevWeek = useCallback(() => setWeekOffset(o => o - 1), []);
  const handleNextWeek = useCallback(() => setWeekOffset(o => o + 1), []);
  const handleThisWeek = useCallback(() => setWeekOffset(0), []);

  if (!weekPlan || !Array.isArray(weekPlan) || weekPlan.length === 0) {
    return null;
  }

  return (
    <div className="timeline">
      <div className="timeline__header">
        <h2 className="timeline__title">📅 Weekly Schedule</h2>
        <div className="timeline__nav">
          <button className="timeline__nav-btn" onClick={handlePrevWeek}>← Prev</button>
          <button className="timeline__nav-btn timeline__nav-btn--today" onClick={handleThisWeek}>This Week</button>
          <button className="timeline__nav-btn" onClick={handleNextWeek}>Next →</button>
        </div>
      </div>
      {dailyPlan && (
        <div className="timeline__summary">
          <span className="timeline__summary-item">Active exercises: {dailyPlan.total}</span>
          {dailyPlan.reviews?.length > 0 && (
            <span className="timeline__summary-item timeline__summary-item--due">{dailyPlan.reviews.length} reviews due</span>
          )}
        </div>
      )}
      <div className="timeline__grid">
        {days.map((day) => (
          <div key={day.date} className={`timeline__day ${day.date === new Date().toISOString().split('T')[0] ? 'timeline__day--today' : ''}`}>
            <div className="timeline__day-header">{day.label}</div>
            <div className="timeline__day-items">
              {day.items.length === 0 ? (
                <div className="timeline__day-empty">Rest</div>
              ) : (
                day.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`timeline__card timeline__card--${item.type || 'exercise'} ${item.completed ? 'timeline__card--done' : ''}`}
                    style={{ borderLeftColor: SKILL_COLORS[item.skill] || '#888' }}
                  >
                    <div className="timeline__card-icon">{SKILL_ICONS[item.skill] || '📝'}</div>
                    <div className="timeline__card-body">
                      <div className="timeline__card-label">{item.label || item.description || item.skill}</div>
                      <div className="timeline__card-meta">
                        {item.type === 'review' && item.retrievability != null && (
                          <span className="timeline__card-retrievability" style={{ color: item.retrievability < 0.3 ? '#e86b6b' : '#e8a838' }}>
                            {Math.round(item.retrievability * 100)}%
                          </span>
                        )}
                        {item.constraints?.difficulty && (
                          <span className={`timeline__card-diff timeline__card-diff--${item.constraints.difficulty}`}>
                            {item.constraints.difficulty}
                          </span>
                        )}
                        {item.constraints?.type && (
                          <span className="timeline__card-type">{item.constraints.type}</span>
                        )}
                        {item.constraints?.timeLimit && (
                          <span className="timeline__card-time">{item.constraints.timeLimit}min</span>
                        )}
                        {item.completed && <span className="timeline__card-done-badge">✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
