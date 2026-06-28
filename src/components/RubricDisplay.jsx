import React from 'react';

export default function RubricDisplay({ scores, feedbacks }) {
  if (!scores) return null;

  const categories = ['content', 'organization', 'language'];
  const labels = { content: 'Content', organization: 'Organisation', language: 'Language' };

  return (
    <div className="writing__correction-rubric">
      {categories.map(cat => {
        const score = scores[cat] || 0;
        const pct = (score / 7) * 100;
        const barColor = score >= 5 ? 'var(--color-success)' : score >= 4 ? 'var(--color-warning)' : 'var(--color-error)';
        return (
          <div key={cat} className="writing__correction-rubric-item">
            <div className="writing__correction-rubric-header">
              <span className="writing__correction-rubric-name">{labels[cat]} (7 marks)</span>
              <span className="writing__correction-rubric-score">{score}/7</span>
            </div>
            <div className="writing__correction-rubric-bar-bg">
              <div className="writing__correction-rubric-fill"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            {feedbacks?.[cat] && <div className="writing__correction-rubric-feedback">{feedbacks[cat]}</div>}
          </div>
        );
      })}
    </div>
  );
}
