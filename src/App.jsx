import React, { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import useNotes from './hooks/useNotes';
import useAI from './hooks/useAI';
import useLocalStorage from './hooks/useLocalStorage';
import SidebarNav from './components/SidebarNav';
import ContextPanel from './components/ContextPanel';
import NoteHeader from './components/NoteHeader';
import Canvas from './components/Canvas';
import CatalogView from './components/CatalogView';
import CourseOverview from './components/CourseOverview';
import CoursePlayer from './components/CoursePlayer';
import CourseIngestion from './components/CourseIngestion';
import CommandPalette from './components/CommandPalette';
import SettingsPage from './components/SettingsPage';
import { ViewProvider, useView } from './context/ViewContext';
import { CourseGenerationProvider } from './context/CourseGenerationContext.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import SkillRing from './components/SkillRing';
import SkillTile from './components/SkillTile';
import PerformanceChart from './components/PerformanceChart';
import SessionHistory from './components/SessionHistory';
import TheVoid from './components/TheVoid';
import ActionBar from './components/ActionBar';
import useKnowledgeHealth from './hooks/useKnowledgeHealth';
import useStudyMode from './hooks/useStudyMode';
import useSynthesis from './hooks/useSynthesis';
import useSkillAnalytics from './hooks/useSkillAnalytics';
import useDSEPapers from './hooks/useDSEPapers';
import useCourses from './hooks/useCourses';
import { useIndexedDB } from './hooks/useIndexedDB';
import ReadingModule from './components/ReadingModule';
import WritingModule from './components/WritingModule';
import ListeningModule from './components/ListeningModule';
import SpeakingModule from './components/SpeakingModule';
import corpusIndex from './utils/corpusIndex';
import { WEAKNESS_TO_TAG_MAP, safeMapLegacyCourse } from './utils/courseSchema';
import { QUESTION_TYPE_TO_AREA } from './utils/errorPatternAnalysis';
import { doFetch, normalizeEndpoint } from './utils/aiConstants';
import './App.css';

const CanvasView = lazy(() => import('./components/CanvasView'));
const ConstellationGraph = lazy(() => import('./components/ConstellationGraph'));

function CrescendoApp() {
  const {
    notes, trash, activeId, activeNote, createNote, deleteNote,
    updateNote, setActive, restoreNote, emptyTrash, exportNotes, exportMarkdown,
    importNotes, storageError,
  } = useNotes();

  const { viewMode, setViewMode, navTab, setNavTab, dseTab, setDseTab, focusMode, setFocusMode, panelWidth, setPanelWidth, toggleTheme } = useView();
  const [halfLife, setHalfLife] = useLocalStorage('crescendo-knowledge-half-life', 30);
  const { healthMap, decayingNotes, overallHealth, tagHealth, trend } = useKnowledgeHealth(notes, halfLife);
  const { suggestions } = useSynthesis(notes, activeId);
  const synthesisStats = useMemo(() => {
    if (!suggestions?.length) return null;
    return {
      total: suggestions.length,
      strong: suggestions.filter(s => s.type === 'strong').length,
      weak: suggestions.filter(s => s.type !== 'strong').length,
    };
  }, [suggestions]);
  const studyMode = useStudyMode();

  const { config, updateConfig, isConfigured, generateBoth, testConnection } = useAI();
  const skillAnalytics = useSkillAnalytics();
  const dsePapers = useDSEPapers();
  const {
    getCourses: getCoursesFn,
    saveCourse: saveCourseFn,
    deleteCourse: deleteCourseFn,
    enrollCourse: enrollCourseFn,
    unenrollCourse: unenrollCourseFn,
    getCourseCount: getCourseCountFn,
    getRecommendations: getRecommendationsFn,
    autoGenerateCourse: autoGenerateCourseFn,
    trackPostCourseImprovement: trackPostCourseImprovementFn,
  } = useCourses();
  const { syncCourses } = useIndexedDB();
  const [courses, setCourses] = useState([]);
  const [showCourseIngestion, setShowCourseIngestion] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseView, setCourseView] = useState('catalog'); // 'catalog' | 'overview' | 'player'
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [courseCompletionCount, setCourseCompletionCount] = useState(0);
  const refreshCourses = useCallback(() => {
    getCoursesFn().then(setCourses);
  }, [getCoursesFn]);

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  // Refresh enrollment/completion state when course list changes
  useEffect(() => {
    try {
      const enrollRaw = localStorage.getItem('crescendo-course-enrollments');
      const enroll = enrollRaw ? JSON.parse(enrollRaw) : [];
      setEnrolledIds(enroll);
      const completedRaw = localStorage.getItem('crescendo-course-completed');
      const completed = completedRaw ? JSON.parse(completedRaw) : [];
      setCompletedIds(completed);
      setCourseCompletionCount(completed.length);
    } catch {}
  }, [courses]);

  const handleCourseSave = useCallback(async (course) => {
    await saveCourseFn(course);
    refreshCourses();
  }, [saveCourseFn, refreshCourses]);

  const handleOpenCourse = useCallback((courseId) => {
    const course = courses.find(c => c.id === courseId);
    setActiveCourseId(courseId);
    setActiveCourse(course || null);
    setCourseView('overview');
  }, [courses]);

  const handleStartCourse = useCallback((courseId) => {
    setActiveCourseId(courseId);
    setCourseView('player');
  }, []);

  const handleBackToCatalog = useCallback(() => {
    setActiveCourseId(null);
    setActiveCourse(null);
    setCourseView('catalog');
  }, []);

  const handleSyncCourses = useCallback(async () => {
    try {
      const courses = await syncCourses(fetch);
      if (courses) {
        await refreshCourses();
        return courses.length || 0;
      }
      throw new Error('Sync returned no data');
    } catch (e) {
      console.warn('[App] Sync courses failed:', e.message);
      throw e;
    }
  }, [syncCourses, refreshCourses]);

  const handleBrowseCourses = useCallback(() => {
    setCourseView('catalog');
    setDseTab('courses');
  }, []);

  // Improvement tracking: capture weak areas when course completes
  const handleTrackImprovement = useCallback((courseId) => {
    try {
      const weakAreas = skillAnalytics?.getWeakAreas?.() || [];
      if (weakAreas.length > 0) {
        trackPostCourseImprovementFn(courseId, weakAreas, null);
      }
    } catch (e) {
      console.warn('[improvement] Failed to track:', e.message);
    }
  }, [skillAnalytics, trackPostCourseImprovementFn]);

  const [courseFilterTags, setCourseFilterTags] = useState(null);

  // Callback for ReadingModule/WritingModule to get course recommendations
  const getCourseRecommendations = useCallback(async () => {
    try {
      const recs = await getRecommendationsFn(skillAnalytics);
      return recs;
    } catch {
      return [];
    }
  }, [getRecommendationsFn, skillAnalytics]);

  // Callback for PostTaskSuggestion enrollment — navigates to catalog filtered by tags
  const handleEnrollCourse = useCallback((tagSet) => {
    if (tagSet?.length) {
      // Derive a single filter tag from the first recommended tag's prefix
      const firstTag = tagSet[0];
      const prefix = firstTag?.split(':')[0];
      setCourseFilterTags(prefix || null);
    } else {
      setCourseFilterTags(null);
    }
    setDseTab('courses');
  }, []);

  const callAI = useCallback(async (prompt, opts = {}) => {
    const { timeout = 60000, temperature = 0.3, maxTokens = 2000, system, signal: externalSignal } = opts;
    const controller = externalSignal ? null : new AbortController();
    const timer = setTimeout(() => controller?.abort(), timeout);

    const messages = system
      ? [{ role: 'system', content: system }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    const signal = externalSignal || controller?.signal;
    const tryFetch = async (url, apiKey, model, extraOpts = {}) => {
      const data = await doFetch(url, apiKey, model, messages, {
        maxTokens: extraOpts.maxTokens || maxTokens,
        temperature: extraOpts.temperature ?? temperature,
        signal,
      });
      return data.choices?.[0]?.message?.content?.trim() || '';
    };

    // Tier 1: User's custom API from Settings
    if (config.endpoint || config.apiKey) {
      try {
        const ep = normalizeEndpoint(config.endpoint, config.provider);
        const model = config.model || 'opencode/deepseek-v4-flash-free';
        const result = await tryFetch(ep, config.apiKey, model, { maxTokens, temperature });
        clearTimeout(timer);
        return result;
      } catch (e) {
        console.warn('[AI] Custom endpoint failed:', e.message);
      }
    }

    // Tier 2: Backend proxy → Express port 3001 → NVIDIA/Agnes/OpenCode
    try {
      const result = await tryFetch('/api/ai/chat/completions', '', '', { maxTokens, temperature });
      clearTimeout(timer);
      return result;
    } catch (e) {
      console.warn('[AI] Backend proxy failed:', e.message);
    }

    // Tier 3: Direct OpenCode serve (port 4010)
    try {
      const result = await tryFetch('http://127.0.0.1:4010/v1/chat/completions', '', 'opencode/deepseek-v4-flash-free', { maxTokens, temperature });
      clearTimeout(timer);
      return result;
    } catch (e) {
      console.warn('[AI] OpenCode serve failed:', e.message);
    }

    clearTimeout(timer);
    throw new Error('All AI endpoints failed');
  }, [config]);

  // Course generation: auto-generate courses from weak areas on load and after sessions
  useEffect(() => {
    if (!skillAnalytics?.isLoaded) return;

    // Only trigger for reading/writing sessions (skip initial load check when no sessions)
    const sessions = skillAnalytics?.sessions || [];
    if (sessions.length > 0) {
      const latest = sessions[0];
      if (!latest || !latest.completedAt) return;
      if (latest.skill !== 'reading' && latest.skill !== 'writing') return;
    }

    const weakAreas = skillAnalytics?.getWeakAreas?.() || [];
    if (weakAreas.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const existingCourses = await getCoursesFn();
        const existingTagSets = new Set();
        for (const c of existingCourses) {
          if (c.source === 'auto-generated' && c.tags?.length > 0) {
            existingTagSets.add(c.tags.sort().join('|'));
          }
        }

        // Build reverse index: sub-topic name → tag + area key
        const subTopicToTag = {};
        const subTopicToArea = {};
        for (const [areaKey, tags] of Object.entries(WEAKNESS_TO_TAG_MAP)) {
          for (const tag of tags) {
            const sub = tag.split(':')[1];
            if (sub) {
              const key = sub.replace(/[- ]/g, '').toLowerCase();
              subTopicToTag[key] = tag;
              subTopicToArea[key] = areaKey;
            }
          }
        }

        // Group weak sub-topics by their parent skill area (translate question types)
        const areaWeaknesses = new Map();
        for (const wa of weakAreas) {
          let areaKey = null;
          let matchedTags = [];

          // Try direct sub-topic match first
          const normalizedKey = wa.area.replace(/[- ]/g, '').toLowerCase();
          const directTag = subTopicToTag[normalizedKey];
          if (directTag) {
            areaKey = subTopicToArea[normalizedKey];
            matchedTags = [directTag];
          }

          // Fallback: translate question type to skill area
          if (!areaKey && QUESTION_TYPE_TO_AREA[wa.area]) {
            const skillAreaName = QUESTION_TYPE_TO_AREA[wa.area];
            areaKey = skillAreaName;
            matchedTags = WEAKNESS_TO_TAG_MAP[skillAreaName] || [];
          }

          if (!areaKey) {
            console.log(`[course-gen] skipping ${wa.area}: not a recognized skill sub-topic or question type`);
            continue;
          }
          if (!areaWeaknesses.has(areaKey)) {
            areaWeaknesses.set(areaKey, { tags: new Set(), sources: [] });
          }
          for (const tag of matchedTags) {
            areaWeaknesses.get(areaKey).tags.add(tag);
          }
          areaWeaknesses.get(areaKey).sources.push(wa.area);
        }

        // Generate one course per skill area (skip if tags already covered)
        for (const [areaKey, { tags, sources }] of areaWeaknesses) {
          const tagsArray = [...tags].sort();
          const tagKey = tagsArray.join('|');
          if (existingTagSets.has(tagKey)) {
            console.log(`[course-gen] skipping ${sources.join(', ')}: course with these tags already exists`);
            continue;
          }
          existingTagSets.add(tagKey);
          console.log(`[course-gen] generating course for ${sources.join(', ')}:`, tagsArray);
          const result = await autoGenerateCourseFn(tagsArray, [], callAI, { aiConfig: config });
          if (result?.course) {
            await saveCourseFn(result.course);
          }
        }
        refreshCourses();
      } catch (e) {
        console.error('[course-gen] error:', e.message);
      }
    }, sessions.length > 0 ? 3000 : 1000);

    return () => clearTimeout(timer);
  }, [
    skillAnalytics?.isLoaded,
    skillAnalytics?.sessions?.length,
    getCoursesFn,
    saveCourseFn,
    autoGenerateCourseFn,
    callAI,
    refreshCourses,
  ]);

  // Legacy course migration: stamp existing courses with isLegacy flag
  const migrationRef = useRef(false);
  useEffect(() => {
    if (migrationRef.current) return;
    migrationRef.current = true;
    (async () => {
      try {
        const existing = await getCoursesFn();
        let migrated = false;
        for (const course of existing) {
          const mapped = safeMapLegacyCourse(course);
          if (mapped !== course) {
            await saveCourseFn(mapped);
            migrated = true;
          }
        }
        if (migrated) refreshCourses();
      } catch (e) {
        console.warn('[course-migration] Failed to migrate:', e.message);
      }
    })();
  }, []);

  // Seed course loader: import bundled seed courses on first launch
  const seedCoursesRef = useRef(false);
  useEffect(() => {
    if (seedCoursesRef.current) return;
    seedCoursesRef.current = true;
    (async () => {
      try {
        const existing = await getCoursesFn();
        const seedData = (await import('./assets/bundled-courses.json')).default;
        const seedIds = new Set(seedData.map(c => c.id));
        const loadedIds = new Set(existing.map(c => c.id));
        const missing = seedData.filter(c => !loadedIds.has(c.id));
        if (missing.length > 0) {
          for (const course of missing) {
            await saveCourseFn({ ...course, source: 'seed', quality: 'seed', published: true });
          }
          refreshCourses();
        }
      } catch (e) {
        console.warn('[seed-courses] Failed to load seed courses:', e.message);
      }
    })();
  }, []);



  useEffect(() => {
    if (['reading', 'writing', 'listening', 'speaking', 'progress', 'courses'].includes(dseTab)) {
      setActive(null);
    }
  }, [dseTab, setActive]);

  const [aiOpen, setAiOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickCaptureText, setQuickCaptureText] = useState('');
  const [showVoid, setShowVoid] = useState(false);
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyQueueIndex, setStudyQueueIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const [saveStatus, setSaveStatus] = useState('');
  const [undoInfo, setUndoInfo] = useState(null);
  const undoQueueRef = useRef([]);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [importStatus, setImportStatus] = useState('');
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const debounceRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const aiTimerRef = useRef(null);
  const aiAbortRef = useRef(null);
  const aiRunningRef = useRef(false);
  const lastAiContentLenRef = useRef(0);
  const canvasRef = useRef(null);
  const undoTimeoutRef = useRef(null);
  const activeNoteRef = useRef(null);
  const tagInputRef = useRef(null);

  const studyStats = useMemo(() => studyMode.getStats(), [showVoid]);

  function handleQuickStudy() {
    const queue = decayingNotes.length > 0
      ? decayingNotes.slice(0, 5)
      : notes.filter(n => (n.content || '').length > 100).slice(-3);
    if (queue.length === 0) return;
    const target = queue[0];
    setActive(target.id);
    studyMode.startSession(target, callAI);
    setStudyQueue(queue);
    setStudyQueueIndex(0);
    setShowVoid(true);
  }

  useEffect(() => { activeNoteRef.current = activeNote; }, [activeNote]);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchQuery(searchInput), 200);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  const indexTimeoutRef = useRef(null);
  useEffect(() => {
    clearTimeout(indexTimeoutRef.current);
    indexTimeoutRef.current = setTimeout(() => {
      try { corpusIndex.rebuild(notes); } catch (e) { console.warn('Index rebuild:', e.message); }
    }, 3000);
    return () => clearTimeout(indexTimeoutRef.current);
  }, [JSON.stringify(notes.map(n => ({ id: n.id, tags: n.tags })))]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  const wordCount = useMemo(() => {
    if (!activeNote?.content) return 0;
    const text = activeNote.content.replace(/<[^>]+>/g, '');
    return text.split(/\s+/).filter(Boolean).length;
  }, [activeNote?.content]);

  const charCount = useMemo(() => {
    if (!activeNote?.content) return 0;
    return activeNote.content.replace(/<[^>]+>/g, '').length;
  }, [activeNote?.content]);

  const backlinks = useMemo(() => {
    if (!activeNote) return [];
    const title = activeNote.title?.toLowerCase();
    if (!title) return [];
    return notes.filter(n =>
      n.id !== activeNote.id &&
      (n.content || '').toLowerCase().includes(`[[${title}]]`)
    );
  }, [activeNote, notes]);

  const todos = useMemo(() => {
    const result = [];
    notes.forEach(n => {
      const text = n.content.replace(/<[^>]+>/g, '');
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        const m = line.match(/^\s*-\s*\[\s*([ xX])\s*\]\s*(.+)/);
        if (m) {
          result.push({
            noteId: n.id,
            noteTitle: n.title || 'Untitled',
            done: m[1].toLowerCase() === 'x',
            text: m[2],
            lineIdx: idx,
          });
        }
      });
    });
    return result;
  }, [notes]);

  function getSnippet(content, query) {
    if (!query || !content) return '';
    const text = content.replace(/<[^>]+>/g, '');
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text.slice(0, 80);
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + query.length + 50);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet += '...';
    return snippet;
  }

  function handleCreateNote() {
    const id = createNote();
    setActive(id);
    setNavTab('notes');
  }

  function handleQuickSave() {
    const text = quickCaptureText.trim();
    if (!text) return;
    const id = createNote({ title: 'Inbox', content: text });
    setActive(id);
    setShowQuickCapture(false);
    setQuickCaptureText('');
  }

  function handleOpenDaily() {
    const today = new Date().toISOString().slice(0, 10);
    const existing = notes.find(n =>
      (n.title || '').toLowerCase() === today || n.createdAt?.startsWith(today)
    );
    if (existing) {
      setActive(existing.id);
    } else {
      const id = createNote({ title: today });
      setActive(id);
    }
    setNavTab('notes');
  }

  function handleRandom() {
    if (notes.length === 0) return;
    const idx = Math.floor(Math.random() * notes.length);
    setActive(notes[idx].id);
    setNavTab('notes');
  }

  function handleDeleteNote(id) {
    const note = notes.find(n => n.id === id);
    deleteNote(id);
    if (note) {
      undoQueueRef.current = [note];
      setUndoInfo({ id, note });
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setUndoInfo(null);
        undoQueueRef.current = [];
      }, 5000);
    }
  }

  function handleUndo() {
    if (undoInfo) {
      restoreNote(undoInfo.id);
      setUndoInfo(null);
      undoQueueRef.current = [];
    }
  }

  function handleContentChange(html) {
    if (!activeId) return;
    updateNote(activeId, { content: html });
    setSaveStatus('Saving...');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSaveStatus('Saved'), 1000);
  }

  const handleFormat = useCallback((cmd) => {
    const el = canvasRef.current?.getElement();
    if (!el) return;
    el.focus();
    if (cmd === 'heading2') {
      document.execCommand('formatBlock', false, '<h2>');
    } else if (cmd === 'heading3') {
      document.execCommand('formatBlock', false, '<h3>');
    } else if (cmd === 'blockquote') {
      document.execCommand('formatBlock', false, '<blockquote>');
    } else if (cmd === 'code') {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount) {
        const text = sel.toString();
        document.execCommand('insertHTML', false, `<pre><code>${text}</code></pre>`);
      }
    } else {
      document.execCommand(cmd, false, null);
    }
  }, []);

  const handleExport = useCallback(() => {
    exportNotes();
    setImportStatus('Exported');
    setTimeout(() => setImportStatus(''), 2000);
  }, [exportNotes]);

  const handleAIGenerate = useCallback(async () => {
    if (!activeId || aiRunningRef.current) return;
    const current = activeNoteRef.current;
    if (!current) return;
    aiRunningRef.current = true;
    setGeneratingStatus('Generating...');
    const controller = new AbortController();
    aiAbortRef.current = controller;
    try {
      const needTitle = !current.userEditedTitle;
      const needTags = !current.userEditedTags;
      const updates = {};

      const analysis = corpusIndex.analyze(current.content, notes);

      if (!current.kindOverridden && analysis.kind) {
        const len = current.content.length;
        if (analysis.kind !== current.kind) {
          updates.kind = analysis.kind;
          updates.kindLastContentLength = len;
        } else {
          const prevLen = current.kindLastContentLength || 0;
          const firstContent = prevLen === 0 && len > 0;
          const delta = Math.abs(len - prevLen);
          const significant = firstContent || delta > 500 || (prevLen > 0 && delta / prevLen > 0.5);
          if (significant) {
            updates.kind = analysis.kind;
            updates.kindLastContentLength = len;
          }
        }
      }

      if (isConfigured && needTitle) {
        const result = await generateBoth(current.content, controller.signal);
        if (result.title) updates.title = result.title;
      }
      if (needTitle && !updates.title) updates.title = analysis.title;
      if (needTags) updates.tags = analysis.tags;
      if (updates.tags?.length || updates.title) {
        updates.aiGeneratedOnce = true;
      }
      if (Object.keys(updates).length > 0) {
        updateNote(activeId, updates);
      }
    } finally {
      aiRunningRef.current = false;
      aiAbortRef.current = null;
      setGeneratingStatus('');
    }
  }, [activeId, isConfigured, generateBoth, updateNote, notes]);

  function handleKindChange(slug) {
    if (!activeId) return;
    if (slug === '') {
      updateNote(activeId, { kind: '', kindOverridden: false });
    } else {
      updateNote(activeId, { kind: slug, kindOverridden: true });
      const note = activeNoteRef.current;
      if (note?.content) {
        corpusIndex.trainKind(slug, note.content);
      }
    }
  }

  function handleOpenVoid() {
    const note = activeNoteRef.current;
    if (!note) return;
    studyMode.startSession(note, callAI);
    setShowVoid(true);
  }

  function handleStudyComplete(noteId, correct, total) {
    if (noteId) updateNote(noteId, { updatedAt: new Date().toISOString() });
  }

  function handleNextInQueue() {
    const nextIdx = studyQueueIndex + 1;
    if (nextIdx >= studyQueue.length) {
      setShowVoid(false);
      setStudyQueue([]);
      return;
    }
    const next = studyQueue[nextIdx];
    setActive(next.id);
    studyMode.startSession(next, callAI);
    setStudyQueueIndex(nextIdx);
  }

  function handleReviewNote(noteId) {
    updateNote(noteId, { updatedAt: new Date().toISOString() });
  }

  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmdPalette(p => !p);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowQuickCapture(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        handleOpenDaily();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleAIGenerate();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleFormat('bold');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        handleFormat('italic');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        handleFormat('underline');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        handleFormat('removeFormat');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '1') {
        e.preventDefault();
        setViewMode('list');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '2') {
        e.preventDefault();
        setViewMode('canvas');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '3') {
        e.preventDefault();
        setViewMode('constellation');
        return;
      }
      if (e.key === 'Escape') {
        setShowCmdPalette(false);
        setShowQuickCapture(false);
        setShowColorPicker(false);
        setAiOpen(false);
        setShowShortcuts(false);
        setShowBacklinks(false);
        setEditingTagIndex(null);
        setTagDraft('');
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.getAttribute('contenteditable') !== 'true') {
        e.preventDefault();
        setShowShortcuts(s => !s);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleCreateNote, handleAIGenerate, handleFormat, setViewMode, handleOpenDaily]);

  function handleTitleChange(title) {
    if (activeId) updateNote(activeId, { title, userEditedTitle: title !== 'Untitled' });
  }

  function handleAddTag() {
    if (!activeNote) return;
    const newTags = [...(activeNote.tags || []), ''];
    updateNote(activeId, { tags: newTags, userEditedTags: true });
    setEditingTagIndex(newTags.length - 1);
    setTagDraft('');
    setTimeout(() => tagInputRef.current?.focus(), 0);
  }

  function handleRemoveTag(index) {
    if (!activeNote) return;
    const newTags = (activeNote.tags || []).filter((_, i) => i !== index);
    updateNote(activeId, { tags: newTags, userEditedTags: true });
  }

  function handleTogglePin() {
    if (!activeNote) return;
    updateNote(activeId, { pinned: !activeNote.pinned });
  }

  function handleBatchDelete(ids) {
    ids.forEach(id => {
      const note = notes.find(n => n.id === id);
      deleteNote(id);
      if (note) {
        undoQueueRef.current = [note];
        setUndoInfo({ id, note });
      }
    });
    clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoInfo(null);
      undoQueueRef.current = [];
    }, 5000);
  }

  function handleBatchPin(ids, pinned) {
    ids.forEach(id => updateNote(id, { pinned }));
  }

  function handleBatchTag(ids, tag) {
    ids.forEach(id => {
      const note = notes.find(n => n.id === id);
      if (note && !(note.tags || []).includes(tag)) {
        updateNote(id, { tags: [...(note.tags || []), tag] });
      }
    });
  }

  function handleDuplicate() {
    if (!activeNote || !activeId) return;
    const id = createNote({
      title: activeNote.title + ' (copy)',
      content: activeNote.content,
      tags: [...(activeNote.tags || [])],
      color: activeNote.color,
    });
    setActive(id);
  }

  function handleColorChange(color) {
    if (activeId) updateNote(activeId, { color });
    setShowColorPicker(false);
  }

  function handleResizeStart(e) {
    setIsResizing(true);
    const startX = e.clientX;
    const startW = panelWidth;

    function onMove(ev) {
      const w = Math.max(200, Math.min(400, startW + ev.clientX - startX));
      setPanelWidth(w);
      document.documentElement.style.setProperty('--panel-width', `${w}px`);
    }

    function onUp() {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Set initial panel width
  useEffect(() => {
    document.documentElement.style.setProperty('--panel-width', `${panelWidth}px`);
  }, [panelWidth]);

  // Welcome screen for empty state
  if (!activeNote && notes.length === 0 && viewMode === 'list') {
    return (
      <CourseGenerationProvider autoGenerateCourseFn={autoGenerateCourseFn} callAI={callAI}>
      <div className={`app${focusMode ? ' app--focus' : ''}`}>
        <SidebarNav
          onOpenDaily={handleOpenDaily}
          onOpenSettings={() => setAiOpen(true)}
          onOpenNotes={() => { if (!activeNote && notes.length > 0) setActive(notes[0].id); }}
        />
        <ContextPanel
          notes={[]}
          trash={trash}
          activeId={null}
          onSelect={(id) => setActive(id)}
          onCreate={handleCreateNote}
          onDelete={handleDeleteNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchInput}
          searchSnippet={null}
          onRestoreFromTrash={(id) => restoreNote(id)}
          onEmptyTrash={emptyTrash}
          todos={todos}
          updateNote={updateNote}
          healthMap={healthMap}
          onBatchDelete={handleBatchDelete}
          onBatchPin={handleBatchPin}
          onBatchTag={handleBatchTag}
        />
        <main className="app__main">
          <Dashboard
            notes={[]}
            skillAnalytics={skillAnalytics}
            onSwitchToModule={(mod) => setDseTab(mod)}
            onCreate={handleCreateNote}
            onOpenDaily={handleOpenDaily}
            onRandom={handleRandom}
            courseCompletionCount={courseCompletionCount}
            onBrowseCourses={() => setDseTab('courses')}
          />
        </main>

        {showCmdPalette && (
          <CommandPalette
            notes={[]}
            onSelect={(id) => setActive(id)}
            onCreate={handleCreateNote}
            onQuickCapture={() => setShowQuickCapture(true)}
            onOpenDaily={handleOpenDaily}
            onRandom={handleRandom}
            onToggleTheme={() => {}}
            onClose={() => setShowCmdPalette(false)}
          />
        )}

        {showQuickCapture && quickCaptureOverlay()}

        {showVoid && (
          <TheVoid
            note={activeNoteRef.current}
            studySession={studyMode.getQuestions().length > 0 ? { questions: studyMode.getQuestions(), useAI: studyMode.getUseAI() } : null}
            onSubmitAnswer={(idx, answer) => studyMode.submitAnswer(idx, answer)}
            onGenerateWithAI={(signal) => studyMode.generateWithAI(signal)}
            onClose={() => { setShowVoid(false); setStudyQueue([]); }}
            onReviewComplete={handleStudyComplete}
            onRecordSession={(id, title) => studyMode.recordSession(id, title)}
            noteHistory={activeNote ? studyMode.getNoteHistory(activeNote.id) : []}
            queueSize={studyQueue.length}
            queueIndex={studyQueueIndex}
            onNextNote={handleNextInQueue}
          />
        )}
      </div>
      </CourseGenerationProvider>
    );
  }

  function quickCaptureOverlay() {
    return (
      <div className="cmd-palette-overlay" onClick={() => setShowQuickCapture(false)}>
        <div className="cmd-palette" onClick={e => e.stopPropagation()}>
          <div className="cmd-palette__input-wrap">
            <span className="cmd-palette__prefix">&gt;</span>
            <input
              className="cmd-palette__input"
              placeholder="Dump a thought..."
              value={quickCaptureText}
              onChange={e => setQuickCaptureText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickSave(); }
              }}
              autoFocus
            />
          </div>
          <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleQuickSave}
              disabled={!quickCaptureText.trim()}
              style={{
                padding: '6px 16px',
                background: quickCaptureText.trim() ? 'var(--color-accent)' : 'var(--color-border)',
                color: quickCaptureText.trim() ? '#fff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: quickCaptureText.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit',
                fontSize: '0.8rem',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CourseGenerationProvider autoGenerateCourseFn={autoGenerateCourseFn} callAI={callAI}>
    <div className={`app${focusMode ? ' app--focus' : ''}`}>
      <SidebarNav
        onOpenDaily={handleOpenDaily}
        onOpenSettings={() => setAiOpen(true)}
        onOpenNotes={() => { if (!activeNote && notes.length > 0) setActive(notes[0].id); }}
      />
      <ContextPanel
        notes={filteredNotes}
        trash={trash}
        activeId={activeId}
        onSelect={(id) => { setActive(id); setNavTab('notes'); }}
        onCreate={handleCreateNote}
        onDelete={handleDeleteNote}
        searchQuery={searchQuery}
        onSearchChange={setSearchInput}
        searchSnippet={searchQuery ? (n) => getSnippet(n.content, searchQuery) : null}
        onRestoreFromTrash={(id) => restoreNote(id)}
        onEmptyTrash={emptyTrash}
        todos={todos}
        updateNote={updateNote}
        healthMap={healthMap}
        onBatchDelete={handleBatchDelete}
        onBatchPin={handleBatchPin}
        onBatchTag={handleBatchTag}
      />
      <div className="app__panel-resize" onMouseDown={handleResizeStart} />

      <main className="app__main">
        {viewMode === 'constellation' ? (
          <Suspense fallback={<div className="panel-empty" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <ErrorBoundary>
              <ConstellationGraph
                notes={notes}
                activeId={activeId}
                onSelect={(id) => setActive(id)}
                onFocusTag={() => {}}
                focusTag={null}
                onClearFocusTag={() => {}}
                healthMap={healthMap}
              />
            </ErrorBoundary>
          </Suspense>
        ) : viewMode === 'canvas' ? (
          <Suspense fallback={<div className="panel-empty" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <ErrorBoundary>
              <CanvasView
                notes={notes}
                activeId={activeId}
                onSelect={(id) => setActive(id)}
                onNodeDragStop={(id, pos) => updateNote(id, { position: pos })}
                focusTag={null}
                onFocusTag={() => {}}
                onClearFocusTag={() => {}}
                updateNote={updateNote}
                suggestions={suggestions}
                healthMap={healthMap}
              />
            </ErrorBoundary>
          </Suspense>
        ) : dseTab === 'dashboard' && !activeNote ? (
          <Dashboard
            notes={notes}
            skillAnalytics={skillAnalytics}
            onSwitchToModule={(mod) => setDseTab(mod)}
            onCreate={handleCreateNote}
            onOpenDaily={handleOpenDaily}
            onRandom={handleRandom}
            courseCompletionCount={courseCompletionCount}
            onBrowseCourses={() => setDseTab('courses')}
          />
        ) : dseTab === 'progress' ? (
          <div className="dse-module">
            <div className="dse-module__header">
              <button className="dse-module__back" onClick={() => setDseTab('dashboard')}>← Dashboard</button>
              <h1 className="dse-module__title">📊 Performance Analytics</h1>
              <p className="dse-module__subtitle">Detailed breakdown of your DSE English progress</p>
            </div>
            <div className="dse-dashboard__rings" style={{ padding: 'var(--space-4)' }}>
              {(['reading', 'writing', 'listening', 'speaking']).map(s => (
                <SkillTile
                  key={s}
                  skill={s}
                  percentage={skillAnalytics[s]?.overall || 0}
                  dseLevel={skillAnalytics[s]?.dseLevel || '1'}
                  onClick={() => setDseTab(s)}
                />
              ))}
            </div>
            <div className="dashboard__grid" style={{ padding: '0 var(--space-4) var(--space-4)' }}>
              <div className="dashboard__section">
                <div className="dashboard__section-header">
                  <h2 className="dashboard__section-title">📈 Grade History</h2>
                </div>
                <PerformanceChart sessions={skillAnalytics.getGradeHistory(null, 30)} />
              </div>
              <div className="dashboard__section">
                <div className="dashboard__section-header">
                  <h2 className="dashboard__section-title">📋 Session History</h2>
                  <button className="dashboard__section-hide" onClick={() => {}} title="View all sessions">✕</button>
                </div>
                <SessionHistory sessions={skillAnalytics.sessions} onBack={() => {}} />
              </div>
            </div>
          </div>
        ) : dseTab === 'reading' ? (
          <ReadingModule
            dsePapers={dsePapers}
            skillAnalytics={skillAnalytics}
            callAI={callAI}
            notes={notes}
            createNote={createNote}
            onBack={() => { setDseTab('dashboard'); setActive(null); }}
            onGetCourseRecommendations={getCourseRecommendations}
            onEnrollCourse={handleEnrollCourse}
            onBrowseCourses={handleBrowseCourses}
          />
        ) : dseTab === 'writing' ? (
          <WritingModule
            dsePapers={dsePapers}
            skillAnalytics={skillAnalytics}
            callAI={callAI}
            notes={notes}
            createNote={createNote}
            onBack={() => { setDseTab('dashboard'); setActive(null); }}
            onGetCourseRecommendations={getCourseRecommendations}
            onEnrollCourse={handleEnrollCourse}
            onBrowseCourses={handleBrowseCourses}
          />
        ) : dseTab === 'listening' ? (
          <ListeningModule
            dsePapers={dsePapers}
            skillAnalytics={skillAnalytics}
            notes={notes}
            onBack={() => { setDseTab('dashboard'); setActive(null); }}
          />
        ) : dseTab === 'speaking' ? (
          <SpeakingModule
            skillAnalytics={skillAnalytics}
            callAI={callAI}
            onBack={() => { setDseTab('dashboard'); setActive(null); }}
          />
        ) : dseTab === 'courses' ? (
          showCourseIngestion ? (
            <CourseIngestion
              callAI={callAI}
              onSave={handleCourseSave}
              onBack={() => setShowCourseIngestion(false)}
            />
          ) : courseView === 'player' && activeCourseId ? (
            <CoursePlayer
              course={activeCourse || courses.find(c => c.id === activeCourseId) || {}}
              onBack={handleBackToCatalog}
              callAI={callAI}
              dsePapers={dsePapers}
              onTrackImprovement={handleTrackImprovement}
            />
          ) : courseView === 'overview' && activeCourseId ? (
            <CourseOverview
              course={activeCourse || courses.find(c => c.id === activeCourseId) || {}}
              onBack={handleBackToCatalog}
              onStart={handleStartCourse}
              callAI={callAI}
            />
          ) : (
            <CatalogView
              courses={courses}
              onEnroll={(courseId) => {
                enrollCourseFn(courseId);
                setEnrolledIds(prev => prev.includes(courseId) ? prev : [...prev, courseId]);
              }}
              onOpenCourse={handleOpenCourse}
              onOpenIngestion={() => setShowCourseIngestion(true)}
              onRefreshCourses={handleSyncCourses}
              enrolledIds={enrolledIds}
              completedIds={completedIds}
              callAI={callAI}
              filterTags={courseFilterTags}
            />
          )
        ) : (
          <>
            <NoteHeader
              note={activeNote}
              onBack={() => setActive(null)}
              onAIGenerate={handleAIGenerate}
              onTogglePin={handleTogglePin}
              onDuplicate={handleDuplicate}
              onTitleChange={handleTitleChange}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onColorChange={handleColorChange}
              backlinks={backlinks.length}
              onShowBacklinks={() => setShowBacklinks(true)}
              generatingStatus={generatingStatus}
              onStudy={handleOpenVoid}
              onKindChange={handleKindChange}
            />
            <Canvas
              ref={canvasRef}
              value={activeNote.content}
              onChange={handleContentChange}
              onFormat={handleFormat}
            />
            <ActionBar
              content={activeNote.content}
              onOpenVoid={handleOpenVoid}
              wordCount={wordCount}
              onToggleFocus={() => setFocusMode(f => !f)}
              isFocusMode={focusMode}
            />
            <div className="main-footer">
              <div className="main-footer__left">
                <span className="main-footer__stat">{wordCount} words</span>
                <span className="main-footer__stat">{charCount} chars</span>
                {saveStatus && <span className="main-footer__stat" style={{ color: 'var(--color-success)' }} aria-live="polite">{saveStatus}</span>}
              </div>
              <div className="main-footer__right">
                <button
                  className="main-footer__btn"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setColorPickerPos({ top: rect.top - 180, left: rect.left - 80 });
                    setShowColorPicker(!showColorPicker);
                  }}
                  title="Note color"
                  aria-label="Note color"
                >
                  🎨
                </button>
                <button
                  className="main-footer__btn"
                  onClick={() => setShowCmdPalette(true)}
                  title="Command palette (Ctrl+K)"
                  aria-label="Command palette"
                >
                  ⌘
                </button>
              </div>
            </div>

            {showColorPicker && (
              <div className="color-popover" style={{ top: colorPickerPos.top, left: colorPickerPos.left }}>
                {['', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#ff9ff3'].map(c => (
                  <button
                    key={c || 'none'}
                    className={`color-popover__dot${activeNote.color === c ? ' color-popover__dot--active' : ''}${!c ? ' color-popover__dot--none' : ''}`}
                    style={c ? { backgroundColor: c } : {}}
                    onClick={() => handleColorChange(c)}
                    title={c || 'No color'}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Backlinks Modal */}
      {showBacklinks && (
        <div className="cmd-palette-overlay" onClick={() => setShowBacklinks(false)}>
          <div className="cmd-palette" onClick={e => e.stopPropagation()} style={{ maxHeight: '50vh' }}>
            <div className="cmd-palette__input-wrap" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' }}>
                Backlinks to "{activeNote?.title}"
              </span>
              <button
                onClick={() => setShowBacklinks(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>
            <div className="cmd-palette__results">
              {backlinks.length === 0 ? (
                <div className="panel-empty">No backlinks</div>
              ) : (
                backlinks.map(n => (
                  <div
                    key={n.id}
                    className="cmd-palette__result"
                    onClick={() => { setActive(n.id); setShowBacklinks(false); }}
                  >
                    <span className="cmd-palette__result-icon">📄</span>
                    <div className="cmd-palette__result-body">
                      <span className="cmd-palette__result-title">{n.title || 'Untitled'}</span>
                      <span className="cmd-palette__result-preview">
                        {n.content.replace(/<[^>]+>/g, '').slice(0, 80)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* The Void */}
      {showVoid && (
        <TheVoid
          note={activeNote}
          studySession={studyMode.getQuestions().length > 0 ? { questions: studyMode.getQuestions(), useAI: !!config.apiKey } : null}
          onSubmitAnswer={(idx, answer) => studyMode.submitAnswer(idx, answer)}
          onGenerateWithAI={(signal) => studyMode.generateWithAI(signal)}
          onClose={() => setShowVoid(false)}
          onReviewComplete={handleStudyComplete}
          onRecordSession={(id, title) => studyMode.recordSession(id, title)}
          noteHistory={activeNote ? studyMode.getNoteHistory(activeNote.id) : []}
          queueSize={studyQueue.length}
          queueIndex={studyQueueIndex}
          onNextNote={handleNextInQueue}
        />
      )}

      {/* Settings */}
      <SettingsPage
        config={config}
        onUpdate={updateConfig}
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        testConnection={testConnection}
        notes={notes}
        exportNotes={exportNotes}
        importNotes={importNotes}
        halfLife={halfLife}
        setHalfLife={setHalfLife}
        studyStats={studyStats}
      />

      {/* Shortcuts */}
      {showShortcuts && (
        <div className="shortcut-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcut-modal" onClick={e => e.stopPropagation()}>
            <div className="shortcut-modal__header">
              <h3>Keyboard Shortcuts</h3>
              <button className="shortcut-modal__close" autoFocus onClick={() => setShowShortcuts(false)}>✕</button>
            </div>
            <div className="shortcut-modal__body">
              <table className="shortcut-table">
                <tbody>
                  <tr><td><kbd>Ctrl+N</kbd></td><td>New note</td></tr>
                  <tr><td><kbd>Ctrl+K</kbd></td><td>Command palette</td></tr>
                  <tr><td><kbd>Ctrl+Shift+N</kbd></td><td>Quick capture</td></tr>
                  <tr><td><kbd>Ctrl+Shift+D</kbd></td><td>Daily note</td></tr>
                  <tr><td><kbd>Ctrl+S</kbd></td><td>AI generate</td></tr>
                  <tr><td><kbd>Ctrl+B</kbd></td><td>Bold</td></tr>
                  <tr><td><kbd>Ctrl+I</kbd></td><td>Italic</td></tr>
                  <tr><td><kbd>Ctrl+U</kbd></td><td>Underline</td></tr>
                  <tr><td><kbd>Ctrl+Shift+F</kbd></td><td>Clear formatting</td></tr>
                  <tr><td><kbd>Ctrl+1</kbd></td><td>List view</td></tr>
                  <tr><td><kbd>Ctrl+2</kbd></td><td>Canvas view</td></tr>
                  <tr><td><kbd>Ctrl+3</kbd></td><td>Graph view</td></tr>
                  <tr><td><kbd>Escape</kbd></td><td>Close modals</td></tr>
                  <tr><td><kbd>?</kbd></td><td>Shortcuts</td></tr>
                </tbody>
              </table>
              <h4 style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Markdown Shortcuts</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                <code>#</code>, <code>##</code>, <code>*</code>, <code>- [ ]</code>, <code>&gt;</code>, <code>```</code>, <code>---</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      {showCmdPalette && (
        <CommandPalette
          notes={notes}
          onSelect={(id) => { setActive(id); setNavTab('notes'); }}
          onCreate={handleCreateNote}
          onQuickCapture={() => setShowQuickCapture(true)}
          onOpenDaily={handleOpenDaily}
          onRandom={handleRandom}
          onToggleTheme={toggleTheme}
          onStudy={handleOpenVoid}
          onClose={() => setShowCmdPalette(false)}
        />
      )}

      {/* Quick Capture */}
      {showQuickCapture && quickCaptureOverlay()}

      {/* Undo Toast */}
      {undoInfo && (
        <div className="undo-toast">
          <span className="undo-toast__text">
            {undoQueueRef.current.length > 1 ? `${undoQueueRef.current.length} notes deleted` : 'Note deleted'}
          </span>
          <button className="undo-toast__btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {/* Storage Warning */}
      {storageError && (
        <div style={{
          position: 'fixed', bottom: 'var(--space-5)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 90, display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius)', padding: 'var(--space-2) var(--space-4)',
          fontSize: 'var(--font-sm)', color: 'var(--color-warning)',
        }}>
          <span>⚠ {storageError}</span>
          <button onClick={handleExport} style={{
            padding: '3px 10px', background: 'var(--color-warning)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 'var(--font-xs)',
          }}>Export</button>
        </div>
      )}
    </div>
    </CourseGenerationProvider>
  );
}

export default function App() {
  return (
    <ViewProvider>
      <CrescendoApp />
    </ViewProvider>
  );
}
