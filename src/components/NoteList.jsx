import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import NoteCard from './NoteCard';
import { KINDS } from '../utils/corpusIndex';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'alpha', label: 'A–Z' },
  { value: 'health', label: 'Health' },
  { value: 'words', label: 'Word Count' },
  { value: 'tags', label: 'Tag Count' },
  { value: 'kind', label: 'Kind' },
];

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').trim();
}

const NoteList = React.memo(function NoteList({
  notes, activeId, onSelect, onCreate, onDelete, searchQuery, onSearchChange,
  searchSnippet, healthMap, onBatchDelete, onBatchPin, onBatchTag,
}) {
  const listRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('recent');
  const [kindFilter, setKindFilter] = useState('');
  const [savedFilters, setSavedFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crescendo-saved-filters') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const active = listRef.current.querySelector('.note-card--active');
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [notes.length]);

  const kindCounts = useMemo(() => {
    const counts = {};
    notes.forEach(n => { counts[n.kind || ''] = (counts[n.kind || ''] || 0) + 1; });
    return counts;
  }, [notes]);

  const kindFiltered = useMemo(() => {
    if (!kindFilter) return notes;
    return notes.filter(n => (n.kind || '') === kindFilter);
  }, [notes, kindFilter]);

  const sorted = useMemo(() => {
    let sorted = [...kindFiltered];
    if (sortBy === 'alpha') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'health') {
      sorted.sort((a, b) => {
        const ha = healthMap?.[a.id]?.score ?? 50;
        const hb = healthMap?.[b.id]?.score ?? 50;
        return ha - hb;
      });
    } else if (sortBy === 'words') {
      sorted.sort((a, b) => stripHtml(b.content || '').split(/\s+/).filter(Boolean).length - stripHtml(a.content || '').split(/\s+/).filter(Boolean).length);
    } else if (sortBy === 'tags') {
      sorted.sort((a, b) => (b.tags?.length || 0) - (a.tags?.length || 0));
    } else if (sortBy === 'kind') {
      sorted.sort((a, b) => {
        const ka = a.kind || '';
        const kb = b.kind || '';
        if (ka !== kb) return ka.localeCompare(kb);
        return (a.title || '').localeCompare(b.title || '');
      });
    } else {
      sorted.sort((a, b) => {
        const da = new Date(a.updatedAt || a.createdAt || 0);
        const db = new Date(b.updatedAt || b.createdAt || 0);
        return db - da;
      });
    }
    return sorted;
  }, [kindFiltered, sortBy, healthMap]);

  const pinned = sorted.filter(n => n.pinned);
  const unpinned = sorted.filter(n => !n.pinned);

  const toggleSelect = useCallback((id, e) => {
    if (e?.ctrlKey || e?.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      e.preventDefault();
    } else if (e?.shiftKey && selectedIds.size > 0) {
      const allIds = sorted.map(n => n.id);
      const lastId = [...selectedIds].pop();
      const start = allIds.indexOf(lastId);
      const end = allIds.indexOf(id);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        const range = allIds.slice(from, to + 1);
        setSelectedIds(new Set(range));
      }
      e.preventDefault();
    } else {
      setSelectedIds(new Set([id]));
      onSelect(id);
    }
  }, [onSelect, sorted]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected note${selectedIds.size > 1 ? 's' : ''}?`)) {
      selectedIds.forEach(id => onDelete(id));
      clearSelection();
    }
  }, [selectedIds, onDelete, clearSelection]);

  const handleBatchPin = useCallback((pinned) => {
    if (selectedIds.size === 0) return;
    onBatchPin?.([...selectedIds], pinned);
    clearSelection();
  }, [selectedIds, onBatchPin, clearSelection]);

  const handleBatchTag = useCallback(() => {
    if (selectedIds.size === 0) return;
    const tag = window.prompt('Enter tag name to add to selected notes:');
    if (tag?.trim()) {
      onBatchTag?.([...selectedIds], tag.trim());
      clearSelection();
    }
  }, [selectedIds, onBatchTag, clearSelection]);

  const saveCurrentFilter = useCallback(() => {
    if (!searchQuery?.trim()) return;
    const name = window.prompt('Name this filter:', searchQuery);
    if (!name?.trim()) return;
    const updated = [...savedFilters, { name: name.trim(), query: searchQuery }];
    setSavedFilters(updated);
    localStorage.setItem('crescendo-saved-filters', JSON.stringify(updated));
  }, [searchQuery, savedFilters]);

  const applyFilter = useCallback((query) => {
    onSearchChange(query);
  }, [onSearchChange]);

  const removeFilter = useCallback((idx) => {
    const updated = savedFilters.filter((_, i) => i !== idx);
    setSavedFilters(updated);
    localStorage.setItem('crescendo-saved-filters', JSON.stringify(updated));
  }, [savedFilters]);

  const selectedCount = selectedIds.size;

  return (
    <>
      <div className="panel-header">
        <span className="panel-header__title">Notes</span>
        <span className="panel-header__count">{notes.length}</span>
        <button className="panel-header__action" onClick={onCreate} title="New note (Ctrl+N)">+</button>
      </div>
      <div className="panel-search">
        <input
          type="text"
          className="panel-search__input"
          placeholder={`Search ${notes.length} notes...`}
          value={searchQuery || ''}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQuery?.trim() && (
          <button className="panel-search__save" onClick={saveCurrentFilter} title="Save current search as filter">
            💾
          </button>
        )}
      </div>
      {savedFilters.length > 0 && (
        <div className="panel-filters">
          {savedFilters.map((f, i) => (
            <span key={i} className="panel-filter" onClick={() => applyFilter(f.query)} title={f.query}>
              {f.name}
              <button className="panel-filter__remove" onClick={e => { e.stopPropagation(); removeFilter(i); }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="panel-kind-filters">
        {KINDS.filter(k => k.slug && kindCounts[k.slug]).map(k => (
          <button
            key={k.slug}
            className={`panel-kind-filter${kindFilter === k.slug ? ' panel-kind-filter--active' : ''}`}
            onClick={() => setKindFilter(kindFilter === k.slug ? '' : k.slug)}
            title={`${k.label} (${kindCounts[k.slug]})`}
          >
            <span>{k.icon}</span>
            <span className="panel-kind-filter__count">{kindCounts[k.slug]}</span>
          </button>
        ))}
        {kindFilter && (
          <button className="panel-kind-filter panel-kind-filter--clear" onClick={() => setKindFilter('')} title="Clear kind filter">
            ✕
          </button>
        )}
      </div>
      <div className="panel-sort">
        <select
          className="panel-sort__select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          title="Sort notes"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {selectedCount > 0 && (
        <div className="panel-batch">
          <span className="panel-batch__count">{selectedCount} selected</span>
          <button className="panel-batch__btn panel-batch__btn--delete" onClick={handleBatchDelete} title="Delete selected">
            🗑 Delete
          </button>
          <button className="panel-batch__btn" onClick={() => handleBatchPin(true)} title="Pin selected">
            📌 Pin
          </button>
          <button className="panel-batch__btn" onClick={() => handleBatchPin(false)} title="Unpin selected">
            ⊟ Unpin
          </button>
          <button className="panel-batch__btn" onClick={handleBatchTag} title="Add tag to selected">
            🏷 Tag
          </button>
          <button className="panel-batch__btn panel-batch__btn--cancel" onClick={clearSelection} title="Clear selection">
            ✕
          </button>
        </div>
      )}
      <div ref={listRef}>
        {kindFiltered.length === 0 ? (
          <div className="panel-empty">
            {kindFilter ? 'No notes of this kind' : (searchQuery ? 'No results found' : 'No notes yet. Create one!')}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <div className="panel-section-header">Pinned</div>
                {pinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isActive={note.id === activeId}
                    onSelect={(id, e) => toggleSelect(id, e)}
                    onDelete={onDelete}
                    searchSnippet={searchSnippet}
                    searchQuery={searchQuery}
                    health={healthMap?.[note.id]}
                  />
                ))}
              </>
            )}
            {pinned.length > 0 && unpinned.length > 0 && (
              <div className="panel-section-header">All Notes</div>
            )}
            {unpinned.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isActive={note.id === activeId}
                onSelect={(id, e) => toggleSelect(id, e)}
                onDelete={onDelete}
                searchSnippet={searchSnippet}
                searchQuery={searchQuery}
                health={healthMap?.[note.id]}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
});

export default NoteList;
