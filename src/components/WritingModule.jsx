import React, { useState, useCallback, useRef, useEffect } from 'react';
import { STRUCTURAL_CONSTRAINTS } from '../utils/structuralConstraints';

export default function WritingModule({ dsePapers, skillAnalytics, callAI, notes, onBack }) {
  const [phase, setPhase] = useState('start');
  const [session, setSession] = useState(null);
  const [essay, setEssay] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [correctionResult, setCorrectionResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const editorRef = useRef(null);
  const timerRef = useRef(null);

  const startSession = useCallback(async (difficulty) => {
    setGenerating(true);
    try {
      let s = await dsePapers.getPaper('writing', { difficulty });
      if (!s) {
        s = await dsePapers.generateWritingPrompt({ difficulty, notes, type: 'essay' }, callAI);
      }
      if (s) {
        setSession(s);
        setEssay('');
        setWordCount(0);
        setCorrectionResult(null);
        const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 40 : 50;
        setTimeRemaining(timeLimit * 60);
        setPhase('writing');
        setGenerating(false);
      }
    } catch (e) {
      console.error('Failed to start writing session:', e);
      setGenerating(false);
    }
  }, [dsePapers, callAI, notes]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || phase !== 'writing') {
      if (timeRemaining === 0 && phase === 'writing') handleSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (!Number.isFinite(t)) { clearInterval(timerRef.current); return 0; }
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeRemaining]);

  const handleEssayChange = useCallback((html) => {
    setEssay(html);
    const text = html.replace(/<[^>]+>/g, '');
    setWordCount(text.split(/\s+/).filter(Boolean).length);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!session || !essay.trim()) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setPhase('submitted');

    try {
      const wordLimit = session.metadata?.wordLimit || { min: 250, max: 400 };
      const prompt = `Evaluate this HKDSE English Paper 2 writing task against the official HKDSE marking scheme.

Task: ${session.prompt}

Word limit: ${wordLimit.min}-${wordLimit.max} words (HKDSE Part B: 400-500 words)

Student's essay:
${essay.replace(/<[^>]+>/g, '')}

Score each category out of 7 (matching HKDSE Paper 2 rubric):
1. Content (7 marks): relevance to prompt, depth of argument, use of examples, task fulfillment
2. Organization (7 marks): coherence, cohesion, paragraphing, logical progression, use of discourse markers
3. Language (7 marks): grammatical accuracy, variety of structures, lexical range, spelling and punctuation

HKDSE grade boundaries for Paper 2 Writing (21 total):
5** = 18-21 (86-100%), 5* = 17-18 (81-86%), 5 = 15-16 (71-76%), 4 = 13-14 (62-67%), 3 = 10-11 (48-52%)

Return as JSON:
{ "content": { "score": 4, "feedback": "...", "subScores": { "relevance": 5, "development": 4, "examples": 3 } },
  "organization": { "score": 4, "feedback": "..." },
  "language": { "score": 4, "feedback": "..." },
  "overall": { "total": 12, "maxTotal": 21, "percentage": 57, "dseLevel": "3" },
  "errors": [ { "original": "error text", "correction": "corrected text", "type": "grammar", "explanation": "..." } ],
  "vocabularySuggestions": [ { "original": "good", "suggestion": "beneficial", "context": "..." } ] }`;

      const data = await callAI(prompt, {
        system: 'You are an expert HKDSE English writing examiner (Paper 2). Assess using the official DSE marking criteria: Content/7, Organization/7, Language/7. Target: IELTS 7.24 = DSE 5** Writing. Return ONLY valid JSON.\n\n' +
          'In your Language evaluation, assess vocabulary specificity — does the essay use concrete, tactile, domain-specific language, or does it rely on generic conceptual abstractions? In your Organization evaluation, assess structural asymmetry — does the argument follow a predictable binary structure, or does it introduce unresolved tensions and oblique perspectives? In Content evaluation, assess whether the authorial stance shows genuine perspective with subjective judgment rather than uniformly detached exposition.\n\n' +
          STRUCTURAL_CONSTRAINTS,
        temperature: 0.3,
        maxTokens: 2000,
      });

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
        } else {
          parsed = null;
        }
      }

      const result = parsed || {
        content: { score: 0, feedback: 'Unable to parse AI response. Please try again.' },
        overall: { total: 0, maxTotal: 21, percentage: 0, dseLevel: '—' },
        errors: [],
        vocabularySuggestions: [],
      };

      setCorrectionResult(result);
      setPhase('feedback');

      if (skillAnalytics && result.overall?.total > 0) {
        skillAnalytics.recordSession({
          skill: 'writing',
          type: 'practice',
          paperId: session.id,
          score: result.overall.total,
          totalQuestions: result.overall.maxTotal,
          percentage: result.overall.percentage,
          subScores: {
            content: ((result.content?.score || 0) / 7) * 100,
            organization: ((result.organization?.score || 0) / 7) * 100,
            language: ((result.language?.score || 0) / 7) * 100,
          },
          wordCount,
          duration: (session.metadata?.timeLimit || 40 * 60) - (timeRemaining || 0),
          dseLevel: result.overall.dseLevel,
        });
      }
    } catch (e) {
      console.error('Failed to correct essay:', e);
      setCorrectionResult({
        content: { score: 0, feedback: 'Error: ' + e.message },
        overall: { total: 0, maxTotal: 21, percentage: 0, dseLevel: '—' },
        errors: [],
        vocabularySuggestions: [],
      });
    } finally {
      setSubmitting(false);
    }
  }, [session, essay, callAI, skillAnalytics, wordCount, timeRemaining]);

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
          <h1 className="dse-module__title">✍️ Writing Practice</h1>
          <p className="dse-module__subtitle">Practice DSE-style writing with AI-generated prompts and personalized correction</p>
        </div>
        <div className="reading__start">
          <div className="reading__difficulty-cards">
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className="reading__difficulty-card" onClick={() => startSession(d)} disabled={generating}>
                <span className="reading__difficulty-icon">{d === 'easy' ? '🌱' : d === 'medium' ? '🔥' : '💎'}</span>
                <span className="reading__difficulty-name">{d === 'easy' ? 'Short (250-350w)' : d === 'medium' ? 'Standard (350-450w)' : 'Extended (450-550w)'}</span>
                <span className="reading__difficulty-desc">
                  {d === 'easy' ? 'Simple prompts, 30 min' : d === 'medium' ? 'DSE standard, 40 min' : 'Challenging, 50 min'}
                </span>
              </button>
            ))}
          </div>
          {generating && <div className="reading__generating">Generating your writing prompt...</div>}
        </div>
      </div>
    );
  }

  if (phase === 'writing') {
    const wordLimit = session?.metadata?.wordLimit || { min: 250, max: 400 };
    const isOverLimit = wordCount > wordLimit.max * 1.1;

    return (
      <div className="dse-module">
        <div className="dse-module__header" style={{ paddingBottom: 0 }}>
          <div className="reading__progress-header">
            <button className="dse-module__back" onClick={() => setPhase('start')}>← Back</button>
            <div className="reading__timer" style={{ color: timeRemaining < 300 ? 'var(--color-error)' : undefined }}>{formatTime(timeRemaining)}</div>
          </div>
        </div>
        <div className="writing__body">
          <div className="writing__prompt-panel">
            <div className="writing__prompt-card">
              <h3 className="writing__prompt-label">📝 Task</h3>
              <p className="writing__prompt-text">{session?.prompt}</p>
              <div className="writing__prompt-meta">
                <span>Word limit: {wordLimit.min}–{wordLimit.max} words</span>
                <span>Type: {session?.metadata?.type || 'Essay'}</span>
              </div>
              {session?.metadata?.suggestedPoints?.length > 0 && (
                <div className="writing__prompt-points">
                  <span className="writing__prompt-points-label">Consider these points:</span>
                  <ul>{session.metadata.suggestedPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
          <div className="writing__editor-panel">
            <div
              ref={editorRef}
              className="writing__editor"
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => handleEssayChange(e.currentTarget.innerHTML)}
              data-placeholder="Start writing your essay here..."
            />
            <div className="writing__editor-footer">
              <div className={`writing__wordcount ${isOverLimit ? 'writing__wordcount--over' : ''}`}>
                {wordCount} / {wordLimit.max} words
              </div>
              <button
                className="writing__submit-btn"
                onClick={handleSubmit}
                disabled={wordCount < wordLimit.min * 0.5 || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit for Correction'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'feedback') {
    if (!correctionResult) return null;
    const overall = correctionResult.overall || {};

    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => { setPhase('start'); setSession(null); }}>← Back</button>
          <h1 className="dse-module__title">📊 Writing Feedback</h1>
        </div>
        <div className="writing__feedback-body">
          <div className="writing__feedback-summary">
            <div className="writing__feedback-ring" style={{ '--pct': overall.percentage || 0, '--color': (overall.percentage || 0) >= 80 ? 'var(--color-success)' : (overall.percentage || 0) >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}>
              <svg viewBox="0 0 36 36" className="reading__results-svg">
                <path className="reading__results-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="reading__results-fill" strokeDasharray={`${overall.percentage || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.5" className="reading__results-text" textAnchor="middle">{overall.percentage || 0}%</text>
              </svg>
            </div>
            <div className="writing__feedback-stats">
              <div className="writing__feedback-stat">
                <span className="writing__feedback-stat-value">{overall.total || 0}/{overall.maxTotal || 21}</span>
                <span className="writing__feedback-stat-label">Total Score</span>
              </div>
              <div className="writing__feedback-stat">
                <span className="writing__feedback-stat-value" style={{
                  color: (overall.dseLevel === '5**' || overall.dseLevel === '5*') ? 'var(--color-success)' : overall.dseLevel === '5' || overall.dseLevel === '4' ? 'var(--color-warning)' : 'var(--color-error)',
                }}>{overall.dseLevel || '—'}</span>
                <span className="writing__feedback-stat-label">DSE Level</span>
              </div>
              <div className="writing__feedback-stat">
                <span className="writing__feedback-stat-value">{wordCount}</span>
                <span className="writing__feedback-stat-label">Words Written</span>
              </div>
            </div>
          </div>

          <div className="writing__feedback-categories">
            {['content', 'organization', 'language'].filter(c => correctionResult[c]).map(cat => (
              <div key={cat} className="writing__feedback-category">
                <div className="writing__feedback-category-header">
                  <span className="writing__feedback-category-name">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                  <span className="writing__feedback-category-score">{correctionResult[cat].score}/7</span>
                </div>
                <div className="writing__feedback-category-bar-bg">
                  <div className="writing__feedback-category-bar-fill" style={{
                    width: `${((correctionResult[cat].score || 0) / 7) * 100}%`,
                    background: correctionResult[cat].score >= 5 ? 'var(--color-success)' : correctionResult[cat].score >= 4 ? 'var(--color-warning)' : 'var(--color-error)',
                  }} />
                </div>
                <p className="writing__feedback-category-text">{correctionResult[cat].feedback}</p>
              </div>
            ))}
          </div>

          {correctionResult.errors?.length > 0 && (
            <div className="writing__feedback-section">
              <h3>✏️ Specific Errors</h3>
              {correctionResult.errors.map((e, i) => (
                <div key={i} className="writing__feedback-error">
                  <div className="writing__feedback-error-original">
                    <span className="writing__feedback-error-label">Original:</span>
                    <span className="writing__feedback-error-text">{e.original}</span>
                  </div>
                  <div className="writing__feedback-error-corrected">
                    <span className="writing__feedback-error-label">Correction:</span>
                    <span className="writing__feedback-error-text" style={{ color: 'var(--color-success)' }}>{e.correction}</span>
                  </div>
                  {e.explanation && <div className="writing__feedback-error-explanation">{e.explanation}</div>}
                </div>
              ))}
            </div>
          )}

          {correctionResult.vocabularySuggestions?.length > 0 && (
            <div className="writing__feedback-section">
              <h3>📖 Vocabulary Upgrades</h3>
              <div className="writing__feedback-vocab">
                {correctionResult.vocabularySuggestions.map((v, i) => (
                  <div key={i} className="writing__feedback-vocab-item">
                    <span className="writing__feedback-vocab-original">{v.original}</span>
                    <span className="writing__feedback-vocab-arrow">→</span>
                    <span className="writing__feedback-vocab-suggestion">{v.suggestion}</span>
                    {v.context && <span className="writing__feedback-vocab-context">{v.context}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="reading__results-actions">
            <button className="reading__results-btn" onClick={() => { setPhase('start'); setSession(null); }}>
              ← Back to Writing
            </button>
            <button className="reading__results-btn reading__results-btn--primary" onClick={() => startSession(session?.difficulty || 'medium')}>
              🔄 Practice Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
