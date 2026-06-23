import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useView } from '../context/ViewContext';
import { getStoredBoundaries, storeBoundaries, getSkillBoundaries, PER_SKILL_DEFAULTS, SKILLS } from '../utils/dseGrading';

const TTS_PREF_KEY = 'crescendo-tts-pref';
const STT_LANG_KEY = 'crescendo-stt-lang';

const TABS = ['General', 'DSE', 'AI', 'Data', 'About'];

const SettingsPage = React.memo(function SettingsPage({ config, onUpdate, isOpen, onClose, testConnection, notes, exportNotes, importNotes, halfLife, setHalfLife, studyStats }) {
  const { theme, toggleTheme, viewMode, setViewMode } = useView();
  const [activeTab, setActiveTab] = useState('General');
  const [local, setLocal] = useState(config);
  const [testStatus, setTestStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [voices, setVoices] = useState([]);
  const [ttsPref, setTtsPref] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TTS_PREF_KEY)) || {}; } catch { return {}; }
  });
  const [boundaries, setBoundaries] = useState(() => getStoredBoundaries());
  const [expandedSkills, setExpandedSkills] = useState(() => {
    const e = {}; SKILLS.forEach(s => { e[s] = true; }); return e;
  });
  const [sttLang, setSttLang] = useState(() => {
    try { return localStorage.getItem(STT_LANG_KEY) || 'en-US'; } catch { return 'en-US'; }
  });
  const overlayRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    setLocal(config);
    setTestStatus('');
  }, [config, isOpen]);

  useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis?.getVoices()?.filter(v => v.lang.startsWith('en')) || [];
      setVoices(all);
    }
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('General');
    triggerRef.current = document.activeElement;
    const focusable = overlayRef.current?.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();
    function handleKey(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        if (!focusable?.length) return;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const kbdStyle = {
    background: 'var(--color-surface-soft)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '1px 5px',
    fontFamily: 'monospace',
    fontSize: '0.78rem',
    color: 'var(--color-text)',
  };

  const storageUsage = useMemo(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('crescendo-')) {
        total += localStorage.getItem(key).length * 2;
      }
    }
    const kb = (total / 1024).toFixed(1);
    const pct = ((total / (5 * 1024 * 1024)) * 100).toFixed(1);
    return { kb, pct };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSave() {
    onUpdate(local);
    onClose();
  }

  function handleBackdrop(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleTest() {
    if (!local.apiKey && !local.endpoint && local.provider) { setTestStatus('Please enter an API key for the external provider'); return; }
    setTesting(true);
    setTestStatus('Testing connection...');
    const result = await testConnection(local);
    setTestStatus(result);
    setTesting(false);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing...');
    try {
      const result = await importNotes(file);
      setImportStatus(result);
    } catch (err) {
      setImportStatus(err.message || 'Import failed');
    }
    setTimeout(() => setImportStatus(''), 3000);
    e.target.value = '';
  }

  function TabButton({ tab }) {
    return (
      <button
        className={`settings-panel__tab${activeTab === tab ? ' settings-panel__tab--active' : ''}`}
        onClick={() => setActiveTab(tab)}
      >
        {tab}
      </button>
    );
  }

  return (
    <div className="settings-overlay" ref={overlayRef} onClick={handleBackdrop}>
      <div className="settings-panel">
        <div className="settings-panel__header">
          <h2>Settings</h2>
          <button className="settings-panel__close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>
        <div className="settings-panel__tabs">
          {TABS.map(tab => <TabButton key={tab} tab={tab} />)}
        </div>
        <div className="settings-panel__body">
          {activeTab === 'General' && (
            <div className="settings-group">
              <label className="settings-group">
                <span>Default View</span>
                <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                  <option value="list">List</option>
                  <option value="canvas">Canvas</option>
                  <option value="constellation">Graph</option>
                </select>
              </label>
              <div className="settings-group">
                <span>Theme</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                  <button
                    onClick={toggleTheme}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--color-surface-soft)',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontFamily: 'inherit',
                      color: 'var(--color-text)',
                    }}
                  >
                    {theme === 'dark' ? '☀ Switch to Light' : '☾ Switch to Dark'}
                  </button>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <label className="settings-group">
                <span>Knowledge Half-Life (days)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="7"
                    max="90"
                    value={halfLife}
                    onChange={e => setHalfLife(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', minWidth: 40, textAlign: 'right' }}>{halfLife}d</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, display: 'block' }}>
                  Lower = faster decay (aggressive review reminders). Higher = slower decay (gentle reminders).
                </span>
              </label>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />

              {/* --- TTS Voice --- */}
              <div className="settings-group">
                <span style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, display: 'block' }}>Listening &amp; Speaking</span>
                <label className="settings-group">
                  <span>TTS Voice</span>
                  <select value={ttsPref.voiceName || ''} onChange={e => {
                    const name = e.target.value;
                    const v = voices.find(v => v.name === name);
                    const next = { ...ttsPref, voiceName: name, lang: v?.lang || 'en-US' };
                    setTtsPref(next);
                    localStorage.setItem(TTS_PREF_KEY, JSON.stringify(next));
                  }}>
                    <option value="">System Default</option>
                    {voices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </label>
                <label className="settings-group">
                  <span>TTS Speed</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="range" min="0.5" max="2" step="0.1"
                      value={ttsPref.rate ?? 0.9}
                      onChange={e => {
                        const next = { ...ttsPref, rate: Number(e.target.value) };
                        setTtsPref(next);
                        localStorage.setItem(TTS_PREF_KEY, JSON.stringify(next));
                      }}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{(ttsPref.rate ?? 0.9).toFixed(1)}x</span>
                  </div>
                </label>
                <label className="settings-group">
                  <span>Speech Recognition Language</span>
                  <select value={sttLang} onChange={e => {
                    setSttLang(e.target.value);
                    localStorage.setItem(STT_LANG_KEY, e.target.value);
                  }}>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-HK">English (Hong Kong)</option>
                    <option value="en-AU">English (Australia)</option>
                    <option value="en-IN">English (India)</option>
                  </select>
                </label>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <strong>Keyboard Shortcuts:</strong> Press <kbd style={{ background: 'var(--color-surface-soft)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '1px 5px', fontFamily: 'monospace', fontSize: '0.78rem' }}>?</kbd> at any time to view all shortcuts.
              </p>
            </div>
          )}

          {activeTab === 'DSE' && (
            <div className="settings-group">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Each DSE paper has different cut-off percentages. Customise thresholds per skill below. These affect all skill assessments and dashboard calculations.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 16px' }} />
              {SKILLS.map(skill => {
                const skillBoundaries = boundaries[skill] || getSkillBoundaries(skill);
                const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
                const expanded = expandedSkills[skill] !== false;
                return (
                  <div key={skill} style={{ marginBottom: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedSkills(p => ({ ...p, [skill]: !expanded }))}
                      style={{
                        width: '100%', padding: '8px 12px', cursor: 'pointer', background: 'var(--color-surface-soft)',
                        border: 'none', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text)',
                      }}
                    >
                      <span>{skillLabel}</span>
                      <span style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>{'\u25BC'}</span>
                    </button>
                    {expanded && (
                      <div style={{ padding: '8px 12px' }}>
                        {skillBoundaries.filter(b => b.level !== '1').map(b => (
                          <label key={b.level} className="settings-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, minWidth: 40 }}>{b.level}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                              <input
                                type="range" min="10" max="100"
                                value={b.minPercentage}
                                onChange={e => {
                                  const updated = { ...boundaries };
                                  if (!updated[skill]) updated[skill] = [...skillBoundaries];
                                  updated[skill] = updated[skill].map(bd =>
                                    bd.level === b.level ? { ...bd, minPercentage: Number(e.target.value) } : bd
                                  );
                                  setBoundaries(updated);
                                  storeBoundaries(updated);
                                }}
                                style={{ flex: 1 }}
                              />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 36, textAlign: 'right', color: 'var(--color-text)' }}>{b.minPercentage}%</span>
                            </div>
                          </label>
                        ))}
                        <button
                          onClick={() => {
                            const updated = { ...boundaries, [skill]: PER_SKILL_DEFAULTS[skill].map(b => ({ ...b })) };
                            setBoundaries(updated);
                            storeBoundaries(updated);
                          }}
                          style={{
                            padding: '4px 10px', marginTop: 8, background: 'transparent',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          Reset {skillLabel} to DSE Default
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Defaults are based on HKEAA 2017–2021 per-paper cut-off averages. Real DSE boundaries vary by year (±3%).
              </p>
            </div>
          )}

          {activeTab === 'AI' && (
            <div className="settings-group">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Crescendo generates titles and tags using <strong>built-in topic detection</strong> by default.
                Optionally connect an external AI API for enhanced tag quality.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 16px' }} />
              <label className="settings-group">
                <span>External Provider (optional override)</span>
                <select value={local.provider} onChange={e => setLocal(prev => ({ ...prev, provider: e.target.value }))}>
                  <option value="">Disabled (use local OpenCode proxy)</option>
                  <option value="nvidia">NVIDIA NIM</option>
                  <option value="openai">OpenAI</option>
                  <option value="custom">Custom / Local LLM</option>
                </select>
              </label>
              <label className="settings-group">
                <span>API Endpoint</span>
                <input type="text" placeholder="https://integrate.api.nvidia.com/v1" value={local.endpoint} onChange={e => setLocal(prev => ({ ...prev, endpoint: e.target.value }))} />
              </label>
              <label className="settings-group">
                <span>API Key</span>
                <input type="password" placeholder="Optional — leave empty for local proxy" value={local.apiKey} onChange={e => setLocal(prev => ({ ...prev, apiKey: e.target.value }))} />
              </label>
              <label className="settings-group">
                <span>Model</span>
                <input type="text" placeholder="opencode/deepseek-v4-flash-free" value={local.model} onChange={e => setLocal(prev => ({ ...prev, model: e.target.value }))} />
              </label>
              {testStatus && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  marginBottom: 12,
                  background: testStatus.startsWith('Connected') ? 'var(--color-success-bg)' : testStatus.includes('Please') || testStatus.includes('Testing') ? 'transparent' : 'var(--color-error-bg)',
                  color: testStatus.startsWith('Connected') ? 'var(--color-success)' : testStatus.includes('Please') || testStatus.includes('Testing') ? 'var(--color-text-muted)' : 'var(--color-error)',
                }}>
                  {testStatus}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--color-surface-soft)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: testing ? 'default' : 'pointer',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: 'var(--color-text)',
                    opacity: testing ? 0.5 : 1,
                  }}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={onClose}
                  style={{
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '6px 14px',
                    background: 'var(--color-accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#fff',
                    fontWeight: 500,
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Data' && (
            <div className="settings-group">
              {notes && notes.length > 0 && (
                <>
                  <div className="settings-group">
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, display: 'block' }}>Statistics</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Total notes</span>
                      <span style={{ fontWeight: 600 }}>{notes.length}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>Total words</span>
                      <span style={{ fontWeight: 600 }}>{notes.reduce((s, n) => s + (n.content?.replace(/<[^>]*>/g, '')?.split(/\s+/)?.filter(Boolean)?.length || 0), 0).toLocaleString()}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>Avg length</span>
                      <span style={{ fontWeight: 600 }}>{Math.round(notes.reduce((s, n) => s + (n.content?.replace(/<[^>]*>/g, '')?.length || 0), 0) / notes.length).toLocaleString()} chars</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>Total tags</span>
                      <span style={{ fontWeight: 600 }}>{new Set(notes.flatMap(n => n.tags || [])).size}</span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Top 5 tags</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(
                          notes.flatMap(n => n.tags || []).reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {})
                        ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => (
                          <span key={tag} style={{
                            padding: '2px 8px', background: 'var(--color-surface-hover)', borderRadius: '4px',
                            fontSize: '0.75rem', color: 'var(--color-text)'
                          }}>{tag} ({count})</span>
                        ))}
                      </div>
                    </div>
                    {studyStats && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Study activity</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Total sessions</span>
                          <span style={{ fontWeight: 600 }}>{studyStats.totalSessionsAll || 0}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>Sessions this week</span>
                          <span style={{ fontWeight: 600 }}>{studyStats.weekSessions || 0}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>Week accuracy</span>
                          <span style={{ fontWeight: 600 }}>{studyStats.weekAccuracy || 0}%</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>Notes studied</span>
                          <span style={{ fontWeight: 600 }}>{studyStats.uniqueNotes || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
                </>
              )}
              <div className="settings-group">
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Storage Usage</span>
                <div style={{
                  height: 8,
                  background: 'var(--color-surface-soft)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  marginTop: 8,
                }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--color-accent)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease',
                    width: `${Math.min(parseFloat(storageUsage.pct), 100)}%`,
                  }} />
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                  {storageUsage.kb} KB / ~5 MB ({storageUsage.pct}%)
                </span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={exportNotes}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--color-accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    color: '#fff',
                    fontWeight: 500,
                  }}
                >
                  ⬇ Export Notes as JSON
                </button>
                <label style={{
                  padding: '8px 14px',
                  background: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                  color: '#fff',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  ⬆ Import Notes from JSON
                  <input type="file" accept=".json" hidden onChange={handleImport} />
                </label>
                {importStatus && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 500 }}>
                    {importStatus}
                  </span>
                )}
                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
                <button
                  onClick={() => {
                    if (window.confirm('Clear ALL notes? This cannot be undone.')) {
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('crescendo-notes') || k.startsWith('nodemind-notes'));
                      keys.forEach(k => localStorage.removeItem(k));
                      window.location.reload();
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--color-error-bg)',
                    color: 'var(--color-error)',
                    border: '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  🗑 Clear All Notes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'About' && (
            <div className="settings-group" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: 4 }}>Crescendo</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Version 2.0.0 — DSE Edition</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                Build your English mastery to a 5** peak with AI-powered DSE practice and smart notes.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0 0 16px' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Built with React 18, Vite 5, React Flow, and Three.js.<br />
                AI-powered DSE Reading, Writing, Listening, Speaking practice.<br />
                PWA offline support via Workbox.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                Open source under the MIT License.<br />
                Contribute at <a href="https://github.com/anomalyco/NodeMind" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>github.com/anomalyco/NodeMind</a><br />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Formerly NodeMind</span>
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />
              <details style={{ textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem' }}>
                <summary style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>⌨️ Keyboard Shortcuts</summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '0.82rem' }}>
                  <kbd style={kbdStyle}>Ctrl+N</kbd><span style={{ color: 'var(--color-text)' }}>New note</span>
                  <kbd style={kbdStyle}>Ctrl+K</kbd><span style={{ color: 'var(--color-text)' }}>Command palette</span>
                  <kbd style={kbdStyle}>Ctrl+Shift+N</kbd><span style={{ color: 'var(--color-text)' }}>Quick capture</span>
                  <kbd style={kbdStyle}>Ctrl+Shift+D</kbd><span style={{ color: 'var(--color-text)' }}>Daily note</span>
                  <kbd style={kbdStyle}>Ctrl+S</kbd><span style={{ color: 'var(--color-text)' }}>AI generate title/tags</span>
                  <kbd style={kbdStyle}>Ctrl+1</kbd><span style={{ color: 'var(--color-text)' }}>List view</span>
                  <kbd style={kbdStyle}>Ctrl+2</kbd><span style={{ color: 'var(--color-text)' }}>Canvas view</span>
                  <kbd style={kbdStyle}>Ctrl+3</kbd><span style={{ color: 'var(--color-text)' }}>Graph view</span>
                  <kbd style={kbdStyle}>Ctrl+B</kbd><span style={{ color: 'var(--color-text)' }}>Bold</span>
                  <kbd style={kbdStyle}>Ctrl+I</kbd><span style={{ color: 'var(--color-text)' }}>Italic</span>
                  <kbd style={kbdStyle}>Ctrl+U</kbd><span style={{ color: 'var(--color-text)' }}>Underline</span>
                  <kbd style={kbdStyle}>Ctrl+Shift+V</kbd><span style={{ color: 'var(--color-text)' }}>The Void (quiz)</span>
                  <kbd style={kbdStyle}>?</kbd><span style={{ color: 'var(--color-text)' }}>Shortcuts help</span>
                  <kbd style={kbdStyle}>Escape</kbd><span style={{ color: 'var(--color-text)' }}>Close modals / deselect</span>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SettingsPage;
