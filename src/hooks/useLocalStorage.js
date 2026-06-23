import { useState, useCallback } from 'react';

function safeParse(raw) {
  if (!raw || raw === 'undefined') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function useLocalStorage(key, defaultValue) {
  const [item, setItem] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = safeParse(raw);
      if (parsed !== null && parsed !== undefined) return parsed;
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    } catch {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }
  });
  const [error, setError] = useState(null);

  const setValue = useCallback((value) => {
    setItem(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        if (next === undefined || next === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(next));
        }
        setError(null);
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          setError('Storage is full. Export your notes to free space.');
        } else {
          setError('Failed to save: ' + e.message);
        }
      }
      return next;
    });
  }, [key]);

  return [item, setValue, error];
}