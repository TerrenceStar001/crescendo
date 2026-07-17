import React from 'react';

const SKILL_ICONS = { reading: '📖', writing: '✍️', listening: '🎧', speaking: '🎤' };
const LEVELS = ['1', '2', '3', '4', '5', '5*', '5**'];

export default function AssessmentProfileCard({ profile, hasCompletedAssessment }) {
  if (!hasCompletedAssessment || !profile?.finalLevels) {
    return (
      <div className="dashboard__analytics-card">
        <div className="dashboard__analytics-card-body">
          <p className="dashboard__analytics-empty">No assessment completed. Take the assessment to get a personalized skill profile.</p>
        </div>
      </div>
    );
  }

  const levels = profile.finalLevels;
  const overall = profile._overallDse || '—';

  return (
    <div className="dashboard__analytics-card">
      <div className="dashboard__analytics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {['reading', 'writing', 'listening', 'speaking'].map(skill => {
          const lv = levels[skill]?.final || '1';
          const lvIdx = LEVELS.indexOf(lv);
          const maxIdx = LEVELS.length - 1;
          return (
            <div key={skill} className="dashboard__analytics-skill-row">
              <div className="dashboard__analytics-skill-icon">{SKILL_ICONS[skill]}</div>
              <div className="dashboard__analytics-skill-info">
                <div className="dashboard__analytics-skill-name">{skill.charAt(0).toUpperCase() + skill.slice(1)}</div>
                <div className="dashboard__analytics-skill-level" style={{ color: lvIdx >= 4 ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  {lv}
                </div>
              </div>
              <div className="dashboard__analytics-skill-bar">
                <div className="dashboard__analytics-skill-bar-track">
                  <div className="dashboard__analytics-skill-bar-fill" style={{ width: `${(lvIdx / maxIdx) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="dashboard__analytics-footer">
        <span className="dashboard__analytics-footer-text">Overall: <strong>{overall}</strong></span>
        <span className="dashboard__analytics-footer-text">Completed: {new Date(profile.completedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
