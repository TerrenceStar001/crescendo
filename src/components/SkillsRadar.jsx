import React, { useMemo } from 'react';

const SKILL_COLORS = { reading: '#4a90d9', writing: '#e67e22', listening: '#27ae60', speaking: '#8e44ad' };
const SKILL_LABELS = { reading: 'Reading', writing: 'Writing', listening: 'Listening', speaking: 'Speaking' };

export default function SkillsRadar({ skillData, sessions }) {
  const radarData = useMemo(() => {
    const result = { reading: [], writing: [], listening: [], speaking: [] };

    for (const sd of skillData) {
      if (!sd || !sd.subScores) continue;
      for (const [key, val] of Object.entries(sd.subScores)) {
        result[sd.skill].push({ label: key, value: val });
      }
    }

    return result;
  }, [skillData]);

  const allLabels = useMemo(() => {
    const labels = new Set();
    for (const skillArr of Object.values(radarData)) {
      for (const item of skillArr) {
        labels.add(item.label);
      }
    }
    return [...labels].sort();
  }, [radarData]);

  if (!skillData?.length || allLabels.length === 0) {
    return <div className="skills-radar__empty">Complete practice sessions to see your sub-skill breakdown.</div>;
  }

  return (
    <div className="skills-radar">
      <svg viewBox="0 0 400 300" className="skills-radar__svg">
        {/* Background grid */}
        {[20, 40, 60, 80, 100].map(pct => (
          <polygon
            key={pct}
            points={getPolygonPoints(200, 150, 100, allLabels.length, pct / 100)}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="0.5"
            opacity={0.3}
          />
        ))}

        {/* Axis lines */}
        {allLabels.map((label, i) => {
          const angle = (Math.PI * 2 * i) / allLabels.length - Math.PI / 2;
          const x = 200 + Math.cos(angle) * 100;
          const y = 150 + Math.sin(angle) * 100;
          return (
            <g key={label}>
              <line x1="200" y1="150" x2={x} y2={y} stroke="var(--color-border)" strokeWidth="0.5" />
              <text
                x={200 + Math.cos(angle) * 115}
                y={150 + Math.sin(angle) * 115}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fill="var(--color-text-muted)"
                style={{ fontFamily: 'inherit' }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Data polygons */}
        {skillData.map(sd => {
          const data = radarData[sd.skill] || [];
          const values = allLabels.map(label => {
            const item = data.find(d => d.label === label);
            return item ? item.value : 0;
          });
          if (values.every(v => v === 0)) return null;

          const points = values.map((v, i) => {
            const angle = (Math.PI * 2 * i) / allLabels.length - Math.PI / 2;
            const r = (v / 100) * 100;
            return `${200 + Math.cos(angle) * r},${150 + Math.sin(angle) * r}`;
          }).join(' ');

          return (
            <polygon
              key={sd.skill}
              points={points}
              fill={SKILL_COLORS[sd.skill]}
              fillOpacity="0.15"
              stroke={SKILL_COLORS[sd.skill]}
              strokeWidth="2"
            />
          );
        })}

        {/* Legend */}
        {skillData.map(sd => (
          <g key={sd.skill}>
            <rect x={10 + skillData.indexOf(sd) * 80} y="280" width="10" height="10" fill={SKILL_COLORS[sd.skill]} fillOpacity="0.6" rx="2" />
            <text x={24 + skillData.indexOf(sd) * 80} y="289" fontSize="10" fill="var(--color-text)" style={{ fontFamily: 'inherit' }}>
              {SKILL_LABELS[sd.skill]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function getPolygonPoints(cx, cy, r, sides, scale) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
  }).join(' ');
}
