import React from 'react';
import { computeGapToTarget, dseLevelColor } from '../utils/dseGrading';

export default function GoalBar({ skillLevels, targetLevel, onSetGoal }) {
  const gap = computeGapToTarget(skillLevels, targetLevel);
  if (!gap) return null;

  const currentLevelNum = gap.currentLevel === '—' ? 0 : parseInt(gap.currentLevel.replace(/\D/g, '') || '0', 10);
  const targetLevelNum = parseInt(targetLevel.replace(/\D/g, '') || '7', 10);
  const pct = targetLevelNum > 0 ? Math.min(100, Math.round((currentLevelNum / targetLevelNum) * 100)) : 0;

  const skillBars = Object.entries(gap.breakdown).map(([skill, data]) => (
    <div key={skill} className="goal-bar__skill" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
      <span style={{ width: 60, textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>{skill}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--color-surface-soft)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, (data.currentScore / data.targetScore) * 100)}%`,
          height: '100%',
          background: data.improvement > 0 ? dseLevelColor(data.currentLevel) : 'var(--color-success)',
          borderRadius: 3,
        }} />
      </div>
      <span style={{ color: 'var(--color-text-muted)', minWidth: 60, textAlign: 'right' }}>
        {data.currentScore}% → {data.targetScore}%
      </span>
    </div>
  ));

  return (
    <div className="goal-bar">
      <div className="goal-bar__header">
        <span className="goal-bar__label">🎯 Target: {targetLevel}</span>
        <button className="goal-bar__set-btn" onClick={onSetGoal}>Set Goal</button>
      </div>
      <div className="goal-bar__progress">
        <div className="goal-bar__bar-bg">
          <div className="goal-bar__bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="goal-bar__pct">{pct}% to {targetLevel}</span>
      </div>
      <div className="goal-bar__skills">
        {skillBars}
      </div>
      <div className="goal-bar__required" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
        Required: {gap.requiredImprovement}
      </div>
    </div>
  );
}
