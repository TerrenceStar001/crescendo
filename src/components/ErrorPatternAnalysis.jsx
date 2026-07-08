import React, { useMemo } from 'react';
import { analyzeBySkill, analyzeByType, identifyWeakAreas } from '../utils/errorPatternAnalysis';

/**
 * ErrorPatternAnalysis shows 3 analysis card panels:
 * 1. Skill breakdown — progress bars per skill, sorted weakest-first
 * 2. Question type breakdown — same bar pattern per question type
 * 3. Weak areas — severity badges with recommendation text
 *
 * Uses BEM classes (error-pattern__*) — all CSS added in Plan 03-03.
 */
export default function ErrorPatternAnalysis({ questions, answers, sections, part }) {
  if (!questions?.length) return null;

  const bySkill = useMemo(() => analyzeBySkill(questions, answers), [questions, answers]);
  const byType = useMemo(() => analyzeByType(questions, answers), [questions, answers]);
  const weakAreas = useMemo(() => identifyWeakAreas(bySkill, byType), [bySkill, byType]);

  // No skill data and no type data — parent decides visibility
  if (!bySkill.length && !byType.length) return null;

  const getBarColor = (pct) => {
    if (pct >= 80) return 'var(--color-success)';
    if (pct >= 60) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className="error-pattern">
      {/* Card 1: Skill breakdown */}
      <div className="error-pattern__card error-pattern__card--skill">
        <h4 className="error-pattern__header">Skill Breakdown</h4>
        {bySkill.map(item => (
          <div key={item.skill} className="error-pattern__row">
            <span className="error-pattern__label">{item.label}</span>
            <div className="error-pattern__bar-bg">
              <div
                className="error-pattern__bar-fill"
                style={{
                  width: `${item.percentage}%`,
                  background: getBarColor(item.percentage),
                }}
              />
            </div>
            <span className="error-pattern__value">{item.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Card 2: Question Type breakdown */}
      <div className="error-pattern__card error-pattern__card--type">
        <h4 className="error-pattern__header">Question Type Breakdown</h4>
        {byType.map(item => (
          <div key={item.type} className="error-pattern__row">
            <span className="error-pattern__label">{item.label}</span>
            <div className="error-pattern__bar-bg">
              <div
                className="error-pattern__bar-fill"
                style={{
                  width: `${item.percentage}%`,
                  background: getBarColor(item.percentage),
                }}
              />
            </div>
            <span className="error-pattern__value">{item.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Card 3: Weak Areas */}
      <div className="error-pattern__card error-pattern__card--weakness">
        <h4 className="error-pattern__header">Weak Areas</h4>
        {weakAreas.length === 0 ? (
          <div className="error-pattern__recommendation">
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              No weak areas identified
            </span>
          </div>
        ) : (
          weakAreas.map((area, i) => (
            <div key={area.area} className="error-pattern__recommendation">
              <span
                className="error-pattern__weakest-badge"
                style={{
                  background: area.severity === 'critical'
                    ? 'var(--color-error)'
                    : 'var(--color-warning)',
                }}
              >
                {area.severity === 'critical' ? 'Critical' : 'Needs Work'}
              </span>
              <span style={{ fontWeight: 600 }}>{area.area}</span>
              <span> — {area.percentage}%</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                {area.recommendation}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
