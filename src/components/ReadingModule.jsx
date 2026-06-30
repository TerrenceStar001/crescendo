import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import QuestionRenderer from './QuestionRenderer';
import { computeWeightedScore, computeSubScores, scoreToDseLevel, isQuestionCorrect } from '../utils/dseGrading';
import { computeScore } from '../utils/answerChecking';
import ReadingResults from './ReadingResults';
import PostTaskSuggestion from './PostTaskSuggestion';

export default function ReadingModule({ dsePapers, skillAnalytics, callAI, notes, createNote, onBack, onGetCourseRecommendations, onEnrollCourse, onBrowseCourses }) {
  const [phase, setPhase] = useState('start');
  const [paper, setPaper] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [results, setResults] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [answerFlags, setAnswerFlags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crescendo-answer-reports') || '{}'); }
    catch { return {}; }
  });
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [reviewSession, setReviewSession] = useState(null);
  const [notesGenerated, setNotesGenerated] = useState(null);
  const timerRef = useRef(null);
  const questionStartRef = useRef(Date.now());
  const questionTimersRef = useRef({});
  const notesGenDataRef = useRef(null);

  const [courseRecommendations, setCourseRecommendations] = useState([]);
  const [showCourseSuggestion, setShowCourseSuggestion] = useState(false);

  // Load course recommendations when entering results phase
  useEffect(() => {
    if (phase === 'results' && results && onGetCourseRecommendations) {
      onGetCourseRecommendations().then(recs => {
        if (recs?.length > 0) {
          setCourseRecommendations(recs);
          setShowCourseSuggestion(true);
        }
      }).catch(() => {});
    }
  }, [phase, results, onGetCourseRecommendations]);

  const SESSION_KEY = 'crescendo-reading-session';

  const saveSessionToStorage = useCallback((p, a, q, t) => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ paper: p, answers: a, currentQuestion: q, timeRemaining: t, savedAt: Date.now() })); } catch {}
  }, []);

  const clearSessionStorage = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  // Check for saved session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      setHasSavedSession(!!saved);
    } catch { setHasSavedSession(false); }
  }, []);

  // Save session on answers/question change during passage-view
  useEffect(() => {
    if (phase === 'passage-view' && paper) {
      saveSessionToStorage(paper, answers, currentQuestion, timeRemaining);
    }
  }, [phase, paper, answers, currentQuestion, timeRemaining, saveSessionToStorage]);

  const resumeSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const { paper: p, answers: a, currentQuestion: cq, timeRemaining: tr } = JSON.parse(saved);
      if (p && p.questions?.length > 0) {
        setPaper(p);
        setAnswers(a || {});
        setCurrentQuestion(cq || 0);
        setTimeRemaining(tr);
        setResults(null);
        setPhase('passage-view');
        setHasSavedSession(false);
      }
    } catch { /* silent fail */ }
  }, []);

  const questions = paper?.questions || [];
  const passages = paper?.passages || [];
  const currentPassage = passages[0];
  const sections = paper?.sections || {};
  const parts = [...new Set(questions.map(q => q.part).filter(Boolean))];
  const passageTruncated = useMemo(() => {
    const content = currentPassage?.content || '';
    const text = content.replace(/<[^>]+>/g, '').trim();
    if (!text || text.length < 100) return false;
    const lastLine = text.split('\n').filter(Boolean).pop() || '';
    const endsProperly = /[.!?)\u201D"]\s*$/.test(lastLine);
    return !endsProperly && lastLine.length > 10;
  }, [currentPassage]);

  const startSession = useCallback(async (difficulty) => {
    clearSessionStorage();
    setGenerating(true);
    try {
      let p;
      try {
        p = await dsePapers.generateReadingSession({ difficulty, notes }, callAI);
      } catch {}

      if (!p || (!p.questions?.length && !p.metadata?.readOnly)) {
        p = await dsePapers.getPaper('reading', { difficulty });
      }

      if (p) {
        setPaper(p);
        setAnswers({});
        setCurrentQuestion(0);
        setResults(null);
        if (p.metadata?.readOnly) {
          setTimeRemaining(null);
        } else {
          const timeLimit = Number.isFinite(p.metadata?.timeLimit) ? p.metadata.timeLimit : (p.questions?.length || 6) * 90;
          setTimeRemaining(timeLimit);
        }
        setPhase('passage-view');
      }
    } catch (e) {
      console.error('Failed to start session:', e);
    } finally {
      setGenerating(false);
    }
  }, [dsePapers, callAI, notes]);

  useEffect(() => {
    if (timeRemaining === null || phase === 'results') return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (!Number.isFinite(t)) { clearInterval(timerRef.current); return 0; }
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (timeRemaining !== 0 || phase !== 'active') return;
    finishSession();
  }, [timeRemaining, phase]);

  const handleAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const goToQuestion = useCallback((idx) => {
    if (idx < 0 || idx >= questions.length) return;
    const prevQ = questions[currentQuestion];
    if (prevQ) {
      const elapsed = Date.now() - questionStartRef.current;
      questionTimersRef.current[prevQ.id] = (questionTimersRef.current[prevQ.id] || 0) + elapsed;
    }
    questionStartRef.current = Date.now();
    setCurrentQuestion(idx);
  }, [currentQuestion, questions]);

  useEffect(() => {
    if (phase === 'start') {
      dsePapers?.getReadingHistory().then(sessions => {
        if (sessions) setPastSessions(sessions);
      }).catch(() => {});
    }
  }, [phase, dsePapers]);

  const handleFlagAnswer = useCallback((qId, stem, userAnswer, aiAnswer) => {
    setAnswerFlags(prev => {
      const updated = { ...prev, [qId]: { stem, userAnswer, aiAnswer, timestamp: Date.now() } };
      localStorage.setItem('crescendo-answer-reports', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleUnflagAnswer = useCallback((qId) => {
    setAnswerFlags(prev => {
      const updated = { ...prev };
      delete updated[qId];
      localStorage.setItem('crescendo-answer-reports', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const finishSession = useCallback(() => {
    clearInterval(timerRef.current);
    if (!paper) return;

    // Record time for final question
    const finalQ = questions[currentQuestion];
    if (finalQ) {
      const elapsed = Date.now() - questionStartRef.current;
      questionTimersRef.current[finalQ.id] = (questionTimersRef.current[finalQ.id] || 0) + elapsed;
    }

    const scoreResult = computeScore(questions, answers);
    const totalMarks = scoreResult.maxMarks;
    const marksEarned = scoreResult.marksEarned;
    const percentage = totalMarks > 0 ? Math.round((marksEarned / totalMarks) * 100) : 0;
    const weighted = computeWeightedScore(questions, answers, 'reading');
    const subScores = computeSubScores('reading', questions, answers);

    const sessionData = {
      skill: 'reading',
      type: paper.source === 'ai-generated' ? 'practice' : 'exam',
      paperId: paper.id,
      score: marksEarned,
      totalQuestions: totalMarks,
      percentage: Math.round((marksEarned / totalMarks) * 100),
      subScores,
      questions: questions.map((q, i) => ({
        id: q.id, type: q.type, questionType: q.type,
        stem: q.stem, options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: answers[q.id] || null,
        isCorrect: scoreResult.results?.[i]?.correct || false,
        marksEarned: scoreResult.results?.[i]?.marksEarned || 0,
        marks: q.marks || 1,
        timeSpent: Math.round((questionTimersRef.current[q.id] || 0) / 1000),
      })),
      duration: paper.metadata?.timeLimit - (timeRemaining || 0),
      dseLevel: scoreToDseLevel(percentage, 'reading').level,
    };

    clearSessionStorage();
    setResults(sessionData);
    skillAnalytics?.recordSession(sessionData);
    setPhase('results');

    // Save to reading history
    const historyEntry = {
      completedAt: new Date().toISOString(),
      difficulty: paper.difficulty,
      dseLevel: sessionData.dseLevel,
      percentage: sessionData.percentage,
      score: sessionData.score,
      totalQuestions: sessionData.totalQuestions,
      passageTitle: currentPassage?.title || paper?.passages?.[0]?.title || 'Reading Passage',
      passageContent: currentPassage?.content || paper?.passages?.[0]?.content || '',
      duration: sessionData.duration,
      questions: sessionData.questions,
    };
    dsePapers?.saveReadingSession(historyEntry).catch(() => {});

    // Generate study notes in background
    const passageText = currentPassage?.content || '';
    if (passageText && questions.length > 0 && callAI && dsePapers?.generateReadingNotes && createNote) {
      setNotesGenerated(null);
      notesGenDataRef.current = {
        passageText, questions, answers, timers: { ...questionTimersRef.current },
        difficulty: paper.difficulty,
        title: currentPassage?.title || 'Practice',
        generateReadingNotes: dsePapers.generateReadingNotes,
        createNote,
        callAI,
      };
    }
  }, [paper, questions, answers, currentQuestion, timeRemaining, skillAnalytics, clearSessionStorage, dsePapers, callAI, createNote, currentPassage]);

  const handleSyncContent = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch('/api/crawl/sync', { method: 'POST' });
      await new Promise(r => setTimeout(r, 1000));
      setSyncing(false);
    } catch { setSyncing(false); }
  }, []);

  // Generate study notes after session finishes (separate effect avoids stale closures)
  useEffect(() => {
    const data = notesGenDataRef.current;
    if (!data) return;
    notesGenDataRef.current = null;
    let cancelled = false;
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        setNotesGenerated(false);
        cancelled = true;
      }
    }, 50000);
    data.generateReadingNotes(data.passageText, data.questions, data.answers, data.timers, data.callAI)
      .then(noteContent => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        if (noteContent && data.createNote) {
          data.createNote({
            kind: 'exercise',
            kindOverridden: true,
            title: `Reading Analysis — ${data.title}`,
            content: noteContent,
            tags: ['reading', data.difficulty === 'easy' ? 'b1' : data.difficulty === 'hard' ? 'b2' : 'part-a', 'exercise'],
          });
        }
        setNotesGenerated(true);
      })
      .catch(e => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        console.warn('[DSE] Notes generation error:', e?.message || e);
        setNotesGenerated(false);
      });
    return () => { cancelled = true; };
  }, [phase]);

  const formatTime = (s) => {
    if (s === null || s === undefined || isNaN(s) || typeof s !== 'number') return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (phase === 'start') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={onBack}>← Dashboard</button>
          <h1 className="dse-module__title">📖 Reading Practice</h1>
          <p className="dse-module__subtitle">Practice DSE-style reading comprehension with AI-generated passages and questions</p>
          <div className="reading__sync-row">
            <button className="reading__sync-btn" onClick={handleSyncContent} disabled={syncing}>
              {syncing ? '⟳ Syncing...' : '↻ Refresh Content'}
            </button>
          </div>
        </div>
        <div className="reading__start">
          <div className="reading__difficulty-cards">
            {['easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                className="reading__difficulty-card"
                onClick={() => startSession(d)}
                disabled={generating}
              >
                <span className="reading__difficulty-icon">
                  {d === 'easy' ? '🌱' : d === 'medium' ? '🔥' : '💎'}
                </span>
                <span className="reading__difficulty-name">
                  {d === 'easy' ? 'Part B1 (Easier)' : d === 'medium' ? 'Part A (Compulsory)' : 'Part B2 (Harder)'}
                </span>
                <span className="reading__difficulty-desc">
                  {d === 'easy' ? 'B1 — easier section, max Level 4'
                    : d === 'medium' ? 'Part A — compulsory section for all candidates'
                    : 'B2 — harder section, up to 5**'}
                </span>
                <span className="reading__difficulty-note" style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: 4 }}>
                  Single-section practice
                </span>
              </button>
            ))}
          </div>
          {generating && <div className="reading__generating">Generating your practice session...</div>}
          {hasSavedSession && (
            <div className="reading__resume-banner">
              <span>You have an unfinished session</span>
              <button className="reading__q-btn reading__q-btn--primary" onClick={resumeSession}>
                📝 Resume
              </button>
              <button className="reading__q-btn" onClick={() => { clearSessionStorage(); setHasSavedSession(false); }} style={{ marginLeft: 8 }}>
                Dismiss
              </button>
            </div>
          )}
          {pastSessions.length > 0 && (
            <details className="reading__history" open>
              <summary className="reading__history-summary">
                📜 Past Sessions ({pastSessions.length})
              </summary>
              <div className="reading__history-list">
                {pastSessions.map((s, i) => (
                  <div key={s.completedAt || i} className="reading__history-item">
                    <div className="reading__history-meta">
                      <span className="reading__history-diff">
                        {s.difficulty === 'easy' ? '🌱' : s.difficulty === 'medium' ? '🔥' : '💎'} {s.difficulty === 'easy' ? 'B1' : s.difficulty === 'medium' ? 'A' : 'B2'}
                      </span>
                      <span className="reading__history-level" style={{ color: s.percentage >= 80 ? 'var(--color-success)' : s.percentage >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}>
                        {s.dseLevel || '—'}
                      </span>
                      <span className="reading__history-pct">{s.percentage || 0}%</span>
                      <span className="reading__history-date">
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="reading__history-title">{s.passageTitle || 'Reading Passage'}</div>
                    <div className="reading__history-actions">
                      <button className="reading__q-btn" onClick={() => { setReviewSession(s); setPhase('history-review'); }}>
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'passage-view') {
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const allAnswered = answeredCount >= totalQuestions;

    const part = paper?.metadata?.part || 'A';
    const partLabels = { A: 'Part A — Compulsory', B1: 'Part B1 — Easier (max Level 4)', B2: 'Part B2 — Harder (up to 5**)' };
    const partClasses = { A: 'reading__passage-part-badge--A', B1: 'reading__passage-part-badge--B1', B2: 'reading__passage-part-badge--B2' };
    const partLabel = partLabels[part] || 'Part A';
    const partClass = partClasses[part] || 'reading__passage-part-badge--A';

    return (
      <div className="dse-module">
        <div className="dse-module__header" style={{ paddingBottom: 0 }}>
          <div className="reading__progress-header">
            <button className="dse-module__back" onClick={() => { saveSessionToStorage(paper, answers, currentQuestion, timeRemaining); setPhase('start'); }}>← Back</button>
            {!paper?.metadata?.readOnly && <div className="reading__timer">{formatTime(timeRemaining)}</div>}
          </div>
        </div>
        <div className="reading__body">
          <div className="reading__passage-col">
            <div className="reading__passage-card">
              {/* Exam framework header — DSE booklet style */}
              <div className="reading__exam-framework">
                <div className="reading__exam-framework-left">
                  <span className="reading__seat-number">Seat No. __________</span>
                </div>
                <div className="reading__exam-framework-center">
                  <span className="reading__exam-title">Hong Kong Diploma of Secondary Education Examination</span>
                </div>
                <div className="reading__exam-framework-right">
                  <span className="reading__exam-year">2024</span>
                </div>
              </div>

              {/* Single part badge — no duplication */}
              <div className={`reading__passage-part-badge ${partClass}`}>
                {partLabel}
              </div>

              {/* Passage title — NO AI badge, clean serif */}
              <h2 className="reading__passage-title">
                {currentPassage?.title || 'Reading Passage'}
              </h2>

              {/* Passage body with line number gutter */}
              <div className="reading__passage-body">
                <div className="reading__line-gutter" aria-hidden="true">
                  {/* Line numbers injected by CSS counter — no JS needed */}
                </div>
                <div className="reading__passage-text">
                  <div dangerouslySetInnerHTML={{ __html: currentPassage?.content || '' }} />
                </div>
              </div>

              {/* Source attribution — single source, no duplication with wordcount */}
              {paper?.metadata?.ragGenerated && (paper.metadata.sourceName || paper.metadata.sourceDate) && (
                <div className="reading__passage-source">
                  Adapted from {paper.metadata.sourceName}{paper.metadata.sourceDate ? `, ${paper.metadata.sourceDate}` : ''}
                </div>
              )}
              {!paper?.metadata?.ragGenerated && paper?.metadata?.aiGenerated && !paper.metadata.sourceName && (
                <div className="reading__passage-source">Adapted from a news article</div>
              )}

              {/* Truncation warning */}
              {paper?.metadata?.passageTruncated ? (
                <div className="reading__truncation-warning">
                  ⚠️ Passage was truncated in the source — AI reconstructed most content but some details may be incomplete.
                </div>
              ) : null}

              {/* Word count — simplified, no redundant source info */}
              <div className="reading__passage-wordcount">
                {currentPassage?.wordCount || currentPassage?.content?.split(/\s+/).length || 0} words
              </div>
            </div>
          </div>
          <div className="reading__questions-col">
            {paper?.metadata?.readOnly ? (
              <div className="reading__readonly">
                <div className="reading__readonly-icon">📖</div>
                <h3>AI Question Generation Unavailable</h3>
                <p>The real DSE passage was loaded, but AI could not generate questions.</p>
                <p className="reading__readonly-hint">This usually means no AI API key is configured, or the AI service timed out.</p>
                <button className="reading__q-btn reading__q-btn--primary" style={{ marginTop: 16 }} onClick={() => setPhase('start')}>
                  ← Back to Reading
                </button>
              </div>
            ) : (
              <div className="reading__questions-scroll">
                <div className="reading__questions-nav">
                  {parts.length > 1 && <div className="reading__q-nav-sections">
                    {parts.map(p => (
                      <span key={p} className={`reading__q-nav-section ${p === 'A' ? 'reading__q-nav-section--a' : p === 'B1' ? 'reading__q-nav-section--b1' : 'reading__q-nav-section--b2'}`}>
                        {p}
                      </span>
                    ))}
                  </div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {questions.map((q, i) => (
                      <button
                        key={`q-${i}`}
                        className={`reading__q-nav-btn${i === currentQuestion ? ' reading__q-nav-btn--active' : ''}${answers[q.id] ? ' reading__q-nav-btn--answered' : ''}${q.part === 'B1' ? ' reading__q-nav-btn--b1' : q.part === 'B2' ? ' reading__q-nav-btn--b2' : ''}`}
                        onClick={() => goToQuestion(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="reading__question-wrap">
                  {currentQuestion > 0 && questions[currentQuestion]?.part !== questions[currentQuestion - 1]?.part && (
                    <div className={`reading__q-section-header ${questions[currentQuestion].part === 'A' ? 'reading__q-section-header--a' : questions[currentQuestion].part === 'B1' ? 'reading__q-section-header--b1' : 'reading__q-section-header--b2'}`}>
                      Section {questions[currentQuestion].part}
                      {questions[currentQuestion].part === 'A' ? ' — Compulsory' : questions[currentQuestion].part === 'B1' ? ' — Easier (max Level 4)' : ' — Harder (up to 5**)'}
                    </div>
                  )}
                  {currentQuestion === 0 && questions[0]?.part && (
                    <div className={`reading__q-section-header ${questions[0].part === 'A' ? 'reading__q-section-header--a' : questions[0].part === 'B1' ? 'reading__q-section-header--b1' : 'reading__q-section-header--b2'}`}>
                      Section {questions[0].part}
                      {questions[0].part === 'A' ? ' — Compulsory' : questions[0].part === 'B1' ? ' — Easier (max Level 4)' : ' — Harder (up to 5**)'}
                    </div>
                  )}
                  <QuestionRenderer
                    question={questions[currentQuestion]}
                    number={currentQuestion + 1}
                    value={answers[questions[currentQuestion]?.id] || null}
                    onSelect={handleAnswer}
                    showResult={false}
                    disabled={false}
                  />
                </div>
                <div className="reading__q-actions">
                  <button
                    className="reading__q-btn"
                    disabled={currentQuestion === 0}
                    onClick={() => goToQuestion(currentQuestion - 1)}
                  >
                    ← Previous
                  </button>
                  <div className="reading__q-progress">
                    {answeredCount}/{totalQuestions} answered
                  </div>
                  {currentQuestion < totalQuestions - 1 ? (
                    <button className="reading__q-btn reading__q-btn--primary" onClick={() => goToQuestion(currentQuestion + 1)}>
                      Next →
                    </button>
                  ) : (
                    <button
                      className="reading__q-btn reading__q-btn--primary"
                      onClick={finishSession}
                    >
                      {allAnswered ? 'Submit All' : `Submit (${totalQuestions - answeredCount} unanswered)`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const partMap = { easy: 'B1', medium: 'A', hard: 'B2' };
  const part = (paper?.metadata?.part) || partMap[paper?.difficulty] || 'A';
  const passageText = currentPassage?.content || '';

  if (phase === 'results') {
    if (!results) return null;
    return (
      <>
        <ReadingResults
          results={results}
          questions={questions}
          answers={answers}
          paper={paper}
          passageContent={passageText}
          passagePreview={passageText.replace(/<[^>]+>/g, '').slice(0, 2000)}
          part={part}
          answerFlags={answerFlags}
          handleFlagAnswer={handleFlagAnswer}
          handleUnflagAnswer={handleUnflagAnswer}
          notesGenerated={notesGenerated}
          callAI={callAI}
          onBack={() => { setPhase('start'); setPaper(null); }}
          onPracticeAgain={() => startSession(paper.difficulty)}
        />
        {showCourseSuggestion && courseRecommendations.length > 0 && (
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 var(--space-4)' }}>
            <PostTaskSuggestion
              recommendations={courseRecommendations}
              onEnroll={(tagSet) => { onEnrollCourse?.(tagSet); setShowCourseSuggestion(false); }}
              onDismiss={() => setShowCourseSuggestion(false)}
              onBrowseAll={() => onBrowseCourses?.()}
            />
          </div>
        )}
      </>
    );
  }

  if (phase === 'history-review') {
    if (!reviewSession) return null;
    // Transform reviewSession data to ReadingResults-compatible format
    const revResults = {
      percentage: reviewSession.percentage || 0,
      score: reviewSession.score || 0,
      totalQuestions: reviewSession.totalQuestions || 0,
      dseLevel: reviewSession.dseLevel || '—',
      duration: reviewSession.duration || 0,
      subScores: reviewSession.subScores || {},
    };
    const revQuestions = (reviewSession.questions || []).map(q => ({
      ...q,
      id: q.id || `rev-q-${Math.random().toString(36).slice(2, 8)}`,
    }));
    const revAnswers = {};
    for (const q of revQuestions) {
      revAnswers[q.id] = q.userAnswer;
    }
    const revPartMap = { easy: 'B1', medium: 'A', hard: 'B2' };
    const revPart = (paper?.metadata?.part) || revPartMap[reviewSession.difficulty] || 'A';
    return (
      <ReadingResults
        results={revResults}
        questions={revQuestions}
        answers={revAnswers}
        paper={paper}
        passageContent={reviewSession.passageContent || ''}
        passagePreview={(reviewSession.passageContent || '').replace(/<[^>]+>/g, '').slice(0, 2000)}
        part={revPart}
        answerFlags={{}}
        handleFlagAnswer={() => {}}
        handleUnflagAnswer={() => {}}
        notesGenerated={notesGenerated}
        callAI={callAI}
        onBack={() => { setPhase('start'); setReviewSession(null); }}
        onPracticeAgain={() => startSession(paper?.difficulty || 'medium')}
      />
    );
  }

  return null;
}
