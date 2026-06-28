import React from 'react';

export default function FormatChecker({ checks, textType }) {
  if (!checks) return null;

  const items = [
    { label: 'Salutation', passed: checks.hasSalutation },
    { label: 'Closing Formula', passed: checks.hasClosingFormula ?? checks.hasClosing },
    { label: 'Signature/Name', passed: checks.hasSignature },
  ].filter(item => item.passed !== undefined);

  if (items.length === 0 && !checks.hasFormatIssues) return null;

  return (
    <div className="format-checker">
      <h3 className="format-checker__header">Format Check{textType ? ` — ${textType}` : ''}</h3>
      <div className="format-checker__list">
        {items.map(item => (
          <div key={item.label}
            className={`format-checker__item ${item.passed ? 'format-checker__item--pass' : 'format-checker__item--fail'}`}
          >
            <span className="format-checker__icon">{item.passed ? '\u2713' : '\u2717'}</span>
            <span className="format-checker__label">{item.label}</span>
          </div>
        ))}
      </div>
      {checks.hasFormatIssues && checks.formatIssues?.length > 0 && (
        <div className="format-checker__issues">
          <p className="format-checker__issues-title">Issues Found:</p>
          <ul className="format-checker__issues-list">
            {checks.formatIssues.map((issue, i) => (
              <li key={i} className="format-checker__issue">{issue}</li>
            ))}
          </ul>
        </div>
      )}
      {checks.hasNoPrompt && (
        <div className="format-checker__no-prompt">No prompt provided — format check limited</div>
      )}
    </div>
  );
}
