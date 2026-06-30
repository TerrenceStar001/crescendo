import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function TheVoid({
  note, studySession, onSubmitAnswer, onGenerateWithAI,
  onClose, onReviewComplete, onRecordSession, noteHistory,
  queueSize, queueIndex, onNextNote,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [sessionDone, setSessionDone] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [retryMode, setRetryMode] = useState(false);
  const [wrongIndices, setWrongIndices] = useState([]);
  const inputRef = useRef(null);
  const voidPanelRef = useRef(null);

  const questions = studySession?.questions || [];
  const resultsRef = useRef([]);
  const retryIndicesRef = useRef([]);

  const history = noteHistory || [];
  const lastSession = history[0];
  const bestSession = history.reduce((best, s) => !best || s.score > best.score ? s : best, null);

  useEffect(() => {
    if (!sessionDone && !feedback) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [currentIdx, sessionDone, feedback]);

  useEffect(() => {
    const el = voidPanelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function handleTab(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [sessionDone, feedback, currentIdx]);

  function handleKey(e) {
    if (e.key === 'Escape') {
      if (sessionDone) { onClose(); return; }
      if (feedback) { setFeedback(null); return; }
      onClose();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !feedback) {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === ' ' && feedback) {
      e.preventDefault();
      if (currentIdx >= questions.length - 1) {
        finishSession();
      } else {
        setFeedback(null);
        setCurrentIdx(i => i + 1);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      finishSession();
      return;
    }
    if (feedback && e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startRetry();
    }
  }

  function handleSubmit() {
    const trimmed = userAnswer.trim();
    if (!trimmed) return;
    const result = onSubmitAnswer(currentIdx, trimmed);
    resultsRef.current.push({
      ...questions[currentIdx],
      userAnswer: trimmed,
      correct: result.correct,
    });
    setFeedback(result);
    setUserAnswer('');
  }

  function handleOptionClick(option) {
    setUserAnswer(option);
    setTimeout(handleSubmit, 50);
  }

  function finishSession() {
    const results = resultsRef.current;
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const wrong = results.map((r, i) => (!r.correct ? i : -1)).filter(i => i >= 0);
    setWrongIndices(wrong);
    setSessionDone(true);
    onRecordSession?.(note?.id, note?.title);
    onReviewComplete?.(note?.id, correct, total);
  }

  function handleContinueToNext() {
    resetAndClose();
    onNextNote?.();
  }

  function resetAndClose() {
    setSessionDone(false);
    setCurrentIdx(0);
    setFeedback(null);
    setRetryMode(false);
    resultsRef.current = [];
    retryIndicesRef.current = [];
  }

  function startRetry() {
    if (wrongIndices.length === 0) return;
    setRetryMode(true);
    setSessionDone(false);
    setCurrentIdx(0);
    setFeedback(null);
    const retryQs = wrongIndices.map(i => questions[i]);
    resultsRef.current = [];
  }

  function handleRetrySubmit() {
    const targetIdx = wrongIndices; 
    const result = onSubmitAnswer(targetIdx[currentIdx], userAnswer.trim());
    resultsRef.current.push({
      ...questions[targetIdx[currentIdx]],
      userAnswer: userAnswer.trim(),
      correct: result.correct,
    });
    setFeedback(result);
    setUserAnswer('');
  }

  function handleRetryFinish() {
    setRetryMode(false);
    setSessionDone(true);
  }

  if (!note) {
    return (
      <div className="void-overlay" onKeyDown={handleKey}>
        <div className="void">
          <div className="void__header">
            <h3 className="void__title">The Void</h3>
            <button className="void__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="void__body">
            <div className="panel-empty">Select a note to study</div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="void-overlay" onClick={onClose} onKeyDown={handleKey}>
        <div className="void" onClick={e => e.stopPropagation()}>
          <div className="void__header">
            <h3 className="void__title">
              Studying:<span className="void__note-title">{note.title || 'Untitled'}</span>
            </h3>
            <button className="void__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="void__body">
            {history.length > 0 && <StudyHistory history={history} />}
            <div className="panel-empty" style={{ padding: 'var(--space-6) var(--space-4)' }}>
              <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
                No questions generated yet.
              </p>
              {studySession?.useAI && !generatingAI && (
                <button className="void__start-btn" onClick={async () => {
                  setGeneratingAI(true);
                  await onGenerateWithAI();
                  setGeneratingAI(false);
                }}>
                  Generate AI Questions
                </button>
              )}
              {generatingAI && (
                <p style={{ color: 'var(--color-text-muted)' }}>Generating questions...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    const results = resultsRef.current;
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const wrongTerms = results.filter(r => !r.correct).map(r => r.answer).filter(Boolean, (v, i, a) => a.indexOf(v) === i);
    const suggestDays = pct >= 100 ? 7 : pct >= 80 ? 3 : 1;

    const hasMore = onNextNote && queueSize > 0 && (queueIndex || 0) < (queueSize || 1) - 1;

    return (
      <div className="void-overlay" onClick={onClose} onKeyDown={handleKey}>
        <div className="void" onClick={e => e.stopPropagation()}>
          <div className="void__header">
            <h3 className="void__title">Session Complete</h3>
            {queueSize > 0 && (
              <span className="void__queue-badge">Note {(queueIndex || 0) + 1} of {queueSize}</span>
            )}
            <button className="void__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="void__body">
            <div className="void__score">
              <span className="void__score-pct" style={{
                color: pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-error)',
              }}>{pct}%</span>
              <span className="void__score-detail">{correct} / {total} correct</span>
              <span className="void__score-next">Next review in {suggestDays} day{suggestDays > 1 ? 's' : ''}</span>
            </div>

            {wrongTerms.length > 0 && (
              <div className="void__wrong-terms">
                <h4 className="void__wrong-title">Terms to review</h4>
                <div className="void__wrong-list">
                  {wrongTerms.map((t, i) => (
                    <span key={i} className="void__wrong-term">{t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="void__review-list">
              {results.map((r, i) => (
                <div key={i} className={`void__review-item ${r.correct ? 'void__review-item--correct' : 'void__review-item--wrong'}`}>
                  <span className="void__review-icon">{r.correct ? '✅' : '❌'}</span>
                  <div className="void__review-body">
                    <p className="void__review-question">
                      {r.type === 'cloze' ? r.sentence : r.question}
                    </p>
                    <p className="void__review-feedback">
                      {r.correct ? 'Correct!' : `The answer was: ${r.answer}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="void__actions">
              {wrongIndices.length > 0 && (
                <button className="void__retry-btn" onClick={startRetry}>
                  🔄 Retry {wrongIndices.length} wrong
                </button>
              )}
              {hasMore ? (
                <button className="void__start-btn" onClick={handleContinueToNext}>
                  Continue to Next Note ▶ <span className="void__shortcut-hint">Space</span>
                </button>
              ) : (
                <button className="void__start-btn" onClick={onClose}>
                  Close <span className="void__shortcut-hint">Esc</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="void-overlay" onClick={onClose} onKeyDown={handleKey}>
        <div className="void" onClick={e => e.stopPropagation()}>
          <div className="void__header">
            <h3 className="void__title">
              Studying:<span className="void__note-title">{note.title || 'Untitled'}</span>
            </h3>
            <button className="void__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="void__progress">
            <div className="void__progress-bar">
              <div className="void__progress-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
            </div>
            <span className="void__progress-text">{currentIdx + 1} / {questions.length}</span>
            <span className="void__progress-shortcut"><kbd>Space</kbd></span>
          </div>
          <div className="void__body">
            <div className={`void__feedback ${feedback.correct ? 'void__feedback--correct' : 'void__feedback--wrong'}`}>
              <span className="void__feedback-icon">{feedback.correct ? '✅' : '❌'}</span>
              <span className="void__feedback-text">{feedback.feedback}</span>
            </div>
            <div className="void__actions">
              <button
                className="void__start-btn"
                autoFocus
                onClick={() => {
                  if (currentIdx >= questions.length - 1) {
                    finishSession();
                  } else {
                    setFeedback(null);
                    setCurrentIdx(i => i + 1);
                  }
                }}
              >
                {currentIdx >= questions.length - 1 ? 'See Results' : 'Next Question'} <span className="void__shortcut-hint">Space</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const isMultiChoice = q.options?.length > 1;

  return (
    <div className="void-overlay" onClick={onClose} onKeyDown={handleKey}>
      <div className="void" ref={voidPanelRef} onClick={e => e.stopPropagation()}>
        <div className="void__header">
          <h3 className="void__title">
            Studying:<span className="void__note-title">{note.title || 'Untitled'}</span>
          </h3>
          {queueSize > 0 && (
            <span className="void__queue-badge">{(queueIndex || 0) + 1}/{queueSize}</span>
          )}
          {history.length > 0 && (
            <span className="void__history-badge" title={`Last: ${lastSession?.score || '?'}% | Best: ${bestSession?.score || '?'}% | ${history.length} sessions`}>
              📊 {history.length}
            </span>
          )}
          <button className="void__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="void__progress">
          <div className="void__progress-bar">
            <div className="void__progress-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>
          <span className="void__progress-text">{currentIdx + 1} / {questions.length}</span>
          <span className="void__progress-shortcut"><kbd>Enter</kbd></span>
        </div>
        <div className="void__body">
          {q.type === 'cloze' ? (
            <>
              <p className="void__prompt">{q.question || 'Fill in the blank:'}</p>
              <p className="void__sentence">{q.sentence}</p>
            </>
          ) : (
            <p className="void__prompt">{q.question}</p>
          )}

          {isMultiChoice ? (
            <div className="void__options">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`void__option ${userAnswer === opt ? 'void__option--selected' : ''}`}
                  onClick={() => handleOptionClick(opt)}
                >
                  <span className="void__option-key">{i + 1}</span>
                  <span className="void__option-text">{opt}</span>
                </button>
              ))}
              <div className="void__input-row" style={{ marginTop: 12 }}>
                <input
                  ref={inputRef}
                  className="void__input"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Type your answer or click an option..."
                />
                <button
                  className="void__submit"
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="void__input-row">
              <input
                ref={inputRef}
                className="void__input"
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
              />
              <button
                className="void__submit"
                onClick={handleSubmit}
                disabled={!userAnswer.trim()}
              >
                Submit
              </button>
            </div>
          )}
          <div className="void__shortcuts-hint">
            <kbd>Enter</kbd> Submit &middot; <kbd>Esc</kbd> Close &middot; <kbd>1</kbd>-<kbd>4</kbd> Select &middot; <kbd>Ctrl+Enter</kbd> End
          </div>
        </div>
      </div>
    </div>
  );
}

function StudyHistory({ history }) {
  return (
    <div className="void__history">
      {history.slice(0, 5).map(s => (
        <div key={s.id} className="void__history-item">
          <span className={`void__history-score ${s.score >= 80 ? 'void__history-score--good' : s.score >= 60 ? 'void__history-score--ok' : 'void__history-score--bad'}`}>
            {s.score}%
          </span>
          <span className="void__history-detail">{s.correct}/{s.total}</span>
          <span className="void__history-date">{new Date(s.date).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}
