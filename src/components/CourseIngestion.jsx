/**
 * CourseIngestion — PDF upload and course draft review component.
 *
 * State machine: idle → uploading → parsing → generating → review → saving → done
 *
 * Props:
 *   callAI    — AI call function (from useAI)
 *   onSave    — (courseDraft) => Promise, called when user publishes
 *   onBack    — () => void, return to catalog
 *
 * Implements D-19 (hybrid ingestion), D-20 (in-app panel), D-21 (pipeline),
 * D-35 (structured JSON prompt → validation → regeneration loop).
 */
import React, { useState, useRef, useCallback } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function CourseIngestion({ callAI, onSave, onBack }) {
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Edit state for review phase
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [editDifficulty, setEditDifficulty] = useState('intermediate');
  const [expandedTopics, setExpandedTopics] = useState({});

  /**
   * Handle file selection (from drag-drop or file picker).
   */
  const handleFile = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a .pdf file.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setError('');
    setPhase('uploading');

    try {
      // Read file as base64
      const base64 = await fileToBase64(file);

      // Show parsing state briefly, then generating (AI work happens on server)
      setPhase('parsing');
      await new Promise(r => setTimeout(r, 600));
      setPhase('generating');

      // Send to backend
      const res = await fetch('/api/courses/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64.split(',')[1] || base64,
          fileName: file.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to process PDF. Please try a different file.');
        setPhase('idle');
        return;
      }

      // Enter review phase with editable draft
      setDraft(data.course);
      setEditTitle(data.course.title || '');
      setEditDescription(data.course.description || '');
      setEditTags(data.course.tags || []);
      setEditDifficulty(data.course.difficulty || 'intermediate');
      setExpandedTopics({});
      setPhase('review');
    } catch (e) {
      setError('Network error. Please check your connection and try again.');
      setPhase('idle');
    }
  }, []);

  /**
   * Convert File to base64 data URL.
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Handle drag events.
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /**
   * Handle publish.
   */
  const handlePublish = useCallback(async () => {
    if (!draft) return;
    setPhase('saving');

    // Build updated course object
    const updatedCourse = {
      ...draft,
      title: editTitle,
      description: editDescription,
      tags: editTags,
      difficulty: editDifficulty,
    };

    try {
      // Save locally via onSave callback
      if (onSave) {
        await onSave(updatedCourse);
      }

      // Publish on backend
      const res = await fetch(`/api/courses/${draft.id}/publish`, {
        method: 'PUT',
      });

      if (!res.ok) {
        console.warn('[CourseIngestion] Backend publish failed:', await res.text());
      }

      setPhase('done');
    } catch (e) {
      setError('Failed to save course. Please try again.');
      setPhase('review');
    }
  }, [draft, editTitle, editDescription, editTags, editDifficulty, onSave]);

  /**
   * Handle discard — return to idle.
   */
  const handleDiscard = useCallback(() => {
    setDraft(null);
    setEditTitle('');
    setEditDescription('');
    setEditTags([]);
    setEditDifficulty('intermediate');
    setError('');
    setPhase('idle');
  }, []);

  /**
   * Toggle tag in edit tags.
   */
  const handleToggleTag = useCallback((tag) => {
    setEditTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  /**
   * Toggle topic accordion.
   */
  const handleToggleTopic = useCallback((index) => {
    setExpandedTopics(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  // --- Render: Idle State ---
  function renderIdle() {
    return (
      <div className="course__ingestion-upload">
        <div
          className={`course__dropzone${dragOver ? ' course__dropzone--active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="course__dropzone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
          </div>
          <p className="course__dropzone-text">
            <strong>Click to upload</strong> or drag and drop
          </p>
          <p className="course__dropzone-hint">PDF files only, up to 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
        {error && (
          <div className="course__error-msg">
            <span>⚠</span> {error}
          </div>
        )}
        {error && (
          <div className="course__error-actions" style={{ display: 'flex', gap: 8 }}>
            <button className="course__btn course__btn--primary" onClick={() => { setError(''); fileInputRef.current?.click(); }}>
              Try Again
            </button>
            <button className="course__btn course__btn--secondary" onClick={handleDiscard}>
              Cancel
            </button>
          </div>
        )}
        <button className="course__btn course__btn--secondary" onClick={onBack} style={{ marginTop: 12 }}>
          ← Back to Catalog
        </button>
      </div>
    );
  }

  // --- Render: Uploading/Parsing/Generating States ---
  function renderLoading(message) {
    return (
      <div className="course__ingestion-loading">
        <div className="course__spinner" />
        <p className="course__loading-text">{message}</p>
      </div>
    );
  }

  // --- Render: Review State ---
  function renderReview() {
    if (!draft) return null;

    return (
      <div className="course__ingestion-review">
        <div className="course__review-header">
          <h2 className="course__review-title">Review Course Draft</h2>
          <p className="course__review-subtitle">Edit the course details below, then publish when ready.</p>
        </div>

        {/* Title */}
        <div className="course__field">
          <label className="course__field-label">Course Title</label>
          <input
            className="course__field-input"
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Enter course title"
          />
        </div>

        {/* Description */}
        <div className="course__field">
          <label className="course__field-label">Description</label>
          <textarea
            className="course__field-textarea"
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            placeholder="Enter course description"
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="course__field">
          <label className="course__field-label">Tags</label>
          <div className="course__tag-editor">
            {['grammar', 'vocabulary', 'sentence-structure', 'academic', 'articles', 'tenses'].map(tag => (
              <button
                key={tag}
                className={`course__tag-chip${editTags.includes(tag) ? ' course__tag-chip--active' : ''}`}
                onClick={() => handleToggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="course__field">
          <label className="course__field-label">Difficulty</label>
          <select
            className="course__field-select"
            value={editDifficulty}
            onChange={e => setEditDifficulty(e.target.value)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Topics Accordion */}
        <div className="course__field">
          <label className="course__field-label">Topics ({draft.topics?.length || 0})</label>
          <div className="course__topics-list">
            {(draft.topics || []).map((topic, ti) => (
              <div key={ti} className="course__topic-accordion">
                <button
                  className="course__topic-header"
                  onClick={() => handleToggleTopic(ti)}
                >
                  <span className="course__topic-number">Topic {ti + 1}</span>
                  <span className="course__topic-title">{topic.title}</span>
                  <span className={`course__topic-chevron${expandedTopics[ti] ? ' course__topic-chevron--open' : ''}`}>
                    ▸
                  </span>
                </button>
                {expandedTopics[ti] && (
                  <div className="course__topic-body">
                    {topic.learningObjectives?.length > 0 && (
                      <div className="course__objectives">
                        <span className="course__objectives-label">Learning Objectives:</span>
                        <ul>
                          {topic.learningObjectives.map((obj, oi) => (
                            <li key={oi}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(topic.lessons || []).map((lesson, li) => (
                      <div key={li} className="course__lesson-card">
                        <div className="course__lesson-header">
                          <span className="course__lesson-number">Lesson {li + 1}</span>
                          <span className="course__lesson-title">{lesson.title}</span>
                        </div>
                        {(lesson.exercises || []).map((ex, ei) => (
                          <div key={ei} className="course__exercise-item">
                            <div className="course__exercise-header">
                              <span className="course__exercise-number">Exercise {ei + 1}</span>
                              <span className={`course__exercise-type course__exercise-type--${ex.type}`}>
                                {ex.type}
                              </span>
                              {ex.difficulty && (
                                <span className="course__exercise-difficulty">★{ex.difficulty}</span>
                              )}
                            </div>
                            <p className="course__exercise-question">{ex.question}</p>
                            {ex.answer && (
                              <div className="course__exercise-answer">
                                <span className="course__exercise-answer-label">Answer:</span> {ex.answer}
                              </div>
                            )}
                            {ex.explanation && (
                              <p className="course__exercise-explanation">{ex.explanation}</p>
                            )}
                          </div>
                        ))}
                        {lesson.referenceContent && (
                          <div className="course__reference">
                            <span className="course__reference-label">Reference Content:</span>
                            <p className="course__reference-text">{lesson.referenceContent}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Final Assessment */}
        {draft.finalAssessment && (
          <div className="course__field">
            <label className="course__field-label">Final Assessment</label>
            <div className="course__final-assessment">
              <h4 className="course__final-title">{draft.finalAssessment.title || 'Final Assessment'}</h4>
              {(draft.finalAssessment.exercises || []).map((ex, ei) => (
                <div key={ei} className="course__exercise-item">
                  <div className="course__exercise-header">
                    <span className="course__exercise-number">Q{ei + 1}</span>
                    <span className={`course__exercise-type course__exercise-type--${ex.type}`}>
                      {ex.type}
                    </span>
                  </div>
                  <p className="course__exercise-question">{ex.question}</p>
                  {ex.answer && (
                    <div className="course__exercise-answer">
                      <span className="course__exercise-answer-label">Answer:</span> {ex.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="course__review-actions">
          <button className="course__btn course__btn--secondary" onClick={handleDiscard}>
            Discard
          </button>
          <button className="course__btn course__btn--primary" onClick={handlePublish}>
            Publish Course
          </button>
        </div>

        {error && (
          <div className="course__error-msg">
            <span>⚠</span> {error}
          </div>
        )}
      </div>
    );
  }

  // --- Render: Done State ---
  function renderDone() {
    return (
      <div className="course__ingestion-done">
        <div className="course__success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="course__done-title">Course Published!</h2>
        <p className="course__done-text">"{editTitle}" has been added to the catalog.</p>
        <div className="course__done-actions">
          <button className="course__btn course__btn--primary" onClick={onBack}>
            View in Catalog
          </button>
          <button className="course__btn course__btn--secondary" onClick={handleDiscard}>
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  // --- Main render ---
  switch (phase) {
    case 'idle':
      return (
        <div className="course__ingestion">
          <div className="course__header">
            <h1 className="course__title">Import PDF</h1>
            <p className="course__subtitle">Upload a PDF to create a structured course with AI</p>
          </div>
          {renderIdle()}
        </div>
      );
    case 'uploading':
      return (
        <div className="course__ingestion">
          <div className="course__header">
            <h1 className="course__title">Import PDF</h1>
          </div>
          {renderLoading('Reading file...')}
        </div>
      );
    case 'parsing':
      return (
        <div className="course__ingestion">
          <div className="course__header">
            <h1 className="course__title">Import PDF</h1>
          </div>
          {renderLoading('Extracting text from PDF...')}
        </div>
      );
    case 'generating':
      return (
        <div className="course__ingestion">
          <div className="course__header">
            <h1 className="course__title">Import PDF</h1>
          </div>
          {renderLoading('AI is structuring your course...')}
        </div>
      );
    case 'review':
      return (
        <div className="course__ingestion">
          {renderReview()}
        </div>
      );
    case 'saving':
      return (
        <div className="course__ingestion">
          <div className="course__header">
            <h1 className="course__title">Import PDF</h1>
          </div>
          {renderLoading('Saving course...')}
        </div>
      );
    case 'done':
      return (
        <div className="course__ingestion">
          {renderDone()}
        </div>
      );
    default:
      return null;
  }
}
