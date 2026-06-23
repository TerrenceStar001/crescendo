import React, { useState, useRef, useEffect } from 'react';

export default function CommandPalette({ notes, onSelect, onCreate, onQuickCapture, onOpenDaily, onRandom, onToggleTheme, onClose, onStudy }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const noteResults = query
    ? notes.filter(n =>
        (n.title || '').toLowerCase().includes(query.toLowerCase()) ||
        (n.content || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const commands = [
    { id: 'new', icon: '+', label: 'New note', shortcut: 'Ctrl+N', action: () => { onCreate(); onClose(); } },
    { id: 'daily', icon: '📅', label: 'Daily note', shortcut: 'Ctrl+Shift+D', action: () => { onOpenDaily(); onClose(); } },
    { id: 'capture', icon: '📥', label: 'Quick capture', shortcut: 'Ctrl+Shift+N', action: () => { onQuickCapture(); onClose(); } },
    { id: 'random', icon: '🎲', label: 'Random note', action: () => { onRandom(); onClose(); } },
    { id: 'study', icon: '🧠', label: 'Study active note', action: () => { onStudy?.(); onClose(); } },
    { id: 'theme', icon: '☀', label: 'Toggle theme', action: () => { onToggleTheme(); onClose(); } },
  ];

  const filteredCommands = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.id.includes(query.toLowerCase()))
    : commands;

  const allItems = [
    ...filteredCommands.map(c => ({ type: 'cmd', ...c })),
    ...noteResults.map(n => ({ type: 'note', id: n.id, title: n.title || 'Untitled', content: n.content, tags: n.tags || [] })),
  ];

  function handleKey(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allItems.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[activeIdx];
      if (!item) return;
      if (item.type === 'cmd') item.action();
      else { onSelect(item.id); onClose(); }
    }
  }

  function stripPreview(html) {
    return html.replace(/<[^>]*>/g, '').trim().slice(0, 60);
  }

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="cmd-palette__input-wrap">
          <span className="cmd-palette__prefix">&gt;</span>
          <input
            ref={inputRef}
            className="cmd-palette__input"
            placeholder="Search notes or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="cmd-palette__results">
          {filteredCommands.length > 0 && (
            <>
              <div className="cmd-palette__section">Commands</div>
              {filteredCommands.map((c, i) => (
                <div
                  key={c.id}
                  ref={el => itemsRef.current[i] = el}
                  className={`cmd-palette__result${activeIdx === i ? ' cmd-palette__result--active' : ''}`}
                  onClick={c.action}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <span className="cmd-palette__result-icon">{c.icon}</span>
                  <span className="cmd-palette__result-cmd">{c.label}</span>
                  {c.shortcut && <span className="cmd-palette__result-shortcut">{c.shortcut}</span>}
                </div>
              ))}
            </>
          )}
          {noteResults.length > 0 && (
            <>
              <div className="cmd-palette__section">Notes</div>
              {noteResults.map((n, i) => {
                const idx = filteredCommands.length + i;
                return (
                  <div
                    key={n.id}
                    className={`cmd-palette__result${activeIdx === idx ? ' cmd-palette__result--active' : ''}`}
                    onClick={() => { onSelect(n.id); onClose(); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="cmd-palette__result-icon">📄</span>
                    <div className="cmd-palette__result-body">
                      <span className="cmd-palette__result-title">{n.title}</span>
                      <span className="cmd-palette__result-preview">{stripPreview(n.content)}</span>
                    </div>
                    <div className="cmd-palette__result-tags">
                      {n.tags.slice(0, 2).map(t => (
                        <span key={t} className="cmd-palette__result-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {allItems.length === 0 && (
            <div className="panel-empty" style={{ padding: '32px 20px' }}>No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
