// M9.1 — Dashboard: a demo-ready overview + quick actions + workflow guide.
//
// Reads counts from the DAL for the first (current) class and its first week, runs them through the
// pure computeDashboardSummary helper, and renders summary cards. Quick-action buttons use the
// in-app nav context to jump to other screens. No charts, no network — local counts only.

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  countActiveStudents,
  countCommentsByClass,
  countParentMessagesByClass,
  countReportsByClass,
  listClasses,
  listWeeklyRecordsByWeek,
  listWeeksByClass,
} from '../../lib/db';
import {
  computeDashboardSummary,
  type DashboardSummary,
} from '../../lib/dashboard/dashboardSummary';
import { useAppNav } from '../../app/nav-context';
import { t } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

export function DashboardPage() {
  const { navigate } = useAppNav();
  const [status, setStatus] = useState<Status>('loading');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const db = await getDb();
      const classes = await listClasses(db);
      const current = classes[0] ?? null;

      let totalStudents = 0;
      let currentWeekLabel: string | null = null;
      let recorded = 0;
      let comments = 0;
      let parentMessages = 0;
      let reports = 0;

      if (current) {
        totalStudents = await countActiveStudents(db, current.id);
        const weeks = await listWeeksByClass(db, current.id);
        const week = weeks[0] ?? null;
        if (week) {
          currentWeekLabel = week.label ?? t.weekly.weekName(week.week_no);
          recorded = (await listWeeklyRecordsByWeek(db, week.id)).length;
        }
        comments = await countCommentsByClass(db, current.id);
        parentMessages = await countParentMessagesByClass(db, current.id);
        reports = await countReportsByClass(db, current.id);
      }

      setSummary(
        computeDashboardSummary({
          totalClasses: classes.length,
          totalStudents,
          currentClassName: current?.name ?? null,
          currentWeekLabel,
          studentsRecordedThisWeek: recorded,
          comments,
          parentMessages,
          reports,
        }),
      );
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{t.dashboard.title}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error' || !summary) {
    return (
      <section className="page">
        <h1 className="page__title">{t.dashboard.title}</h1>
        <div className="state state--error">
          <p>{t.common.dbUnavailable}</p>
          <button type="button" className="btn" onClick={() => void load()}>
            {t.common.retry}
          </button>
        </div>
      </section>
    );
  }

  const none = t.dashboard.none;

  return (
    <section className="page">
      <h1 className="page__title">{t.dashboard.title}</h1>
      <p className="muted">{t.dashboard.intro}</p>

      {!summary.hasClass ? (
        <div className="state state--empty">
          <h2>{t.dashboard.noClassTitle}</h2>
          <p>{t.dashboard.noClassHint}</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('classes')}>
            {t.actions.goClasses}
          </button>
        </div>
      ) : (
        <div className="stat-grid">
          <StatCard label={t.dashboard.statClasses} value={String(summary.totalClasses)} />
          <StatCard label={t.dashboard.statCurrentClass} value={summary.currentClassName ?? none} />
          <StatCard label={t.dashboard.statStudents} value={String(summary.totalStudents)} />
          <StatCard label={t.dashboard.statCurrentWeek} value={summary.currentWeekLabel ?? none} />
          <StatCard
            label={t.dashboard.statRecorded}
            value={
              summary.hasWeek
                ? `${t.dashboard.recordedOf(summary.studentsRecordedThisWeek, summary.totalStudents)} · ${summary.recordedPercent}%`
                : none
            }
          />
          <StatCard label={t.dashboard.statComments} value={String(summary.comments)} />
          <StatCard label={t.dashboard.statMessages} value={String(summary.parentMessages)} />
          <StatCard label={t.dashboard.statReports} value={String(summary.reports)} />
        </div>
      )}

      <h2 className="section-title">{t.dashboard.quickActionsTitle}</h2>
      <div className="quick-actions">
        <button type="button" className="btn" onClick={() => navigate('classes')}>{t.dashboard.qaClasses}</button>
        <button type="button" className="btn" onClick={() => navigate('weekly')}>{t.dashboard.qaWeekly}</button>
        <button type="button" className="btn" onClick={() => navigate('comments')}>{t.dashboard.qaComments}</button>
        <button type="button" className="btn" onClick={() => navigate('parent')}>{t.dashboard.qaParent}</button>
        <button type="button" className="btn" onClick={() => navigate('reports')}>{t.dashboard.qaReports}</button>
        <button type="button" className="btn" onClick={() => navigate('exports')}>{t.dashboard.qaExports}</button>
        <button type="button" className="btn" onClick={() => navigate('claude')}>{t.dashboard.qaClaude}</button>
      </div>

      <h2 className="section-title">{t.dashboard.workflowTitle}</h2>
      <ol className="workflow-guide">
        <li>{t.dashboard.step1}</li>
        <li>{t.dashboard.step2}</li>
        <li>{t.dashboard.step3}</li>
        <li>{t.dashboard.step4}</li>
      </ol>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}
