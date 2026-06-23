import React, { useState, useCallback, useRef, useEffect } from 'react';
import WaveformDisplay from './WaveformDisplay';
import { useSpeech } from '../hooks/useSpeech';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { getTopicList, generateSpeakingPrompt, getTopicGroups } from '../utils/dseSpeakingTopics';
import { scoreToDseLevel } from '../utils/dseGrading';
import { STRUCTURAL_CONSTRAINTS } from '../utils/structuralConstraints';

function analyzeTranscript(text) {
  const fillerWords = ['uhm', 'uh', 'um', 'like', 'you know', 'well', 'actually', 'basically', 'i mean', 'sort of', 'kind of'];
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);
  const fillerCount = fillerWords.reduce((sum, fw) => {
    const re = new RegExp(`\\b${fw}\\b`, 'gi');
    return sum + (text.match(re) || []).length;
  }, 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wpm = words.length;
  const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
  return { fillerCount, sentences: sentences.length, wpm, lexicalDiversity, wordCount: words.length };
}

export default function SpeakingModule({ skillAnalytics, callAI, onBack }) {
  const { speak, stop: stopTTS, isSpeaking } = useSpeech();
  const recorder = useAudioRecorder();
  const [phase, setPhase] = useState('start');
  const [topic, setTopic] = useState(null);
  const [prepTime, setPrepTime] = useState(null);
  const [speakingTime, setSpeakingTime] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const topics = getTopicList();
  const categories = getTopicGroups();

  const filteredTopics = selectedCategory === 'all' ? topics
    : (categories.find(([key]) => key === selectedCategory)?.[1] || topics);

  const startPreparation = useCallback((topicName) => {
    const prompt = generateSpeakingPrompt(topicName);
    setTopic(prompt);
    setPrepTime(60);
    setSpeakingTime(0);
    setAnalysis(null);
    setError('');
    recorder.resetTranscript();
    setPhase('preparing');
  }, [recorder]);

  useEffect(() => {
    if (phase === 'preparing' && prepTime > 0) {
      timerRef.current = setInterval(() => {
        setPrepTime(t => {
          if (t <= 1) { clearInterval(timerRef.current); setPhase('recording'); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, prepTime]);

  useEffect(() => {
    if (phase === 'recording' && recorder.isRecording) {
      timerRef.current = setInterval(() => {
        setSpeakingTime(t => {
          if (t >= 60) { clearInterval(timerRef.current); handleStopRecording(); return 60; }
          return t + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, recorder.isRecording]);

  const handleStartRecording = useCallback(() => {
    recorder.startRecording();
    setSpeakingTime(0);
    setPhase('recording');
  }, [recorder]);

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording();
    stopTTS();
    clearInterval(timerRef.current);
    setPhase('analyzing');
    runAnalysis();
  }, [recorder, stopTTS]);

  const runAnalysis = useCallback(async () => {
    const text = recorder.transcript;
    if (!text || text.trim().length === 0) {
      setAnalysis({
        fluency: { score: 0, feedback: 'No speech detected. Please try again.', fillerCount: 0, wpm: 0 },
        vocabulary: { score: 0, feedback: 'N/A' },
        grammar: { score: 0, feedback: 'N/A' },
        structure: { score: 0, feedback: 'N/A' },
        overall: { score: 0, dseLevel: '1' },
        improvements: ['Practice speaking for the full duration.'],
        modelAnswer: '',
      });
      setPhase('feedback');
      return;
    }

    const stats = analyzeTranscript(text);
    const fluencyScore = Math.min(100, Math.round(Math.max(0,
      70 - stats.fillerCount * 5 + (stats.wpm / 120) * 20 + stats.lexicalDiversity * 30
    )));
    const vocabScore = Math.min(100, Math.round(Math.max(0, stats.lexicalDiversity * 150)));
    const grammarScore = Math.min(100, Math.round(Math.max(0, 70 + stats.sentences * 2 - Math.max(0, stats.wordCount - 80) * 0.5)));

    if (callAI && topic) {
      try {
        const data = await callAI(`Assess this HKDSE English Paper 4 (Speaking) response against the official DSE rubric.

Topic: ${topic.topic}
Group discussion role: Group interaction + individual response (3 min per candidate)

Student's speech transcript:
${text}

Assess each category on a 0-100 scale using HKDSE Speaking criteria:
- pronunciation (clarity, accuracy, word stress)
- fluency (pace, hesitation, filler words, coherence)
- grammar (accuracy, range of structures)
- vocabulary (range, precision, idiomatic usage)
- structure (organization, logical flow, argument development)

Paper 4 marks: 28 total = 7 per rater × 2 raters for each of Pronunciation & Delivery, Communication Strategies, Vocabulary & Language Patterns, and Ideas & Organization.

Return as JSON:
{ "pronunciation": { "score": 70, "errors": [], "feedback": "..." },
  "fluency": { "score": 65, "feedback": "..." },
  "grammar": { "score": 60, "feedback": "..." },
  "vocabulary": { "score": 55, "feedback": "..." },
  "structure": { "score": 60, "feedback": "..." },
  "overall": { "score": 62, "dseLevel": "3" },
  "improvements": ["..."],
  "modelAnswer": "..." }`, {
          system: 'You are an expert HKDSE English speaking examiner (Paper 4). Target: IELTS band 7.60 = DSE 5** Speaking. Assess against the official DSE Paper 4 marking criteria (Pronunciation & Delivery, Communication Strategies, Vocabulary & Language Patterns, Ideas & Organization). Return ONLY valid JSON.\n\n' +
            'In your Vocabulary assessment, distinguish between generic academic abstractions and concrete, domain-specific language — does the speaker use tactile, operational vocabulary alongside conceptual terms? In your Ideas assessment, evaluate whether the response demonstrates genuine perspective with subjective judgment rather than uniformly detached exposition. Assess structural complexity — does the argument follow a predictable binary structure, or does it introduce unresolved tensions, counter-perspectives, and nuanced positioning?\n\n' +
            STRUCTURAL_CONSTRAINTS,
          temperature: 0.3, maxTokens: 1500,
        });
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsed.fluency = {...parsed.fluency, fillerCount: stats.fillerCount, wpm: stats.wpm};
          setAnalysis(parsed);
          if (skillAnalytics) {
            const scores = [parsed.pronunciation, parsed.fluency, parsed.grammar, parsed.vocabulary, parsed.structure];
            const avg = Math.round(scores.reduce((s, c) => s + (c?.score || 0), 0) / scores.length);
            skillAnalytics.recordSession({
              skill: 'speaking', type: 'practice',
              score: parsed.overall?.score || avg,
              totalQuestions: 100,
              percentage: parsed.overall?.score || avg,
              dseLevel: parsed.overall?.dseLevel || '1',
              wordCount: stats.wordCount,
              topic: topic.topic,
            });
          }
          setPhase('feedback');
          return;
        }
      } catch {}
    }

    setAnalysis({
      pronunciation: { score: 0, feedback: 'AI analysis requires an API key. See local stats below.' },
      fluency: { score: fluencyScore, feedback: stats.fillerCount > 5 ? `Too many filler words (${stats.fillerCount}). Try pausing instead.` : 'Good fluency.', fillerCount: stats.fillerCount, wpm: stats.wpm },
      grammar: { score: grammarScore, feedback: `Approximately ${stats.sentences} sentences detected.` },
      vocabulary: { score: vocabScore, feedback: `Unique word ratio: ${(stats.lexicalDiversity * 100).toFixed(0)}%.` },
      structure: { score: 0, feedback: 'Structure analysis requires AI (add API key).' },
      overall: { score: speakingScore, dseLevel: scoreToDseLevel(speakingScore, 'speaking').level },
      improvements: stats.fillerCount > 5 ? ['Reduce filler words (uhm, like, you know).'] : [],
      modelAnswer: '',
    });
    const speakingScore = Math.round((fluencyScore + vocabScore + grammarScore) / 3);
    if (skillAnalytics) {
      skillAnalytics.recordSession({
        skill: 'speaking', type: 'practice',
        score: speakingScore,
        totalQuestions: 100,
        percentage: speakingScore,
        dseLevel: scoreToDseLevel(speakingScore, 'speaking').level,
        wordCount: stats.wordCount,
        topic: topic?.topic,
      });
    }
    setPhase('feedback');
  }, [recorder.transcript, callAI, topic, skillAnalytics]);

  const handlePlaySample = useCallback(() => {
    if (!topic) return;
    const sample = topic.prompt.split('\n\nConsider:')[0] + '\n\n' + (analysis?.modelAnswer || '');
    speak(sample, { rate: 0.9 });
  }, [topic, analysis, speak]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (phase === 'start') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={onBack}>← Dashboard</button>
          <h1 className="dse-module__title">🎤 Speaking Practice</h1>
          <p className="dse-module__subtitle">Practice DSE-style speaking with timed topics and speech analysis</p>
        </div>
        <div className="speaking__start">
          <div className="speaking__topic-controls">
            <div className="speaking__category-filter">
              {[{ key: 'all', label: 'All' }, ...categories.map(([key]) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }))].map(c => (
                <button key={c.key} className={`speaking__category-btn${selectedCategory === c.key ? ' speaking__category-btn--active' : ''}`} onClick={() => setSelectedCategory(c.key)}>{c.label}</button>
              ))}
            </div>
            {!recorder.isSupported && (
              <div className="speaking__unsupported">Speech recognition not supported in this browser. Try Chrome or Edge.</div>
            )}
          </div>
          <div className="speaking__topic-grid">
            {filteredTopics.map(t => (
              <button key={t} className="speaking__topic-card" onClick={() => startPreparation(t)} disabled={!recorder.isSupported}>
                <span className="speaking__topic-name">{t}</span>
                <span className="speaking__topic-action">Start →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'preparing') {
    return (
      <div className="dse-module">
        <div className="dse-module__header" style={{ paddingBottom: 0 }}>
          <div className="reading__progress-header">
            <button className="dse-module__back" onClick={() => { clearInterval(timerRef.current); setPhase('start'); }}>← Back</button>
            <div className="reading__timer">{formatTime(prepTime)}</div>
          </div>
        </div>
        <div className="speaking__prep">
          <div className="speaking__prep-card">
            <h2 className="speaking__prep-topic">{topic?.topic}</h2>
            <p className="speaking__prep-prompt">{topic?.prompt.split('\n\nConsider:')[0]}</p>
            <div className="speaking__prep-hints">
              <strong>Consider:</strong>
              <ul>{topic?.prompt.split('\n\nConsider:')[1]?.split('\n').filter(l => l.trim().startsWith('-')).map((l, i) => <li key={i}>{l.replace(/^-\s*/, '')}</li>)}</ul>
            </div>
            <div className="speaking__prep-timer-bar">
              <div className="speaking__prep-timer-fill" style={{ width: `${(prepTime / 60) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'recording') {
    return (
      <div className="dse-module">
        <div className="dse-module__header" style={{ paddingBottom: 0 }}>
          <div className="reading__progress-header">
            <button className="dse-module__back" onClick={() => { clearInterval(timerRef.current); stopTTS(); recorder.stopRecording(); setPhase('start'); }}>← Back</button>
            <div className="reading__timer" style={{ color: speakingTime > 50 ? 'var(--color-error)' : undefined }}>{formatTime(speakingTime)} / 1:00</div>
          </div>
        </div>
        <div className="speaking__record">
          <h2 className="speaking__record-topic">{topic?.topic}</h2>
          <WaveformDisplay audioLevel={recorder.audioLevel} isRecording={recorder.isRecording} transcript={recorder.transcript} />
          <div className="speaking__record-controls">
            {recorder.isRecording ? (
              <button className="speaking__record-btn speaking__record-btn--stop" onClick={handleStopRecording}>⏹ Stop Recording</button>
            ) : (
              <button className="speaking__record-btn speaking__record-btn--start" onClick={handleStartRecording}>⏺ Start Recording</button>
            )}
          </div>
          <div className="speaking__record-progress">
            <div className="speaking__record-progress-fill" style={{ width: `${(speakingTime / 60) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'analyzing') {
    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <h1 className="dse-module__title">🔍 Analyzing...</h1>
        </div>
        <div className="reading__start">
          <div className="reading__generating">Analyzing your speech...</div>
        </div>
      </div>
    );
  }

  if (phase === 'feedback') {
    if (!analysis) return null;
    const categories = ['pronunciation', 'fluency', 'grammar', 'vocabulary', 'structure'];

    return (
      <div className="dse-module">
        <div className="dse-module__header">
          <button className="dse-module__back" onClick={() => { setPhase('start'); setAnalysis(null); }}>← Back</button>
          <h1 className="dse-module__title">📊 Speaking Feedback</h1>
          <p className="dse-module__subtitle">Topic: {topic?.topic}</p>
        </div>
        <div className="speaking__feedback-body">
          <div className="writing__feedback-summary">
            <div className="writing__feedback-ring" style={{ '--pct': analysis.overall?.score || 0, '--color': (analysis.overall?.score || 0) >= 80 ? 'var(--color-success)' : (analysis.overall?.score || 0) >= 60 ? 'var(--color-warning)' : 'var(--color-error)' }}>
              <svg viewBox="0 0 36 36" className="reading__results-svg">
                <path className="reading__results-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="reading__results-fill" strokeDasharray={`${analysis.overall?.score || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.5" className="reading__results-text" textAnchor="middle">{analysis.overall?.score || 0}%</text>
              </svg>
            </div>
            <div className="writing__feedback-stats">
              <div className="writing__feedback-stat">
                <span className="writing__feedback-stat-value">{analysis.overall?.dseLevel || '—'}</span>
                <span className="writing__feedback-stat-label">DSE Level</span>
              </div>
              <div className="writing__feedback-stat">
                <span className="writing__feedback-stat-value">{analysis.fluency?.wpm || 0}</span>
                <span className="writing__feedback-stat-label">WPM</span>
              </div>
              <div className="writing__feedback-stat">
                <span className="writing__feedback-stat-value">{analysis.fluency?.fillerCount || 0}</span>
                <span className="writing__feedback-stat-label">Fillers</span>
              </div>
            </div>
          </div>

          <div className="speaking__feedback-categories">
            {categories.map(cat => {
              const c = analysis[cat];
              if (!c || c.score === undefined) return null;
              return (
                <div key={cat} className="writing__feedback-category">
                  <div className="writing__feedback-category-header">
                    <span className="writing__feedback-category-name">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <span className="writing__feedback-category-score">{c.score}/100</span>
                  </div>
                  <div className="writing__feedback-category-bar-bg">
                    <div className="writing__feedback-category-bar-fill" style={{
                      width: `${c.score}%`,
                      background: c.score >= 70 ? 'var(--color-success)' : c.score >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                    }} />
                  </div>
                  <p className="writing__feedback-category-text">{c.feedback}</p>
                </div>
              );
            })}
          </div>

          <div className="speaking__feedback-transcript">
            <h3>📝 Your Transcript</h3>
            <div className="speaking__feedback-transcript-text">
              {recorder.transcript || '(No speech detected)'}
            </div>
          </div>

          {analysis.improvements?.length > 0 && (
            <div className="writing__feedback-section">
              <h3>💡 Improvement Suggestions</h3>
              <ul className="speaking__improvements">
                {analysis.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
              </ul>
            </div>
          )}

          {analysis.modelAnswer && (
            <div className="speaking__feedback-model">
              <h3>⭐ Model Answer (5** Level)</h3>
              <button className="speaking__play-sample-btn" onClick={handlePlaySample} disabled={isSpeaking}>
                {isSpeaking ? '🔊 Playing...' : '▶ Listen to Sample'}
              </button>
              <div className="speaking__feedback-model-text">{analysis.modelAnswer}</div>
            </div>
          )}

          <div className="reading__results-actions">
            <button className="reading__results-btn" onClick={() => { setPhase('start'); setAnalysis(null); }}>← Back to Speaking</button>
            <button className="reading__results-btn reading__results-btn--primary" onClick={() => startPreparation(topic?.topic || 'Technology')}>
              🔄 Practice Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
