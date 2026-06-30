import React, { useState, useMemo } from 'react';

const FILTER_TAGS = ['grammar', 'vocabulary', 'sentence-structure'];

/**
 * CatalogView — Course catalog browser.
 * Shows three sections: Recommended for You, In Progress, Completed.
 * Includes search bar and tag filter chips.
 *
 * Props:
 *   courses       — array of course objects
 *   onEnroll      — (courseId) => void
 *   onOpenCourse  — (courseId) => void
 *   callAI        — AI call function
 */
export default function CatalogView({ courses = [], onEnroll, onOpenCourse, callAI }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);

  // Filter courses by search query and active tag
  const filteredCourses = useMemo(() => {
    let result = courses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }

    if (activeTag) {
      result = result.filter(c =>
        (c.tags || []).some(t => t.startsWith(activeTag))
      );
    }

    return result;
  }, [courses, searchQuery, activeTag]);

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
          placeholder="Search courses..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="course__tag-filters">
        {FILTER_TAGS.map(tag => (
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
        {/* Recommended for You */}
        <section className="course__section">
          <h2 className="course__section-title">Recommended for You</h2>
          {filteredCourses.length === 0 ? (
            <p className="course__empty-message">
              {courses.length === 0
                ? 'No courses available yet. Upload a PDF or complete practice tasks to generate courses.'
                : 'No courses match your search or filter.'}
            </p>
          ) : (
            <div className="course__grid">
              {filteredCourses.map(course => (
                <div key={course.id} className="course__card">
                  <div className="course__card-body">
                    <h3 className="course__card-title">{course.title}</h3>
                    {course.description && (
                      <p className="course__card-desc">{course.description}</p>
                    )}
                    <div className="course__card-meta">
                      <span className={`course__card-difficulty course__card-difficulty--${course.difficulty || 'intermediate'}`}>
                        {course.difficulty || 'intermediate'}
                      </span>
                      <span className="course__card-source">
                        {course.source === 'pdf-import' ? '📄 Imported' : '🤖 Auto-generated'}
                      </span>
                    </div>
                    {course.tags && course.tags.length > 0 && (
                      <div className="course__card-tags">
                        {course.tags.slice(0, 3).map(t => (
                          <span key={t} className="course__card-tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="course__card-actions">
                    <button
                      className="course__btn course__btn--primary"
                      onClick={() => onOpenCourse?.(course.id)}
                    >
                      View Course
                    </button>
                    <button
                      className="course__btn course__btn--secondary"
                      onClick={() => onEnroll?.(course.id)}
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* In Progress */}
        <section className="course__section">
          <h2 className="course__section-title">In Progress</h2>
          <p className="course__empty-message">
            Enroll in a course to start learning. Your active lessons will appear here.
          </p>
        </section>

        {/* Completed */}
        <section className="course__section">
          <h2 className="course__section-title">Completed</h2>
          <p className="course__empty-message">
            Complete a course to see your achievements here. Course scores stay separate from DSE skill rings.
          </p>
        </section>
      </div>
    </div>
  );
}
