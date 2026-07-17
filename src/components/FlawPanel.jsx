import React from 'react';

const CATEGORY_COLORS = {
  vocabulary: '#4A90D9',
  grammar: '#E57373',
  comprehension: '#81C784',
  inference: '#FFB74D',
  synthesis: '#BA68C8',
  expression: '#4DB6AC',
};

const CATEGORY_LABELS = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  comprehension: 'Comprehension',
  inference: 'Inference',
  synthesis: 'Synthesis',
  expression: 'Expression',
};

const CATEGORY_TIPS = {
  vocabulary: 'Practice using new words in context. Try collocation exercises.',
  grammar: 'Review tense usage and subject-verb agreement rules.',
  comprehension: 'Practice identifying main ideas and supporting details.',
  inference: 'Work on reading between the lines and drawing conclusions.',
  synthesis: 'Practice connecting ideas across multiple sources.',
  expression: 'Focus on sentence structure and clarity of expression.',
};

const SEVERITY_COLORS = { micro: '#4CAF50', meso: '#FF9800', macro: '#f44336' };

export default function FlawPanel({ getFlawSummary, flawRecords, isLoaded }) {
  if (!isLoaded) {
    return React.createElement('div', { className: 'flaw-panel__container' },
      React.createElement('div', { className: 'flaw-panel__empty' }, 'Loading flaw data...'),
    );
  }

  const summary = typeof getFlawSummary === 'function' ? getFlawSummary() : null;
  if (!summary || summary.totalFlaws === 0) {
    return React.createElement('div', { className: 'flaw-panel__container' },
      React.createElement('div', { className: 'flaw-panel__empty' },
        React.createElement('span', { style: { fontSize: '2rem' } }, '🔍'),
        React.createElement('p', null, 'Complete practice sessions to see your cognitive flaw profile.'),
      ),
    );
  }

  const { byCategory = {}, bySeverity = {}, topCategories = [], trend = 'stable', totalFlaws = 0, windowFlaws = 0 } = summary;
  const maxCatCount = Math.max(1, ...Object.values(byCategory));
  const trendIcon = trend === 'improving' ? '↗︎' : trend === 'declining' ? '↘︎' : '→';
  const trendColor = trend === 'improving' ? 'var(--color-success)' : trend === 'declining' ? 'var(--color-error)' : 'var(--color-text-muted)';

  return React.createElement('div', { className: 'flaw-panel__container' },
    React.createElement('h3', { className: 'flaw-panel__title' }, '🔍 Cognitive Flaw Analysis'),

    React.createElement('div', { className: 'flaw-panel__summary-bar' },
      React.createElement('div', { className: 'flaw-panel__stat' },
        React.createElement('span', { className: 'flaw-panel__stat-value' }, totalFlaws),
        React.createElement('span', { className: 'flaw-panel__stat-label' }, 'Total Flaws'),
      ),
      React.createElement('div', { className: 'flaw-panel__stat' },
        React.createElement('span', { className: 'flaw-panel__stat-value' }, windowFlaws),
        React.createElement('span', { className: 'flaw-panel__stat-label' }, 'Last 7 days'),
      ),
      React.createElement('div', { className: 'flaw-panel__stat' },
        React.createElement('span', { className: 'flaw-panel__stat-value', style: { color: trendColor } }, trendIcon),
        React.createElement('span', { className: 'flaw-panel__stat-label' }, 'Trend'),
      ),
    ),

    React.createElement('div', { className: 'flaw-panel__section' },
      React.createElement('h4', null, 'Category Breakdown'),
      React.createElement('div', { className: 'flaw-panel__category-bars' },
        Object.entries(CATEGORY_LABELS).map(([slug, label]) => {
          const count = byCategory[slug] || 0;
          const pct = Math.round((count / maxCatCount) * 100);
          return React.createElement('div', { key: slug, className: 'flaw-panel__category-row' },
            React.createElement('span', { className: 'flaw-panel__category-label' }, label),
            React.createElement('div', { className: 'flaw-panel__bar-track' },
              React.createElement('div', {
                className: 'flaw-panel__bar-fill',
                style: { width: `${pct}%`, backgroundColor: CATEGORY_COLORS[slug] },
              }),
            ),
            React.createElement('span', { className: 'flaw-panel__category-count' }, count),
          );
        }),
      ),
    ),

    React.createElement('div', { className: 'flaw-panel__section' },
      React.createElement('h4', null, 'Severity Distribution'),
      React.createElement('div', { className: 'flaw-panel__severity-row' },
        Object.entries(SEVERITY_COLORS).map(([sev, color]) => {
          const count = bySeverity[sev] || 0;
          return React.createElement('div', { key: sev, className: 'flaw-panel__severity-card' },
            React.createElement('span', {
              className: 'flaw-panel__severity-dot',
              style: { backgroundColor: color, width: sev === 'micro' ? 12 : sev === 'meso' ? 18 : 24, height: sev === 'micro' ? 12 : sev === 'meso' ? 18 : 24 },
            }),
            React.createElement('span', { className: 'flaw-panel__severity-count' }, count),
            React.createElement('span', { className: 'flaw-panel__severity-label' }, sev),
          );
        }),
      ),
    ),

    topCategories.length > 0 && React.createElement('div', { className: 'flaw-panel__section' },
      React.createElement('h4', null, 'Top Weaknesses'),
      topCategories.slice(0, 3).map((cat, i) => React.createElement('div', { key: cat, className: 'flaw-panel__tip' },
        React.createElement('span', { className: 'flaw-panel__tip-badge', style: { backgroundColor: CATEGORY_COLORS[cat] } }, `${i + 1}`),
        React.createElement('div', null,
          React.createElement('strong', null, CATEGORY_LABELS[cat] || cat),
          React.createElement('p', null, CATEGORY_TIPS[cat] || 'Focus on this area to improve.'),
        ),
      )),
    ),
  );
}
