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
    ASSESSMENT: 'crescendo-assessment',
    STUDY_PLAN: 'crescendo-study-plan',
    FLAW_DATA: 'crescendo-flaw-data',
    REVIEW_DATA: 'crescendo-review-data',
  };

  const syncCourses = useCallback(async (fetchFn) => {
    try {
      const res = await fetchFn('/api/courses/sync', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { courses: backendCourses } = await res.json();
      const backendIds = new Set((backendCourses || []).map(c => c.id));

      // Merge: keep local courses (seed + auto-generated) that backend doesn't have
      const existing = await getItem(DSE_KEYS.COURSES) || [];
      const localOnly = (Array.isArray(existing) ? existing : []).filter(c => !backendIds.has(c.id));

      const merged = [...(backendCourses || []), ...localOnly];
      await setItem(DSE_KEYS.COURSES, merged);
      return backendCourses || [];
    } catch (e) {
      console.warn('[IndexedDB] Course sync failed:', e.message);
      return null;
    }
  }, [setItem, getItem]);

  const getCachedCourses = useCallback(async () => {
    try {
      const courses = await getItem(DSE_KEYS.COURSES);
      return Array.isArray(courses) ? courses : [];
    } catch {
      return [];
    }
  }, [getItem]);

  return { getItem, setItem, updateItem, deleteItem, getKeys, clearAll, getStorageEstimate, DSE_KEYS, syncCourses, getCachedCourses };
}
