import React, { useMemo } from 'react';

const FLAW_COLORS = {
  vocabulary: '#e86b6b',
  grammar: '#e8a838',
  comprehension: '#4f8ef7',
  inference: '#8e44ad',
  synthesis: '#2ecc71',
  expression: '#e67e22',
};
const FLAW_LABELS = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  comprehension: 'Comprehension',
  inference: 'Inference',
  synthesis: 'Synthesis',
  expression: 'Expression',
};

export default function FlawTrendChart({ flawRecords, height = 200 }) {
  const chartData = useMemo(() => {
    if (!flawRecords?.length) return null;
    const categories = {};
    const sorted = [...flawRecords].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    for (const r of sorted) {
      const d = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const cat = r.category || 'unknown';
      if (!categories[cat]) categories[cat] = {};
      categories[cat][d] = (categories[cat][d] || 0) + r.weight;
    }
    const dates = [...new Set(sorted.map(r => new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})))].slice(-14);
    const series = Object.entries(categories).map(([cat, points]) => ({
      category: cat,
      label: FLAW_LABELS[cat] || cat,
      color: FLAW_COLORS[cat] || '#888',
      points: dates.map(d => points[d] || 0),
    }));
    const maxVal = Math.max(1, ...series.flatMap(s => s.points));
    return { dates, series, maxVal };
  }, [flawRecords]);

  if (!chartData || chartData.dates.length < 2) {
    return <div className="perf-chart__empty">Not enough flaw data yet. Complete more practice sessions to see trends.</div>;
  }

  const svgW = Math.max(200, chartData.dates.length * 30);
  const pad = { top: 20, right: 20, bottom: 30, left: 8 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const xStep = plotW / (chartData.dates.length - 1 || 1);

  return (
    <div className="perf-chart" style={{ height }}>
      <svg width={svgW} height={height} className="perf-chart__svg">
        {chartData.series.map((s) => {
          if (s.points.every(p => p === 0)) return null;
          const points = s.points.map((v, i) =>
            `${pad.left + i * xStep},${pad.top + plotH - (v / chartData.maxVal) * plotH * 0.85}`
          ).join(' ');
          return (
            <polyline key={s.category}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              opacity={0.7}
            >
              <title>{s.label}</title>
            </polyline>
          );
        })}
        {chartData.dates.map((d, i) => (
          <text key={i}
            x={pad.left + i * xStep} y={height - 6}
            textAnchor="middle"
            fontSize={8}
            fill="var(--color-text-muted)"
            style={{ fontFamily: 'inherit' }}
          >
            {i % Math.max(1, Math.floor(chartData.dates.length / 7)) === 0 ? d : ''}
          </text>
        ))}
      </svg>
      <div className="perf-chart__legend" style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
        {chartData.series.filter(s => !s.points.every(p => p === 0)).map(s => (
          <span key={s.category} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
