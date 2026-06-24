import React from 'react';

const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  'gap-fill': 'Fill in the Blank',
  tfng: 'True / False / Not Given',
  'short-answer': 'Short Answer',
  matching: 'Matching',
  'open-ended': 'Open-ended',
  'summary-cloze': 'Summary Cloze',
  'pronoun-ref': 'Reference Question',
  'semantic-connect': 'Semantic Matching',
};

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const lines = raw.split('\n').filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      const m = line.match(/^\s*([A-D])[.)]\s*(.+)/);
      if (m) parsed.push({ label: m[1], text: m[2].trim() });
    }
    if (parsed.length >= 2) return parsed;
  }
  return [];
}

function MCQInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, correctAnswer, explanation } = question;
  const options = parseOptions(question.options);
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      <div className="mcq__options">
        {(options || []).map((opt) => {
          const isSelected = value === opt.label;
          const isCorrect = showResult && opt.label === correctAnswer;
          const isWrong = showResult && isSelected && opt.label !== correctAnswer;
          let className = 'mcq__option';
          if (isSelected && !showResult) className += ' mcq__option--selected';
          if (isCorrect && showResult) className += ' mcq__option--correct';
          if (isWrong) className += ' mcq__option--wrong';
          return (
            <button key={opt.label} className={className}
              onClick={() => !disabled && !showResult && onSelect(id, opt.label)}
              disabled={disabled || showResult}
            >
              <span className="mcq__option-key">{opt.label}</span>
              <span className="mcq__option-text">{opt.text}</span>
              {isCorrect && showResult && <span className="mcq__option-icon">{'\u2713'}</span>}
              {isWrong && <span className="mcq__option-icon">{'\u2717'}</span>}
            </button>
          );
        })}
      </div>
      {showResult && explanation && (
        <div className={`mcq__explanation ${value === correctAnswer ? 'mcq__explanation--correct' : 'mcq__explanation--wrong'}`}>
          <span className="mcq__explanation-icon">{value === correctAnswer ? '\uD83D\uDCA1' : '\uD83D\uDCD6'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function GapFillInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, correctAnswer, answers, explanation } = question;

  if (answers && answers.length > 1) {
    const val = value || {};
    const allCorrect = showResult && answers.every((a, i) => String(val[i] || '').toLowerCase().trim() === a.toLowerCase().trim());
    return (
      <>
        <p className="mcq__stem">{stem}</p>
        <div className="gf__blanks">
          {answers.map((a, i) => {
            const userAns = String(val[i] || '');
            const isCorrect = showResult && userAns.toLowerCase().trim() === a.toLowerCase().trim();
            return (
              <div key={i} className="gf__blank-row">
                <span className="gf__blank-number">{i + 1}.</span>
                <input type="text" className={`gf__input${showResult ? (isCorrect ? ' gf__input--correct' : ' gf__input--wrong') : ''}`}
                  placeholder={`Blank ${i + 1}...`}
                  value={userAns}
                  onChange={e => onSelect(id, { ...val, [i]: e.target.value })}
                  disabled={disabled || showResult}
                />
                {showResult && !isCorrect && (
                  <span className="gf__correct-answer">→ {a}</span>
                )}
              </div>
            );
          })}
        </div>
        {showResult && !allCorrect && (
          <div className="mcq__explanation mcq__explanation--wrong">
            <span className="mcq__explanation-icon">{'\uD83D\uDCD6'}</span>
            <span>Correct answers: {correctAnswer}</span>
          </div>
        )}
        {showResult && explanation && (
          <div className={`mcq__explanation ${allCorrect ? 'mcq__explanation--correct' : 'mcq__explanation--wrong'}`}>
            <span className="mcq__explanation-icon">{allCorrect ? '\uD83D\uDCA1' : '\uD83D\uDCD6'}</span>
            <span>{explanation}</span>
          </div>
        )}
      </>
    );
  }

  const isCorrect = showResult && value?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      <div className="gf__input-row">
        <input type="text" className={`gf__input${showResult ? (isCorrect ? ' gf__input--correct' : ' gf__input--wrong') : ''}`}
          placeholder="Type your answer..."
          value={value || ''}
          onChange={e => onSelect(id, e.target.value)}
          disabled={disabled || showResult}
        />
        {showResult && !isCorrect && value && (
          <span className="gf__correct-answer">Correct: {correctAnswer}</span>
        )}
      </div>
      {showResult && explanation && (
        <div className={`mcq__explanation ${isCorrect ? 'mcq__explanation--correct' : 'mcq__explanation--wrong'}`}>
          <span className="mcq__explanation-icon">{isCorrect ? '\uD83D\uDCA1' : '\uD83D\uDCD6'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function TFNGInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, correctAnswer, explanation } = question;
  const choices = ['True', 'False', 'Not Given'];
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      <div className="mcq__options tfng__options">
        {choices.map(choice => {
          const isSelected = value === choice;
          const isCorrect = showResult && choice === correctAnswer;
          const isWrong = showResult && isSelected && choice !== correctAnswer;
          let className = 'mcq__option tfng__option';
          if (isSelected && !showResult) className += ' mcq__option--selected';
          if (isCorrect && showResult) className += ' mcq__option--correct';
          if (isWrong) className += ' mcq__option--wrong';
          return (
            <button key={choice} className={className}
              onClick={() => !disabled && !showResult && onSelect(id, choice)}
              disabled={disabled || showResult}
            >
              <span className="mcq__option-key">{choice[0]}</span>
              <span className="mcq__option-text">{choice}</span>
            </button>
          );
        })}
      </div>
      {showResult && explanation && (
        <div className={`mcq__explanation ${value === correctAnswer ? 'mcq__explanation--correct' : 'mcq__explanation--wrong'}`}>
          <span className="mcq__explanation-icon">{value === correctAnswer ? '\uD83D\uDCA1' : '\uD83D\uDCD6'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function ShortAnswerInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, correctAnswer, wordLimit, explanation } = question;
  const wc = (value || '').split(/\s+/).filter(Boolean).length;
  const overLimit = wordLimit && wc > wordLimit;
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      {wordLimit && <div className="sa__word-limit">Word limit: {wordLimit} words</div>}
      <textarea className={`sa__textarea${showResult ? (value ? ' sa__textarea--answered' : '') : ''}`}
        placeholder="Type your answer..."
        value={value || ''}
        onChange={e => onSelect(id, e.target.value)}
        disabled={disabled || showResult}
        rows={3}
      />
      <div className="sa__counter" style={{ color: overLimit ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
        {wc} / {wordLimit || '\u221E'} words
      </div>
      {showResult && correctAnswer && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span className="mcq__explanation-icon">{'\uD83D\uDCD6'}</span>
          <span>Suggested answer: {correctAnswer}</span>
        </div>
      )}
      {showResult && explanation && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function MatchingInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, pairs, options, correctAnswer, explanation } = question;
  const answers = value || {};
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      <div className="matching__grid">
        {(pairs || []).map(p => (
          <div key={p.item} className="matching__row">
            <span className="matching__item">{p.item}</span>
            <select className="matching__select"
              value={answers[p.item] || ''}
              onChange={e => onSelect(id, { ...answers, [p.item]: e.target.value })}
              disabled={disabled || showResult}
            >
              <option value="">—</option>
              {(options || []).map(o => (
                <option key={o.label} value={o.label}>{o.label}. {o.text}</option>
              ))}
            </select>
            {showResult && (
              <span style={{ marginLeft: 8, fontSize: '0.8rem', color: answers[p.item] === p.match ? 'var(--color-success)' : 'var(--color-error)' }}>
                {answers[p.item] === p.match ? '\u2713' : '\u2717'} <span style={{ color: 'var(--color-text-muted)' }}>({p.match})</span>
              </span>
            )}
          </div>
        ))}
      </div>
      {showResult && explanation && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span className="mcq__explanation-icon">{'\uD83D\uDCA1'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function OpenEndedInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, wordLimit, explanation } = question;
  const wc = (value || '').split(/\s+/).filter(Boolean).length;
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      {wordLimit && <div className="sa__word-limit">Suggested length: {wordLimit} words</div>}
      <textarea className="sa__textarea"
        placeholder="Write your response..."
        value={value || ''}
        onChange={e => onSelect(id, e.target.value)}
        disabled={disabled || showResult}
        rows={5}
      />
      <div className="sa__counter" style={{ color: 'var(--color-text-muted)' }}>
        {wc} words
      </div>
      {showResult && explanation && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span className="mcq__explanation-icon">{'\uD83D\uDCA1'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function SummaryClozeInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, answers, correctAnswer, explanation } = question;
  // Inline summary cloze: split stem on {N} blank markers and interleave spans with inputs
  const blankPattern = /\{(\d+)\}/g;
  const parts = [];
  let lastIdx = 0;
  let match;
  while ((match = blankPattern.exec(stem)) !== null) {
    const before = stem.slice(lastIdx, match.index);
    if (before) parts.push({ type: 'text', value: before });
    parts.push({ type: 'blank', index: parseInt(match[1], 10) - 1 });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < stem.length) parts.push({ type: 'text', value: stem.slice(lastIdx) });

  const val = value || {};

  return (
    <>
      <div className="mcq__stem">
        {parts.map((part, i) => {
          if (part.type === 'text') return <span key={i}>{part.value}</span>;
          const idx = part.index;
          const userAns = String(val[idx] || '');
          const answerKey = answers && answers[idx] ? answers[idx] : '';
          const isCorrect = showResult && userAns.toLowerCase().trim() === answerKey.toLowerCase().trim();
          return (
            <span key={i} className="gf__blank-row" style={{ display: 'inline', margin: '0 2px' }}>
              <input type="text" className={`gf__input${showResult ? (isCorrect ? ' gf__input--correct' : ' gf__input--wrong') : ''}`}
                style={{ width: 80, display: 'inline' }}
                placeholder={`${idx + 1}...`}
                value={userAns}
                onChange={e => onSelect(id, { ...val, [idx]: e.target.value })}
                disabled={disabled || showResult}
              />
              {showResult && !isCorrect && (
                <span className="gf__correct-answer" style={{ fontSize: '0.75rem' }}>→ {answerKey}</span>
              )}
            </span>
          );
        })}
      </div>
      {showResult && explanation && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span className="mcq__explanation-icon">{'\uD83D\uDCA1'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function PronounRefInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, options, correctAnswer, explanation } = question;

  if (options && Array.isArray(options) && options.length > 0) {
    // MCQ-style rendering with options
    const parsed = parseOptions(options);
    return (
      <>
        <p className="mcq__stem">{stem}</p>
        <div className="mcq__options">
          {(parsed.length > 0 ? parsed : options).map((opt, i) => {
            const optLabel = opt.label || String.fromCharCode(65 + i);
            const optText = opt.text || opt;
            const isSelected = value === optLabel;
            const isCorrect = showResult && optLabel === correctAnswer;
            const isWrong = showResult && isSelected && optLabel !== correctAnswer;
            let className = 'mcq__option';
            if (isSelected && !showResult) className += ' mcq__option--selected';
            if (isCorrect && showResult) className += ' mcq__option--correct';
            if (isWrong) className += ' mcq__option--wrong';
            return (
              <button key={optLabel} className={className}
                onClick={() => !disabled && !showResult && onSelect(id, optLabel)}
                disabled={disabled || showResult}
              >
                <span className="mcq__option-key">{optLabel}</span>
                <span className="mcq__option-text">{optText}</span>
                {isCorrect && showResult && <span className="mcq__option-icon">{'\u2713'}</span>}
                {isWrong && <span className="mcq__option-icon">{'\u2717'}</span>}
              </button>
            );
          })}
        </div>
        {showResult && explanation && (
          <div className={`mcq__explanation ${value === correctAnswer ? 'mcq__explanation--correct' : 'mcq__explanation--wrong'}`}>
            <span className="mcq__explanation-icon">{value === correctAnswer ? '\uD83D\uDCA1' : '\uD83D\uDCD6'}</span>
            <span>{explanation}</span>
          </div>
        )}
      </>
    );
  }

  // No options provided — render as short-answer textarea
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      <textarea className="sa__textarea"
        placeholder="Type your answer..."
        value={value || ''}
        onChange={e => onSelect(id, e.target.value)}
        disabled={disabled || showResult}
        rows={2}
      />
      {showResult && correctAnswer && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span className="mcq__explanation-icon">{'\uD83D\uDCD6'}</span>
          <span>Answer: {correctAnswer}</span>
        </div>
      )}
      {showResult && explanation && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

function SemanticConnectInput({ question, value, onSelect, showResult, disabled }) {
  const { id, stem, pairs, options, correctAnswer, explanation } = question;
  const answers = value || {};
  return (
    <>
      <p className="mcq__stem">{stem}</p>
      <div className="matching__grid" style={{ marginTop: 8 }}>
        <div className="matching__row" style={{ fontWeight: 'bold', borderBottom: '1px solid var(--color-border)' }}>
          <span className="matching__item">Cause / Claim</span>
          <select className="matching__select" disabled style={{ opacity: 1 }}>
            <option>Effect / Evidence</option>
          </select>
        </div>
        {(pairs || []).map((p, i) => (
          <div key={p.item || i} className="matching__row">
            <span className="matching__item">{p.item}</span>
            <select className="matching__select"
              value={answers[p.item] || ''}
              onChange={e => onSelect(id, { ...answers, [p.item]: e.target.value })}
              disabled={disabled || showResult}
            >
              <option value="">—</option>
              {(options || []).map(o => (
                <option key={o.label} value={o.label}>{o.label}. {o.text}</option>
              ))}
            </select>
            {showResult && (
              <span style={{ marginLeft: 8, fontSize: '0.8rem', color: answers[p.item] === p.match ? 'var(--color-success)' : 'var(--color-error)' }}>
                {answers[p.item] === p.match ? '\u2713' : '\u2717'} <span style={{ color: 'var(--color-text-muted)' }}>({p.match})</span>
              </span>
            )}
          </div>
        ))}
      </div>
      {showResult && explanation && (
        <div className="mcq__explanation mcq__explanation--correct">
          <span className="mcq__explanation-icon">{'\uD83D\uDCA1'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </>
  );
}

export default function QuestionRenderer({ question, value, onSelect, showResult, disabled, number }) {
  if (!question) return null;
  const q = { ...question, number };
  const type = q.type || 'mcq';

  let input;
  switch (type) {
    case 'gap-fill': input = <GapFillInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'tfng': input = <TFNGInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'short-answer': input = <ShortAnswerInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'matching': input = <MatchingInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'open-ended': input = <OpenEndedInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'summary-cloze': input = <SummaryClozeInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'pronoun-ref': input = <PronounRefInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    case 'semantic-connect': input = <SemanticConnectInput {...{ question: q, value, onSelect, showResult, disabled }} />; break;
    default: input = <MCQInput {...{ question: q, value, onSelect, showResult, disabled }} />;
  }

  return (
    <div className="mcq">
      <div className="mcq__header">
        <span className={`mcq__type mcq__type--${type}`}>
          {TYPE_LABELS[type] || 'Question'}
        </span>
        <span className="mcq__number">Question {number || '\u2014'}</span>
        {q.marks && <span className="mcq__marks">[{q.marks} mark{q.marks > 1 ? 's' : ''}]</span>}
      </div>
      {input}
    </div>
  );
}

export function isQuestionCorrect(question, answer) {
  if (answer === null || answer === undefined || answer === '') return false;
  switch (question.type) {
    case 'mcq':
      return answer === question.correctAnswer;
    case 'tfng': {
      const norm = { 'true': 'T', 'false': 'F', 'not given': 'NG', 't': 'T', 'f': 'F', 'ng': 'NG' };
      return (norm[(answer || '').toLowerCase()] || answer) === (norm[(question.correctAnswer || '').toLowerCase()] || question.correctAnswer);
    }
    case 'gap-fill': {
      if (question.answers && Array.isArray(question.answers)) {
        if (!answer || typeof answer !== 'object') return false;
        return question.answers.every((a, i) => String(answer[i] || '').toLowerCase().trim() === a.toLowerCase().trim());
      }
      return answer.toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
    }
    case 'matching': {
      if (!answer || typeof answer !== 'object') return false;
      const pairs = question.pairs || [];
      const correct = pairs.every(p => answer[p.item] === p.match);
      return correct;
    }
    case 'short-answer': {
      const userText = (answer || '').trim();
      if (!userText) return false;
      const correct = (question.correctAnswer || '').trim();
      if (!correct) return userText.length > 0; // fallback if no answer key
      // Keyword matching: extract key terms from the correct answer
      const keyTerms = correct
        .toLowerCase()
        .split(/[,;/\s]+/)
        .filter(t => t.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'than', 'that', 'they', 'this', 'very', 'what', 'when', 'where', 'which', 'who', 'will', 'with', 'from', 'their', 'there', 'would', 'about', 'into', 'over', 'such', 'your'].includes(t));
      if (keyTerms.length === 0) return userText.length > 0;
      return keyTerms.some(term => userText.toLowerCase().includes(term));
    }
    case 'open-ended': {
      const userText = (answer || '').trim();
      if (!userText) return false;
      const correct = (question.correctAnswer || '').trim();
      if (!correct) return userText.length > 0;
      const keyTerms = correct
        .toLowerCase()
        .split(/[,;/\s]+/)
        .filter(t => t.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'than', 'that', 'they', 'this', 'very', 'what', 'when', 'where', 'which', 'who', 'will', 'with', 'from', 'their', 'there', 'would', 'about', 'into', 'over', 'such', 'your'].includes(t));
      if (keyTerms.length === 0) return userText.length > 0;
      return keyTerms.some(term => userText.toLowerCase().includes(term));
    }
    case 'summary-cloze': {
      if (question.answers && Array.isArray(question.answers)) {
        if (!answer || typeof answer !== 'object') return false;
        return question.answers.every((a, i) => String(answer[i] || '').toLowerCase().trim() === a.toLowerCase().trim());
      }
      return answer === question.correctAnswer;
    }
    case 'pronoun-ref': {
      return String(answer || '').toLowerCase().trim() === String(question.correctAnswer || '').toLowerCase().trim();
    }
    case 'semantic-connect': {
      if (!answer || typeof answer !== 'object') return false;
      const pairs = question.pairs || [];
      return pairs.every(p => answer[p.item] === p.match);
    }
    default:
      return answer === question.correctAnswer;
  }
}
