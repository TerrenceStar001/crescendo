import React from 'react';
import { PART_A_FORMAT_RULES } from '../utils/formatConventions';

const CHECK_TO_LABEL = {
  hasSalutation: 'Salutation',
  hasClosing: 'Closing Formula',
  hasClosingFormula: 'Closing Formula',
  hasSignature: 'Signature/Name',
  hasSubject: 'Subject Line',
  hasTitle: 'Title/Heading',
};

const ELEMENT_TO_CHECK = {
  salutation: 'hasSalutation',
  closing_formula: 'hasClosing',
  signature: 'hasSignature',
  subject_line: 'hasSubject',
  title: 'hasTitle',
  sign_off: 'hasClosing',
};

export default function FormatChecker({ checks, textType }) {
  if (!checks) return null;

  const rules = textType ? PART_A_FORMAT_RULES[textType] : null;
  let items = [];

  if (rules) {
    for (const element of rules.requiredElements) {
      const checkKey = ELEMENT_TO_CHECK[element];
      if (checkKey && checkKey in checks) {
        items.push({
          label: CHECK_TO_LABEL[checkKey] || element,
          passed: checks[checkKey],
        });
      }
    }
  }

  // Only show format checks for known text types with required elements
  if (!rules || rules.requiredElements.length === 0) {
    if (!checks.hasFormatIssues) return null;
  }

  if (items.length === 0 && !checks.hasFormatIssues) return null;

  return (
    <div className="format-checker">
      <h3 className="format-checker__header">Format Check{textType ? ` — ${textType}` : ''}</h3>
      <div className="format-checker__list">
        {items.map((item, i) => (
          <div key={i}
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
