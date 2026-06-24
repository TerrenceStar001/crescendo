import React, { useMemo } from 'react';
import { scoreToDseLevel, isQuestionCorrect } from '../utils/dseGrading';
import MarkedScriptView from './MarkedScriptView';
import ErrorPatternAnalysis from './ErrorPatternAnalysis';
import DrillGenerator from './DrillGenerator';

export default function ReadingResults({
  results, questions, answers, paper,
  passageContent, passagePreview,
  part, answerFlags, handleFlagAnswer, handleUnflagAnswer,
  notesGenerated, callAI,
  onBack, onPracticeAgain,
}) {
  if (!results) return null;

  const formatTime = (s) => {
    if (s === null || s === undefined || isNaN(s) || typeof s !== 'number') return '\u2014';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Derive weak types and mistakes context for DrillGenerator
  const { weakTypes, mistakesContext } = useMemo(() => {
    // Weakest skills
    const skillScores = {};
    const skillCounts = {};
    (questions || []).filter(q => q.skillTested).forEach(q => {
      const sk = q.skillTested;
      if (!skillScores[sk]) { skillScores[sk] = 0; skillCounts[sk] = 0; }
      skillCounts[sk] += q.marks || 1;
      if (isQuestionCorrect(q, answers[q.id])) skillScores[sk] += q.marks || 1;
    });
    const weakSkills = Object.entries(skillScores)
      .map(([k, v]) => ({ slug: k, pct: Math.round((v / (skillCounts[k] || 1)) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 2)
      .map(s => s.slug);

    // Weakest question type
    const typeScores = {};
    const typeCounts = {};
    (questions || []).forEach(q => {
      const t = q.type;
      if (!typeScores[t]) { typeScores[t] = 0; typeCounts[t] = 0; }
      typeCounts[t] += q.marks || 1;
      if (isQuestionCorrect(q, answers[q.id])) typeScores[t] += q.marks || 1;
    });
    const derived = [...weakSkills];
    const entries = Object.entries(typeScores)
      .map(([k, v]) => ({ type: k, pct: Math.round((v / (typeCounts[k] || 1)) * 100) }))
      .sort((a, b) => a.pct - b.pct);
    const weakestType = entries[0]?.type;
    if (weakestType && !derived.includes(weakestType)) derived.push(weakestType);

    // Mistakes context
    const ctx = (questions || [])
      .filter(q => !isQuestionCorrect(q, answers[q.id]))
      .map(q => ({
        qNum: questions.indexOf(q) + 1,
        type: q.type,
        userAnswer: answers[q.id],
        correctAnswer: q.correctAnswer,
      }));

    return { weakTypes: derived, mistakesContext: ctx };
  }, [questions, answers]);

  return (
    <div className="dse-module">
      <div className="dse-module__header">
        <button className="dse-module__back" onClick={onBack}>← Back</button>
        <h1 className="dse-module__title">📊 Results</h1>
      </div>
      <div className="reading__results">

        {/* 1. Results Summary */}
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
              <span className="reading__results-stat-label">Marks</span>
            </div>
            <div className="reading__results-stat">
              <span className="reading__results-stat-value" style={{ color: `var(--color-${results.percentage >= 80 ? 'success' : results.percentage >= 60 ? 'warning' : 'error'})` }}>{results.dseLevel}</span>
              <span className="reading__results-stat-label">DSE Level</span>
            </div>
            <div className="reading__results-stat">
              <span className="reading__results-stat-value">{formatTime(results.duration)}</span>
              <span className="reading__results-stat-label">Time</span>
            </div>
          </div>
        </div>

        {/* 2. Source badge */}
        <div className="reading__results-source">
          <span className={`reading__source-badge ${paper?.metadata?.ragGenerated ? '' : 'reading__source-badge--bundled'}`}>
            {paper?.metadata?.ragGenerated
              ? (paper.metadata.year ? `${paper.metadata.year} DSE` : 'RAG')
              : 'Bundled'}
          </span>
          {paper?.metadata?.ragGenerated
            ? (paper.metadata.year
              ? ` Passage: ${paper.metadata.year} DSE Paper 1 (Part ${paper.metadata.part}) · Questions: AI-generated`
              : ' RAG-sourced passage')
            : ' Built-in practice content'}
        </div>

        {/* 3. Marked Script View (collapsible, open by default) — NEW */}
        <details className="reading__history" open>
          <summary className="reading__history-summary" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Annotated Passage
          </summary>
          <MarkedScriptView
            passageHtml={passageContent}
            questions={questions}
            userAnswers={answers}
          />
        </details>

        {/* 4. Error Pattern Analysis — NEW */}
        <ErrorPatternAnalysis
          questions={questions}
          answers={answers}
          sections={paper?.sections}
          part={part}
        />

        {/* 5. Drill Generator — NEW */}
        <DrillGenerator
          passagePreview={passagePreview}
          weakTypes={weakTypes}
          part={part}
          mistakesContext={mistakesContext}
          callAI={callAI}
        />

        {/* 6. Section breakdown */}
        {paper?.sections && Object.keys(paper.sections).filter(k => paper.sections[k].questionCount > 0).length > 0 && (
          <div className="reading__results-subscores">
            <h3>Breakdown by Section</h3>
            {Object.entries(paper.sections).filter(([, s]) => s.questionCount > 0).map(([section]) => {
              const sectionQuestions = questions.filter(q => (q.part || '').startsWith(section === 'A' ? 'A' : section === 'B1' ? 'B1' : 'B2'));
              const sectionMarks = sectionQuestions.reduce((s, q) => s + (q.marks || 1), 0);
              const sectionEarned = sectionQuestions.reduce((s, q) => s + (isQuestionCorrect(q, answers[q.id]) ? (q.marks || 1) : 0), 0);
              const sectionPct = sectionMarks > 0 ? Math.round((sectionEarned / sectionMarks) * 100) : 0;
              return (
                <div key={section} className="reading__results-subscore">
                  <span className="reading__results-subscore-label">
                    Part {section}
                    <span style={{ fontSize: '0.72rem', opacity: 0.6, marginLeft: 6 }}>
                      ({sectionEarned}/{sectionMarks} marks)
                    </span>
                  </span>
                  <div className="reading__results-subscore-bar-bg">
                    <div className="reading__results-subscore-bar-fill" style={{
                      width: `${sectionPct}%`,
                      background: section === 'A' ? 'var(--color-accent)' : section === 'B1' ? '#ff9800' : '#e91e63',
                    }} />
                  </div>
                  <span className="reading__results-subscore-value">{sectionPct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 7. Question type breakdown */}
        {results.subScores && Object.keys(results.subScores).length > 0 && (
          <div className="reading__results-subscores">
            <h3>Breakdown by Question Type</h3>
            {Object.entries(results.subScores).map(([type, score]) => (
              <div key={type} className="reading__results-subscore">
                <span className="reading__results-subscore-label">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                <div className="reading__results-subscore-bar-bg">
                  <div className="reading__results-subscore-bar-fill" style={{
                    width: `${score}%`,
                    background: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-error)',
                  }} />
                </div>
                <span className="reading__results-subscore-value">{score}%</span>
              </div>
            ))}
          </div>
        )}

        {/* 8. Skill breakdown — REMOVED (replaced by ErrorPatternAnalysis) */}

        {/* 9. Review Questions */}
        <div className="reading__results-review">
          <h3>Review Questions</h3>
          {questions.map((q, i) => {
            const ua = answers[q.id];
            const correct = isQuestionCorrect(q, ua);
            const displayAnswer = q.type === 'matching' && ua && typeof ua === 'object'
              ? Object.entries(ua).map(([k, v]) => `${k} → ${v}`).join(', ')
              : q.type === 'gap-fill' && q.answers && ua && typeof ua === 'object'
                ? q.answers.map((a, i) => `${i + 1}. ${ua[i] || '—'}`).join(', ')
                : (ua || '—');
            return (
              <div key={q.id} className={`reading__results-review-item ${correct ? '' : 'reading__results-review-item--wrong'}`}>
                <div className="reading__results-review-header">
                  <span className={`reading__results-review-status ${correct ? 'reading__results-review-status--correct' : 'reading__results-review-status--wrong'}`}>
                    {correct ? '✓' : '✗'}
                  </span>
                  {q.part && <span className={`reading__q-nav-section ${q.part === 'A' ? 'reading__q-nav-section--a' : q.part === 'B1' ? 'reading__q-nav-section--b1' : q.part === 'B2' ? 'reading__q-nav-section--b2' : ''}`} style={{ marginRight: 6, fontSize: '0.65rem', padding: '1px 5px' }}>{q.part}</span>}
                  {q.skillTested && <span className="reading__skill-tag" style={{ marginRight: 6, fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>{q.skillTested}</span>}
                  <span className="reading__results-review-q">Q{i + 1}. {q.stem}</span>
                  <span className="mcq__marks" style={{ marginLeft: 'auto' }}>[{q.marks || 1}m]</span>
                </div>
                <div className="reading__results-review-answers">
                  <span>Your answer: <strong>{displayAnswer}</strong></span>
                  {!correct && q.correctAnswer && <span>Correct: <strong style={{ color: 'var(--color-success)' }}>
                    {q.type === 'matching'
                      ? (q.pairs || []).map(p => `${p.item} → ${p.match}`).join(', ') || q.correctAnswer
                      : q.correctAnswer}
                  </strong></span>}
                </div>
                {Array.isArray(q.options) && q.options.length >= 2 && (
                  <div className="reading__results-review-options" style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--color-text-muted)' }}>
                    {q.options.map(o => <span key={o.label} style={{ marginRight: 12 }}>{o.label}. {o.text}</span>)}
                  </div>
                )}
                {(q.type === 'matching' || q.type === 'semantic-connect') && Array.isArray(q.pairs) && q.pairs.length > 0 && (
                  <div className="reading__results-review-pairs" style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--color-text-muted)' }}>
                    Pairs: {q.pairs.map(p => `${p.item} → ${p.match}`).join(', ')}
                  </div>
                )}
                {!correct && (
                  <button
                    className={`reading__flag-btn ${answerFlags[q.id] ? 'reading__flag-btn--flagged' : ''}`}
                    onClick={() => answerFlags[q.id] ? handleUnflagAnswer(q.id) : handleFlagAnswer(q.id, q.stem, displayAnswer, q.correctAnswer)}
                  >
                    {answerFlags[q.id] ? '🚩 Reported' : '🚩 Report wrong answer'}
                  </button>
                )}
                {q.explanation && <div className="reading__results-review-explanation">{q.explanation}</div>}
              </div>
            );
          })}
        </div>

        {/* 10. AI Notes status + Actions */}
        <div className="reading__results-actions">
          {notesGenerated === null && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 8 }}>
              ⏳ Generating study notes...
            </div>
          )}
          {notesGenerated === true && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', textAlign: 'center', marginBottom: 8 }}>
              📊 Study notes saved to your notes
            </div>
          )}
          {notesGenerated === false && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 8 }}>
              ⚠️ Study notes could not be generated
            </div>
          )}
          <button className="reading__results-btn" onClick={onBack}>
            ← Back to Reading
          </button>
          <button className="reading__results-btn reading__results-btn--primary" onClick={onPracticeAgain}>
            🔄 Practice Again
          </button>
        </div>

      </div>
    </div>
  );
}
