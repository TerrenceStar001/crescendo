import { useCallback } from 'react';

const DB_NAME = 'CrescendoDSE';
const DB_VERSION = 1;
const STORE_NAME = 'store';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useIndexedDB() {
  const getItem = useCallback(async (key) => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => { resolve(req.result || null); db.close(); };
        req.onerror = () => { reject(req.error); db.close(); };
      });
    } catch { return null; }
  }, []);

  const setItem = useCallback(async (key, value) => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => { resolve(); db.close(); };
        req.onerror = () => { reject(req.error); db.close(); };
      });
    } catch { /* silent */ }
  }, []);

  const updateItem = useCallback(async (key, updater) => {
    try {
      const current = await getItem(key);
      const next = updater(current);
      await setItem(key, next);
      return next;
    } catch { return null; }
  }, [getItem, setItem]);

  const deleteItem = useCallback(async (key) => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(key);
        req.onsuccess = () => { resolve(); db.close(); };
        req.onerror = () => { reject(req.error); db.close(); };
      });
    } catch { /* silent */ }
  }, []);

  const getKeys = useCallback(async () => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => { resolve(req.result); db.close(); };
        req.onerror = () => { reject(req.error); db.close(); };
      });
    } catch { return []; }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).clear();
        req.onsuccess = () => { resolve(); db.close(); };
        req.onerror = () => { reject(req.error); db.close(); };
      });
    } catch { /* silent */ }
  }, []);

  const getStorageEstimate = useCallback(async () => {
    try {
      if (navigator.storage?.estimate) {
        return await navigator.storage.estimate();
      }
    } catch { /* ignore */ }
    return { usage: 0, quota: 0 };
  }, []);

  const DSE_KEYS = {
    PROFILE: 'crescendo-skill-profile',
    SESSIONS: 'crescendo-skill-sessions',
    PAPERS: 'crescendo-dse-papers',
    CONTENT: 'crescendo-dse-content',
    DRAFTS: 'crescendo-writing-drafts',
    RECORDINGS: 'crescendo-speech-recordings',
    SESSION_ANSWERS: 'crescendo-session-answers',
    WRITING_SESSIONS: 'crescendo-writing-sessions',
    COURSES: 'crescendo-course-definitions',
    COURSE_PROGRESS: 'crescendo-course-progress',
    COURSE_INGESTION: 'crescendo-course-ingestion',
  };

  return { getItem, setItem, updateItem, deleteItem, getKeys, clearAll, getStorageEstimate, DSE_KEYS };
}
