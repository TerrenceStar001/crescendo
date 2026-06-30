import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useCourses from '../hooks/useCourses';

/**
 * CourseOverview — Course entry page (D-09).
 *
 * Shows course title, description, difficulty badge, tags,
 * progress bar, topic list with lock/unlock status,
 * and Start/Continue/Replay buttons.
 *
 * Props:
 *   course   — full course object from IndexedDB
 *   onBack   — () => void, return to catalog
 *   onStart  — (courseId) => void, launch CoursePlayer
 *   callAI   — AI function (for future content gen)
 */
export default function CourseOverview({ course, onBack, onStart, callAI }) {
  const { getEnrollmentStatus, enrollCourse, setEnrollmentStatus, getCourseProgress, getEnrolledCourses } = useCourses();
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [starting, setStarting] = useState(false);

  // Load enrollment status and progress on mount
  useEffect(() => {
    const s = getEnrollmentStatus(course.id);
    setStatus(s);
    (async () => {
      const p = await getCourseProgress(course.id);
      setProgress(p);
    })();
  }, [course.id, getEnrollmentStatus, getCourseProgress]);

  // Compute progress
  const allLessonsCount = course.topics.reduce((sum, t) => sum + t.lessons.length, 0);
  const completedLessonCount = progress?.completedLessons?.length || 0;
  const progressPct = allLessonsCount > 0 ? Math.round((completedLessonCount / allLessonsCount) * 100) : 0;

  // Check if all lessons in a topic are done
  const isTopicCompleted = useCallback((topicIndex) => {
    if (!progress?.completedLessons) return false;
    const topic = course.topics[topicIndex];
    if (!topic) return false;
    const topicLessonCount = topic.lessons.length;
    if (topicLessonCount === 0) return true;
    // Count completed lessons in this topic
    let completedInTopic = 0;
    for (let i = 0; i < topicIndex; i++) {
      completedInTopic -= course.topics[i].lessons.length;
    }
    // Use a simpler approach: compute lesson global indices
    const topicStartIndex = course.topics.slice(0, topicIndex).reduce((s, t) => s + t.lessons.length, 0);
    for (let li = 0; li < topic.lessons.length; li++) {
      if (progress.completedLessons.includes(topicStartIndex + li)) {
        completedInTopic++;
      }
    }
    return completedInTopic >= topic.lessons.length;
  }, [course.topics, progress]);

  const isTopicLocked = useCallback((topicIndex) => {
    if (topicIndex === 0) return false;
    // A topic is locked if any previous topic is not completed
    for (let i = 0; i < topicIndex; i++) {
      if (!isTopicCompleted(i)) return true;
    }
    return false;
  }, [isTopicCompleted]);

  // Handle Start/Continue
  const handleStart = useCallback(() => {
    setStarting(true);
    try {
      enrollCourse(course.id);
      setEnrollmentStatus(course.id, 'enrolled');
      setStatus('enrolled');
      onStart(course.id);
    } catch {
      // Still try to start even if enrollment fails
      onStart(course.id);
    }
  }, [course.id, enrollCourse, setEnrollmentStatus, onStart]);

  // Handle Replay (completed course, read-only)
  const handleReplay = useCallback(() => {
    onStart(course.id);
  }, [course.id, onStart]);

  return (
    <div className="course__overview">
      {/* Header with back button */}
      <div className="course__player-header">
        <button className="course__btn" onClick={onBack}>← Back to Catalog</button>
      </div>

      <div className="course__overview-body">
        {/* Course title */}
        <h1 className="course__title">{course.title}</h1>

        {/* Description */}
        {course.description && (
          <p className="course__overview-desc">{course.description}</p>
        )}

        {/* Meta: difficulty badge + source */}
        <div className="course__overview-meta">
          <span className={`course__card-difficulty course__card-difficulty--${course.difficulty || 'intermediate'}`}>
            {course.difficulty || 'intermediate'}
          </span>
          <span className="course__card-source">
            {course.source === 'pdf-import' ? '📄 Imported' : '🤖 Auto-generated'}
          </span>
        </div>

        {/* Tags */}
        {course.tags?.length > 0 && (
          <div className="course__card-tags" style={{ marginTop: 'var(--space-2)' }}>
            {course.tags.map(t => <span key={t} className="course__card-tag">{t}</span>)}
          </div>
        )}

        {/* Progress bar */}
        {status && (
          <div className="course__progress-section">
            <div className="course__progress-header">
              <span className="course__progress-label">Progress</span>
              <span className="course__progress-pct">{progressPct}%</span>
            </div>
            <div className="course__progress-bar">
              <div
                className="course__progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Topic list with lock/unlock (D-09 sequential unlock) */}
        <div className="course__overview-topics">
          <h3 className="course__section-title">Topics ({course.topics.length})</h3>
          {course.topics.map((topic, ti) => {
            const locked = !status || isTopicLocked(ti);
            const completed = isTopicCompleted(ti);

            return (
              <div
                key={ti}
                className={`course__topic-row${locked ? ' course__topic-row--locked' : ''}${completed ? ' course__topic-row--completed' : ''}`}
              >
                <div className="course__topic-row-header">
                  <span className="course__topic-icon">
                    {completed ? '✅' : locked ? '🔒' : status === 'enrolled' ? '▶' : '📖'}
                  </span>
                  <span className="course__topic-row-title">{topic.title}</span>
                  <span className="course__topic-row-count">{topic.lessons.length} lesson{topic.lessons.length !== 1 ? 's' : ''}</span>
                </div>
                {topic.learningObjectives?.length > 0 && (
                  <ul className="course__objectives">
                    {topic.learningObjectives.map((obj, oi) => (
                      <li key={oi}>{obj}</li>
                    ))}
                  </ul>
                )}
                {/* Lesson checklist per topic (D-44) */}
                <div className="course__topic-lessons">
                  {topic.lessons.map((lesson, li) => {
                    const globalIdx = course.topics.slice(0, ti).reduce((s, t) => s + t.lessons.length, 0) + li;
                    const lessonDone = progress?.completedLessons?.includes(globalIdx);
                    return (
                      <div key={li} className={`course__lesson-check${lessonDone ? ' course__lesson-check--done' : ''}`}>
                        <span className="course__lesson-check-icon">{lessonDone ? '✅' : '○'}</span>
                        <span className="course__lesson-check-title">{lesson.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="course__overview-actions">
          {status === 'completed' && (
            <>
              <span className="course__completed-badge">✅ Completed</span>
              <button className="course__btn course__btn--secondary course__btn--replay" onClick={handleReplay}>
                Replay
              </button>
            </>
          )}
          {(!status || status === 'enrolled') && (
            <button
              className="course__btn course__btn--primary course__btn--start"
              onClick={handleStart}
              disabled={starting}
            >
              {starting ? 'Starting...' : progressPct > 0 ? 'Continue' : 'Start Course'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
