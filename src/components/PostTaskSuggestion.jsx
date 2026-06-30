import React, { useState, useMemo } from 'react';
import { getDismissedRecommendations, dismissRecommendation } from '../utils/courseSchema';

/**
 * PostTaskSuggestion — Inline course recommendation banner shown after task submission (D-18).
 * Displays at most 2 recommendations.
 * Dismissal persists in localStorage with 7-day expiry.
 *
 * Props:
 *   recommendations  — Array of { tags: string[], confidence: number, source: string }
 *   onEnroll         — (tagSet) => void, navigates to catalog filtered by tags
 *   onDismiss        — () => void, hides this suggestion
 *   onBrowseAll      — () => void, navigates to full catalog
 */
export default function PostTaskSuggestion({ recommendations = [], onEnroll, onDismiss, onBrowseAll }) {
  const [dismissed, setDismissed] = useState(false);

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
    onDismiss?.();
  };

  const tagLabels = visible.map(r => r.tags?.slice(0, 3).join(', ') || '').filter(Boolean);

  return (
    <div className="course__post-task">
      <div className="course__post-task-header">
        <span className="course__post-task-icon">📚</span>
        <span className="course__post-task-title">Recommended Courses</span>
      </div>
      <p className="course__post-task-desc">
        Based on your performance, you may benefit from:{' '}
        <strong>{tagLabels.join('; ')}</strong>
      </p>
      <div className="course__post-task-actions">
        <button
          className="course__post-task-btn course__post-task-btn--primary"
          onClick={() => onEnroll?.(visible[0]?.tags)}
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
