import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

const ViewContext = createContext(null);

export function ViewProvider({ children }) {
  const [viewMode, setViewMode] = useLocalStorage('crescendo-view', 'list');
  const [focusTag, setFocusTag] = React.useState(null);
  const [theme, setTheme] = useLocalStorage('crescendo-theme', 'light');
  const [navTab, setNavTab] = useState('notes');
  const [dseTab, setDseTab] = useLocalStorage('crescendo-dse-tab', 'dashboard');
  const [panelWidth, setPanelWidth] = useLocalStorage('crescendo-panel-width', 260);
  const [focusMode, setFocusMode] = useState(false);
  const [planTab, setPlanTab] = useLocalStorage('crescendo-plan-tab', 'plan');

  const clearFocusTag = useCallback(() => setFocusTag(null), []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ViewContext.Provider value={{
      viewMode, setViewMode,
      focusTag, setFocusTag, clearFocusTag,
      theme, toggleTheme,
      navTab, setNavTab,
      dseTab, setDseTab,
      panelWidth, setPanelWidth,
      focusMode, setFocusMode,
      planTab, setPlanTab,
    }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error('useView must be used within ViewProvider');
  return ctx;
}
