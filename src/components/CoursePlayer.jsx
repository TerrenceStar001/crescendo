import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { normalizeAnswer } from '../utils/answerChecking';

/**
 * CoursePlayer — Exercise-first lesson delivery engine.
 *
 * State machine phases (D-40):
 *   overview → lesson → exercise → reference-unlocked → final-assessment → complete → archived
 *
 * Props:
 *   course   — full course object from IndexedDB
 *   onBack   — () => void, return to overview/catalog
 *   callAI   — AI function for potential content generation
 *   dsePapers — IndexedDB wrapper (for backward compat)
 */
export default function CoursePlayer({ course, onBack, callAI, dsePapers, onTrackImprovement }) {
  const { getItem, setItem, DSE_KEYS } = useIndexedDB();
  const COURSE_PROGRESS_KEY = `${DSE_KEYS.COURSE_PROGRESS}:${course.id}`;

  // === State machine ===
  const [phase, setPhase] = useState('overview');
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [referenceUnlocked, setReferenceUnlocked] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [finalAssessmentPassed, setFinalAssessmentPassed] = useState(false);
  const [finalAssessmentAnswers, setFinalAssessmentAnswers] = useState({});
  const [finalAssessmentAttempts, setFinalAssessmentAttempts] = useState(0);
  const [finalAssessmentScore, setFinalAssessmentScore] = useState(0);
  const [exerciseFeedback, setExerciseFeedback] = useState(null);
  const [showReference, setShowReference] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTermIndex, setSelectedTermIndex] = useState(null);
  const [reorderState, setReorderState] = useState(null);
  const [generatedExercises, setGeneratedExercises] = useState(null);
  const [currentExerciseSet, setCurrentExerciseSet] = useState(null);
  const [generatingExercises, setGeneratingExercises] = useState(false);

  const saveTimerRef = useRef(null);

  // === Derived data ===
  const currentTopic = course.topics[currentTopicIndex];
  const currentLesson = currentTopic?.lessons[currentLessonIndex];
  const allLessonsCount = useMemo(() => {
    return course.topics.reduce((sum, t) => sum + t.lessons.length, 0);
  }, [course]);
  const completedLessonCount = completedLessons.length;
  const progressPct = allLessonsCount > 0 ? Math.round((completedLessonCount / allLessonsCount) * 100) : 0;

  // Determine which exercise set to use (generated > seed)
  const lessonExercises = useMemo(() => {
    if (!currentLesson) return [];
    if (generatedExercises && generatedExercises.length > 0) return generatedExercises;
    return currentLesson.exercises || [];
  }, [currentLesson, generatedExercises]);

  const currentExerciseFromSet = lessonExercises[currentExerciseIndex];

  // Shuffle definitions for matching exercise (stable on currentExercise change)
  const shuffledDefs = useMemo(() => {
    if (!currentExerciseFromSet || currentExerciseFromSet.type !== 'matching' || !currentExerciseFromSet.pairs) return [];
    return [...currentExerciseFromSet.pairs].map(p => p.match).sort(() => Math.random() - 0.5);
  }, [currentExerciseFromSet]);

  // Generate exercises for current lesson when it changes
  const generationAttemptedRef = useRef(false);
  // Reset generation state when lesson changes
  useEffect(() => {
    generationAttemptedRef.current = false;
    setGeneratedExercises(null);
    setCurrentExerciseIndex(0);
    setAnswers({});
    setExerciseFeedback(null);
  }, [currentLesson?.title]);

  useEffect(() => {
    if (!currentLesson || !callAI || !dsePapers?.generateCourseExercises) return;
    if (generationAttemptedRef.current) return;
    generationAttemptedRef.current = true;

    const types = ['mcq', 'gap-fill', 'short-answer'];
    if (currentLesson.exercises?.some(e => e.type === 'matching')) types.push('matching');
    if (currentLesson.exercises?.some(e => e.type === 'sentence-rewrite')) types.push('sentence-rewrite');
    if (currentLesson.exercises?.some(e => e.type === 'reordering')) types.push('reordering');

    setGeneratingExercises(true);
    dsePapers.generateCourseExercises(
      currentLesson.referenceContent,
      currentLesson.title,
      types,
      callAI
    ).then(exercises => {
      if (exercises && exercises.length >= 3) {
        setGeneratedExercises(exercises);
        console.log('[course] AI generated', exercises.length, 'exercises for', currentLesson.title);
      } else {
        console.warn('[course] AI returned', exercises?.length || 0, 'exercises — falling back to seed');
      }
    }).catch(e => {
      console.warn('[course] AI exercise generation failed:', e.message, '— using seed exercises');
    }).finally(() => {
      setGeneratingExercises(false);
    });
  }, [currentLesson?.title, callAI, dsePapers?.generateCourseExercises]);

  // Regenerate exercises on demand
  const handleRegenerateExercises = useCallback(() => {
    if (!currentLesson || !callAI || !dsePapers?.generateCourseExercises) return;
    setGeneratedExercises(null);
    generationAttemptedRef.current = true;
    setCurrentExerciseIndex(0);
    setAnswers({});
    setExerciseFeedback(null);

    const types = ['mcq', 'gap-fill', 'short-answer'];
    if (currentLesson.exercises?.some(e => e.type === 'matching')) types.push('matching');
    if (currentLesson.exercises?.some(e => e.type === 'sentence-rewrite')) types.push('sentence-rewrite');
    if (currentLesson.exercises?.some(e => e.type === 'reordering')) types.push('reordering');

    setGeneratingExercises(true);
    dsePapers.generateCourseExercises(
      currentLesson.referenceContent,
      currentLesson.title,
      types,
      callAI
    ).then(exercises => {
      if (exercises && exercises.length >= 3) {
        setGeneratedExercises(exercises);
        console.log('[course] AI regenerated', exercises.length, 'exercises for', currentLesson.title);
      } else {
        console.warn('[course] AI returned', exercises?.length || 0, 'exercises — falling back to seed');
      }
    }).catch(e => {
      console.warn('[course] AI exercise regeneration failed:', e.message, '— using seed exercises');
    }).finally(() => {
      setGeneratingExercises(false);
    });

    setShowReference(false);
  }, [currentLesson, callAI, dsePapers?.generateCourseExercises]);

  // === Load saved progress on mount ===
  useEffect(() => {
    (async () => {
      try {
        const saved = await getItem(COURSE_PROGRESS_KEY);
        if (saved) {
          setCurrentTopicIndex(saved.topicIndex ?? 0);
          setCurrentLessonIndex(saved.lessonIndex ?? 0);
          setCurrentExerciseIndex(saved.exerciseIndex ?? 0);
          setAnswers(saved.answers || {});
          setReferenceUnlocked(saved.referenceUnlocked || false);
          setCompletedLessons(saved.completedLessons || []);
          setFinalAssessmentPassed(saved.finalAssessmentPassed || false);
          setFinalAssessmentScore(saved.finalAssessmentScore || 0);
          setFinalAssessmentAttempts(saved.finalAssessmentAttempts || 0);
          if (saved.enrolled) setEnrolled(true);
          if (saved.phase === 'lesson' || saved.phase === 'exercise' || saved.phase === 'reference-unlocked') {
            setPhase('lesson');
          }
        }
      } catch {}
    })();
  }, []);

  // Track post-course improvement when course completes
  useEffect(() => {
    if (phase === 'complete' && course.id && onTrackImprovement) {
      onTrackImprovement(course.id);
    }
  }, [phase, course.id, onTrackImprovement]);

  // === Auto-save every 10 seconds (WritingModule pattern) ===
  useEffect(() => {
    if (phase === 'overview' || phase === 'complete' || phase === 'archived') return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        setItem(COURSE_PROGRESS_KEY, {
          courseId: course.id,
          topicIndex: currentTopicIndex,
          lessonIndex: currentLessonIndex,
          exerciseIndex: currentExerciseIndex,
          answers,
          referenceUnlocked,
          completedLessons,
          finalAssessmentPassed,
          finalAssessmentScore,
          finalAssessmentAttempts,
          enrolled,
          phase,
          savedAt: Date.now(),
        });
      } catch {}
    }, 10000);
    return () => clearTimeout(saveTimerRef.current);
  }, [
    phase, currentTopicIndex, currentLessonIndex, currentExerciseIndex,
    answers, referenceUnlocked, completedLessons, finalAssessmentPassed,
    finalAssessmentScore, finalAssessmentAttempts, enrolled, course.id, setItem, COURSE_PROGRESS_KEY,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Initialize reorderState when entering a reordering exercise
  useEffect(() => {
    if (currentExerciseFromSet?.type === 'reordering' && currentExerciseFromSet.correctOrder?.length) {
      const shuffled = [...currentExerciseFromSet.correctOrder].sort(() => Math.random() - 0.5);
      setReorderState(shuffled);
    } else {
      setReorderState(null);
    }
  }, [currentExerciseFromSet]);

  // === Single active lesson enforcement (D-04) ===
  const checkActiveLesson = useCallback(() => {
    try {
      const raw = localStorage.getItem('crescendo-course-active-lesson');
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.courseId || null;
    } catch {
      return null;
    }
  }, []);

  const handleConfirmSwitch = useCallback(() => {
    try {
      localStorage.setItem('crescendo-course-active-lesson', JSON.stringify({ courseId: course.id }));
    } catch {}
    setEnrolled(true);
    setPhase('lesson');
  }, [course.id]);

  // === Exercise answer handling ===
  const handleExerciseAttempt = useCallback((exerciseId, answer) => {
    if (isSubmitting || !currentExerciseFromSet) return;
    setIsSubmitting(true);

    const currentAttempts = (answers[exerciseId]?.attempts || 0) + 1;
    let isCorrect = false;

    switch (currentExerciseFromSet.type) {
      case 'mcq': {
        isCorrect = normalizeAnswer(String(answer)) === normalizeAnswer(String(currentExerciseFromSet.answer));
        break;
      }
      case 'gap-fill':
      case 'cloze': {
        if (currentExerciseFromSet.answers && Array.isArray(currentExerciseFromSet.answers)) {
          const blanks = currentExerciseFromSet.answers;
          const userBlanks = answer || {};
          isCorrect = blanks.every((blank, i) =>
            normalizeAnswer(String(userBlanks[i] || '')) === normalizeAnswer(String(blank || ''))
          );
        } else {
          isCorrect = normalizeAnswer(String(answer)) === normalizeAnswer(String(currentExerciseFromSet.answer));
        }
        break;
      }
      case 'short-answer':
      case 'sentence-rewrite': {
        isCorrect = normalizeAnswer(String(answer)) === normalizeAnswer(String(currentExerciseFromSet.answer));
        break;
      }
      case 'matching': {
        if (currentExerciseFromSet.pairs && typeof answer === 'object') {
          isCorrect = currentExerciseFromSet.pairs.every(p => answer[p.item] === p.match);
        }
        break;
      }
      case 'reordering': {
        if (currentExerciseFromSet.correctOrder && Array.isArray(answer)) {
          isCorrect = currentExerciseFromSet.correctOrder.every((item, idx) => answer[idx] === item);
        }
        break;
      }
      default:
        isCorrect = false;
    }

    setAnswers(prev => ({
      ...prev,
      [exerciseId]: { answer, correct: isCorrect, attempts: currentAttempts, timestamp: Date.now() },
    }));

    if (!isCorrect || currentAttempts >= 3) {
      setReferenceUnlocked(true);
    }

    setExerciseFeedback({ correct: isCorrect, answer, attempts: currentAttempts });
    setIsSubmitting(false);
  }, [currentExerciseFromSet, currentExerciseIndex, currentLesson, answers, isSubmitting]);

  // === Hint/reference click ===
  const handleHintClick = useCallback(() => {
    setReferenceUnlocked(true);
    setShowReference(true);
  }, []);

  // === Skip current exercise ===
  const handleSkipExercise = useCallback(() => {
    if (!currentExerciseFromSet) return;
    setAnswers(prev => ({
      ...prev,
      [currentExerciseFromSet.question]: { answer: null, correct: false, skipped: true, timestamp: Date.now() },
    }));
    setExerciseFeedback({ correct: false });
    setTimeout(() => {
      if (currentExerciseIndex < lessonExercises.length - 1) {
        setCurrentExerciseIndex(prev => prev + 1);
        setExerciseFeedback(null);
      } else {
        setLessonComplete(true);
        setExerciseFeedback(null);
      }
    }, 800);
  }, [currentExerciseFromSet, currentExerciseIndex, currentLesson]);

  // === Next exercise (manual advance) ===
  const handleNextExercise = useCallback(() => {
    setExerciseFeedback(null);
    setShowReference(false);
    const nextIdx = currentExerciseIndex + 1;
    if (nextIdx >= lessonExercises.length) {
      setLessonComplete(true);
    } else {
      setCurrentExerciseIndex(nextIdx);
    }
  }, [currentExerciseIndex, lessonExercises.length]);

  // === Reveal correct answer ===
  const handleRevealAnswer = useCallback(() => {
    if (!currentExerciseFromSet) return;
    setAnswers(prev => ({
      ...prev,
      [currentExerciseFromSet.question]: { answer: null, correct: false, revealed: true, timestamp: Date.now() },
    }));
    setExerciseFeedback({ correct: false });
  }, [currentExerciseFromSet]);

  // === Start lesson ===
  const handleStartLesson = useCallback(() => {
    const activeCourseId = checkActiveLesson();
    if (activeCourseId && activeCourseId !== course.id) {
      if (window.confirm(`You have an active lesson in another course. Start this one anyway?`)) {
        handleConfirmSwitch();
      }
      return;
    }
    try {
      localStorage.setItem('crescendo-course-active-lesson', JSON.stringify({ courseId: course.id }));
    } catch {}
    setEnrolled(true);
    setReferenceUnlocked(false);
    setShowReference(false);
    setLessonComplete(false);
    setPhase('lesson');
  }, [course.id, checkActiveLesson, handleConfirmSwitch]);

  // === Next lesson / topic ===
  const handleNextLesson = useCallback(() => {
    const lessonGlobalIdx = course.topics
      .slice(0, currentTopicIndex)
      .reduce((sum, t) => sum + t.lessons.length, 0) + currentLessonIndex;
    const newCompleted = [...new Set([...completedLessons, lessonGlobalIdx])];
    setCompletedLessons(newCompleted);
    setLessonComplete(false);

    const nextLessonIdx = currentLessonIndex + 1;
    if (nextLessonIdx < currentTopic.lessons.length) {
      setCurrentLessonIndex(nextLessonIdx);
      setCurrentExerciseIndex(0);
      setReferenceUnlocked(false);
      setShowReference(false);
      setAnswers({});
    } else {
      const nextTopicIdx = currentTopicIndex + 1;
      if (nextTopicIdx < course.topics.length) {
        setCurrentTopicIndex(nextTopicIdx);
        setCurrentLessonIndex(0);
        setCurrentExerciseIndex(0);
        setReferenceUnlocked(false);
        setShowReference(false);
        setAnswers({});
      } else {
        setPhase('final-assessment');
      }
    }
  }, [currentTopicIndex, currentLessonIndex, currentTopic, course.topics, completedLessons]);

  // === Final assessment ===
  const finalAssessmentExercises = useMemo(() => {
    const selected = [];
    course.topics.forEach(topic => {
      const allExercises = topic.lessons.flatMap(l => l.exercises || []);
      if (allExercises.length === 0) return;
      const count = Math.min(2, allExercises.length);
      for (let i = 0; i < count; i++) {
        selected.push(allExercises[i % allExercises.length]);
      }
    });
    return selected;
  }, [course]);

  const handleFinalAssessmentSubmit = useCallback(() => {
    let correctCount = 0;
    const total = finalAssessmentExercises.length;

    finalAssessmentExercises.forEach((exercise) => {
      const userAnswer = finalAssessmentAnswers[exercise.question];
      if (!userAnswer) return;
      let isCorrect = false;
      switch (exercise.type) {
        case 'mcq':
          isCorrect = normalizeAnswer(String(userAnswer)) === normalizeAnswer(String(exercise.answer));
          break;
        case 'gap-fill':
        case 'short-answer':
        case 'sentence-rewrite':
          isCorrect = normalizeAnswer(String(userAnswer)) === normalizeAnswer(String(exercise.answer));
          break;
        case 'matching':
          if (exercise.pairs && typeof userAnswer === 'object') {
            isCorrect = exercise.pairs.every(p => userAnswer[p.item] === p.match);
          }
          break;
        default:
          isCorrect = false;
      }
      if (isCorrect) correctCount++;
    });

    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    setFinalAssessmentScore(score);
    setFinalAssessmentAttempts(prev => prev + 1);

    if (score >= 60) {
      setFinalAssessmentPassed(true);
      setPhase('complete');
    } else {
      if (finalAssessmentAttempts + 1 >= 3) {
        setPhase('complete');
      } else {
        setExerciseFeedback({ correct: false, finalAssessment: true, score });
      }
    }
  }, [finalAssessmentExercises, finalAssessmentAnswers, finalAssessmentAttempts]);

  const handleFinalAssessmentRetry = useCallback(() => {
    setFinalAssessmentAnswers({});
    setExerciseFeedback(null);
  }, []);

  // === Phase: Overview ===
  if (phase === 'overview') {
    return (
      <div className="course__player">
        <div className="course__player-header">
          <button className="course__btn" onClick={onBack}>← Back to Catalog</button>
          <h1 className="course__title">{course.title}</h1>
        </div>

        <div className="course__overview">
          {course.description && <p className="course__overview-desc">{course.description}</p>}

          <div className="course__overview-meta">
            <span className={`course__card-difficulty course__card-difficulty--${course.difficulty || 'intermediate'}`}>
              {course.difficulty || 'intermediate'}
            </span>
            {course.tags?.length > 0 && (
              <div className="course__card-tags">
                {course.tags.map(t => <span key={t} className="course__card-tag">{t}</span>)}
              </div>
            )}
          </div>

          {enrolled && allLessonsCount > 0 && (
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

          <div className="course__overview-topics">
            <h3 className="course__section-title">Topics</h3>
            {course.topics.map((topic, ti) => {
              const allTopicLessonsDone = topic.lessons.every((_, li) => {
                const globalIdx = course.topics.slice(0, ti).reduce((s, t) => s + t.lessons.length, 0) + li;
                return completedLessons.includes(globalIdx);
              });
              const prevTopicDone = ti === 0 ? true : course.topics.slice(0, ti).every((prevT, pti) => {
                return prevT.lessons.every((_, li) => {
                  const globalIdx = course.topics.slice(0, pti).reduce((s, t) => s + t.lessons.length, 0) + li;
                  return completedLessons.includes(globalIdx);
                });
              });
              const isLocked = enrolled ? false : !prevTopicDone;

              return (
                <div key={ti} className={`course__topic-row${isLocked ? ' course__topic-row--locked' : ''}${allTopicLessonsDone ? ' course__topic-row--completed' : ''}`}>
                  <div className="course__topic-row-header">
                    <span className="course__topic-icon">
                      {allTopicLessonsDone ? '✅' : isLocked ? '🔒' : '▶'}
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
                </div>
              );
            })}
          </div>

          <div className="course__overview-actions">
            {!enrolled && (
              <button className="course__btn course__btn--primary course__btn--start" onClick={handleStartLesson}>
                Start Course
              </button>
            )}
            {enrolled && phase === 'overview' && (
              <button className="course__btn course__btn--primary course__btn--start" onClick={handleStartLesson}>
                {progressPct > 0 ? 'Continue' : 'Start Course'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === Phase: Lesson / Exercise ===
  if (phase === 'lesson') {
    // Lesson complete screen
    if (lessonComplete) {
      const correctCount = Object.values(answers).filter(a => a.correct).length;
      const totalCount = Object.keys(answers).length;
      const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

      return (
        <div className="course__player">
          <div className="course__player-header">
            <button className="course__btn" onClick={onBack}>← Back</button>
            <div className="course__player-progress">
              <span className="course__breadcrumb">
                {course.title} &rsaquo; {currentTopic.title} &rsaquo; {currentLesson.title}
              </span>
            </div>
          </div>

          <div className="course__lesson-complete">
            <div className="course__lesson-complete-icon">🎉</div>
            <h2 className="course__lesson-complete-title">Lesson Complete!</h2>
            <p className="course__lesson-complete-subtitle">You finished all exercises in this lesson.</p>
            <div className="course__lesson-complete-stats">
              <div className="course__stat-item">
                <span className="course__stat-value">{accuracy}%</span>
                <span className="course__stat-label">Accuracy</span>
              </div>
              <div className="course__stat-divider" />
              <div className="course__stat-item">
                <span className="course__stat-value">{correctCount}/{totalCount}</span>
                <span className="course__stat-label">Correct</span>
              </div>
              <div className="course__stat-divider" />
              <div className="course__stat-item">
                <span className="course__stat-value">{completedLessonCount}/{allLessonsCount}</span>
                <span className="course__stat-label">Lessons</span>
              </div>
            </div>
            <div className="course__lesson-complete-actions">
              <button className="course__btn course__btn--primary course__btn--lg" onClick={handleNextLesson}>
                Next Lesson →
              </button>
            </div>
          </div>
        </div>
      );
    }

    const refWordCount = currentLesson.referenceContent?.trim().split(/\s+/).length || 0;

    return (
      <div className="course__player">
        {/* Top progress strip */}
        <div className="course__progress-strip">
          <div className="course__progress-strip-bar">
            <div
              className="course__progress-strip-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="course__progress-strip-info">
            <span className="course__progress-strip-lessons">
              {completedLessonCount} of {allLessonsCount} lessons
            </span>
            <span className="course__progress-strip-exercise">
              Exercise {currentExerciseIndex + 1} of {lessonExercises.length}
            </span>
          </div>
        </div>

        <div className="course__exercise-area">
          {/* Exercise question */}
          {currentExerciseFromSet && (
            <div className="course__exercise">
              <div className="course__exercise-header">
                <span className={`course__exercise-type course__exercise-type--${currentExerciseFromSet.type}`}>
                  {currentExerciseFromSet.type.replace('-', ' ')}
                </span>
                {currentExerciseFromSet.difficulty && (
                  <span className="course__exercise-difficulty">
                    {'★'.repeat(currentExerciseFromSet.difficulty)}{'☆'.repeat(5 - currentExerciseFromSet.difficulty)}
                  </span>
                )}
              </div>

              <p className="course__exercise-question">{currentExerciseFromSet.question}</p>

              {/* Exercise input per type */}
              {(currentExerciseFromSet.type === 'gap-fill') && (
                <div className="course__exercise-input-group">
                  <input
                    className="course__exercise-input"
                    type="text"
                    placeholder="Type your answer..."
                    defaultValue=""
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleExerciseAttempt(currentExerciseFromSet.question, e.target.value);
                      }
                    }}
                    onBlur={e => {
                      if (e.target.value.trim()) {
                        handleExerciseAttempt(currentExerciseFromSet.question, e.target.value);
                      }
                    }}
                    disabled={exerciseFeedback !== null}
                  />
                </div>
              )}

              {(currentExerciseFromSet.type === 'short-answer' || currentExerciseFromSet.type === 'sentence-rewrite') && (
                <div className="course__exercise-input-group">
                  <textarea
                    className="course__exercise-textarea"
                    placeholder={currentExerciseFromSet.type === 'sentence-rewrite' ? 'Rewrite the sentence...' : 'Type your answer...'}
                    rows={3}
                    defaultValue=""
                    onBlur={e => {
                      if (e.target.value.trim()) {
                        handleExerciseAttempt(currentExerciseFromSet.question, e.target.value);
                      }
                    }}
                    disabled={exerciseFeedback !== null}
                  />
                  <button
                    className="course__btn course__btn--primary"
                    onClick={() => {
                      const textarea = document.querySelector('.course__exercise-textarea');
                      if (textarea && textarea.value.trim()) {
                        handleExerciseAttempt(currentExerciseFromSet.question, textarea.value);
                      }
                    }}
                    disabled={exerciseFeedback !== null}
                  >
                    Submit
                  </button>
                </div>
              )}

              {currentExerciseFromSet.type === 'mcq' && currentExerciseFromSet.options?.length > 0 && (
                <div className="course__exercise-mcq">
                  {currentExerciseFromSet.options.map((opt, oi) => {
                    const isSelected = answers[currentExerciseFromSet.question]?.answer === opt;
                    const showCorrect = exerciseFeedback && isSelected;
                    return (
                      <button
                        key={oi}
                        className={`course__exercise-option${isSelected ? ' course__exercise-option--selected' : ''}${showCorrect && exerciseFeedback.correct ? ' course__exercise-option--correct' : ''}${exerciseFeedback && isSelected && !exerciseFeedback.correct ? ' course__exercise-option--wrong' : ''}`}
                        onClick={() => handleExerciseAttempt(currentExerciseFromSet.question, opt)}
                        disabled={exerciseFeedback !== null}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentExerciseFromSet.type === 'matching' && currentExerciseFromSet.pairs?.length > 0 && (
                <div className="course__exercise-matching">
                  <p className="course__exercise-instruction">Click a term, then click its matching definition.</p>
                  <div className="course__matching-columns">
                    <div className="course__matching-col">
                      {currentExerciseFromSet.pairs.map((pair, pi) => {
                        const currentMatch = answers[currentExerciseFromSet.question]?.answer || {};
                        const isPaired = currentMatch[pair.item] !== undefined;
                        return (
                          <button
                            key={pi}
                            className={`course__matching-item${selectedTermIndex === pi ? ' course__matching-item--selected' : ''}${isPaired ? ' course__matching-item--paired' : ''}`}
                            onClick={() => {
                              if (exerciseFeedback) return;
                              setSelectedTermIndex(selectedTermIndex === pi ? null : pi);
                            }}
                            disabled={exerciseFeedback !== null}
                          >
                            {pair.item}
                          </button>
                        );
                      })}
                    </div>
                    <div className="course__matching-col">
                      {shuffledDefs.map((def, di) => {
                        const currentMatch = answers[currentExerciseFromSet.question]?.answer || {};
                        const isUsed = Object.values(currentMatch).includes(def);
                        return (
                          <button
                            key={di}
                            className={`course__matching-def${isUsed ? ' course__matching-def--used' : ''}`}
                            onClick={() => {
                              if (exerciseFeedback || selectedTermIndex === null || isUsed) return;
                              const term = currentExerciseFromSet.pairs[selectedTermIndex].item;
                              const newMatch = { ...currentMatch };
                              Object.keys(newMatch).forEach(k => { if (newMatch[k] === def) delete newMatch[k]; });
                              newMatch[term] = def;
                              handleExerciseAttempt(currentExerciseFromSet.question, newMatch);
                              setSelectedTermIndex(null);
                            }}
                            disabled={exerciseFeedback !== null}
                          >
                            {def}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {currentExerciseFromSet.type === 'cloze' && (
                <div className="course__exercise-cloze">
                  {currentExerciseFromSet.answers?.length > 1 ? (
                    <div className="course__cloze-blanks">
                      <p className="course__exercise-instruction">Fill in the blanks.</p>
                      {currentExerciseFromSet.answers.map((blank, bi) => (
                        <div key={bi} className="course__cloze-blank-row">
                          <label className="course__cloze-label">Blank {bi + 1}:</label>
                          <input
                            className="course__exercise-input"
                            type="text"
                            placeholder="..."
                            defaultValue=""
                            onBlur={e => {
                              const currentVal = answers[currentExerciseFromSet.question]?.answer || {};
                              currentVal[bi] = e.target.value;
                              handleExerciseAttempt(currentExerciseFromSet.question, currentVal);
                            }}
                            disabled={exerciseFeedback !== null}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="course__exercise-input"
                      type="text"
                      placeholder="Fill in the blank..."
                      defaultValue=""
                      onBlur={e => {
                        if (e.target.value.trim()) {
                          handleExerciseAttempt(currentExerciseFromSet.question, e.target.value);
                        }
                      }}
                      disabled={exerciseFeedback !== null}
                    />
                  )}
                </div>
              )}

              {currentExerciseFromSet.type === 'reordering' && currentExerciseFromSet.correctOrder?.length > 0 && (
                <div className="course__exercise-reorder">
                  <p className="course__exercise-instruction">Arrange the items in the correct order using the ▲ ▼ buttons.</p>
                  <div className="course__reorder-list">
                    {(reorderState || currentExerciseFromSet.correctOrder).map((item, ri) => (
                      <div key={ri} className="course__reorder-item">
                        <span className="course__reorder-number">{ri + 1}.</span>
                        <span className="course__reorder-text">{item}</span>
                        <div className="course__reorder-arrows">
                          <button
                            className="course__reorder-arrow"
                            onClick={() => {
                              if (ri === 0 || exerciseFeedback) return;
                              const next = [...(reorderState || currentExerciseFromSet.correctOrder)];
                              [next[ri - 1], next[ri]] = [next[ri], next[ri - 1]];
                              setReorderState(next);
                            }}
                            disabled={ri === 0 || exerciseFeedback !== null}
                            aria-label="Move up"
                          >▲</button>
                          <button
                            className="course__reorder-arrow"
                            onClick={() => {
                              const list = reorderState || currentExerciseFromSet.correctOrder;
                              if (ri >= list.length - 1 || exerciseFeedback) return;
                              const next = [...list];
                              [next[ri], next[ri + 1]] = [next[ri + 1], next[ri]];
                              setReorderState(next);
                            }}
                            disabled={ri >= (reorderState || currentExerciseFromSet.correctOrder).length - 1 || exerciseFeedback !== null}
                            aria-label="Move down"
                          >▼</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="course__btn course__btn--primary"
                    onClick={() => handleExerciseAttempt(currentExerciseFromSet.question, reorderState || currentExerciseFromSet.correctOrder)}
                    disabled={exerciseFeedback !== null}
                  >
                    Confirm Order
                  </button>
                </div>
              )}

              {/* Feedback display */}
              {exerciseFeedback && (
                <div className={`course__feedback${exerciseFeedback.correct ? ' course__feedback--correct' : ' course__feedback--incorrect'}`}>
                  <span className="course__feedback-icon">{exerciseFeedback.correct ? '✅' : '❌'}</span>
                  <span className="course__feedback-text">
                    {exerciseFeedback.correct ? 'Correct!' : `Not quite — ${currentExerciseFromSet?.explanation || 'Review the reading passage and try again.'}`}
                  </span>
                  {answers[currentExerciseFromSet?.question]?.revealed && currentExerciseFromSet?.answer && (
                    <div className="course__feedback-answer">
                      <strong>Correct answer:</strong> {String(currentExerciseFromSet.answer)}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {!exerciseFeedback && (
                <div className="course__exercise-actions">
                  <button className="course__btn course__btn--skip" onClick={() => handleSkipExercise()}>
                    Skip
                  </button>
                  <button className="course__btn course__btn--reveal" onClick={() => handleRevealAnswer()}>
                    Reveal Answer
                  </button>
                </div>
              )}
              {exerciseFeedback && exerciseFeedback.correct === false && (
                <div className="course__exercise-actions">
                  <button className="course__btn course__btn--reveal" onClick={() => handleRevealAnswer()}>
                    Show Correct Answer
                  </button>
                </div>
              )}

              {/* Manual next button (advance only after feedback) */}
              {exerciseFeedback && (
                <div className="course__exercise-actions" style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}>
                  <button className="course__btn course__btn--primary" onClick={handleNextExercise}>
                    Next →
                  </button>
                </div>
              )}

              {/* Generate new practice button */}
              {!exerciseFeedback && (
                <div className="course__exercise-actions" style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}>
                  {generatingExercises ? (
                    <span className="course__generating-text">Generating new practice...</span>
                  ) : (
                    <button className="course__btn course__btn--secondary" onClick={handleRegenerateExercises}>
                      🔄 New Practice
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Collapsible reading passage */}
          {currentLesson.referenceContent && (
            <div className="course__reference">
              <button
                className="course__reference-toggle"
                onClick={() => setShowReference(!showReference)}
                aria-expanded={showReference}
              >
                <span className="course__reference-toggle-icon">{showReference ? '▾' : '▸'}</span>
                <span className="course__reference-toggle-text">
                  📖 Reading Passage · {refWordCount} words
                </span>
              </button>
              {showReference && (
                <div className="course__reference-content">
                  <div className="course__reference-text">{currentLesson.referenceContent}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Phase: Final Assessment ===
  if (phase === 'final-assessment') {
    return (
      <div className="course__player">
        <div className="course__player-header">
          <button className="course__btn" onClick={onBack}>← Back</button>
          <div className="course__player-progress">
            <span className="course__breadcrumb">{course.title}</span>
          </div>
        </div>

        <div className="course__final-assessment">
          <div className="course__final-assessment-header">
            <h2 className="course__final-assessment-title">Final Assessment</h2>
            <p className="course__final-assessment-desc">
              This assessment covers all topics in this course. You need <strong>60%</strong> to pass.
              {finalAssessmentAttempts < 3 && (
                <span className="course__assessment-attempt"> Attempt {finalAssessmentAttempts + 1} of 3.</span>
              )}
            </p>
          </div>

          <div className="course__progress-strip">
            <div className="course__progress-strip-bar">
              <div
                className="course__progress-strip-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="course__progress-strip-info">
              <span className="course__progress-strip-lessons">
                {completedLessonCount} of {allLessonsCount} lessons completed
              </span>
            </div>
          </div>

          {finalAssessmentExercises.length === 0 ? (
            <p className="course__empty-message">No exercises available for assessment.</p>
          ) : (
            <div className="course__final-exercises">
              {finalAssessmentExercises.map((exercise, ei) => (
                <div key={ei} className="course__exercise">
                  <div className="course__exercise-header">
                    <span className={`course__exercise-type course__exercise-type--${exercise.type}`}>
                      {exercise.type.replace('-', ' ')}
                    </span>
                    <span className="course__exercise-number">Question {ei + 1}</span>
                  </div>
                  <p className="course__exercise-question">{exercise.question}</p>

                  {exercise.type === 'mcq' && exercise.options?.length > 0 && (
                    <div className="course__exercise-mcq">
                      {exercise.options.map((opt, oi) => {
                        const isSelected = finalAssessmentAnswers[exercise.question] === opt;
                        return (
                          <button
                            key={oi}
                            className={`course__exercise-option${isSelected ? ' course__exercise-option--selected' : ''}`}
                            onClick={() => setFinalAssessmentAnswers(prev => ({ ...prev, [exercise.question]: opt }))}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {exercise.type === 'gap-fill' && (
                    <input
                      className="course__exercise-input"
                      type="text"
                      placeholder="Type your answer..."
                      onChange={e => setFinalAssessmentAnswers(prev => ({ ...prev, [exercise.question]: e.target.value }))}
                    />
                  )}

                  {(exercise.type === 'short-answer' || exercise.type === 'sentence-rewrite') && (
                    <textarea
                      className="course__exercise-textarea"
                      rows={2}
                      placeholder="Type your answer..."
                      onChange={e => setFinalAssessmentAnswers(prev => ({ ...prev, [exercise.question]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {exerciseFeedback?.finalAssessment && !exerciseFeedback.correct ? (
            <div className="course__final-result">
              <div className="course__feedback course__feedback--incorrect">
                <span className="course__feedback-icon">❌</span>
                <span className="course__feedback-text">
                  You scored {exerciseFeedback.score}%. A minimum of 60% is required.
                </span>
              </div>
              {finalAssessmentAttempts < 3 && (
                <button className="course__btn course__btn--primary" onClick={handleFinalAssessmentRetry}>
                  Retry Assessment
                </button>
              )}
            </div>
          ) : (
            <div className="course__final-assessment-actions">
              <button
                className="course__btn course__btn--primary course__btn--lg"
                onClick={handleFinalAssessmentSubmit}
                disabled={Object.keys(finalAssessmentAnswers).length === 0}
              >
                Submit Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Phase: Complete ===
  if (phase === 'complete') {
    const passed = finalAssessmentPassed;
    return (
      <div className="course__player">
        <div className="course__complete">
          <div className={`course__complete-icon course__complete-icon--large ${passed ? 'course__complete-icon--pass' : ''}`}>
            {passed ? '🎉' : '📊'}
          </div>
          <h2 className="course__complete-title">
            {passed ? 'Congratulations!' : 'Course Completed'}
          </h2>
          <p className="course__complete-text">
            {passed
              ? 'You passed the final assessment and completed this course!'
              : 'You finished all lessons but the final assessment needs more practice. Review the material and try again.'}
          </p>

          <div className="course__complete-score-ring">
            <svg viewBox="0 0 120 120" className="course__score-svg">
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={passed ? 'var(--color-success)' : 'var(--color-warning)'}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - finalAssessmentScore / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="course__score-center">
              <span className="course__score-value">{finalAssessmentScore}%</span>
              <span className="course__score-label">Score</span>
            </div>
          </div>

          <div className="course__complete-stats">
            <div className="course__stat-item">
              <span className="course__stat-value">{finalAssessmentAttempts}</span>
              <span className="course__stat-label">Attempts</span>
            </div>
            <div className="course__stat-divider" />
            <div className="course__stat-item">
              <span className="course__stat-value">{completedLessonCount}/{allLessonsCount}</span>
              <span className="course__stat-label">Lessons</span>
            </div>
            <div className="course__stat-divider" />
            <div className="course__stat-item">
              <span className="course__stat-value">{passed ? 'Passed' : 'Failed'}</span>
              <span className="course__stat-label">Result</span>
            </div>
          </div>

          <div className="course__complete-actions">
            {!passed && (
              <button className="course__btn course__btn--secondary" onClick={handleFinalAssessmentRetry}>
                Retry Assessment
              </button>
            )}
            <button className="course__btn course__btn--primary" onClick={onBack}>
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="course__player">
      <p className="course__empty-message">Loading course...</p>
    </div>
  );
}
