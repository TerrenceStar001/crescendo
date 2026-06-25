import React, { useState, useCallback, useEffect } from 'react';
import QuestionRenderer from './QuestionRenderer';
import { generateDrills } from '../utils/drillGenerator';

const STORAGE_KEY = 'crescendo-drill-state';

/**
 * DrillGenerator — 6-state state machine for targeted practice question generation.
 *
 * States: idle → generating → ready → answering → answered → failed
 *
 * Props:
 *   passagePreview   — Plain-text passage excerpt (first ~2000 chars)
 *   weakTypes        — ['inference', 'mcq'] — weakest skill + type slugs
 *   part             — 'A'|'B1'|'B2'
 *   mistakesContext  — [{ qNum, type, userAnswer, correctAnswer }]
 *   callAI           — AI call function (from useAI or ReadingModule)
 *
 * Per T-03-02-02: AI call has 30s timeout; failed state provides fallback UI.
 * Per T-03-02-03: Passes mistake context to AI — no PII or user identity included.
 */
export default function DrillGenerator({ passagePreview, weakTypes, part, mistakesContext, callAI }) {
  if (!callAI) return null;

  const [phase, setPhase] = useState('idle');
  const [drills, setDrills] = useState([]);
  const [drillAnswers, setDrillAnswers] = useState({});
  const [drillPhase, setDrillPhase] = useState('answering');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.drills?.length) {
          setDrills(state.drills);
          setDrillAnswers(state.drillAnswers || {});
          setDrillPhase(state.drillPhase || 'answering');
          setPhase(state.phase === 'generating' || state.phase === 'failed' ? 'idle' : state.phase);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (drills.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ drills, drillAnswers, drillPhase, phase }));
      } catch {}
    }
  }, [drills, drillAnswers, drillPhase, phase]);

  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    try {
      const generated = await generateDrills(
        passagePreview, weakTypes, part, mistakesContext, callAI
      );
      if (generated?.length) {
        setDrills(generated);
        setPhase('ready');
      } else {
        setPhase('failed');
      }
    } catch {
      setPhase('failed');
    }
  }, [passagePreview, weakTypes, part, mistakesContext, callAI]);

  const handleDrillAnswer = useCallback((questionId, value) => {
    setDrillAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleCheckAllAnswers = useCallback(() => {
    setDrillPhase('answered');
  }, []);

  const handleTryAgain = useCallback(() => {
    setPhase('idle');
    setDrills([]);
    setDrillAnswers({});
    setDrillPhase('answering');
  }, []);

  return (
    <div className="drill-generator">
      {/* --- idle state --- */}
      {phase === 'idle' && (
        <div className="drill-generator__card">
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            {weakTypes.length > 0
              ? 'Review your mistakes above, then generate practice questions targeting your weak areas.'
              : 'Complete a reading session to see targeted practice'}
          </p>
          {weakTypes.length > 0 && (
            <button className="drill-generator__cta" onClick={handleGenerate}>
              Generate Targeted Practice
            </button>
          )}
        </div>
      )}

      {/* --- generating state --- */}
      {phase === 'generating' && (
        <div
          className="drill-generator__loading"
          style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}
        >
          ⏳ Generating targeted practice questions...
        </div>
      )}

      {/* --- failed state --- */}
      {phase === 'failed' && (
        <div className="drill-generator__card">
          <p
            className="drill-generator__error"
            style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}
          >
            Practice questions could not be generated. Try again or start a new session.
          </p>
          <button className="drill-generator__cta" onClick={handleGenerate}>
            Try Again
          </button>
        </div>
      )}

      {/* --- ready / answering / answered states --- */}
      {(phase === 'ready' || phase === 'answering' || phase === 'answered') && (
        <>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>
            Practice these questions
          </h4>
          {drills.map((q, i) => {
            const qid = q.id || `drill-idx-${i}`;
            return (
            <div key={qid} className="drill-generator__question">
              <QuestionRenderer
                question={q}
                number={i + 1}
                value={drillAnswers[qid] || null}
                onSelect={(id, val) => handleDrillAnswer(qid, val)}
                showResult={drillPhase === 'answered'}
                disabled={drillPhase === 'answered'}
              />
            </div>
            );
          })}
          <div className="drill-generator__actions">
            {drillPhase === 'answering' && (
              <button
                className="reading__q-btn reading__q-btn--primary"
                onClick={handleCheckAllAnswers}
              >
                Check All Answers
              </button>
            )}
            {drillPhase === 'answered' && (
              <button className="reading__q-btn" onClick={handleTryAgain}>
                Try Again
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
