import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

const INITIAL_STATE = { notes: [], activeId: null, trash: [] };

let idCounter = Date.now();

function generateId() {
  idCounter += 1;
  return idCounter.toString(36);
}

function createBlankNote(overrides) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'Untitled',
    content: '',
    tags: [],
    color: '',
    position: null,
    createdAt: now,
    updatedAt: now,
    userEditedTitle: false,
    userEditedTags: false,
    aiGeneratedOnce: false,
    kind: '',
    kindOverridden: false,
    kindLastContentLength: 0,
    ...overrides,
  };
}

export default function useNotes() {
  const [state, setState, storageError] = useLocalStorage('crescendo-notes', INITIAL_STATE);

  const notes = (state.notes || []).filter(n => !n.deleted);
  const trash = (state.trash || []).concat((state.notes || []).filter(n => n.deleted));
  const activeId = state.activeId || null;
  const activeNote = notes.find(n => n.id === activeId) || null;

  const setActive = useCallback((id) => {
    setState(prev => ({ ...prev, activeId: id }));
  }, [setState]);

  const createNote = useCallback((overrides) => {
    const note = createBlankNote(overrides);
    setState(prev => ({
      ...prev,
      notes: [note, ...(prev.notes || [])],
      activeId: note.id,
    }));
    return note.id;
  }, [setState]);

  const deleteNote = useCallback((id) => {
    setState(prev => {
      const note = (prev.notes || []).find(n => n.id === id);
      if (!note) return prev;
      const nextNotes = (prev.notes || []).map(n => n.id === id ? { ...n, deleted: true } : n);
      let nextActive = prev.activeId;
      if (prev.activeId === id) {
        const remaining = nextNotes.filter(n => !n.deleted);
        nextActive = remaining.length > 0 ? remaining[0].id : null;
      }
      return { ...prev, notes: nextNotes, activeId: nextActive };
    });
  }, [setState]);

  const restoreNote = useCallback((id) => {
    setState(prev => {
      const restored = (prev.notes || []).find(n => n.id === id && n.deleted) || (prev.trash || []).find(n => n.id === id);
      if (!restored) return prev;
      const alive = { ...restored, deleted: false };
      const nextNotes = (prev.notes || []).filter(n => n.id !== id);
      const nextTrash = (prev.trash || []).filter(n => n.id !== id);
      return { ...prev, notes: [alive, ...nextNotes], trash: nextTrash, activeId: id };
    });
  }, [setState]);

  const emptyTrash = useCallback(() => {
    setState(prev => {
      const live = (prev.notes || []).filter(n => !n.deleted);
      return { ...prev, notes: live, trash: [] };
    });
  }, [setState]);

  const updateNote = useCallback((id, updates) => {
    setState(prev => ({
      ...prev,
      notes: (prev.notes || []).map(n =>
        n.id === id ? { ...n, ...updates, ...(updates.content !== undefined || updates.title !== undefined || updates.tags !== undefined ? { updatedAt: new Date().toISOString() } : {}) } : n
      ),
    }));
  }, [setState]);

  const exportNotes = useCallback(() => {
    const data = { version: 1, exportedAt: new Date().toISOString(), notes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crescendo-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const exportMarkdown = useCallback(() => {
    let md = '';
    notes.forEach(n => {
      const title = n.title || 'Untitled';
      const date = new Date(n.createdAt).toISOString().slice(0, 10);
      const tags = (n.tags || []).map(t => `  - ${t}`).join('\n');
      const content = (n.content || '').replace(/<[^>]*>/g, '').trim();
      md += `# ${title}\n\n`;
      md += `*Created: ${date}*\n\n`;
      if (tags) md += `Tags:\n${tags}\n\n`;
      md += `${content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crescendo-export-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const importNotes = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.notes || !Array.isArray(data.notes)) {
            reject(new Error('Invalid file: missing notes array'));
            return;
          }
          const valid = data.notes.filter(n => n && n.id && n.title !== undefined);
          if (valid.length === 0) {
            reject(new Error('No valid notes found in file'));
            return;
          }
          let importedCount;
          setState(prev => {
            const existingIds = new Set(prev.notes.map(n => n.id));
            const newNotes = valid.filter(n => !existingIds.has(n.id));
            importedCount = newNotes.length;
            if (newNotes.length === 0) return prev;
            return { ...prev, notes: [...prev.notes, ...newNotes] };
          });
          if (importedCount > 0) resolve(`${importedCount} notes imported`);
          else reject(new Error('All notes already exist'));
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.readAsText(file);
    });
  }, [setState]);

  return {
    notes,
    trash,
    activeId,
    activeNote,
    createNote,
    deleteNote,
    updateNote,
    setActive,
    restoreNote,
    emptyTrash,
    exportNotes,
    exportMarkdown,
    importNotes,
    storageError,
  };
}
