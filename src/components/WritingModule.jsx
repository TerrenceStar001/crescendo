import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useView } from '../context/ViewContext';
import { scoreToDseLevel } from '../utils/dseGrading';

const SESSION_KEY = 'crescendo-writing-session';
const TOTAL_DURATION = 7200; // 2 hours in seconds

const PART_A_TYPES = ['email', 'letter', 'blog comment', 'questionnaire response', 'short article', 'speech'];
const PART_B_TYPES = ['article', 'letter', 'speech', 'report', 'story', 'blog', 'review', 'proposal'];

const TEXT_TYPE_BADGES = {
  email: { label: 'Email', color: '#5b5bf0' },
  letter: { label: 'Letter', color: '#e8a87c' },
  'blog comment': { label: 'Blog Comment', color: '#5b5bf0' },
  questionnaire: { label: 'Questionnaire', color: '#5b5bf0' },
  article: { label: 'Article', color: '#4caf50' },
  speech: { label: 'Speech', color: '#e8a87c' },
  report: { label: 'Report', color: '#8a8aa0' },
  story: { label: 'Story', color: '#ff9800' },
  blog: { label: 'Blog', color: '#5b5bf0' },
  review: { label: 'Review', color: '#4caf50' },
  proposal: { label: 'Proposal', color: '#8a8aa0' },
};

function getBadgeInfo(type) {
  if (!type) return { label: 'General', color: '#8a8aa0' };
  const lower = type.toLowerCase();
  return TEXT_TYPE_BADGES[lower] || { label: type, color: '#8a8aa0' };
}

export default function WritingModule({ dsePapers, skillAnalytics, callAI, notes, onBack }) {
  const { focusMode, setFocusMode } = useView();
  const [phase, setPhase] = useState('start');
  const [sessionData, setSessionData] = useState(null);
  const [partA, setPartA] = useState({ essay: '', prompt: null });
  const [partB, setPartB] = useState({ chosenOption: null, essay: '', prompt: null });
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [correctionResult, setCorrectionResult] = useState(null);
  const [correctionPartAResult, setCorrectionPartAResult] = useState(null);
  const [correctionPartBResult, setCorrectionPartBResult] = useState(null);
  const [activePart, setActivePart] = useState('A');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [selfAssessment, setSelfAssessment] = useState([]);
  const [saveIndicator, setSaveIndicator] = useState('');
  const [resubmitMode, setResubmitMode] = useState(false);
  const [reviewSession, setReviewSession] = useState(null);
  const [compareSessionId, setCompareSessionId] = useState(null);
  const [pastWritingSessions, setPastWritingSessions] = useState([]);
  const [practiceMode, setPracticeMode] = useState('both'); // 'both' | 'partA' | 'partB'
  const [partAAnalysisStatus, setPartAAnalysisStatus] = useState(null); // null | 'analysing' | 'done' | 'failed'
  const partAResultRef = useRef(null);
  const editorRef = useRef(null);
  const timerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const partADoneTimerRef = useRef(null);
  const soundPlayedRef = useRef({ thirty: false, fifteen: false, five: false });

  // --- Sound alert helper ---
  const playAlert = useCallback((frequency = 880, duration = 200) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {}
  }, []);

  // --- Timer formatting ---
  const formatExamTime = (s) => {
    if (s === null || s === undefined || isNaN(s)) return '\u2014';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // --- Timer state for CSS classes ---
  const timerClassName = (() => {
    if (timeRemaining === null) return '';
    if (timeRemaining <= 300) return 'writing__timer writing__timer--danger';
    if (timeRemaining <= 900) return 'writing__timer writing__timer--critical';
    if (timeRemaining <= 1800) return 'writing__timer writing__timer--warning';
    return 'writing__timer';
  })();

  // --- Crash recovery on mount ---
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.partA && data.partA.essay && data.phase && !['correction', 'history', 'comparison'].includes(data.phase)) {
          setHasSavedSession(true);
        }
      }
    } catch {}
  }, []);

  const resumeSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.partA?.essay) {
          setPartA(prev => ({ ...prev, essay: data.partA.essay, prompt: data.partA?.prompt || prev.prompt }));
        }
        if (data.partB?.essay) {
          setPartB(prev => ({ ...prev, essay: data.partB.essay, chosenOption: data.partB.chosenOption, prompt: data.partB?.prompt || prev.prompt }));
        }
        if (data.sessionData) {
          setSessionData(data.sessionData);
        }
        if (data.practiceMode) {
          setPracticeMode(data.practiceMode);
        }
        if (data.activePart) {
          setActivePart(data.activePart);
        }
        if (data.timeRemaining) {
          setTimeRemaining(data.timeRemaining);
        }
        if (data.phase) {
          setPhase(data.phase === 'writing' ? 'writingPartA' : data.phase);
        }
        setHasSavedSession(false);

        // If prompts are missing (old session format), regenerate session
        if ((!data.partA?.prompt && !sessionData?.partA?.prompt) || (!data.partB?.prompt && !sessionData?.partB?.options)) {
          // Defer regeneration to next render cycle
          setTimeout(async () => {
            try {
              const session = await dsePapers.generateWritingSession({ notes }, callAI);
              if (session) {
                setSessionData(session);
                setPartA(prev => ({ ...prev, prompt: session.partA?.prompt || prev.prompt }));
                if (session.partB?.options?.length > 0) {
                  setPartB(prev => ({ ...prev, prompt: session.partB.options[0] }));
                }
              }
            } catch (e) {
              console.error('Failed to regenerate prompts for resume:', e);
            }
          }, 0);
        }
      } else {
        setHasSavedSession(false);
      }
    } catch {
      setHasSavedSession(false);
    }
  }, [dsePapers, callAI, notes]);

  const clearSessionStorage = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  // --- Auto-save on every state change ---
  useEffect(() => {
    if (phase === 'start' || phase === 'choosing' || phase === 'correction' || phase === 'history' || phase === 'comparison' || phase === 'correcting') return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          partA: { essay: partA.essay, prompt: partA.prompt },
          partB: { essay: partB.essay, chosenOption: partB.chosenOption, prompt: partB.prompt },
          phase,
          timeRemaining,
          activePart,
          practiceMode,
          sessionData,
          savedAt: Date.now(),
        }));
        setSaveIndicator('Saved');
        setTimeout(() => setSaveIndicator(''), 2000);
      } catch {}
    }, 10000);
    return () => clearTimeout(saveTimerRef.current);
  }, [partA.essay, partA.prompt, partB.essay, partB.chosenOption, partB.prompt, phase, timeRemaining, activePart, practiceMode, sessionData]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(partADoneTimerRef.current);
    };
  }, []);

  // --- Timer countdown ---
  useEffect(() => {
    if (phase !== 'writingPartA' && phase !== 'writingPartB') return;
    if (timeRemaining === null || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (!Number.isFinite(t)) { clearInterval(timerRef.current); return 0; }
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimeout(() => handleSubmit(), 100);
          return 0;
        }
        // Sound alerts at thresholds
        if (soundAlerts && !soundPlayedRef.current[t <= 300 ? 'five' : t <= 900 ? 'fifteen' : 'thirty']) {
          const key = t <= 300 ? 'five' : t <= 900 ? 'fifteen' : 'thirty';
          soundPlayedRef.current[key] = true;
          playAlert(key === 'five' ? 1200 : key === 'fifteen' ? 1000 : 800);
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeRemaining, soundAlerts, playAlert]);

  // --- Load writing history ---
  useEffect(() => {
    if (phase === 'history' || phase === 'comparison') {
      (async () => {
        const sessions = await dsePapers.writingSessionGet?.() || [];
        setPastWritingSessions(sessions);
      })();
    }
  }, [phase, dsePapers]);

  // --- Start session ---
  const handleStartSession = useCallback(async () => {
    setGenerating(true);
    try {
      const session = await dsePapers.generateWritingSession({ notes }, callAI);
      if (session) {
        setSessionData(session);
        const partAPrompt = session.partA?.prompt || null;
        setPartA({ essay: '', prompt: partAPrompt });
        setPartB({ chosenOption: null, essay: '', prompt: null });
        setTimeRemaining(TOTAL_DURATION);
        setPhase('choosing');
        soundPlayedRef.current = { thirty: false, fifteen: false, five: false };
      }
    } catch (e) {
      console.error('Failed to start writing session:', e);
    } finally {
      setGenerating(false);
    }
  }, [dsePapers, callAI, notes]);

  // --- Part B option selection ---
  const handleSelectOption = useCallback((index) => {
    setPartB(prev => ({ ...prev, chosenOption: index }));
  }, []);

  const handleConfirmOption = useCallback(() => {
    if (practiceMode === 'partA') {
      setPhase('writingPartA');
      return;
    }
    if (partB.chosenOption === null) return;
    const opt = sessionData?.partB?.options?.[partB.chosenOption];
    if (opt) {
      setPartB(prev => ({ ...prev, prompt: opt }));
    }
    if (practiceMode === 'partB') {
      setPhase('writingPartB');
    } else {
      setPhase('writingPartA');
    }
  }, [partB.chosenOption, sessionData, practiceMode]);

  // --- Essay change handler ---
  const handleEssayChange = useCallback((html) => {
    if (activePart === 'A') {
      setPartA(prev => ({ ...prev, essay: html }));
    } else {
      setPartB(prev => ({ ...prev, essay: html }));
    }
  }, [activePart]);

  // --- Get current essay text ---
  const getCurrentEssay = useCallback(() => {
    const el = editorRef.current;
    if (el) return el.innerHTML;
    return activePart === 'A' ? partA.essay : partB.essay;
  }, [activePart, partA.essay, partB.essay]);

  // --- Get current essay plain text ---
  const getEssayPlainText = useCallback((html) => {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
  }, []);

  // --- Submit handler (D-38: separate correction per part) ---
  const handleSubmit = useCallback(async () => {
    const essay = getCurrentEssay();
    const plainText = getEssayPlainText(essay);
    if (!plainText) return;

    clearInterval(timerRef.current);
    setFocusMode(false);
    setSubmitting(true);

    const part = activePart;

    // In 'both' mode, save Part A essay and go directly to Part B — run AI in background
    if (part === 'A' && practiceMode === 'both') {
      setPartAAnalysisStatus('analysing');
      setActivePart('B');
      setSelfAssessment([]);
      soundPlayedRef.current = { thirty: false, fifteen: false, five: false };
      setPhase('writingPartB');
      // Fire-and-forget AI analysis for Part A
      (async () => {
        try {
          const promptInfo = sessionData?.partA?.prompt || partA.prompt;
          const prompt = dsePapers.buildCorrectionPrompt('A', { essay, text: plainText, prompt: promptInfo }, selfAssessment);
          const data = await callAI(prompt, {
            system: 'You are an expert HKDSE English examiner (Paper 2 Writing). Assess using official HKEAA criteria: Content/7, Organization/7, Language/7. Return ONLY valid JSON.',
            temperature: 0.3,
            maxTokens: 3000,
          });
          const parsed = dsePapers.parseCorrectionResponse(data);
          if (!parsed) throw new Error('Failed to parse AI response');
          const partTotal = (parsed.content?.score || 0) + (parsed.organization?.score || 0) + (parsed.language?.score || 0);
          const partPct = Math.round((partTotal / 21) * 100);
          const dseLevel = scoreToDseLevel(partPct, 'writing').level;
          parsed.overall = { ...parsed.overall, total: partTotal, maxTotal: 21, percentage: partPct, dseLevel };
          setCorrectionPartAResult(parsed);
          partAResultRef.current = parsed;
          setPartAAnalysisStatus('done');
        } catch (e) {
          console.error('Background Part A analysis failed:', e);
          setPartAAnalysisStatus('failed');
        }
      })();
      setSubmitting(false);
      return;
    }

    setPhase(part === 'A' ? 'correctingPartA' : 'correctingPartB');

    try {
      const promptInfo = part === 'A'
        ? (sessionData?.partA?.prompt || partA.prompt)
        : (partB.prompt || sessionData?.partB?.options?.[partB.chosenOption]);

      const prompt = dsePapers.buildCorrectionPrompt(part, { essay, text: plainText, prompt: promptInfo }, selfAssessment);

      const data = await callAI(prompt, {
        system: 'You are an expert HKDSE English examiner (Paper 2 Writing). Assess using official HKEAA criteria: Content/7, Organization/7, Language/7. Return ONLY valid JSON.',
        temperature: 0.3,
        maxTokens: 3000,
      });

      const parsed = dsePapers.parseCorrectionResponse(data);
      if (!parsed) throw new Error('Failed to parse AI response. The AI may have returned invalid JSON. Try a different model or check your API endpoint.');

      const partTotal = (parsed.content?.score || 0) + (parsed.organization?.score || 0) + (parsed.language?.score || 0);
      const partPct = Math.round((partTotal / 21) * 100);
      const dseLevel = scoreToDseLevel(partPct, 'writing').level || '—';

      parsed.overall = { ...parsed.overall, total: partTotal, maxTotal: 21, percentage: partPct, dseLevel };

      if (part === 'A') {
        setCorrectionPartAResult(parsed);
        setPhase('correctionPartA');
      } else {
        // If Part A analysis hasn't completed yet (both mode), wait with timeout
        if (practiceMode === 'both' && !partAResultRef.current && partAAnalysisStatus !== 'failed') {
          setPhase('correctingPartB');
          await new Promise((resolve, reject) => {
            let waited = 0;
            const check = () => {
              if (partAResultRef.current) { resolve(); return; }
              if (partAAnalysisStatus === 'failed') { reject(new Error('Part A analysis failed')); return; }
              waited += 300;
              if (waited > 30000) { reject(new Error('Timed out waiting for Part A analysis')); return; }
              setTimeout(check, 300);
            };
            check();
          }).catch(() => {
            // Part A failed — create a stub so we can still show Part B results
            partAResultRef.current = {
              content: { score: 0, feedback: '' },
              organization: { score: 0, feedback: '' },
              language: { score: 0, feedback: '' },
              overall: { total: 0, maxTotal: 21, percentage: 0, dseLevel: '—', narrativeSummary: 'Part A analysis was unavailable.' },
              errors: [], vocabularySuggestions: [], goodLanguage: [], sectionBreakdown: {}, pitfallsAvoided: [], targetedImprovements: [], inlineAnnotations: [],
            };
          });
        }
        const partAResult = partAResultRef.current || correctionPartAResult;
        const combined = dsePapers.combineCorrections(partAResult, parsed);
        setCorrectionPartBResult(parsed);
        setCorrectionResult(combined);
        setPhase('correctionCombined');
        saveSessionToHistory({
          partA: { essay: partA.essay, prompt: sessionData?.partA?.prompt, correction: correctionPartAResult },
          partB: { essay: partB.essay, prompt: partB.prompt, correction: parsed },
          combined,
        });
        clearSessionStorage();
      }
    } catch (e) {
      console.error('Failed to correct essay:', e);
      const errorResult = {
        content: { score: 0, feedback: 'Correction failed. Please try again.' },
        organization: { score: 0, feedback: '' },
        language: { score: 0, feedback: '' },
        overall: { total: 0, maxTotal: 21, percentage: 0, dseLevel: '—', narrativeSummary: 'Correction failed.' },
        errors: [], vocabularySuggestions: [], goodLanguage: [], sectionBreakdown: {}, pitfallsAvoided: [], targetedImprovements: [], inlineAnnotations: [],
      };
      if (part === 'B' && correctionPartAResult) {
        // Part B failed but Part A succeeded — show combined with Part A data
        setCorrectionPartBResult(errorResult);
        const combined = dsePapers.combineCorrections(correctionPartAResult, errorResult);
        setCorrectionResult(combined);
      } else {
        setCorrectionResult(errorResult);
      }
      setPhase(part === 'A' ? 'correctionPartA' : 'correctionCombined');
      setSubmitting(false);
    }
  }, [activePart, getCurrentEssay, getEssayPlainText, partA, partB, sessionData, selfAssessment, correctionPartAResult, callAI, skillAnalytics, dsePapers, setFocusMode, practiceMode]);

  // --- Proceed to Part B ---
  const handleProceedToPartB = useCallback(() => {
    setActivePart('B');
    setSelfAssessment([]);
    setPhase('writingPartB');
    soundPlayedRef.current = { thirty: false, fifteen: false, five: false };
  }, []);

  // --- Save session to IndexedDB ---
  const saveSessionToHistory = useCallback(async (data) => {
    try {
      const DSE_KEYS = { WRITING_SESSIONS: 'crescendo-writing-sessions' };
      const existing = await dsePapers.writingSessionGet?.() || [];
      const session = {
        id: `writing_ses_${Date.now()}`,
        completedAt: new Date().toISOString(),
        partA: {
          essay: data.partA?.essay || partA.essay,
          essayPlainText: getEssayPlainText(data.partA?.essay || partA.essay),
          wordCount: getEssayPlainText(data.partA?.essay || partA.essay).split(/\s+/).filter(Boolean).length,
          prompt: data.partA?.prompt,
          correction: data.partA?.correction,
        },
        partB: {
          essay: data.partB?.essay || partB.essay,
          essayPlainText: getEssayPlainText(data.partB?.essay || partB.essay),
          wordCount: getEssayPlainText(data.partB?.essay || partB.essay).split(/\s+/).filter(Boolean).length,
          chosenOption: partB.chosenOption,
          prompt: data.partB?.prompt,
          correction: data.partB?.correction,
        },
        correction: data.combined,
        selfAssessment: { unsureAreas: selfAssessment },
        duration: TOTAL_DURATION - (timeRemaining || 0),
        dseLevel: data.combined?.overall?.dseLevel || '—',
      };
      const updated = [session, ...existing].slice(0, 50);
      dsePapers.writingSessionSet?.(updated);
    } catch (e) {
      console.warn('Failed to save session to history:', e);
    }
  }, [partA.essay, partB.essay, partB.chosenOption, selfAssessment, timeRemaining, getEssayPlainText, dsePapers]);

  // --- Reset ---
  const handleReset = useCallback(() => {
    setPhase('start');
    setSessionData(null);
    setPartA({ essay: '', prompt: null });
    setPartB({ chosenOption: null, essay: '', prompt: null });
    setTimeRemaining(null);
    setCorrectionResult(null);
    setCorrectionPartAResult(null);
    setCorrectionPartBResult(null);
    setCorrectionResult(null);
    setPartAAnalysisStatus(null);
    partAResultRef.current = null;
    setActivePart('A');
    setSelfAssessment([]);
    setResubmitMode(false);
    clearSessionStorage();
  }, [clearSessionStorage]);

  // --- Render helpers ---

  // Exam header
  const renderExamHeader = () => (
    <div className="writing__exam-header">
      <div className="writing__exam-header-title">Hong Kong Diploma of Secondary Education Examination</div>
      <div className="writing__exam-header-paper">English Language Paper 2 \u2014 Writing</div>
      <div className="writing__exam-header-instructions">Answer ALL questions in Part A and ONE question from Part B. Write approximately 200 words for Part A and 400\u2013500 words for Part B.</div>
    </div>
  );

  // Timer display
  const renderTimer = () => (
    <div className={timerClassName} title={formatExamTime(timeRemaining)}>
      {formatExamTime(timeRemaining)}
    </div>
  );

  // Sound toggle
  const renderSoundToggle = () => (
    <button
      className="writing__sound-toggle"
      onClick={() => setSoundAlerts(!soundAlerts)}
      title={soundAlerts ? 'Disable sound alerts' : 'Enable sound alerts'}
    >
      {soundAlerts ? '\uD83D\uDD0A' : '\uD83D\uDD07'}
    </button>
  );

  // Reusable correction block for one part
  const renderCorrectionBlock = (result, partLabel, essayHTML) => {
    if (!result) return null;
    const block = result;
    const blockErrors = block.errors || [];
    const errorTypes = ['grammar', 'vocabulary', 'structure', 'style', 'punctuation', 'spelling', 'content'];
    const errorColors = {
      grammar: '#ef5350', vocabulary: '#ff9800', structure: '#5b5bf0',
      style: '#8a8aa0', punctuation: '#e8a87c', spelling: '#ef5350', content: '#ff9800',
    };
    const errorTypeCounts = errorTypes.map(type => ({
      type, count: blockErrors.filter(e => e.type === type).length, color: errorColors[type]
    }));
    const maxErrorCount = Math.max(...errorTypeCounts.map(e => e.count), 1);

    return (
      <div className="writing__correction-block">{partLabel !== 'Combined' && (
        <h3 className="writing__correction-block-title">{partLabel}</h3>
      )}

        {/* Section header for combined views */}
        {partLabel === 'Combined' && <h3 className="writing__correction-block-title">Correction Summary</h3>}

        {/* Rubric bars */}
        <div className="writing__correction-rubric">
          {['content', 'organization', 'language'].map(cat => (
            <div key={cat} className="writing__correction-rubric-item">
              <div className="writing__correction-rubric-header">
                <span className="writing__correction-rubric-name">
                  {cat === 'content' ? 'Content' : cat === 'organization' ? 'Organisation' : 'Language'} (7 marks)
                </span>
                <span className="writing__correction-rubric-score">{block[cat]?.score || 0}/7</span>
              </div>
              <div className="writing__correction-rubric-bar-bg">
                <div className="writing__correction-rubric-fill"
                  style={{
                    width: `${((block[cat]?.score || 0) / 7) * 100}%`,
                    background: (block[cat]?.score || 0) >= 5 ? 'var(--color-success)' : (block[cat]?.score || 0) >= 4 ? 'var(--color-warning)' : 'var(--color-error)',
                  }}
                />
              </div>
              {block[cat]?.feedback && <div className="writing__correction-rubric-feedback">{block[cat].feedback}</div>}
            </div>
          ))}
        </div>

        {/* Section breakdown */}
        {block.sectionBreakdown && Object.keys(block.sectionBreakdown).length > 0 && (
          <div className="writing__section-breakdown">
            <h3 className="writing__section-breakdown-header">Section-by-Section Breakdown</h3>
            <div className="writing__section-breakdown-sections">
              {Object.entries(block.sectionBreakdown).map(([section, data]) => (
                <div key={section} className="writing__section-breakdown-item">
                  <div className="writing__section-breakdown-header-row">
                    <span className="writing__section-breakdown-name">{section.charAt(0).toUpperCase() + section.slice(1)}</span>
                    <span className="writing__section-breakdown-score">{data.score || 0}/7</span>
                  </div>
                  <div className="writing__section-breakdown-bar-bg">
                    <div className="writing__section-breakdown-bar-fill" style={{ width: `${((data.score || 0) / 7) * 100}%` }} />
                  </div>
                  {data.feedback && <p className="writing__section-breakdown-feedback">{data.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error frequency chart */}
        {blockErrors.length > 0 && (
          <div className="writing__error-chart">
            <h3 className="writing__error-chart-header">Error Frequency</h3>
            <div className="writing__error-chart-bars">
              {errorTypeCounts.filter(e => e.count > 0).map(({ type, count, color }) => (
                <div key={type} className="writing__error-chart-row">
                  <span className="writing__error-chart-label" style={{ color }}>{type} ({count})</span>
                  <div className="writing__error-chart-bar-bg">
                    <div className="writing__error-chart-bar-fill" style={{ width: `${(count / maxErrorCount) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annotated essay */}
        {(block.inlineAnnotations && block.inlineAnnotations.length > 0) && (
          <div className="writing__annotated-essay">
            <h3 className="writing__annotated-essay-header">Your Essay with Annotations</h3>
            <div className="writing__annotated-essay-body">
              {(() => {
                const plainText = getEssayPlainText(essayHTML);
                let result = plainText;
                const annotations = [];
                block.inlineAnnotations.forEach((ann, i) => {
                  const escaped = ann.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(`(${escaped})`, 'g');
                  result = result.replace(regex, (match) => {
                    annotations.push({ ...ann, _index: i });
                    return '\uFFFC';
                  });
                });
                let idx = 0;
                const parts = result.split('\uFFFC');
                return parts.map((part, i) => (
                  <React.Fragment key={i}>
                    {part}
                    {annotations[idx] && (
                      <span className={`writing__annotation writing__annotation--${annotations[idx].type}`}
                        title={`${annotations[idx].type}: '${annotations[idx].text}' \u2192 '${annotations[idx].replacement}'`}
                      >
                        {annotations[idx].text}
                      </span>
                    )}
                    {idx++}
                  </React.Fragment>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Error list */}
        {blockErrors.length > 0 && (
          <div className="writing__correction-errors">
            <h3 className="writing__correction-errors-header">Detailed Error Analysis</h3>
            {[...blockErrors].sort((a, b) => {
              const sevOrder = { Critical: 0, Major: 1, Minor: 2 };
              return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
            }).map((err, i) => (
              <div key={i} className="writing__correction-error">
                <div className="writing__correction-error-header-row">
                  <span className={`writing__correction-error-severity writing__correction-error-severity--${err.severity?.toLowerCase() || 'minor'}`}>
                    {err.severity || 'Minor'}
                  </span>
                  <span className="writing__correction-error-type" style={{ color: errorColors[err.type] || '#8a8aa0' }}>
                    {err.type}
                  </span>
                  {err.location && (
                    <span className="writing__correction-error-location">
                      Para {err.location.paragraph}, Line {err.location.line}
                    </span>
                  )}
                </div>
                <div className="writing__correction-error-original">
                  <span className="writing__correction-error-label">Original:</span>
                  <span className="writing__correction-error-text">{err.original}</span>
                </div>
                <div className="writing__correction-error-corrected">
                  <span className="writing__correction-error-label">Correction:</span>
                  <span className="writing__correction-error-text" style={{ color: 'var(--color-success)' }}>{err.correction}</span>
                </div>
                {err.explanation && <div className="writing__correction-error-explanation">{err.explanation}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Good language use */}
        {block.goodLanguage && block.goodLanguage.length > 0 && (
          <div className="writing__correction-good">
            <h3 className="writing__correction-good-header">Good Language Use</h3>
            {block.goodLanguage.map((item, i) => (
              <div key={i} className="writing__correction-good-item">
                <span className="writing__correction-good-phrase">"{item.phrase}"</span>
                {item.comment && <span className="writing__correction-good-comment">{item.comment}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Vocabulary upgrades */}
        {block.vocabularySuggestions && block.vocabularySuggestions.length > 0 && (
          <div className="writing__correction-vocab">
            <h3 className="writing__correction-vocab-header">Vocabulary Upgrades</h3>
            <div className="writing__correction-vocab-table">
              {block.vocabularySuggestions.map((v, i) => (
                <div key={i} className="writing__correction-vocab-item">
                  <span className="writing__correction-vocab-original">{v.original}</span>
                  <span className="writing__correction-vocab-arrow">{v.original ? '\u2192' : ''}</span>
                  <span className="writing__correction-vocab-suggestion">{v.suggestion}</span>
                  {v.cefrLevel && <span className="writing__correction-vocab-cefr">({v.cefrLevel})</span>}
                  {v.context && <span className="writing__correction-vocab-context">{v.context}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pitfalls avoided */}
        {block.pitfallsAvoided && block.pitfallsAvoided.length > 0 && (
          <div className="writing__correction-pitfalls">
            <h3 className="writing__correction-pitfalls-header">Common DSE Pitfalls You Avoided</h3>
            {block.pitfallsAvoided.map((p, i) => (
              <div key={i} className="writing__correction-pitfalls-item">
                {p}
              </div>
            ))}
          </div>
        )}

        {/* Targeted improvements */}
        {block.targetedImprovements && block.targetedImprovements.length > 0 && (
          <div className="writing__correction-improvements">
            <h3 className="writing__correction-improvements-header">Next Steps to Level Up</h3>
            {block.targetedImprovements.map((item, i) => (
              <div key={i} className="writing__correction-improvement-item">
                <div className="writing__correction-improvement-area">{item.area}</div>
                {item.currentWeakness && <div className="writing__correction-improvement-weakness">Issue: {item.currentWeakness}</div>}
                {item.concreteFix && <div className="writing__correction-improvement-fix">Fix: {item.concreteFix}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Start screen
  if (phase === 'start') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={onBack}>← Dashboard</button>
          <h1 className="dse-module__title">Writing Practice</h1>
          <p className="dse-module__subtitle">Practice DSE Paper 2 Writing with AI-powered correction</p>
        </div>

        {hasSavedSession && (
          <div className="writing__resume-banner">
            <span>You have an unsaved writing session. Would you like to resume?</span>
            <button className="writing__resume-btn" onClick={resumeSession}>Resume Session</button>
            <button className="writing__resume-skip" onClick={() => { clearSessionStorage(); setHasSavedSession(false); }}>Discard</button>
          </div>
        )}

        <div className="writing__start">
          <div className="writing__start-cards">
            <div className="writing__start-card">
              <div className="writing__start-card-badge writing__start-card-badge--a">Part A (Compulsory)</div>
              <div className="writing__start-card-title">Short Writing Task</div>
              <div className="writing__start-card-desc">Write ~200 words in a practical text type</div>
              <div className="writing__start-card-types">
                {PART_A_TYPES.slice(0, 4).map(t => (
                  <span key={t} className="writing__start-card-type-chip">{t}</span>
                ))}
                {PART_A_TYPES.length > 4 && <span className="writing__start-card-type-chip">+{PART_A_TYPES.length - 4} more</span>}
              </div>
            </div>
            <div className="writing__start-card">
              <div className="writing__start-card-badge writing__start-card-badge--b">Part B (Choose from options)</div>
              <div className="writing__start-card-title">Extended Writing Task</div>
                <div className="writing__start-card-desc">Choose ONE of 3 options, write 400\u2013500 words</div>
                <div className="writing__start-card-types">
                  {PART_B_TYPES.slice(0, 3).map(t => (
                    <span key={t} className="writing__start-card-type-chip">{t}</span>
                  ))}
                  {PART_B_TYPES.length > 3 && <span className="writing__start-card-type-chip">+{PART_B_TYPES.length - 3} more</span>}
              </div>
            </div>
          </div>

          <div className="writing__start-actions">
            <button className="writing__start-btn--primary" onClick={handleStartSession} disabled={generating}>
              {generating ? 'Generating...' : 'Start Writing Practice'}
            </button>
            <button className="writing__start-btn--secondary" onClick={() => setPhase('history')}>
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Choosing Part B option
  if (phase === 'choosing') {
    const options = (sessionData?.partB?.options || []).slice(0, 3);
    const showPartBSelection = practiceMode !== 'partA';
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => setPhase('start')}>← Back</button>
          <h1 className="dse-module__title">Writing Practice</h1>
        </div>
        <div className="writing__practice-mode-selector">
          <button
            className={`writing__practice-mode-btn ${practiceMode === 'both' ? 'writing__practice-mode-btn--active' : ''}`}
            onClick={() => setPracticeMode('both')}
          >
            Both Parts (Real DSE)
          </button>
          <button
            className={`writing__practice-mode-btn ${practiceMode === 'partA' ? 'writing__practice-mode-btn--active' : ''}`}
            onClick={() => setPracticeMode('partA')}
          >
            Part A Only
          </button>
          <button
            className={`writing__practice-mode-btn ${practiceMode === 'partB' ? 'writing__practice-mode-btn--active' : ''}`}
            onClick={() => setPracticeMode('partB')}
          >
            Part B Only
          </button>
        </div>
        {showPartBSelection && (
          <>
            <div className="writing__part-b-header">Choose ONE of the following tasks:</div>
            <div className="writing__part-b-options">
              {options.map((opt, idx) => {
                const badge = getBadgeInfo(opt.type);
                return (
                  <button
                    key={idx}
                    className={`writing__part-b-option ${partB.chosenOption === idx ? 'writing__part-b-option--selected' : ''}`}
                    onClick={() => handleSelectOption(idx)}
                  >
                    <span className="writing__part-b-option-badge" style={{ background: badge.color }}>
                      {badge.label}
                    </span>
                    <div className="writing__part-b-option-title">{opt.title}</div>
                    <div className="writing__part-b-option-desc">{opt.context?.slice(0, 80)}...</div>
                    <div className="writing__part-b-option-limit">
                      {opt.wordLimit?.min}\u2013{opt.wordLimit?.max} words
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="writing__part-b-confirm">
          <button
            className="writing__start-btn--primary"
            onClick={handleConfirmOption}
            disabled={showPartBSelection ? partB.chosenOption === null : false}
          >
            {practiceMode === 'partA' ? 'Start Part A' : 'Confirm Selection'}
          </button>
        </div>
      </div>
    );
  }

  // Correcting state (Part A or Part B)
  if (phase === 'correctingPartA' || phase === 'correctingPartB') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => { setPhase(activePart === 'A' ? 'writingPartA' : 'writingPartB'); }}>← Cancel</button>
          <h1 className="dse-module__title">AI Examiner is reviewing your essay...</h1>
        </div>
        <div className="writing__correcting">
          <div className="writing__correcting-spinner"><div className="writing__spinner-ring"></div></div>
          <div className="writing__correcting-steps">
            <span>Analyzing content<span className="writing__correcting-dots">...</span></span>
            <span>Evaluating organization<span className="writing__correcting-dots">...</span></span>
            <span>Checking language<span className="writing__correcting-dots">...</span></span>
          </div>
        </div>
      </div>
    );
  }

  // Correction Part A results
  if (phase === 'correctionPartA') {
    const cr = correctionPartAResult;
    if (!cr) return null;
    const total = (cr.content?.score || 0) + (cr.organization?.score || 0) + (cr.language?.score || 0);
    const pct = Math.round((total / 21) * 100);
    const level = cr.overall?.dseLevel || scoreToDseLevel(pct, 'writing').level || '—';

    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => setPhase('writingPartA')}>← Back to Writing</button>
          <h1 className="dse-module__title">HKEAA Marking Scheme - Part A</h1>
        </div>
        <div className="writing__correction">
          {/* Summary ring */}
          <div className="writing__correction-summary">
            <div className="writing__correction-ring" style={{ '--pct': pct }}>
              <svg viewBox="0 0 36 36" className="reading__results-svg">
                <path className="reading__results-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="reading__results-fill" strokeDasharray={`${pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.5" className="reading__results-text" textAnchor="middle">{pct}%</text>
              </svg>
            </div>
            <div className={`writing__correction-level writing__correction-level--${pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low'}`}>
              DSE Level: {level}
            </div>
            <div className="writing__correction-total">{total} / 21</div>
            {cr.overall?.narrativeSummary && (
              <div className="writing__correction-narrative">
                <div className="writing__correction-narrative-label">Overall Feedback</div>
                {cr.overall.narrativeSummary}
              </div>
            )}
          </div>

          {renderCorrectionBlock(cr, 'Part A', partA.essay)}

          {/* Action buttons */}
          {practiceMode === 'both' && !sessionData?.partB?.options && (
            <div className="writing__correction-actions">
              <button className="writing__start-btn--secondary" onClick={handleReset}>
                Start New Practice
              </button>
            </div>
          )}
          {practiceMode === 'both' && sessionData?.partB?.options && (
            <div className="writing__correction-actions">
              <button className="writing__proceed-btn" onClick={handleProceedToPartB}>
                Proceed to Part B \u2192
              </button>
              <button className="writing__start-btn--secondary" onClick={handleReset}>
                Start New Practice
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Combined correction results
  if (phase === 'correctionCombined') {
    const cr = correctionResult;
    if (!cr) return null;

    // Error state
    if (cr.overall?.percentage === 0 && (!cr.errors || cr.errors.length === 0)) {
      return (
        <div className="dse-module">
          <div className="dse-module__header">
            <button className="dse-module__back" onClick={handleReset}>← Back</button>
            <h1 className="dse-module__title">Correction Failed</h1>
          </div>
          <div className="writing__correction-error-state">
            <p>The AI examiner encountered an error. You can try submitting again, or save your essay and try later.</p>
            <button className="writing__start-btn--primary" onClick={() => {
              // Retry correction for the failed part
              setPhase(activePart === 'B' || practiceMode === 'both' ? 'correctingPartB' : 'correctingPartA');
              setTimeout(() => handleSubmit(), 50);
            }}>Try Again</button>
          </div>
        </div>
      );
    }

    const total = cr.overall?.total || 0;
    const maxTotal = cr.overall?.maxTotal || 42;
    const pct = cr.overall?.percentage || 0;
    const level = cr.overall?.dseLevel || scoreToDseLevel(pct, 'writing').level || '\u2014';

    // Cross-session patterns
    const crossSessionPatterns = [];
    try {
      const sessions = dsePapers.writingSessionGet?.() || [];
      const recent = sessions.slice(0, 5);
      const errorTypes = ['grammar', 'vocabulary', 'structure', 'style', 'punctuation', 'spelling', 'content'];
      errorTypes.forEach(type => {
        const count = recent.filter(s => (s.correction?.errors || []).some(e => e.type === type)).length;
        if (count > 0) {
          crossSessionPatterns.push({ type, count, total: recent.length });
        }
      });
    } catch {}

    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={handleReset}>← Back</button>
          <h1 className="dse-module__title">HKEAA Marking Scheme</h1>
        </div>
        <div className="writing__correction">
          {/* Summary */}
          <div className="writing__correction-summary">
            <div className="writing__correction-ring" style={{ '--pct': pct }}>
              <svg viewBox="0 0 36 36" className="reading__results-svg">
                <path className="reading__results-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="reading__results-fill" strokeDasharray={`${pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.5" className="reading__results-text" textAnchor="middle">{pct}%</text>
              </svg>
            </div>
            <div className={`writing__correction-level writing__correction-level--${pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low'}`}>
              DSE Level: {level}
            </div>
            <div className="writing__correction-total">{total} / {maxTotal}</div>
            {cr.overall?.narrativeSummary && (
              <div className="writing__correction-narrative">
                <div className="writing__correction-narrative-label">Overall Feedback</div>
                {cr.overall.narrativeSummary}
              </div>
            )}
          </div>

          {/* Part A / Part B breakdown */}
          {correctionPartAResult && correctionPartBResult && (
            <div className="writing__correction-part-breakdown">
              <div className="writing__correction-part">
                <h3 className="writing__correction-part-title">Part A</h3>
                <div className="writing__correction-part-score">
                  {(correctionPartAResult.content?.score || 0) + (correctionPartAResult.organization?.score || 0) + (correctionPartAResult.language?.score || 0)} / 21
                </div>
                {['content', 'organization', 'language'].map(cat => (
                  <div key={cat} className="writing__correction-part-row">
                    <span className="writing__correction-part-label">{cat === 'content' ? 'Content' : cat === 'organization' ? 'Organisation' : 'Language'}</span>
                    <span className="writing__correction-part-score-val">{correctionPartAResult[cat]?.score || 0}/7</span>
                  </div>
                ))}
              </div>
              <div className="writing__correction-part">
                <h3 className="writing__correction-part-title">Part B</h3>
                <div className="writing__correction-part-score">
                  {(correctionPartBResult.content?.score || 0) + (correctionPartBResult.organization?.score || 0) + (correctionPartBResult.language?.score || 0)} / 21
                </div>
                {['content', 'organization', 'language'].map(cat => (
                  <div key={cat} className="writing__correction-part-row">
                    <span className="writing__correction-part-label">{cat === 'content' ? 'Content' : cat === 'organization' ? 'Organisation' : 'Language'}</span>
                    <span className="writing__correction-part-score-val">{correctionPartBResult[cat]?.score || 0}/7</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Part A correction block */}
          {renderCorrectionBlock(correctionPartAResult, 'Part A - Correction', partA.essay)}

          {/* Part B correction block */}
          {renderCorrectionBlock(correctionPartBResult, 'Part B - Correction', partB.essay)}

          {/* Cross-session error patterns */}
          {crossSessionPatterns.length > 0 && (
            <div className="writing__correction-patterns">
              <h3 className="writing__correction-patterns-header">Error Pattern Across Sessions</h3>
              <div className="writing__correction-patterns-list">
                {crossSessionPatterns.map(pattern => (
                  <div key={pattern.type} className="writing__correction-patterns-item">
                    <span className="writing__correction-patterns-type">{pattern.type}</span>
                    <span className="writing__correction-patterns-count">
                      in {pattern.count} of last {pattern.total} sessions
                      {pattern.count >= 3 ? ' - Recurring issue' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="writing__correction-actions">
            <button className="writing__resubmit-btn" onClick={() => { setResubmitMode(true); setPhase('writingPartA'); }}>
              Revise and Re-submit
            </button>
            <button className="writing__start-btn--secondary" onClick={() => setPhase('history')}>
              View History
            </button>
            <button className="writing__start-btn--primary" onClick={handleReset}>
              Start New Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  // History phase
  if (phase === 'history') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => setPhase(resubmitMode ? 'correctionCombined' : 'start')}>← Back</button>
          <h1 className="dse-module__title">Writing History</h1>
        </div>
        <div className="writing__history">
          {pastWritingSessions.length === 0 ? (
            <div className="writing__history-empty">
              <p>No writing sessions yet.</p>
              <p>Complete a practice session to see your history here.</p>
              <button className="writing__start-btn--primary" onClick={() => setPhase('start')}>Start Writing Practice</button>
            </div>
          ) : (
            <div className="writing__history-list">
              {pastWritingSessions.map((ses, idx) => (
                <div key={ses.id || idx} className="writing__history-item">
                  <div className="writing__history-meta">
                    <span className="writing__history-date">{ses.completedAt ? new Date(ses.completedAt).toLocaleDateString() : 'Unknown date'}</span>
                    {ses.partB?.prompt && (
                      <span className="writing__history-type">{getBadgeInfo(ses.partB.prompt.type)?.label || ses.partB.prompt.type || 'Part B'}</span>
                    )}
                  </div>
                  <div className="writing__history-title">
                    {ses.partB?.prompt?.title || ses.partA?.prompt?.title || 'Untitled'}
                  </div>
                  <div className="writing__history-score-row">
                    <span className={`writing__history-level writing__history-level--${(ses.correction?.overall?.percentage || 0) >= 80 ? 'high' : (ses.correction?.overall?.percentage || 0) >= 60 ? 'mid' : 'low'}`}>
                      DSE {ses.dseLevel || '—'}
                    </span>
                    <span className="writing__history-score">
                      {ses.correction?.overall?.total || 0}/{ses.correction?.overall?.maxTotal || 42}
                    </span>
                  </div>
                  {pastWritingSessions.length >= 2 && (
                    <button
                      className="writing__history-compare-btn"
                      onClick={() => {
                        setCompareSessionId(ses.id);
                        setPhase('comparison');
                      }}
                    >
                      Compare
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Comparison phase
  if (phase === 'comparison') {
    const s1 = pastWritingSessions.find(s => s.id === compareSessionId) || pastWritingSessions[0];
    const s2 = pastWritingSessions.filter(s => s.id !== (compareSessionId || pastWritingSessions[0]?.id))[0];
    if (!s1 || !s2) {
      return (
        <div className="dse-module">
          <div className="dse-module__header">
            <button className="dse-module__back" onClick={() => setPhase('history')}>← Back</button>
            <h1 className="dse-module__title">Session Comparison</h1>
          </div>
          <div className="writing__comparison-error">Select 2 sessions from history to compare.</div>
        </div>
      );
    }

    const diff = (a, b) => {
      const d = b - a;
      return d > 0 ? { cls: 'writing__comparison-diff-item--improved', text: `+${d}` } : d < 0 ? { cls: 'writing__comparison-diff-item--worse', text: `${d}` } : { cls: 'writing__comparison-diff-item--same', text: '0' };
    };

    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => setPhase('history')}>← Back to History</button>
          <h1 className="dse-module__title">Session Comparison</h1>
        </div>
        <div className="writing__comparison">
          <div className="writing__comparison-panels">
            <div className="writing__comparison-panel">
              <h3>Session 1 \u2014 {s1.completedAt ? new Date(s1.completedAt).toLocaleDateString() : 'Unknown'}</h3>
              <div className="writing__comparison-stats">
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">Content</span><span className="writing__comparison-stat-value">{s1.correction?.content?.score || 0}/7</span></div>
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">Organisation</span><span className="writing__comparison-stat-value">{s1.correction?.organization?.score || 0}/7</span></div>
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">Language</span><span className="writing__comparison-stat-value">{s1.correction?.language?.score || 0}/7</span></div>
                <div className="writing__comparison-stat writing__comparison-stat--total"><span className="writing__comparison-stat-label">Total</span><span className="writing__comparison-stat-value">{s1.correction?.overall?.total || 0}/{s1.correction?.overall?.maxTotal || 42}</span></div>
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">DSE Level</span><span className="writing__comparison-stat-value">{s1.correction?.overall?.dseLevel || '\u2014'}</span></div>
              </div>
            </div>
            <div className="writing__comparison-panel">
              <h3>Session 2 \u2014 {s2.completedAt ? new Date(s2.completedAt).toLocaleDateString() : 'Unknown'}</h3>
              <div className="writing__comparison-stats">
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">Content</span><span className="writing__comparison-stat-value">{s2.correction?.content?.score || 0}/7</span></div>
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">Organisation</span><span className="writing__comparison-stat-value">{s2.correction?.organization?.score || 0}/7</span></div>
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">Language</span><span className="writing__comparison-stat-value">{s2.correction?.language?.score || 0}/7</span></div>
                <div className="writing__comparison-stat writing__comparison-stat--total"><span className="writing__comparison-stat-label">Total</span><span className="writing__comparison-stat-value">{s2.correction?.overall?.total || 0}/{s2.correction?.overall?.maxTotal || 42}</span></div>
                <div className="writing__comparison-stat"><span className="writing__comparison-stat-label">DSE Level</span><span className="writing__comparison-stat-value">{s2.correction?.overall?.dseLevel || '\u2014'}</span></div>
              </div>
            </div>
          </div>
          {/* Error diff */}
          <div className="writing__comparison-diff">
            <h3 className="writing__comparison-diff-header">\u26A0\uFE0F Error Pattern Changes</h3>
            {(() => {
              const errs1 = (s1.correction?.errors || []).reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {});
              const errs2 = (s2.correction?.errors || []).reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {});
              const allTypes = new Set([...Object.keys(errs1), ...Object.keys(errs2)]);
              return [...allTypes].map(type => {
                const d = (errs2[type] || 0) - (errs1[type] || 0);
                const cls = d > 0 ? 'writing__comparison-diff-item--worse' : d < 0 ? 'writing__comparison-diff-item--improved' : 'writing__comparison-diff-item--same';
                const sign = d > 0 ? '+' : '';
                return (
                  <div key={type} className={`writing__comparison-diff-item ${cls}`}>
                    {type}: {sign}{d}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Writing phase (writingPartA or writingPartB)
  const isPartA = phase === 'writingPartA';
  const isPartB = phase === 'writingPartB';
  const currentPrompt = isPartA
    ? (partA.prompt || sessionData?.partA?.prompt || null)
    : (partB.prompt || sessionData?.partB?.options?.[partB.chosenOption] || null);
  const badge = getBadgeInfo(currentPrompt?.type);
  const essayContent = isPartA ? partA.essay : partB.essay;
  const partLabel = isPartA ? 'Part A' : 'Part B';
  const partClass = isPartA ? 'writing__prompt-card--part-a' : 'writing__prompt-card--part-b';

  return (
    <div className="writing__fullscreen">
      {renderExamHeader()}

      <div className="writing__exam-layout">
        {/* Prompt card */}
        <div className="writing__prompt-panel">
          <div className={`writing__prompt-card ${partClass}`}>
            <div className="writing__prompt-card-badge">{partLabel}</div>
            {currentPrompt && (
              <>
                <span className="writing__prompt-card-type-badge" style={{ background: badge.color }}>{badge.label}</span>
                {currentPrompt.title && <h3 className="writing__prompt-card-title">{currentPrompt.title}</h3>}
                {currentPrompt.context && <p className="writing__prompt-card-context">{currentPrompt.context}</p>}
                {currentPrompt.task && <div className="writing__prompt-card-task">{currentPrompt.task}</div>}
                {isPartA && currentPrompt.instructions && (
                  <div className="writing__prompt-card-instructions">{currentPrompt.instructions}</div>
                )}
                {!isPartA && currentPrompt.wordLimit && (
                  <div className="writing__prompt-card-meta">
                    Word limit: {currentPrompt.wordLimit.min}\u2013{currentPrompt.wordLimit.max} words
                  </div>
                )}
              </>
            )}
          </div>
        </div>

          {/* Editor area */}
          <div className="writing__editor-area">
            <div className="writing__exam-topbar">
              {renderTimer()}
              {isPartB && practiceMode === 'both' && partAAnalysisStatus === 'analysing' && (
                <div className="writing__analysis-badge writing__analysis-badge--analysing">Analysing Part A...</div>
              )}
              {isPartB && practiceMode === 'both' && partAAnalysisStatus === 'done' && (
                <div className="writing__analysis-badge writing__analysis-badge--done">\u2713 Part A analysed</div>
              )}
              {isPartB && practiceMode === 'both' && partAAnalysisStatus === 'failed' && (
                <div className="writing__analysis-badge writing__analysis-badge--failed">Part A analysis failed</div>
              )}
              {renderSoundToggle()}
            </div>

            {isPartA && (
              <div className="writing__task-banner">
                <div className="writing__task-banner-scroll">
                  {currentPrompt ? (
                    <>
                      {currentPrompt.context && <p className="writing__task-banner-context">{currentPrompt.context}</p>}
                      {currentPrompt.task && <div className="writing__task-banner-task">{currentPrompt.task}</div>}
                    </>
                  ) : (
                    <p className="writing__task-banner-context">Write a short text (~200 words) on the given topic.</p>
                  )}
                </div>
              </div>
            )}

            <div
            key={phase}
            ref={editorRef}
            className="writing__editor--exam writing__editor-ruled"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleEssayChange(e.currentTarget.innerHTML)}
            data-placeholder="Start writing your essay here..."
          />

          {/* Editor footer */}
          <div className="writing__editor-footer">
            <div className="writing__editor-save-indicator">{saveIndicator}</div>
            <div className="writing__editor-footer-buttons">
              {/* Self-assessment */}
              <details className="writing__self-assessment">
                <summary className="writing__self-assessment-header">
                  \uD83E\uDD14 Which parts are you unsure about?
                </summary>
                <div className="writing__self-assessment-tags">
                  {['content', 'organization', 'vocabulary', 'grammar', 'conventions', 'style'].map(area => (
                    <button
                      key={area}
                      className={`writing__self-assessment-tag ${selfAssessment.includes(area) ? 'writing__self-assessment-tag--selected' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelfAssessment(prev =>
                          prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                        );
                      }}
                    >
                      {area.charAt(0).toUpperCase() + area.slice(1)}
                    </button>
                  ))}
                </div>
              </details>

              {isPartA && correctionPartAResult && (
                <button className="writing__proceed-btn" onClick={handleProceedToPartB}>
                  Proceed to Part B \u2192
                </button>
              )}
              <button
                className="writing__submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : (isPartA ? 'Submit Part A' : 'Submit for Correction')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
