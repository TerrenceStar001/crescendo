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
export default function CoursePlayer({ course, onBack, callAI, dsePapers }) {
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

  const saveTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  // === Derived data ===
  const currentTopic = course.topics[currentTopicIndex];
  const currentLesson = currentTopic?.lessons[currentLessonIndex];
  const currentExercise = currentLesson?.exercises[currentExerciseIndex];
  const allLessonsCount = useMemo(() => {
    return course.topics.reduce((sum, t) => sum + t.lessons.length, 0);
  }, [course]);
  const completedLessonCount = completedLessons.length;
  const progressPct = allLessonsCount > 0 ? Math.round((completedLessonCount / allLessonsCount) * 100) : 0;

  // Shuffle definitions for matching exercise (stable on currentExercise change)
  const shuffledDefs = useMemo(() => {
    if (!currentExercise || currentExercise.type !== 'matching' || !currentExercise.pairs) return [];
    return [...currentExercise.pairs].sort(() => Math.random() - 0.5);
  }, [currentExercise]);

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
      clearTimeout(feedbackTimerRef.current);
    };
  }, []);

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
    if (isSubmitting || !currentExercise) return;
    setIsSubmitting(true);

    const currentAttempts = (answers[exerciseId]?.attempts || 0) + 1;
    let isCorrect = false;

    // Check answer based on exercise type
    // Course exercises use 'answer' field (not 'correctAnswer' like DSE schema)
    switch (currentExercise.type) {
      case 'mcq': {
        isCorrect = normalizeAnswer(String(answer)) === normalizeAnswer(String(currentExercise.answer));
        break;
      }
      case 'gap-fill':
      case 'cloze': {
        if (currentExercise.answers && Array.isArray(currentExercise.answers)) {
          // Multiple blanks in cloze/gap-fill
          const blanks = currentExercise.answers;
          const userBlanks = answer || {};
          isCorrect = blanks.every((blank, i) =>
            normalizeAnswer(String(userBlanks[i] || '')) === normalizeAnswer(String(blank || ''))
          );
        } else {
          // Single answer
          isCorrect = normalizeAnswer(String(answer)) === normalizeAnswer(String(currentExercise.answer));
        }
        break;
      }
      case 'short-answer':
      case 'sentence-rewrite': {
        isCorrect = String(answer).trim().toLowerCase() === String(currentExercise.answer).trim().toLowerCase();
        break;
      }
      case 'matching': {
        if (currentExercise.pairs && typeof answer === 'object') {
          isCorrect = currentExercise.pairs.every(p => answer[p.item] === p.match);
        }
        break;
      }
      case 'reordering': {
        if (currentExercise.correctOrder && Array.isArray(answer)) {
          isCorrect = currentExercise.correctOrder.every((item, idx) => answer[idx] === item);
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

    // Unlock reference on wrong answer, hint click, or 3rd attempt
    if (!isCorrect || currentAttempts >= 3) {
      setReferenceUnlocked(true);
    }

    setExerciseFeedback({ correct: isCorrect, answer, attempts: currentAttempts });

    // Auto-advance after feedback delay
    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setExerciseFeedback(null);
      setShowReference(false);
      if (isCorrect) {
        const nextIdx = currentExerciseIndex + 1;
        if (nextIdx >= currentLesson.exercises.length) {
          // Lesson complete
          setLessonComplete(true);
        } else {
          setCurrentExerciseIndex(nextIdx);
        }
      }
      setIsSubmitting(false);
    }, 1500);
  }, [currentExercise, currentExerciseIndex, currentLesson, answers, isSubmitting]);

  // === Hint/reference click ===
  const handleHintClick = useCallback(() => {
    setReferenceUnlocked(true);
    setShowReference(true);
  }, []);

  // === Start lesson ===
  const handleStartLesson = useCallback(() => {
    const activeCourseId = checkActiveLesson();
    if (activeCourseId && activeCourseId !== course.id) {
      // Show confirmation dialog (handled via dedicated state)
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
    // Mark current lesson as complete
    const lessonGlobalIdx = course.topics
      .slice(0, currentTopicIndex)
      .reduce((sum, t) => sum + t.lessons.length, 0) + currentLessonIndex;
    const newCompleted = [...new Set([...completedLessons, lessonGlobalIdx])];
    setCompletedLessons(newCompleted);
    setLessonComplete(false);

    // Check if all lessons in current topic are done
    const nextLessonIdx = currentLessonIndex + 1;
    if (nextLessonIdx < currentTopic.lessons.length) {
      setCurrentLessonIndex(nextLessonIdx);
      setCurrentExerciseIndex(0);
      setReferenceUnlocked(false);
      setShowReference(false);
      setAnswers({});
    } else {
      // Move to next topic or final assessment
      const nextTopicIdx = currentTopicIndex + 1;
      if (nextTopicIdx < course.topics.length) {
        setCurrentTopicIndex(nextTopicIdx);
        setCurrentLessonIndex(0);
        setCurrentExerciseIndex(0);
        setReferenceUnlocked(false);
        setShowReference(false);
        setAnswers({});
      } else {
        // All lessons done — final assessment
        setPhase('final-assessment');
      }
    }
  }, [currentTopicIndex, currentLessonIndex, currentTopic, course.topics, completedLessons]);

  // === Final assessment ===
  const finalAssessmentExercises = useMemo(() => {
    // Pick 2-3 exercises per topic for composite assessment (D-12)
    const selected = [];
    course.topics.forEach(topic => {
      const allExercises = topic.lessons.flatMap(l => l.exercises || []);
      if (allExercises.length === 0) return;
      // Pick 2 exercises per topic (or min available)
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
          isCorrect = String(userAnswer).trim().toLowerCase() === String(exercise.answer).trim().toLowerCase();
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
      // Failed — retry if attempts < 3
      if (finalAssessmentAttempts + 1 >= 3) {
        // Max retries reached, still fail
        setPhase('complete');
      } else {
        // Show failure message, can retry
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

          {/* Progress bar */}
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

          {/* Topic list accordion */}
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

          {/* Actions */}
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
      return (
        <div className="course__player">
          <div className="course__player-header">
            <h2 className="course__section-title">Lesson Complete</h2>
            <span className="course__breadcrumb">
              {course.title} &rsaquo; {currentTopic.title} &rsaquo; {currentLesson.title}
            </span>
          </div>
          <div className="course__complete-lesson">
            <div className="course__complete-icon">✅</div>
            <p className="course__complete-text">Great job! You completed this lesson.</p>
            <div className="course__overview-actions">
              <button className="course__btn course__btn--primary" onClick={handleNextLesson}>
                Next Lesson
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="course__player">
        <div className="course__player-header">
          <button className="course__btn" onClick={onBack}>← Back</button>
          <div className="course__player-progress">
            <span className="course__breadcrumb">
              {course.title} &rsaquo; {currentTopic.title} &rsaquo; {currentLesson.title}
            </span>
            <span className="course__exercise-counter">
              Exercise {currentExerciseIndex + 1} of {currentLesson.exercises.length}
            </span>
          </div>
        </div>

        <div className="course__exercise-area">
          {/* Exercise question */}
          {currentExercise && (
            <div className="course__exercise">
              <div className="course__exercise-header">
                <span className={`course__exercise-type course__exercise-type--${currentExercise.type}`}>
                  {currentExercise.type.replace('-', ' ')}
                </span>
                {currentExercise.difficulty && (
                  <span className="course__exercise-difficulty">
                    {'★'.repeat(currentExercise.difficulty)}{'☆'.repeat(5 - currentExercise.difficulty)}
                  </span>
                )}
              </div>

              <p className="course__exercise-question">{currentExercise.question}</p>

              {/* Exercise input per type */}
              {(currentExercise.type === 'gap-fill') && (
                <div className="course__exercise-input-group">
                  <input
                    className="course__exercise-input"
                    type="text"
                    placeholder="Type your answer..."
                    defaultValue=""
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleExerciseAttempt(currentExercise.question, e.target.value);
                      }
                    }}
                    onBlur={e => {
                      if (e.target.value.trim()) {
                        handleExerciseAttempt(currentExercise.question, e.target.value);
                      }
                    }}
                    disabled={exerciseFeedback !== null}
                  />
                </div>
              )}

              {(currentExercise.type === 'short-answer' || currentExercise.type === 'sentence-rewrite') && (
                <div className="course__exercise-input-group">
                  <textarea
                    className="course__exercise-textarea"
                    placeholder={currentExercise.type === 'sentence-rewrite' ? 'Rewrite the sentence...' : 'Type your answer...'}
                    rows={3}
                    defaultValue=""
                    onBlur={e => {
                      if (e.target.value.trim()) {
                        handleExerciseAttempt(currentExercise.question, e.target.value);
                      }
                    }}
                    disabled={exerciseFeedback !== null}
                  />
                  <button
                    className="course__btn course__btn--primary"
                    onClick={() => {
                      const textarea = document.querySelector('.course__exercise-textarea');
                      if (textarea && textarea.value.trim()) {
                        handleExerciseAttempt(currentExercise.question, textarea.value);
                      }
                    }}
                    disabled={exerciseFeedback !== null}
                  >
                    Submit
                  </button>
                </div>
              )}

              {currentExercise.type === 'mcq' && currentExercise.options?.length > 0 && (
                <div className="course__exercise-mcq">
                  {currentExercise.options.map((opt, oi) => {
                    const isSelected = answers[currentExercise.question]?.answer === opt;
                    const showCorrect = exerciseFeedback && isSelected;
                    return (
                      <button
                        key={oi}
                        className={`course__exercise-option${isSelected ? ' course__exercise-option--selected' : ''}${showCorrect && exerciseFeedback.correct ? ' course__exercise-option--correct' : ''}${exerciseFeedback && isSelected && !exerciseFeedback.correct ? ' course__exercise-option--wrong' : ''}`}
                        onClick={() => handleExerciseAttempt(currentExercise.question, opt)}
                        disabled={exerciseFeedback !== null}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentExercise.type === 'matching' && currentExercise.pairs?.length > 0 && (
                <div className="course__exercise-matching">
                  <p className="course__exercise-instruction">Match each item with its correct definition.</p>
                  <div className="course__matching-columns">
                    <div className="course__matching-col">
                      {currentExercise.pairs.map((pair, pi) => (
                        <div key={pi} className="course__matching-item">
                          <span className="course__matching-term">{pair.item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="course__matching-col">
                      {shuffledDefs.map((pair, pi) => {
                        const isSelected = answers[currentExercise.question]?.answer?.[pair.item] === pair.match;
                        return (
                          <button
                            key={pi}
                            className={`course__matching-def${isSelected ? ' course__matching-def--selected' : ''}`}
                            onClick={() => {
                              // Simple click-to-match: select first unmatched item
                              const currentMatch = answers[currentExercise.question]?.answer || {};
                              const newMatch = { ...currentMatch };
                              // Find if this def is already matched to something
                              const matchedItem = Object.entries(newMatch).find(([, v]) => v === pair.match);
                              if (matchedItem) {
                                delete newMatch[matchedItem[0]];
                              }
                              // For simplicity, user clicks def first then term
                              newMatch[pair.item] = pair.match;
                              handleExerciseAttempt(currentExercise.question, newMatch);
                            }}
                            disabled={exerciseFeedback !== null}
                          >
                            {pair.match}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {currentExercise.type === 'cloze' && (
                <div className="course__exercise-cloze">
                  {currentExercise.answers?.length > 1 ? (
                    <div className="course__cloze-blanks">
                      <p className="course__exercise-instruction">Fill in the blanks.</p>
                      {currentExercise.answers.map((blank, bi) => (
                        <div key={bi} className="course__cloze-blank-row">
                          <label className="course__cloze-label">Blank {bi + 1}:</label>
                          <input
                            className="course__exercise-input"
                            type="text"
                            placeholder="..."
                            defaultValue=""
                            onBlur={e => {
                              const currentVal = answers[currentExercise.question]?.answer || {};
                              currentVal[bi] = e.target.value;
                              handleExerciseAttempt(currentExercise.question, currentVal);
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
                          handleExerciseAttempt(currentExercise.question, e.target.value);
                        }
                      }}
                      disabled={exerciseFeedback !== null}
                    />
                  )}
                </div>
              )}

              {currentExercise.type === 'reordering' && currentExercise.correctOrder?.length > 0 && (
                <div className="course__exercise-reorder">
                  <p className="course__exercise-instruction">Arrange the items in the correct order.</p>
                  <div className="course__reorder-list">
                    {currentExercise.correctOrder.map((item, ri) => (
                      <div key={ri} className={`course__reorder-item${answers[currentExercise.question]?.order?.[ri] ? ' course__reorder-item--placed' : ''}`}>
                        <span className="course__reorder-text">{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="course__btn course__btn--primary"
                    onClick={() => handleExerciseAttempt(currentExercise.question, currentExercise.correctOrder)}
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
                    {exerciseFeedback.correct ? 'Correct!' : `Incorrect${currentExercise.explanation ? '. ' + currentExercise.explanation : ''}`}
                  </span>
                </div>
              )}

              {/* Hint button (only if reference exists and not yet unlocked) */}
              {!referenceUnlocked && currentLesson.referenceContent && (
                <button className="course__btn course__hint-btn" onClick={handleHintClick}>
                  💡 Show Hint / Reference
                </button>
              )}

              {/* Reference content (unlocked on struggle or hint click) */}
              {(referenceUnlocked || exerciseFeedback?.correct === false) && currentLesson.referenceContent && (
                <div className="course__reference">
                  <span className="course__reference-label">📖 Reference</span>
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
    const allDone = completedLessons.length >= allLessonsCount;

    return (
      <div className="course__player">
        <div className="course__player-header">
          <h2 className="course__section-title">Final Assessment</h2>
          <span className="course__breadcrumb">{course.title}</span>
        </div>

        <div className="course__final-assessment">
          <p className="course__final-description">
            This assessment covers all topics in this course. You need <strong>60%</strong> to pass.
            {finalAssessmentAttempts < 3 && (
              <span> Attempt {finalAssessmentAttempts + 1} of 3.</span>
            )}
          </p>

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
            <div className="course__overview-actions">
              <button
                className="course__btn course__btn--primary"
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
    return (
      <div className="course__player">
        <div className="course__complete">
          <div className="course__complete-icon course__complete-icon--large">{finalAssessmentPassed ? '🎉' : '📊'}</div>
          <h2 className="course__complete-title">
            {finalAssessmentPassed ? 'Congratulations!' : 'Assessment Complete'}
          </h2>
          <p className="course__complete-text">
            {finalAssessmentPassed
              ? 'You passed the final assessment and completed this course!'
              : 'You completed all lessons and the final assessment.'}
          </p>
          <div className="course__complete-score">
            <span className="course__complete-score-label">Final Score:</span>
            <span className={`course__complete-score-value${finalAssessmentPassed ? ' course__complete-score--pass' : ' course__complete-score--fail'}`}>
              {finalAssessmentScore}%
            </span>
            <span className="course__complete-score-threshold">
              (Pass: 60%)
            </span>
          </div>
          <div className="course__overview-actions">
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
