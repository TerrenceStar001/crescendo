import React, { useState } from 'react';

const SKILL_ICONS = { reading: '📖', writing: '✍️', listening: '🎧', speaking: '🎤' };
const DENSITY_COLORS = { low: '#4CAF50', medium: '#FFC107', high: '#FF9800', critical: '#f44336' };

const TIER_ORDER = ['shortTerm', 'midTerm', 'longTerm'];
const TIER_LABELS = { shortTerm: 'This Week', midTerm: 'This Month', longTerm: 'Until Exam' };

function ExerciseCard({ exercise, tier, onToggle }) {
  const c = exercise.constraints || {};
  const skillIcon = SKILL_ICONS[exercise.skill] || '📝';
  return React.createElement('div', { className: 'study-plan__exercise-card' },
    React.createElement('label', { className: 'study-plan__exercise-check' },
      React.createElement('input', {
        type: 'checkbox',
        checked: !!exercise.completed,
        onChange: () => onToggle(exercise.id, tier, !exercise.completed),
      }),
      React.createElement('span', { className: 'study-plan__checkmark' }),
    ),
    React.createElement('div', { className: 'study-plan__exercise-body' },
      React.createElement('div', { className: 'study-plan__exercise-header' },
        React.createElement('span', { className: 'study-plan__exercise-skill' }, `${skillIcon} ${exercise.skill}`),
        React.createElement('span', {
          className: `study-plan__exercise-status${exercise.completed ? ' study-plan__exercise-status--done' : ''}`,
        }, exercise.completed ? '✓ Done' : '○ Pending'),
      ),
      React.createElement('p', { className: 'study-plan__exercise-desc' }, exercise.description),
      React.createElement('div', { className: 'study-plan__constraint-pills' },
        React.createElement('span', { className: 'study-plan__constraint-pill' }, c.difficulty || 'medium'),
        React.createElement('span', { className: 'study-plan__constraint-pill' }, c.type || 'mcq'),
        React.createElement('span', { className: 'study-plan__constraint-pill' }, `${c.timeLimit || 10}m`),
        c.focus && React.createElement('span', { className: 'study-plan__constraint-pill study-plan__constraint-pill--focus' }, c.focus),
      ),
    ),
  );
}

function TierSection({ tierKey, tier, onToggle }) {
  const [expanded, setExpanded] = useState(tierKey === 'shortTerm');
  const total = tier.exercises?.length || 0;
  const done = tier.exercises?.filter(e => e.completed).length || 0;

  return React.createElement('div', { className: `study-plan__tier${expanded ? ' study-plan__tier--expanded' : ''}` },
    React.createElement('button', {
      className: 'study-plan__tier-header',
      onClick: () => setExpanded(!expanded),
      'aria-expanded': expanded,
    },
      React.createElement('span', { className: 'study-plan__tier-arrow' }, expanded ? '▼' : '▶'),
      React.createElement('div', { className: 'study-plan__tier-info' },
        React.createElement('span', { className: 'study-plan__tier-label' }, TIER_LABELS[tierKey] || tierKey),
        React.createElement('span', { className: 'study-plan__tier-meta' }, `${done}/${total} done · ${tier.sessionsPerWeek || '?'}/wk`),
      ),
    ),
    expanded && React.createElement('div', { className: 'study-plan__tier-body' },
      tier.focus && React.createElement('p', { className: 'study-plan__tier-focus' }, `Focus: ${tier.focus}`),
      tier.exercises?.map(ex => React.createElement(ExerciseCard, { key: ex.id, exercise: ex, tier: tierKey, onToggle })),
    ),
  );
}

export default function StudyPlanPage({ plan, isGenerating, error, onRegenerate, onUpdateExercise }) {
  if (!plan) {
    return React.createElement('div', { className: 'study-plan__container' },
      React.createElement('div', { className: 'study-plan__empty' },
        React.createElement('span', { style: { fontSize: '3rem' } }, '📋'),
        React.createElement('h2', null, 'No Study Plan Yet'),
        React.createElement('p', null, 'Complete your assessment and generate your first personalized study plan.'),
        React.createElement('button', {
          className: 'study-plan__btn study-plan__btn--primary',
          onClick: onRegenerate,
          disabled: isGenerating,
        }, isGenerating ? 'Generating...' : 'Generate Plan'),
      ),
    );
  }

  const density = plan.density || {};
  const densityColor = DENSITY_COLORS[density.density] || '#999';

  return React.createElement('div', { className: 'study-plan__container' },
    React.createElement('div', { className: 'study-plan__header' },
      React.createElement('div', { className: 'study-plan__title-row' },
        React.createElement('h2', null, '📋 Your Study Plan'),
        React.createElement('span', {
          className: 'study-plan__density-badge',
          style: { backgroundColor: densityColor, color: densityColor === '#FFC107' ? '#333' : '#fff' },
        }, (density.density || 'medium').toUpperCase()),
      ),
      React.createElement('div', { className: 'study-plan__stats' },
        React.createElement('span', null, `${density.sessionsPerWeek || '?'} sessions/week`),
        React.createElement('span', null, `${density.dailyMinutes || '?'} min/day`),
        React.createElement('span', null, `${density.daysRemaining || '?'} days to DSE`),
      ),
      React.createElement('p', { className: 'study-plan__generated' },
        `Generated ${plan.generatedAt ? new Date(plan.generatedAt).toLocaleDateString() : '—'}`,
        plan.version > 1 && ` (v${plan.version})`,
        plan._isFallback && React.createElement('span', { className: 'study-plan__fallback-tag' }, '· Default Plan'),
      ),
    ),

    TIER_ORDER.map(key => {
      const tier = plan.tiers?.[key];
      if (!tier) return null;
      return React.createElement(TierSection, { key, tierKey: key, tier, onToggle: onUpdateExercise });
    }),

    React.createElement('div', { className: 'study-plan__actions' },
      React.createElement('button', {
        className: 'study-plan__btn study-plan__btn--secondary',
        onClick: onRegenerate,
        disabled: isGenerating,
      }, isGenerating ? '⏳ Generating...' : '🔄 Regenerate Plan'),
    ),

    error && React.createElement('div', { className: 'study-plan__error' }, `⚠ ${error}`),
  );
}
