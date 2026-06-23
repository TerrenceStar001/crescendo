import React from 'react';
import { dseLevelColor } from '../utils/dseGrading';

const LEVELS = ['1', '2', '3', '4', '5', '5*', '5**'];

export default function PerformanceChart({ sessions, height = 180, showTarget = true }) {
  if (!sessions?.length) {
    return <div className="perf-chart__empty">No sessions yet. Complete a practice to see your progress.</div>;
  }

  const maxLevel = 7;
  const barWidth = Math.max(12, Math.min(32, 400 / sessions.length));
  const chartWidth = Math.max(200, sessions.length * (barWidth + 6));

  return (
    <div className="perf-chart" style={{ height }}>
      <div className="perf-chart__y-label">5**</div>
      <div className="perf-chart__y-label" style={{ bottom: '57%' }}>3</div>
      <div className="perf-chart__y-label" style={{ bottom: '14%' }}>1</div>

      <svg width={chartWidth} height={height} className="perf-chart__svg">
        {showTarget && (
          <line
            x1={0} y1={height * 0.06}
            x2={chartWidth} y2={height * 0.06}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
        )}
        {showTarget && (
          <text
            x={chartWidth - 4} y={height * 0.06 - 4}
            textAnchor="end"
            fontSize={9}
            fill="var(--color-accent)"
            opacity={0.6}
            style={{ fontFamily: 'inherit' }}
          >
            5**
          </text>
        )}

        {sessions.map((s, i) => {
          const levelIndex = LEVELS.indexOf(s.level);
          if (levelIndex === -1) return null;
          const y = height - (levelIndex / (LEVELS.length - 1)) * height * 0.85 - height * 0.08;
          const barH = Math.max(4, (height * 0.85) / (LEVELS.length - 1));
          const x = i * (barWidth + 6) + 4;
          const color = dseLevelColor(s.level);

          return (
            <g key={i}>
              <rect
                x={x} y={y - barH / 2}
                width={barWidth} height={barH}
                rx={3} ry={3}
                fill={color}
                opacity={0.7}
              >
                <title>{`${s.skill}: ${s.level} (${s.percentage}%) — ${new Date(s.date).toLocaleDateString()}`}</title>
              </rect>
              <text
                x={x + barWidth / 2} y={height - 4}
                textAnchor="middle"
                fontSize={8}
                fill="var(--color-text-muted)"
                style={{ fontFamily: 'inherit' }}
              >
                {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
