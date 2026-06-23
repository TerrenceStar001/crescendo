import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const OLD_PREFIX = 'nodemind-';
const NEW_PREFIX = 'crescendo-';

function migrateStorageKeys() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(OLD_PREFIX)) {
      const newKey = NEW_PREFIX + key.slice(OLD_PREFIX.length);
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, localStorage.getItem(key));
      }
    }
  }
}

function cleanCorruptedStorage() {
  const keys = [
    'nodemind-notes', 'nodemind-ai-config', 'nodemind-corpus-index',
    'nodemind-kind-profiles', 'nodemind-study-sessions',
    'nodemind-dashboard-sections', 'nodemind-saved-filters',
    'nodemind-knowledge-half-life',
    'crescendo-notes', 'crescendo-ai-config', 'crescendo-corpus-index',
    'crescendo-kind-profiles', 'crescendo-study-sessions',
    'crescendo-dashboard-sections', 'crescendo-saved-filters',
    'crescendo-knowledge-half-life',
  ];
  keys.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      if (raw === 'undefined' || raw === 'null') {
        localStorage.removeItem(key);
        return;
      }
      const parsed = JSON.parse(raw);
      if (key === 'nodemind-notes' || key === 'crescendo-notes') {
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.notes)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
  });
}

migrateStorageKeys();
cleanCorruptedStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
