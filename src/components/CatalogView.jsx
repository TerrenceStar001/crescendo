import React, { useState, useMemo, useCallback, useRef } from 'react';

const STATIC_FILTER_TAGS = ['grammar', 'vocabulary', 'sentence-structure'];

/** Extract unique tag categories (text before colon) from courses */
function getFilterTags(courses) {
  const dynamic = new Set();
  (courses || []).forEach(c => (c.tags || []).forEach(t => {
    const cat = t.split(':')[0].trim();
    if (cat) dynamic.add(cat);
  }));
  const dynamicArr = [...dynamic].sort();
  return dynamicArr.length >= 2 ? dynamicArr : STATIC_FILTER_TAGS;
}

/**
 * CatalogView — Course catalog browser.
 * Shows three sections: Recommended for You, In Progress, Completed.
 * Includes search bar and tag filter chips.
 *
 * Props:
 *   courses           — array of course objects
 *   onEnroll          — (courseId) => void
 *   onOpenCourse      — (courseId) => void, opens CourseOverview
 *   onOpenIngestion   — () => void, opens PDF ingestion panel
 *   enrolledIds       — array of enrolled course IDs
 *   completedIds      — array of completed course IDs
 *   callAI            — AI call function
 */
function getOverallDseLevel(skillAnalytics) {
  // Infer DSE level from skill rings or overallDseLevel (D-30)
  if (!skillAnalytics) return '1';
  if (skillAnalytics.overallDseLevel) return skillAnalytics.overallDseLevel;
  const numLevel = (() => {
    const levels = ['reading', 'writing', 'listening', 'speaking']
      .map(s => parseInt((skillAnalytics[s]?.dseLevel || '1').replace(/[^\d]/g, ''), 10))
      .filter(v => !isNaN(v));
    if (levels.length === 0) return 1;
    return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
  })();
  // Convert numeric level back to DSE string (5**, 5*, 5, 4, 3, 2, 1)
  if (numLevel >= 5.5) return '5**';
  if (numLevel >= 5) return '5*';
  if (numLevel >= 4.5) return '5';
  if (numLevel >= 4) return '4';
  if (numLevel >= 3) return '3';
  if (numLevel >= 2) return '2';
  return '1';
}

function levelToNumber(level) {
  if (!level) return 1;
  if (level === '5**') return 5.5;
  if (level === '5*') return 5;
  return parseInt(level, 10) || 1;
}

export default function CatalogView({
  courses = [],
  onEnroll,
  onOpenCourse,
  onOpenIngestion,
  onRefreshCourses,
  enrolledIds = [],
  completedIds = [],
  callAI,
  skillAnalytics,
  filterTags,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState(filterTags || null);

  // Derive filter categories dynamically from available course tags
  const filterTagCategories = useMemo(() => getFilterTags(courses), [courses]);

  // Sync filterTags prop when it changes externally
  const prevFilterTags = React.useRef(filterTags);
  if (filterTags !== prevFilterTags.current) {
    prevFilterTags.current = filterTags;
    if (filterTags) setActiveTag(filterTags);
  }

  // State for sync button
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const handleSync = useCallback(async () => {
    if (!onRefreshCourses || syncing) return;
    setSyncing(true);
    setSyncError('');
    try {
      const count = await onRefreshCourses();
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'course__toast course__toast--success';
      toast.textContent = `Courses synced from server (${count} courses)`;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    } catch {
      setSyncError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, [onRefreshCourses, syncing]);

  // Derive course sets
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);
  const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

  const enrolledCourses = useMemo(() => courses.filter(c => enrolledSet.has(c.id) && !completedSet.has(c.id)), [courses, enrolledSet, completedSet]);
  const completedCourses = useMemo(() => courses.filter(c => completedSet.has(c.id)), [courses, completedSet]);
  const availableCourses = useMemo(() => courses.filter(c => !enrolledSet.has(c.id) && !completedSet.has(c.id)), [courses, enrolledSet, completedSet]);

  // Filter available courses by search query and active tag
  const filteredAvailable = useMemo(() => {
    let result = availableCourses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (activeTag) {
      result = result.filter(c =>
        (c.tags || []).some(t => t.startsWith(activeTag))
      );
    }

    return result;
  }, [availableCourses, searchQuery, activeTag]);

  // Filter enrolled courses by search/tag too
  const filteredEnrolled = useMemo(() => {
    if (!searchQuery && !activeTag) return enrolledCourses;
    return enrolledCourses.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(c.title || '').toLowerCase().includes(q) &&
            !(c.description || '').toLowerCase().includes(q) &&
            !(c.tags || []).some(t => t.toLowerCase().includes(q))) {
          return false;
        }
      }
      if (activeTag) {
        if (!(c.tags || []).some(t => t.startsWith(activeTag))) return false;
      }
      return true;
    });
  }, [enrolledCourses, searchQuery, activeTag]);

  // Difficulty progression (D-30): check if course is locked based on DSE level
  const isLocked = useMemo(() => {
    return (course) => {
      if (course.quality === 'seed' || course.source === 'seed') return false;
      if (!course?.difficulty) return false;
      const userLevel = levelToNumber(getOverallDseLevel(skillAnalytics));
      if (course.difficulty === 'advanced' && userLevel < 4) return true;
      if (course.difficulty === 'intermediate' && userLevel < 3) return true;
      return false;
    };
  }, [skillAnalytics]);

  const getLockRequirement = (difficulty) => {
    if (difficulty === 'advanced') return 'Requires DSE Level 4+ to unlock';
    if (difficulty === 'intermediate') return 'Requires DSE Level 3+ to unlock';
    return null;
  };

  const renderCourseCard = (course, showEnroll = false) => {
    const locked = isLocked(course);
    return (
    <div key={course.id} className={`course__card${locked ? ' course__card--locked' : ''}`}>
      <div className="course__card-body">
        {locked && <div className="course__card-lock-overlay" title={getLockRequirement(course.difficulty)}>🔒</div>}
        <h3 className="course__card-title">{course.title}</h3>
        {course.description && (
          <p className="course__card-desc">{course.description}</p>
        )}
        <div className="course__card-meta">
          <span className={`course__card-difficulty course__card-difficulty--${course.difficulty || 'intermediate'}`}>
            {course.difficulty || 'intermediate'}
          </span>
          <span className="course__card-source">
            {course.source === 'pdf-import' ? '📄 Imported' : course.source === 'seed' ? '🌱 Seed' : '🤖 Auto-generated'}
          </span>
          {course.quality && (
            <span className={`course__badge course__badge--${course.quality}`}>
              {course.quality === 'seed' ? '🌱' : course.quality === 'reviewed' ? '✓' : '✎'} {course.quality}
            </span>
          )}
        </div>
        {course.tags && course.tags.length > 0 && (
          <div className="course__card-tags">
            {course.tags.slice(0, 3).map(t => (
              <span key={t} className="course__card-tag">{t}</span>
            ))}
          </div>
        )}
        {locked && (
          <div className="course__card-lock-tooltip">{getLockRequirement(course.difficulty)}</div>
        )}
      </div>
      <div className="course__card-actions">
        <button
          className={`course__btn course__btn--primary${locked ? ' course__btn--disabled' : ''}`}
          onClick={() => { if (!locked) onOpenCourse?.(course.id); }}
          title={locked ? getLockRequirement(course.difficulty) : ''}
        >
          {locked ? 'Locked' : (completedSet.has(course.id) ? 'Review' : 'View Course')}
        </button>
        {showEnroll && !locked && !enrolledSet.has(course.id) && !completedSet.has(course.id) && (
          <button
            className="course__btn course__btn--secondary"
            onClick={() => onEnroll?.(course.id)}
          >
            Enroll
          </button>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="course__catalog">
      <div className="course__header">
        <h1 className="course__title">Courses</h1>
        <p className="course__subtitle">Interactive courses to strengthen your English skills</p>
      </div>

      <div className="course__search-bar">
        <input
          className="course__search-input"
          type="text"
          placeholder="Search courses by title, description, or tags..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="course__search-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            className="course__btn course__btn--refresh"
            onClick={handleSync}
            disabled={syncing || typeof navigator !== 'undefined' && !navigator.onLine}
            title={!navigator.onLine ? 'Cannot refresh while offline' : 'Refresh courses from server'}
            aria-label={syncing ? 'Syncing courses...' : 'Refresh courses from server'}
          >
            {syncing ? (
              <>
                <span className="course__btn-spinner" />
                Syncing...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh Courses
              </>
            )}
          </button>
          {onOpenIngestion && (
            <button className="course__btn course__btn--upload" onClick={onOpenIngestion}>
              Upload PDF
            </button>
          )}
        </div>
      </div>
      {syncError && (
        <p className="course__empty-message" style={{ color: 'var(--color-error)', fontSize: 'var(--font-xs)', marginTop: 4 }}>
          {syncError}
        </p>
      )}

      <div className="course__tag-filters">
        {filterTagCategories.map(tag => (
          <button
            key={tag}
            className={`course__tag-chip${activeTag === tag ? ' course__tag-chip--active' : ''}`}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
          >
            {tag === 'sentence-structure' ? 'Sentence Structure' : tag.charAt(0).toUpperCase() + tag.slice(1)}
          </button>
        ))}
      </div>

      <div className="course__sections">
        {/* Recommended for You — courses not yet enrolled */}
        <section className="course__section">
          <h2 className="course__section-title">Recommended for You</h2>
          {filteredAvailable.length === 0 ? (
            <p className="course__empty-message">
              {courses.length === 0
                ? 'No courses available yet. Upload a PDF or complete practice tasks to generate courses.'
                : 'No courses match your search or filter.'}
            </p>
          ) : (
            <div className="course__grid">
              {filteredAvailable.map(c => renderCourseCard(c, true))}
            </div>
          )}
        </section>

        {/* In Progress — enrolled courses */}
        <section className="course__section">
          <h2 className="course__section-title">In Progress</h2>
          {filteredEnrolled.length === 0 ? (
            <p className="course__empty-message">
              {enrolledCourses.length === 0
                ? 'Enroll in a course to start learning. Your active lessons will appear here.'
                : 'No enrolled courses match your search or filter.'}
            </p>
          ) : (
            <div className="course__grid">
              {filteredEnrolled.map(c => renderCourseCard(c))}
            </div>
          )}
        </section>

        {/* Completed */}
        <section className="course__section">
          <h2 className="course__section-title">Completed</h2>
          {completedCourses.length === 0 ? (
            <p className="course__empty-message">
              Complete a course to see your achievements here. Course scores stay separate from DSE skill rings.
            </p>
          ) : (
            <div className="course__grid">
              {completedCourses.map(c => renderCourseCard(c))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
