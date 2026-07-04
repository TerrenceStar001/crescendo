import React, { useState, useMemo } from 'react';
import { dseLevelColor } from '../utils/dseGrading';

const SKILL_ICONS = { reading: '📖', writing: '✍️', listening: '🎧', speaking: '🎤' };
const SKILL_COLORS = { reading: '#4a90d9', writing: '#e67e22', listening: '#27ae60', speaking: '#8e44ad' };

export default function SessionHistory({ sessions, onBack }) {
  const [filterSkill, setFilterSkill] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    if (filterSkill === 'all') return sessions;
    return sessions.filter(s => s.skill === filterSkill);
  }, [sessions, filterSkill]);

  if (!sessions?.length) {
    return (
      <div className="session-history">
        <div className="session-history__header">
          <button className="session-history__back" onClick={onBack}>← Back</button>
          <h2 className="session-history__title">Session History</h2>
        </div>
        <div className="session-history__empty">No sessions recorded yet.</div>
      </div>
    );
  }

  return (
    <div className="session-history">
      <div className="session-history__header">
        <button className="session-history__back" onClick={onBack}>← Back</button>
        <h2 className="session-history__title">Session History ({sessions.length})</h2>
      </div>

      <div className="session-history__filters">
        {['all', 'reading', 'writing', 'listening', 'speaking'].map(sk => (
          <button
            key={sk}
            className={`session-history__filter${filterSkill === sk ? ' session-history__filter--active' : ''}`}
            onClick={() => setFilterSkill(sk)}
          >
            {sk === 'all' ? 'All' : SKILL_ICONS[sk]} {sk.charAt(0).toUpperCase() + sk.slice(1)}
          </button>
        ))}
      </div>

      <div className="session-history__list">
        {filtered.map(session => {
          const isExpanded = expandedId === session.id;
          const skill = session.skill || 'reading';
          const level = session.dseLevel || '—';
          const pct = session.percentage || 0;
          const color = dseLevelColor(level);

          return (
            <div key={session.id} className={`session-history__item${isExpanded ? ' session-history__item--expanded' : ''}`}>
              <div className="session-history__item-header" onClick={() => setExpandedId(isExpanded ? null : session.id)}>
                <span className="session-history__item-skill" style={{ color: SKILL_COLORS[skill] }}>
                  {SKILL_ICONS[skill] || '📝'} {skill}
                </span>
                <span className="session-history__item-level" style={{ color }}>
                  {level}
                </span>
                <span className="session-history__item-pct">{pct}%</span>
                <span className="session-history__item-date">
                  {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : '—'}
                </span>
                <span className="session-history__item-chevron">{isExpanded ? '▾' : '▸'}</span>
              </div>
              {isExpanded && (
                <div className="session-history__item-details">
                  {session.type && <div className="session-history__detail-row"><span>Type:</span><strong>{session.type}</strong></div>}
                  {session.paperId && <div className="session-history__detail-row"><span>Paper:</span><strong>{session.paperId}</strong></div>}
                  {session.wordCount && <div className="session-history__detail-row"><span>Word count:</span><strong>{session.wordCount}</strong></div>}
                  {session.topic && <div className="session-history__detail-row"><span>Topic:</span><strong>{session.topic}</strong></div>}
                  {session.duration && <div className="session-history__detail-row"><span>Duration:</span><strong>{Math.round(session.duration / 60)}m</strong></div>}
                  {session.subScores && Object.keys(session.subScores).length > 0 && (
                    <div className="session-history__subscores">
                      <strong>Sub-scores:</strong>
                      {Object.entries(session.subScores).map(([key, val]) => (
                        <div key={key} className="session-history__subscore-row">
                          <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span>{val}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
