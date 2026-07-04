import React, { useState, useMemo, useCallback } from 'react';
import SkillRing from './SkillRing';
import PerformanceChart from './PerformanceChart';
import { computeStreak } from '../utils/dseGrading';

const DEFAULT_SECTIONS = ['overview', 'recommendations', 'gradeHistory', 'weakAreas', 'quickActions'];

export default function Dashboard({
  notes, skillAnalytics, onSwitchToModule, onCreate, onOpenDaily, onRandom,
  courseCompletionCount = 0, onBrowseCourses,
}) {
  const [visibleSections, setVisibleSections] = useState(() => {
    try {
      const saved = localStorage.getItem('crescendo-dse-dashboard-sections');
      return saved ? JSON.parse(saved) : [...DEFAULT_SECTIONS];
    } catch { return [...DEFAULT_SECTIONS]; }
  });
  const [showCustomize, setShowCustomize] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  // Read course improvements from localStorage
  const improvements = useMemo(() => {
    try {
      const raw = localStorage.getItem('crescendo-course-improvements');
      if (!raw) return {};
      return JSON.parse(raw);
    } catch { return {}; }
  }, []);

  const toggleSection = useCallback((key) => {
    setVisibleSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const vis = (key) => visibleSections.includes(key);

  const skillData = useMemo(() => {
    if (!skillAnalytics) return [];
    return [
      { skill: 'reading', percentage: skillAnalytics.reading?.overall || 0, dseLevel: skillAnalytics.reading?.dseLevel || '1', module: 'reading' },
      { skill: 'writing', percentage: skillAnalytics.writing?.overall || 0, dseLevel: skillAnalytics.writing?.dseLevel || '1', module: 'writing' },
      { skill: 'listening', percentage: skillAnalytics.listening?.overall || 0, dseLevel: skillAnalytics.listening?.dseLevel || '1', module: 'listening' },
      { skill: 'speaking', percentage: skillAnalytics.speaking?.overall || 0, dseLevel: skillAnalytics.speaking?.dseLevel || '1', module: 'speaking' },
    ];
  }, [skillAnalytics]);

  const gradeHistory = useMemo(() => {
    if (!skillAnalytics) return [];
    return skillAnalytics.getGradeHistory(null, 30);
  }, [skillAnalytics]);

  const sessionCounts = useMemo(() => {
    if (!skillAnalytics) return { total: 0, thisWeek: 0 };
    const all = skillAnalytics.sessions || [];
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      total: all.length,
      thisWeek: all.filter(s => new Date(s.completedAt).getTime() > weekAgo).length,
    };
  }, [skillAnalytics]);

  const overallDse = skillAnalytics?.overallDseLevel || '1';
  const recommended = skillAnalytics?.recommendations || [];

  const weakAreas = useMemo(() => {
    if (!skillAnalytics) return [];
    return skillAnalytics.getWeakAreas().slice(0, 6);
  }, [skillAnalytics]);

  const streakData = useMemo(() => {
    if (!skillAnalytics) return { streak: 0, todayActive: false };
    return skillAnalytics.streak || { streak: 0, todayActive: false };
  }, [skillAnalytics]);

  function Section({ id, title, className, children }) {
    if (!vis(id)) return null;
    return (
      <div className={`dashboard__section${className ? ' ' + className : ''}`}>
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">{title}</h2>
          <button className="dashboard__section-hide" onClick={() => toggleSection(id)} title="Hide section">✕</button>
        </div>
        {children}
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard__empty">
          <h1 className="dashboard__greeting">Welcome to HKDSE English 5**</h1>
          <p className="dashboard__subtitle">Master Reading, Writing, Listening, and Speaking. Start your journey here.</p>
          <button className="welcome__cta" onClick={onCreate}>
            Create Your First Note
          </button>
          <p className="welcome__hints">
            <kbd>Ctrl+N</kbd> New &middot; <kbd>Ctrl+K</kbd> Command palette &middot; <kbd>?</kbd> Shortcuts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div className="dashboard__greeting-col">
          <h1 className="dashboard__greeting">
            HKDSE English Dashboard
            {streakData.streak >= 2 && (
              <span className="dashboard__streak" title={`${streakData.streak}-day streak${streakData.todayActive ? ' — active today!' : ''}`}>
                🔥 {streakData.streak}d
              </span>
            )}
          </h1>
          <p className="dashboard__subtitle">
            Predicted: <strong>{overallDse}</strong> &middot; {sessionCounts.total} total sessions &middot; {sessionCounts.thisWeek} this week
          </p>
          <div className="dashboard__stats-bar">
            <span className="dashboard__stats-item"><strong>{sessionCounts.total}</strong> sessions</span>
            <span className="dashboard__stats-sep" />
            <span className="dashboard__stats-item"><strong>{notes.length}</strong> notes</span>
            <span className="dashboard__stats-sep" />
            <span className="dashboard__stats-item">Courses: <strong>{courseCompletionCount}</strong> completed</span>
            <span className="dashboard__stats-sep" />
            <span className="dashboard__stats-item">Target: <strong>5**</strong></span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="dashboard__customize-btn" onClick={() => setShowCustomize(c => !c)} title="Customize dashboard">⚙</button>
        </div>
      </div>

      {showCustomize && (
        <div className="dashboard__customize" onClick={() => setShowCustomize(false)}>
          <div className="dashboard__customize-panel" onClick={e => e.stopPropagation()}>
            <h3 className="dashboard__customize-title">Customize Dashboard</h3>
            {DEFAULT_SECTIONS.map(key => (
              <label key={key} className="dashboard__customize-item">
                <input type="checkbox" checked={vis(key)} onChange={() => toggleSection(key)} />
                <span>{key === 'overview' ? 'Skill Overview' : key === 'recommendations' ? 'Recommendations' : key === 'gradeHistory' ? 'Grade History' : key === 'weakAreas' ? 'Weak Areas' : 'Quick Actions'}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard__grid">
        <Section id="overview" title="📊 Skill Overview">
          <div className="dse-dashboard__rings">
            {skillData.map(d => (
              <SkillRing
                key={d.skill}
                skill={d.skill}
                percentage={d.percentage}
                dseLevel={d.dseLevel}
                onClick={() => onSwitchToModule?.(d.module)}
              />
            ))}
          </div>
          {overallDse === '5**' && (
            <div className="dse-dashboard__target-reached">
              🎉 Congratulations! You're at 5** level. Keep practicing to maintain your edge.
            </div>
          )}
          {overallDse !== '5**' && overallDse !== '—' && (
            <div className="dse-dashboard__target-gap">
              Target: <strong>5**</strong> &rarr; Current: <strong>{overallDse}</strong>
              &nbsp;&middot;&nbsp; Keep going!
            </div>
          )}
        </Section>

        {recommended.length > 0 && (
          <Section id="recommendations" title="💡 Recommendations">
            <div className="dse-dashboard__recs">
              {(showAllRecs ? recommended : recommended.slice(0, 3)).map((r, i) => (
                <div key={i} className={`dse-dashboard__rec dse-dashboard__rec--${r.priority}`}>
                  <div className="dse-dashboard__rec-icon">
                    {r.priority === 'high' ? '🔴' : '🟡'}
                  </div>
                  <div className="dse-dashboard__rec-body">
                    <span className="dse-dashboard__rec-action">{r.action}</span>
                    <span className="dse-dashboard__rec-reason">{r.reason}</span>
                  </div>
                </div>
              ))}
              {recommended.length > 3 && (
                <button className="dse-dashboard__rec-toggle" onClick={() => setShowAllRecs(s => !s)}>
                  {showAllRecs ? 'Show less' : `Show all ${recommended.length} recommendations`}
                </button>
              )}
            </div>
          </Section>
        )}

        {(vis('gradeHistory') && gradeHistory.length > 0) && (
          <Section id="gradeHistory" title="📈 Grade History">
            <PerformanceChart sessions={gradeHistory} />
          </Section>
        )}

        {weakAreas.length > 0 && (
          <Section id="weakAreas" title="🎯 Areas to Improve">
            <div className="dse-dashboard__weak-list">
              {weakAreas.map((w, i) => (
                <div key={i} className="dse-dashboard__weak-item" onClick={() => onSwitchToModule?.(w.skill)}>
                  <span className="dse-dashboard__weak-skill">
                    {w.skill === 'reading' ? '📖' : w.skill === 'writing' ? '✍️' : w.skill === 'listening' ? '🎧' : '🎤'} {w.skill}
                  </span>
                  <span className="dse-dashboard__weak-area">{w.area.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="dse-dashboard__weak-bar-bg">
                    <div className="dse-dashboard__weak-bar-fill" style={{ width: `${Math.max(4, w.score)}%`, background: w.score < 40 ? 'var(--color-error)' : 'var(--color-warning)' }} />
                  </div>
                  <span className="dse-dashboard__weak-score">{w.score}%</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {Object.keys(improvements).length > 0 && (
          <div className="dashboard__section">
            <div className="dashboard__section-header">
              <h2 className="dashboard__section-title">📈 Course Improvements</h2>
              <button className="dashboard__section-hide" onClick={() => {}} title="Course improvement tracking">✕</button>
            </div>
            <div className="dse-dashboard__improvements">
              {Object.entries(improvements).slice(0, 3).map(([courseId, entry]) => {
                const areas = entry.beforeAnalysis?.filter?.(b => b.percentage < 60) || [];
                return areas.length > 0 ? (
                  <div key={courseId} className="dse-dashboard__improvement-item">
                    <span className="dse-dashboard__improvement-area">
                      {areas.slice(0, 2).map(a => a.area).join(', ')}
                    </span>
                    <span className="dse-dashboard__improvement-detail">
                      {areas.map(a => `${a.area}: ${a.percentage}%`).join(', ')}
                    </span>
                    <span className="dse-dashboard__improvement-date">
                      {new Date(entry.trackedAt).toLocaleDateString()}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        <Section id="quickActions" title="⚡ Quick Actions">
          <div className="dashboard__actions">
            <button className="dashboard__action" onClick={onCreate}>
              <span className="dashboard__action-icon">+</span>
              <span className="dashboard__action-label">New Note</span>
            </button>
            <button className="dashboard__action" onClick={onOpenDaily}>
              <span className="dashboard__action-icon">📅</span>
              <span className="dashboard__action-label">Daily Note</span>
            </button>
            <button className="dashboard__action" onClick={onRandom}>
              <span className="dashboard__action-icon">🎲</span>
              <span className="dashboard__action-label">Random Note</span>
            </button>
            <button className="dashboard__action" onClick={() => onSwitchToModule?.('reading')}>
              <span className="dashboard__action-icon">📖</span>
              <span className="dashboard__action-label">Reading Practice</span>
            </button>
            <button className="dashboard__action" onClick={() => onSwitchToModule?.('writing')}>
              <span className="dashboard__action-icon">✍️</span>
              <span className="dashboard__action-label">Writing Prompt</span>
            </button>
            <button className="dashboard__action" onClick={() => onSwitchToModule?.('speaking')}>
              <span className="dashboard__action-icon">🎤</span>
              <span className="dashboard__action-label">Speaking Drill</span>
            </button>
            {onBrowseCourses && (
              <button className="dashboard__action" onClick={onBrowseCourses}>
                <span className="dashboard__action-icon">📚</span>
                <span className="dashboard__action-label">Browse Courses</span>
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
