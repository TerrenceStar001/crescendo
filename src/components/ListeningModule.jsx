import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import MCQQuestion from './MCQQuestion';
import { useSpeech } from '../hooks/useSpeech';
import { computeWeightedScore, computeSubScores, scoreToDseLevel } from '../utils/dseGrading';

export default function ListeningModule({ dsePapers, skillAnalytics, notes, onBack }) {
  const { speak, stop, isSpeaking, isPaused, pause, resume } = useSpeech();
  const [phase, setPhase] = useState('start');
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [results, setResults] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const progressRef = useRef(null);

  const questions = paper?.questions || [];
  const passages = paper?.passages || [];
  const passageText = passages[0]?.content?.replace(/<[^>]+>/g, '') || '';

  const startSession = useCallback(async (difficulty) => {
    setGenerating(true);
    try {
      let p = await dsePapers.getPaper('reading', { difficulty });
      if (!p) {
        p = await dsePapers.generateReadingSession({ difficulty, notes, questionCount: 6 }, async () => '');
      }
      if (p) {
        setPaper(p);
        setAnswers({});
        setCurrentQuestion(0);
        setResults(null);
        setTranscriptVisible(false);
        setPlaybackProgress(0);
        setPhase('listening');
      }
    } catch (e) {
      console.error('Failed to start listening session:', e);
    } finally {
      setGenerating(false);
    }
  }, [dsePapers, notes]);

  const handlePlay = useCallback(() => {
    if (!passageText) return;
    speak(passageText, { rate: 0.85, onEnd: () => setPhase('answering') });
  }, [passageText, speak]);

  const handlePause = useCallback(() => {
    if (isPaused) resume();
    else pause();
  }, [isPaused, resume, pause]);

  const handleStop = useCallback(() => {
    stop();
    if (phase === 'listening') setPhase('answering');
  }, [stop, phase]);

  const handleReplay = useCallback(() => {
    stop();
    speak(passageText, { rate: 0.85, onEnd: () => setPhase('answering') });
  }, [passageText, speak, stop]);

  useEffect(() => {
    if (phase === 'listening' && isSpeaking) {
      progressRef.current = setInterval(() => {
        setPlaybackProgress(p => Math.min(1, p + 0.02));
      }, 200);
    } else {
      clearInterval(progressRef.current);
    }
    return () => clearInterval(progressRef.current);
  }, [phase, isSpeaking]);

  const handleAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const finishSession = useCallback(() => {
    stop();
    if (!paper) return;
    const score = questions.reduce((s, q) => s + (answers[q.id] === q.correctAnswer ? 1 : 0), 0);
    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const weighted = computeWeightedScore(questions, answers, 'listening');
    const subScores = computeSubScores('listening', questions, answers);

    const sessionData = {
      skill: 'listening',
      type: 'practice',
      paperId: paper.id,
      score,
      totalQuestions: total,
      percentage: weighted,
      subScores,
      questions: questions.map(q => ({
        id: q.id, type: q.type, questionType: q.questionType,
        stem: q.stem, options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: answers[q.id] || null,
        isCorrect: answers[q.id] === q.correctAnswer,
        timeSpent: 0,
      })),
      duration: 0,
      dseLevel: scoreToDseLevel(weighted, 'listening').level,
    };

    setResults(sessionData);
    skillAnalytics?.recordSession(sessionData);
    setPhase('results');
  }, [paper, questions, answers, stop, skillAnalytics]);

  if (phase === 'start') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={onBack}>← Dashboard</button>
          <h1 className="dse-module__title">🎧 Listening Practice</h1>
          <p className="dse-module__subtitle">Practice DSE-style listening with TTS-read passages and comprehension questions</p>
        </div>
        <div className="reading__start">
          <div className="reading__difficulty-cards">
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className="reading__difficulty-card" onClick={() => startSession(d)} disabled={generating}>
                <span className="reading__difficulty-icon">{d === 'easy' ? '🌱' : d === 'medium' ? '🔥' : '💎'}</span>
                <span className="reading__difficulty-name">{d === 'easy' ? 'Easy (Slow)' : d === 'medium' ? 'Medium (Normal)' : 'Hard (Fast)'}</span>
                <span className="reading__difficulty-desc">{d === 'easy' ? 'Simple passages, slow TTS' : d === 'medium' ? 'DSE standard speed' : 'Challenging, fast TTS'}</span>
              </button>
            ))}
          </div>
          {generating && <div className="reading__generating">Preparing your listening session...</div>}
        </div>
      </div>
    );
  }

  if (phase === 'listening' || phase === 'answering') {
    const allAnswered = Object.keys(answers).length >= questions.length;

    return (
      <div className="dse-module">
        <div className="dse-module__header" style={{ paddingBottom: 0 }}>
          <div className="reading__progress-header">
            <button className="dse-module__back" onClick={() => { stop(); setPhase('start'); setPaper(null); }}>← Back</button>
            <h2 className="reading__passage-title" style={{ margin: 0 }}>
              {passages[0]?.title || 'Listening Passage'}
              {paper?.metadata?.ragGenerated && <span className="reading__source-badge">RAG</span>}
            </h2>
          </div>
        </div>
        <div className="listening__body">
          <div className="listening__player">
            <div className="listening__controls">
              {phase === 'listening' && !isSpeaking && (
                <button className="listening__control-btn listening__control-btn--primary" onClick={handlePlay}>▶ Play</button>
              )}
              {phase === 'listening' && isSpeaking && (
                <button className="listening__control-btn" onClick={handlePause}>{isPaused ? '▶ Resume' : '⏸ Pause'}</button>
              )}
              {phase === 'listening' && (
                <button className="listening__control-btn" onClick={handleStop}>⏹ Stop</button>
              )}
              {phase === 'answering' && (
                <button className="listening__control-btn" onClick={handleReplay}>🔄 Play Again</button>
              )}
              <button className="listening__control-btn" onClick={() => setTranscriptVisible(v => !v)}>
                {transcriptVisible ? 'Hide' : 'Show'} Transcript
              </button>
            </div>
            {isSpeaking && (
              <div className="listening__progress-bar">
                <div className="listening__progress-fill" style={{ width: `${playbackProgress * 100}%` }} />
              </div>
            )}
          </div>

          {transcriptVisible && (
            <div className="listening__transcript">
              <div dangerouslySetInnerHTML={{ __html: passages[0]?.content || '' }} />
            </div>
          )}

          {phase === 'answering' && (
            <div className="listening__questions">
              <div className="reading__questions-nav">
                {questions.map((q, i) => (
                  <button key={q.id}
                    className={`reading__q-nav-btn${i === currentQuestion ? ' reading__q-nav-btn--active' : ''}${answers[q.id] ? ' reading__q-nav-btn--answered' : ''}`}
                    onClick={() => setCurrentQuestion(i)}>{i + 1}</button>
                ))}
              </div>
              <div className="reading__question-wrap">
                <MCQQuestion
                  question={{ ...questions[currentQuestion], number: currentQuestion + 1 }}
                  selectedAnswer={answers[questions[currentQuestion]?.id] || null}
                  onSelect={handleAnswer}
                  showResult={false}
                  disabled={false}
                />
              </div>
              <div className="reading__q-actions">
                <button className="reading__q-btn" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(i => i - 1)}>← Previous</button>
                <div className="reading__q-progress">{Object.keys(answers).length}/{questions.length} answered</div>
                {currentQuestion < questions.length - 1 ? (
                  <button className="reading__q-btn reading__q-btn--primary" onClick={() => setCurrentQuestion(i => i + 1)}>Next →</button>
                ) : (
                  <button className="reading__q-btn reading__q-btn--primary" onClick={finishSession} disabled={!allAnswered}>
                    {allAnswered ? 'Submit All' : `Submit (${questions.length - Object.keys(answers).length} unanswered)`}
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === 'listening' && (
            <div className="listening__waiting">
              <p>Listen to the passage, then answer the questions.</p>
              <p className="listening__waiting-hint">Click <strong>Stop</strong> or wait for playback to end to proceed.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    if (!results) return null;
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => { setPhase('start'); setPaper(null); }}>← Back</button>
          <h1 className="dse-module__title">📊 Listening Results</h1>
        </div>
        <div className="reading__results">
          <div className="reading__results-summary">
            <div className="reading__results-ring" style={{ '--pct': results.percentage, '--color': results.percentage >= 80 ? 'var(--color-success)' : results.percentage >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}>
              <svg viewBox="0 0 36 36" className="reading__results-svg">
                <path className="reading__results-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="reading__results-fill" strokeDasharray={`${results.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.5" className="reading__results-text" textAnchor="middle">{results.percentage}%</text>
              </svg>
            </div>
            <div className="reading__results-stats">
              <div className="reading__results-stat">
                <span className="reading__results-stat-value">{results.score}/{results.totalQuestions}</span>
                <span className="reading__results-stat-label">Correct</span>
              </div>
              <div className="reading__results-stat">
                <span className="reading__results-stat-value" style={{ color: `var(--color-${results.percentage >= 80 ? 'success' : results.percentage >= 60 ? 'warning' : 'error'})` }}>{results.dseLevel}</span>
                <span className="reading__results-stat-label">DSE Level</span>
              </div>
            </div>
          </div>
          {results.subScores && Object.keys(results.subScores).length > 0 && (
            <div className="reading__results-subscores">
              <h3>Breakdown by Question Type</h3>
              {Object.entries(results.subScores).map(([type, score]) => (
                <div key={type} className="reading__results-subscore">
                  <span className="reading__results-subscore-label">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="reading__results-subscore-bar-bg">
                    <div className="reading__results-subscore-bar-fill" style={{ width: `${score}%`, background: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }} />
                  </div>
                  <span className="reading__results-subscore-value">{score}%</span>
                </div>
              ))}
            </div>
          )}
          <div className="reading__results-review">
            <h3>Review Questions</h3>
            {questions.map((q, i) => {
              const ua = answers[q.id];
              const isCorrect = ua === q.correctAnswer;
              return (
                <div key={q.id} className={`reading__results-review-item ${isCorrect ? '' : 'reading__results-review-item--wrong'}`}>
                  <div className="reading__results-review-header">
                    <span className={`reading__results-review-status ${isCorrect ? 'reading__results-review-status--correct' : 'reading__results-review-status--wrong'}`}>{isCorrect ? '✓' : '✗'}</span>
                    <span className="reading__results-review-q">Q{i + 1}. {q.stem}</span>
                  </div>
                  <div className="reading__results-review-answers">
                    <span>Your answer: <strong>{ua || '—'}</strong></span>
                    {!isCorrect && <span>Correct: <strong style={{ color: 'var(--color-success)' }}>{q.correctAnswer}</strong></span>}
                  </div>
                  {q.explanation && <div className="reading__results-review-explanation">{q.explanation}</div>}
                </div>
              );
            })}
          </div>
          <div className="reading__results-actions">
            <button className="reading__results-btn" onClick={() => { setPhase('start'); setPaper(null); }}>← Back to Listening</button>
            <button className="reading__results-btn reading__results-btn--primary" onClick={() => startSession(paper?.difficulty || 'medium')}>🔄 Practice Again</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
