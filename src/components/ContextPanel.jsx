import React from 'react';
import { useView } from '../context/ViewContext';
import NoteList from './NoteList';

export default function ContextPanel({
  notes, trash, activeId, onSelect, onCreate, onDelete,
  searchQuery, onSearchChange, searchSnippet,
  onRestoreFromTrash, onEmptyTrash, todos, updateNote,
  healthMap, onBatchDelete, onBatchPin, onBatchTag,
}) {
  const { navTab, setNavTab } = useView();

  function renderContent() {
    switch (navTab) {
      case 'tags':
        return <TagsPanel notes={notes} onSelect={onSelect} />;
      case 'tasks':
        return <TasksPanel todos={todos} notes={notes} updateNote={updateNote} onSelect={onSelect} />;
      case 'trash':
        return <TrashPanel trash={trash} onRestore={onRestoreFromTrash} onEmpty={onEmptyTrash} />;
      case 'notes':
      default:
        return (
          <NoteList
            notes={notes}
            activeId={activeId}
            onSelect={onSelect}
            onCreate={onCreate}
            onDelete={onDelete}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            searchSnippet={searchSnippet}
            healthMap={healthMap}
            onBatchDelete={onBatchDelete}
            onBatchPin={onBatchPin}
            onBatchTag={onBatchTag}
          />
        );
    }
  }

  return (
    <div className="app__panel">
      <div className="panel-content">
        {renderContent()}
      </div>
    </div>
  );
}

function TagsPanel({ notes, onSelect }) {
  const tree = buildTagTree(notes);

  function handleTagClick(tag) {
    const first = notes.find(n => (n.tags || []).includes(tag));
    if (first) onSelect(first.id);
  }

  if (Object.keys(tree).length === 0) {
    return <div className="panel-empty">No tags yet</div>;
  }

  return (
    <>
      <div className="panel-header">
        <span className="panel-header__title">Tags</span>
      </div>
      <ul className="tag-tree">
        {renderTagTreeItems(tree, '', 0, handleTagClick)}
      </ul>
    </>
  );
}

function renderTagTreeItems(node, prefix, depth, onClick) {
  const items = [];
  for (const key of Object.keys(node).sort()) {
    const fullTag = prefix ? `${prefix}/${key}` : key;
    const count = node[key]._count || 0;
    const hasChildren = Object.keys(node[key]).some(k => k !== '_count');
    items.push(
      <React.Fragment key={fullTag}>
        <li
          className={`tag-tree__item tag-tree__item--depth-${depth}`}
          onClick={() => onClick(fullTag)}
        >
          <span>{key}</span>
          {count > 0 && <span className="tag-tree__count">{count}</span>}
        </li>
        {hasChildren && renderTagTreeItems(node[key], fullTag, depth + 1, onClick)}
      </React.Fragment>
    );
  }
  return items;
}

function buildTagTree(notes) {
  const tree = {};
  notes.forEach(n => {
    (n.tags || []).forEach(t => {
      const parts = t.split('/');
      let node = tree;
      parts.forEach(p => {
        if (!node[p]) node[p] = {};
        node = node[p];
      });
      node._count = (node._count || 0) + 1;
    });
  });
  return tree;
}

function TasksPanel({ todos, notes, updateNote, onSelect }) {
  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  return (
    <>
      <div className="panel-header">
        <span className="panel-header__title">Tasks</span>
        {todos.length > 0 && <span className="panel-header__count">{pending.length}/{todos.length}</span>}
      </div>
      {todos.length === 0 ? (
        <div className="panel-empty">No tasks. Use <code>- [ ]</code> in notes.</div>
      ) : (
        <>
          {pending.map((t, i) => (
            <div key={`p-${i}`} className="task-item">
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleTask(t, notes, updateNote)}
              />
              <span className="task-item__text">{t.text}</span>
              <span className="task-item__source" onClick={() => onSelect(t.noteId)}>
                {t.noteTitle}
              </span>
            </div>
          ))}
          {done.length > 0 && (
            <>
              <div className="panel-section-header">Done</div>
              {done.map((t, i) => (
                <div key={`d-${i}`} className="task-item task-item--done">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleTask(t, notes, updateNote)}
                  />
                  <span className="task-item__text">{t.text}</span>
                  <span className="task-item__source" onClick={() => onSelect(t.noteId)}>
                    {t.noteTitle}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

function toggleTask(task, notes, updateNote) {
  const n = notes.find(x => x.id === task.noteId);
  if (!n) return;
  const text = n.content.replace(/<[^>]+>/g, '');
  const lines = text.split('\n');
  const updated = lines.map((l, j) => {
    if (j === task.lineIdx) {
      return task.done ? l.replace(/\[x\]/i, '[ ]') : l.replace(/\[\s*\]/, '[x]');
    }
    return l;
  });
  const html = updated.join('\n');
  updateNote(task.noteId, { content: html });
}

function TrashPanel({ trash, onRestore, onEmpty }) {
  return (
    <>
      <div className="panel-header">
        <span className="panel-header__title">Trash</span>
        {trash.length > 0 && (
          <button className="panel-header__action" onClick={onEmpty} title="Empty trash">
            ✕
          </button>
        )}
      </div>
      {trash.length === 0 ? (
        <div className="trash-empty">Trash is empty</div>
      ) : (
        trash.map(n => (
          <div key={n.id} className="trash-item">
            <div className="trash-item__info">
              <span className="trash-item__title">{n.title || 'Untitled'}</span>
              <span className="trash-item__date">{new Date(n.updatedAt || n.createdAt).toLocaleDateString()}</span>
            </div>
            <button className="trash-item__restore" onClick={() => onRestore(n.id)}>
              Restore
            </button>
          </div>
        ))
      )}
    </>
  );
}
