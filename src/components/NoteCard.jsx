import React from 'react';
import { KINDS } from '../utils/corpusIndex';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function stripPreview(html) {
  const text = html.replace(/<[^>]*>/g, '').trim();
  return text.slice(0, 80) + (text.length > 80 ? '...' : '');
}

export default function NoteCard({ note, isActive, onSelect, onDelete, searchSnippet, searchQuery, health }) {
  const displayTitle = note.title || stripPreview(note.content || '') || 'Untitled';
  const tags = (note.tags || []).slice(0, 2);
  const snippet = searchSnippet ? searchSnippet(note) : null;
  const kindInfo = note.kind ? KINDS.find(k => k.slug === note.kind) : null;

  function highlightText(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="note-card__highlight">{p}</mark>
        : p
    );
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(note.id);
    }
  };

  return (
    <div
      className={`note-card${isActive ? ' note-card--active' : ''}${note.pinned ? ' note-card--pinned' : ''}`}
      onClick={() => onSelect(note.id)}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
    >
      <span className="note-card__color" style={note.color ? { background: note.color } : {}} />
      {health && health.score < 80 && (
        <span className="note-card__health" style={{ background: health.color }} title={`${health.score}% retention — reviewed ${health.daysSinceReview}d ago`} />
      )}
      <div className="note-card__body">
        <span className="note-card__title">
          {searchQuery ? highlightText(displayTitle, searchQuery) : displayTitle}
        </span>
        {snippet && (
          <span className="note-card__preview">{snippet}</span>
        )}
        {!snippet && !searchQuery && (
          <span className="note-card__preview">{stripPreview(note.content || '')}</span>
        )}
        <div className="note-card__meta">
          {tags.map(t => (
            <span key={t} className="note-card__tag">{t}</span>
          ))}
          {kindInfo && (
            <span className="note-card__kind" style={{ color: kindInfo.color }} title={kindInfo.label}>
              {kindInfo.icon}
            </span>
          )}
          <span className="note-card__date">{formatDate(note.updatedAt)}</span>
        </div>
      </div>
      <button
        className="note-card__delete"
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        title="Delete note"
        aria-label="Delete note"
      >
        ×
      </button>
    </div>
  );
}
