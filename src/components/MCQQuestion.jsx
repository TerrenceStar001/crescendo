import React from 'react';

const TYPE_LABELS = {
  mainIdea: 'Main Idea',
  inference: 'Inference',
  vocabInContext: 'Vocabulary',
  detail: 'Detail',
  tone: 'Tone',
  purpose: 'Purpose',
};

export default function MCQQuestion({ question, selectedAnswer, onSelect, showResult, correctAnswer, disabled }) {
  if (!question) return null;

  const { id, stem, options, type, explanation } = question;

  return (
    <div className="mcq">
      <div className="mcq__header">
        <span className={`mcq__type mcq__type--${type || 'general'}`}>
          {TYPE_LABELS[type] || 'Question'}
        </span>
        <span className="mcq__number">Question {question.number || '—'}</span>
      </div>
      <p className="mcq__stem">{stem}</p>
      <div className="mcq__options">
        {(options || []).map((opt) => {
          const isSelected = selectedAnswer === opt.label;
          const isCorrect = showResult && opt.label === correctAnswer;
          const isWrong = showResult && isSelected && opt.label !== correctAnswer;

          let className = 'mcq__option';
          if (isSelected && !showResult) className += ' mcq__option--selected';
          if (isCorrect && showResult) className += ' mcq__option--correct';
          if (isWrong) className += ' mcq__option--wrong';

          return (
            <button
              key={opt.label}
              className={className}
              onClick={() => !disabled && !showResult && onSelect?.(id, opt.label)}
              disabled={disabled || showResult}
              aria-label={`Option ${opt.label}: ${opt.text}`}
            >
              <span className="mcq__option-key">{opt.label}</span>
              <span className="mcq__option-text">{opt.text}</span>
              {isCorrect && showResult && <span className="mcq__option-icon">✓</span>}
              {isWrong && <span className="mcq__option-icon">✗</span>}
            </button>
          );
        })}
      </div>
      {showResult && explanation && (
        <div className={`mcq__explanation ${selectedAnswer === correctAnswer ? 'mcq__explanation--correct' : 'mcq__explanation--wrong'}`}>
          <span className="mcq__explanation-icon">{selectedAnswer === correctAnswer ? '💡' : '📖'}</span>
          <span>{explanation}</span>
        </div>
      )}
    </div>
  );
}
