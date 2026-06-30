import React from 'react';
import { useView } from '../context/ViewContext';

const NAV_ITEMS = [
  { id: 'notes', icon: '📝', label: 'Notes' },
  { id: 'reading', icon: '📖', label: 'Reading' },
  { id: 'writing', icon: '✍️', label: 'Writing' },
  { id: 'listening', icon: '🎧', label: 'Listening' },
  { id: 'speaking', icon: '🎤', label: 'Speaking' },
  { id: 'courses', icon: '📚', label: 'Courses' },
  { id: 'graph', icon: '🔗', label: 'Graph' },
  { id: 'progress', icon: '📊', label: 'Progress' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export default function SidebarNav({ onOpenDaily, onOpenSettings, onOpenNotes }) {
  const { navTab, setNavTab, dseTab, setDseTab, viewMode, setViewMode, focusMode, setFocusMode } = useView();

  function handleClick(id) {
    switch (id) {
      case 'graph':
        setViewMode('constellation');
        break;
      case 'settings':
        onOpenSettings?.();
        break;
      case 'notes':
        onOpenNotes?.();
        setNavTab('notes');
        setViewMode('list');
        setDseTab('dashboard');
        break;
      case 'progress':
        setViewMode('list');
        setNavTab('notes');
        setDseTab('progress');
        break;
      case 'courses':
        setDseTab('courses');
        setViewMode('list');
        setNavTab('notes');
        break;
      case 'reading':
      case 'writing':
      case 'listening':
      case 'speaking':
        setDseTab(id);
        setViewMode('list');
        setNavTab('notes');
        break;
      default:
        setNavTab(navTab === id ? 'notes' : id);
    }
  }

  function isActive(id) {
    if (id === 'notes') return navTab === 'notes' && dseTab === 'dashboard' && viewMode !== 'constellation';
    if (id === 'graph') return viewMode === 'constellation';
    if (id === 'progress') return dseTab === 'progress';
    if (id === 'courses') return dseTab === 'courses';
    if (['reading', 'writing', 'listening', 'speaking'].includes(id)) return dseTab === id;
    if (id === 'settings') return false;
    return navTab === id;
  }

  return (
    <nav className="app__nav" aria-label="Main navigation">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`nav-btn${isActive(item.id) ? ' nav-btn--active' : ''}`}
          onClick={() => handleClick(item.id)}
          aria-label={item.label}
          title={item.label}
        >
          <span role="img" aria-hidden="true">{item.icon}</span>
          <span className="nav-btn__tooltip">{item.label}</span>
        </button>
      ))}
      <div className="nav-spacer" />
      <button
        className="nav-btn nav-collapse"
        onClick={() => setFocusMode(!focusMode)}
        aria-label={focusMode ? 'Exit focus mode' : 'Focus mode'}
        title={focusMode ? 'Exit focus mode' : 'Focus mode'}
      >
        {focusMode ? '◈' : '⊞'}
        <span className="nav-btn__tooltip">{focusMode ? 'Exit focus' : 'Focus mode'}</span>
      </button>
    </nav>
  );
}
