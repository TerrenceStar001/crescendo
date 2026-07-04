import React, { useMemo } from 'react';
import { dseLevelColor } from '../utils/dseGrading';

const LEVELS = ['1', '2', '3', '4', '5', '5*', '5**'];
const SKILL_COLORS = { reading: '#4a90d9', writing: '#e67e22', listening: '#27ae60', speaking: '#8e44ad' };

export default function PerformanceChart({ sessions, height = 200, showTarget = true }) {
  if (!sessions?.length) {
    return <div className="perf-chart__empty">No sessions yet. Complete a practice to see your progress.</div>;
  }

  const maxLevel = 7;
  const gap = Math.max(4, Math.min(8, 280 / sessions.length));
  const barWidth = Math.max(8, Math.min(28, 300 / sessions.length));
  const chartWidth = Math.max(200, sessions.length * (barWidth + gap));
  const maxLabelInterval = Math.max(1, Math.floor(60 / (barWidth + gap)));

  const movingAvg = useMemo(() => {
    const window = 7;
    const result = [];
    for (let i = 0; i < sessions.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = sessions.slice(start, i + 1);
      const avg = slice.reduce((s, x) => s + (x.percentage || 0), 0) / slice.length;
      result.push(avg);
    }
    return result;
  }, [sessions]);

  const skillColors = useMemo(() => {
    const colors = {};
    for (const s of sessions) {
      if (!colors[s.skill]) colors[s.skill] = SKILL_COLORS[s.skill] || '#999';
    }
    return colors;
  }, [sessions]);

  const hasMovingAvg = sessions.length >= 3;

  return (
    <div className="perf-chart" style={{ height }}>
      <div className="perf-chart__y-label" style={{ top: 4 }}>5**</div>
      <div className="perf-chart__y-label" style={{ bottom: '43%' }}>3</div>
      <div className="perf-chart__y-label" style={{ bottom: 4 }}>1</div>

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

        {/* Moving average line */}
        {hasMovingAvg && (
          <polyline
            points={movingAvg.map((v, i) => {
              const levelIndex = Math.round((v / 100) * (LEVELS.length - 1));
              const y = height - (levelIndex / (LEVELS.length - 1)) * height * 0.85 - height * 0.08 - height * 0.85 / (LEVELS.length - 1) * 0.5;
              return `${i * (barWidth + gap) + gap + barWidth / 2},${y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--color-text)"
            strokeWidth={2}
            opacity={0.4}
            strokeDasharray="6 3"
          />
        )}

        {sessions.map((s, i) => {
          const levelIndex = LEVELS.indexOf(s.level);
          if (levelIndex === -1) return null;
          const y = height - (levelIndex / (LEVELS.length - 1)) * height * 0.85 - height * 0.08;
          const barH = Math.max(4, (height * 0.85) / (LEVELS.length - 1));
          const x = i * (barWidth + gap) + gap;
          const color = skillColors[s.skill] || dseLevelColor(s.level);

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
                x={x + barWidth / 2} y={y - barH / 2 - 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight="600"
                fill={color}
                style={{ fontFamily: 'inherit' }}
              >
                {s.level === '5**' ? '5**' : s.level}
              </text>
              {i === sessions.length - 1 && (
                <text
                  x={x + barWidth / 2} y={height - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--color-text-muted)"
                  style={{ fontFamily: 'inherit' }}
                >
                  {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="perf-chart__legend" style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
        {Object.entries(skillColors).map(([skill, color]) => (
          <span key={skill} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            {skill.charAt(0).toUpperCase() + skill.slice(1)}
          </span>
        ))}
        {hasMovingAvg && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 16, height: 0, borderTop: '1px dashed var(--color-text-muted)', display: 'inline-block' }} />
            7-day avg
          </span>
        )}
      </div>
    </div>
  );
}
