import React from 'react';
import { dseLevelColor } from '../utils/dseGrading';

export default function SkillRing({ skill, percentage, dseLevel, size = 110, strokeWidth = 6, onClick, animated = true }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;
  const color = dseLevelColor(dseLevel);

  const icons = { reading: '📖', writing: '✍️', listening: '🎧', speaking: '🎤' };
  const labels = { reading: 'Reading', writing: 'Writing', listening: 'Listening', speaking: 'Speaking' };

  return (
    <button className="skill-ring" onClick={onClick} title={`${labels[skill]}: ${dseLevel} (${percentage}%)`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: animated ? 'stroke-dashoffset 0.8s ease-out' : 'none' }}
        />
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fontWeight="700"
          fill={dseLevel === '5**' ? color : 'var(--color-text)'}
          style={{ fontFamily: 'inherit' }}
        >
          {dseLevel}
        </text>
        <text
          x={cx} y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.1}
          fill="var(--color-text-muted)"
          style={{ fontFamily: 'inherit' }}
        >
          {percentage}%
        </text>
      </svg>
      <span className="skill-ring__icon">{icons[skill]}</span>
      <span className="skill-ring__label">{labels[skill]}</span>
    </button>
  );
}
