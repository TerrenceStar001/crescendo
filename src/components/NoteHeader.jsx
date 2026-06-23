import React, { useState, useRef, useEffect } from 'react';
import { KINDS } from '../utils/corpusIndex';

export default function NoteHeader({
  note, onBack, onAIGenerate, onTogglePin, onDuplicate,
  onTitleChange, onAddTag, onRemoveTag, onColorChange,
  backlinks, onShowBacklinks, generatingStatus,
  onStudy, onKindChange,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showKindPicker, setShowKindPicker] = useState(false);
  const titleRef = useRef(null);
  const moreRef = useRef(null);
  const kindRef = useRef(null);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    function handleClick(e) {
      if (showMore && moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
      if (showKindPicker && kindRef.current && !kindRef.current.contains(e.target)) {
        setShowKindPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore, showKindPicker]);

  function handleTitleSave() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== note.title) {
      onTitleChange(trimmed);
    }
    setEditingTitle(false);
  }

  if (!note) return null;

  const currentKind = note.kind ? KINDS.find(k => k.slug === note.kind) : null;

  return (
    <div className="main-header">
      <div className="main-header__top">
        <button className="main-header__back" onClick={onBack} title="Back to all notes" aria-label="Back">
          ←
        </button>
        <span className="main-header__brand">Crescendo</span>
        <div className="main-header__spacer" />
        <div className="main-header__actions">
          <button
            className="main-header__btn"
            onClick={onAIGenerate}
            title="Generate title & tags with AI"
            aria-label="Generate with AI"
          >
            ✨
          </button>
          {backlinks > 0 && (
            <button
              className="main-header__btn"
              onClick={onShowBacklinks}
              title={`${backlinks} backlinks`}
              aria-label="Show backlinks"
            >
              🔗
            </button>
          )}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              className="main-header__btn"
              onClick={() => setShowMore(!showMore)}
              title="More actions"
              aria-label="More actions"
            >
              ⋯
            </button>
            {showMore && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-md)',
                padding: '4px',
                zIndex: 20,
                minWidth: 140,
              }}>
                <MoreMenuItem onClick={() => { onTogglePin(); setShowMore(false); }}>
                  {note.pinned ? 'Unpin' : 'Pin'}
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { onDuplicate(); setShowMore(false); }}>
                  Duplicate
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { onStudy?.(); setShowMore(false); }}>
                  Study this note
                </MoreMenuItem>
                <MoreMenuItem onClick={() => { setShowMore(false); }}>
                  Export as MD
                </MoreMenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingTitle ? (
        <input
          ref={titleRef}
          className="main-header__title"
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); }
            if (e.key === 'Escape') { setEditingTitle(false); }
          }}
        />
      ) : (
        <div
          className="main-header__title"
          onClick={() => { setTitleDraft(note.title || ''); setEditingTitle(true); }}
          style={{ cursor: 'text' }}
          title="Click to edit title"
        >
          {note.title || (
            generatingStatus
              ? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Generating...</span>
              : <span style={{ color: 'var(--color-text-muted)' }}>Untitled</span>
          )}
        </div>
      )}

      <div className="main-header__tags">
        {(note.tags || []).map((t, i) => (
          <span key={i} className="main-header__tag" title="Click to edit (double-click to remove)">
            {t}
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveTag(i); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                marginLeft: 3, padding: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)',
                lineHeight: 1,
              }}
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <button className="main-header__tag-add" onClick={onAddTag} title="Add tag">+</button>
        {!note.tags?.length && generatingStatus && (
          <span className="main-header__tag" style={{ fontStyle: 'italic' }}>Generating tags...</span>
        )}
        <div className="note-header__kind-wrap" ref={kindRef}>
          <button
            className={`note-header__kind-btn${currentKind ? ' note-header__kind-btn--active' : ''}`}
            onClick={() => setShowKindPicker(!showKindPicker)}
            title={currentKind ? currentKind.label : 'Set note kind'}
          >
            {currentKind ? <>{currentKind.icon} {currentKind.label}</> : '🏷️ Kind'}
          </button>
          {showKindPicker && (
            <div className="note-header__kind-dropdown">
              {KINDS.map(k => (
                <button
                  key={k.slug}
                  className={`note-header__kind-option${note.kind === k.slug ? ' note-header__kind-option--selected' : ''}`}
                  onClick={() => { onKindChange(k.slug); setShowKindPicker(false); }}
                >
                  <span>{k.icon}</span>
                  <span>{k.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MoreMenuItem({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '6px 12px',
        border: 'none',
        background: 'transparent',
        color: 'var(--color-text)',
        fontSize: '0.8rem',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-nav-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  );
}
