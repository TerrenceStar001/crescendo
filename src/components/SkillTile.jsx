import React from 'react';
import { dseLevelColor } from '../utils/dseGrading';

const ICONS = { reading: '📖', writing: '✍️', listening: '🎧', speaking: '🎤' };
const LABELS = { reading: 'Reading', writing: 'Writing', listening: 'Listening', speaking: 'Speaking' };

export default function SkillTile({ skill, percentage, dseLevel, trend, onClick, animated = true }) {
  const color = dseLevelColor(dseLevel);
  const icon = ICONS[skill] || '📝';
  const label = LABELS[skill] || skill;
  const trendArrow = trend === null ? null : trend > 0 ? `↗ +${trend}%` : trend < 0 ? `↘ ${trend}%` : '→';
  const trendColor = trend > 0 ? 'var(--color-success)' : trend < 0 ? 'var(--color-error)' : 'var(--color-text-muted)';

  return (
    <button
      className="dse-dashboard__tile"
      onClick={onClick}
      title={`${label}: ${dseLevel} (${percentage}%)`}
      style={{ position: 'relative' }}
    >
      <div className="dse-dashboard__tile-ring">
        <svg viewBox="0 0 80 80" className="dse-dashboard__tile-svg">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="5" />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            strokeDashoffset={animated ? 2 * Math.PI * 34 * (1 - percentage / 100) : 2 * Math.PI * 34}
            transform="rotate(-90 40 40)"
            style={{ transition: animated ? 'stroke-dashoffset 0.8s ease-out' : 'none' }}
          />
        </svg>
        <div className="dse-dashboard__tile-center">
          <span className="dse-dashboard__tile-icon">{icon}</span>
          <span className="dse-dashboard__tile-level" style={{ color: dseLevel === '5**' ? color : 'inherit' }}>
            {dseLevel}
          </span>
          <span className="dse-dashboard__tile-pct">{percentage}%</span>
        </div>
      </div>
      <span className="dse-dashboard__tile-label">{label}</span>
      {trendArrow && (
        <span className="dse-dashboard__tile-trend" style={{ color: trendColor }}>
          {trendArrow}
        </span>
      )}
    </button>
  );
}
