import React, { useMemo } from 'react';

export default function ReviewHealthCard({ reviewItems, getStats, config }) {
  const stats = useMemo(() => {
    if (!getStats) return null;
    try { return getStats(); }
    catch { return null; }
  }, [getStats]);

  if (!stats || stats.total === 0) {
    return (
      <div className="dashboard__analytics-card">
        <div className="dashboard__analytics-card-body">
          <p className="dashboard__analytics-empty">No review items yet. Complete practice sessions to build your review queue.</p>
        </div>
      </div>
    );
  }

  const healthPct = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

  return (
    <div className="dashboard__analytics-card">
      <div className="dashboard__analytics-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="dashboard__analytics-stat">
          <div className="dashboard__analytics-stat-value" style={{ color: 'var(--color-primary)' }}>{stats.total}</div>
          <div className="dashboard__analytics-stat-label">Total Items</div>
        </div>
        <div className="dashboard__analytics-stat">
          <div className="dashboard__analytics-stat-value" style={{ color: stats.due > 0 ? 'var(--color-warning, #e8a838)' : 'var(--color-success, #6bca6b)' }}>
            {stats.due}
          </div>
          <div className="dashboard__analytics-stat-label">Due Now</div>
        </div>
        <div className="dashboard__analytics-stat">
          <div className="dashboard__analytics-stat-value" style={{ color: healthPct >= 70 ? 'var(--color-success, #6bca6b)' : 'var(--color-warning, #e8a838)' }}>
            {healthPct}%
          </div>
          <div className="dashboard__analytics-stat-label">Review Health</div>
        </div>
      </div>
      <div className="dashboard__analytics-bar">
        <div className="dashboard__analytics-bar-track">
          <div className="dashboard__analytics-bar-fill" style={{ width: `${healthPct}%`, background: healthPct >= 70 ? 'var(--color-success, #6bca6b)' : healthPct >= 40 ? 'var(--color-warning, #e8a838)' : 'var(--color-error, #e86b6b)' }} />
        </div>
      </div>
      <div className="dashboard__analytics-footer">
        <span className="dashboard__analytics-footer-text">Avg half-life: {stats.avgHalfLife}d</span>
        <span className="dashboard__analytics-footer-text">Threshold: {Math.round((config?.threshold || 0.5) * 100)}%</span>
      </div>
    </div>
  );
}
