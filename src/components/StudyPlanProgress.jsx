import React, { useMemo } from 'react';

export default function StudyPlanProgress({ plan }) {
  const stats = useMemo(() => {
    if (!plan?.tiers) return null;
    const tiers = plan.tiers;
    const allExercises = [
      ...(tiers.shortTerm?.exercises || []),
      ...(tiers.midTerm?.exercises || []),
      ...(tiers.longTerm?.exercises || []),
    ];
    const total = allExercises.length;
    const completed = allExercises.filter(e => e.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const tierStats = {};
    for (const [key, tier] of Object.entries(tiers)) {
      const exs = tier.exercises || [];
      tierStats[key] = {
        total: exs.length,
        completed: exs.filter(e => e.completed).length,
        label: tier.label || key,
      };
    }
    return { total, completed, pct, tierStats, density: plan.density };
  }, [plan]);

  if (!stats || stats.total === 0) {
    return (
      <div className="dashboard__analytics-card">
        <div className="dashboard__analytics-card-body">
          <p className="dashboard__analytics-empty">No study plan generated yet. Complete your assessment first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard__analytics-card">
      <div className="dashboard__analytics-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="dashboard__analytics-stat">
          <div className="dashboard__analytics-stat-value">{stats.completed}</div>
          <div className="dashboard__analytics-stat-label">Completed</div>
        </div>
        <div className="dashboard__analytics-stat">
          <div className="dashboard__analytics-stat-value">{stats.total}</div>
          <div className="dashboard__analytics-stat-label">Total Exercises</div>
        </div>
        <div className="dashboard__analytics-stat">
          <div className="dashboard__analytics-stat-value" style={{ color: stats.pct >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {stats.pct}%
          </div>
          <div className="dashboard__analytics-stat-label">Completion</div>
        </div>
      </div>
      <div className="dashboard__analytics-bar">
        <div className="dashboard__analytics-bar-track">
          <div className="dashboard__analytics-bar-fill" style={{ width: `${stats.pct}%`, background: 'var(--color-primary)' }} />
        </div>
      </div>
      <div className="dashboard__analytics-tiers">
        {Object.entries(stats.tierStats).map(([key, ts]) => (
          <div key={key} className="dashboard__analytics-tier-row">
            <span className="dashboard__analytics-tier-label">{ts.label}</span>
            <div className="dashboard__analytics-tier-bar-track">
              <div className="dashboard__analytics-tier-bar-fill" style={{ width: `${ts.total > 0 ? (ts.completed / ts.total) * 100 : 0}%` }} />
            </div>
            <span className="dashboard__analytics-tier-count">{ts.completed}/{ts.total}</span>
          </div>
        ))}
      </div>
      {stats.density && (
        <div className="dashboard__analytics-footer">
          <span className="dashboard__analytics-footer-text">{stats.density.sessionsPerWeek} sessions/wk</span>
          <span className="dashboard__analytics-footer-text">{stats.density.dailyMinutes} min/day</span>
        </div>
      )}
    </div>
  );
}
