import React, { useState, useMemo } from 'react';
import { getDismissedRecommendations, dismissRecommendation } from '../utils/courseSchema';

/**
 * PostTaskSuggestion — Inline course recommendation banner shown after task submission (D-18).
 * Displays at most 2 recommendations.
 * Dismissal persists in localStorage with 7-day expiry.
 *
 * Props:
 *   recommendations  — Array of { tags: string[], confidence: number, source: string }
 *   onGenerate       — (tags) => Promise<{ course?: object, error?: string }>, generates a course
 *   onSuccess        — (course) => void, called after generation succeeds
 *   onError          — (error) => void, called after generation fails
 *   onDismiss        — () => void, hides this suggestion
 *   onBrowseAll      — () => void, navigates to full catalog
 *   onEnroll         — (tagSet) => void, legacy navigation fallback (if onGenerate not set)
 */
export default function PostTaskSuggestion({
  recommendations = [],
  onGenerate,
  onSuccess,
  onError,
  onDismiss,
  onBrowseAll,
  onEnroll,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Filter out recently dismissed recommendations
  const visible = useMemo(() => {
    if (dismissed) return [];
    const dismissedRecs = getDismissedRecommendations();
    const dismissedTags = new Set(
      dismissedRecs.flatMap(r => r.tags || [])
    );
    return recommendations
      .filter(r => !r.tags?.some(t => dismissedTags.has(t)))
      .slice(0, 2);
  }, [recommendations, dismissed]);

  if (visible.length === 0) return null;

  const handleDismiss = () => {
    visible.forEach(r => dismissRecommendation(r.tags));
    setDismissed(true);
    setGenerationError(null);
    setGenerating(false);
    onDismiss?.();
  };

  const handleRetry = async () => {
    const tags = visible[0]?.tags;
    if (!tags || !onGenerate) return;
    setGenerationError(null);
    setGenerating(true);
    try {
      const result = await onGenerate(tags);
      if (result.course) {
        onSuccess?.(result.course);
      } else {
        setGenerationError(result.error || 'Generation failed. Please try again.');
        onError?.(result.error || 'Generation failed');
      }
    } catch (e) {
      setGenerationError(e.message || 'An unexpected error occurred.');
      onError?.(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleEnroll = async () => {
    const tags = visible[0]?.tags;
    if (!tags) return;

    // If onGenerate is provided, use the generation flow
    if (onGenerate) {
      setGenerating(true);
      setGenerationError(null);
      try {
        const result = await onGenerate(tags);
        if (result.course) {
          onSuccess?.(result.course);
        } else {
          setGenerationError(result.error || 'Generation failed. Please try again.');
          onError?.(result.error || 'Generation failed');
        }
      } catch (e) {
        setGenerationError(e.message || 'An unexpected error occurred.');
        onError?.(e.message);
      } finally {
        setGenerating(false);
      }
    } else {
      // Legacy fallback — navigate to catalog
      onEnroll?.(tags);
    }
  };

  const tagLabels = visible.map(r => r.tags?.slice(0, 3).join(', ') || '').filter(Boolean);

  const tagLabelsJoined = tagLabels.join('; ');

  // Loading state
  if (generating) {
    return (
      <div className="course__post-task">
        <div className="course__post-task-header">
          <span className="course__post-task-icon">📚</span>
          <span className="course__post-task-title">Recommended Courses</span>
        </div>
        <div className="course__post-task-generating">
          <div className="course__spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          <p className="course__post-task-gen-text">
            Tailoring your remedial course for {tagLabelsJoined}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="course__post-task">
      <div className="course__post-task-header">
        <span className="course__post-task-icon">📚</span>
        <span className="course__post-task-title">Recommended Courses</span>
      </div>
      <p className="course__post-task-desc">
        Based on your performance, you may benefit from:{' '}
        <strong>{tagLabelsJoined}</strong>
      </p>

      {generationError && (
        <div className="course__gen-inline-error">
          <span className="course__gen-inline-error-text">{generationError}</span>
          <div className="course__gen-inline-actions">
            <button
              className="course__post-task-btn course__post-task-btn--primary"
              onClick={handleRetry}
            >
              Try Again
            </button>
            <button
              className="course__post-task-btn course__post-task-btn--ghost"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="course__post-task-actions">
        <button
          className="course__post-task-btn course__post-task-btn--primary"
          onClick={handleEnroll}
        >
          Enroll
        </button>
        <button
          className="course__post-task-btn course__post-task-btn--ghost"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
        <button
          className="course__post-task-btn course__post-task-btn--ghost"
          onClick={() => onBrowseAll?.()}
        >
          Browse All Courses →
        </button>
      </div>
    </div>
  );
}
