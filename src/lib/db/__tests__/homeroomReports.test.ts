// M6 — homeroom_reports DAL test.
//
// Covers saving generated minutes/reports and the latest-by-(class, kind, label) prefill reader the
// "Biên bản & Báo cáo" screen uses. Runs against the shipped migrations (better-sqlite3 in-memory).

import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import { createClass, createReport, getLatestReport, listReportsByClass } from '../repositories';

async function setup() {
  const db = freshDb();
  const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
  return { db, classId };
}

describe('M6 homeroom_reports DAL', () => {
  it('saves week + month reports and lists them for a class', async () => {
    const { db, classId } = await setup();
    await createReport(db, {
      class_id: classId,
      period_kind: 'week',
      period_label: 'Biên bản · Tuần 1',
      body_text: 'Biên bản tuần 1.',
    });
    await createReport(db, {
      class_id: classId,
      period_kind: 'month',
      period_label: 'Báo cáo tháng · Tháng 9/2025',
      body_text: 'Báo cáo tháng 9.',
    });

    const all = await listReportsByClass(db, classId);
    expect(all).toHaveLength(2);
    db.close();
  });

  it('returns the latest report per (class, kind, label)', async () => {
    const { db, classId } = await setup();
    const label = 'Báo cáo tuần · Tuần 1';
    await createReport(db, { class_id: classId, period_kind: 'week', period_label: label, body_text: 'Bản 1.' });
    await createReport(db, {
      class_id: classId,
      period_kind: 'week',
      period_label: label,
      body_text: 'Bản đã sửa.',
      edited_by_user: true,
    });

    const latest = await getLatestReport(db, classId, 'week', label);
    expect(latest?.body_text).toBe('Bản đã sửa.');
    expect(latest?.edited_by_user).toBe(1);
    db.close();
  });

  it('distinguishes minutes vs weekly report for the same week by label', async () => {
    const { db, classId } = await setup();
    await createReport(db, { class_id: classId, period_kind: 'week', period_label: 'Biên bản · Tuần 1', body_text: 'BB.' });
    await createReport(db, { class_id: classId, period_kind: 'week', period_label: 'Báo cáo tuần · Tuần 1', body_text: 'BC.' });

    expect((await getLatestReport(db, classId, 'week', 'Biên bản · Tuần 1'))?.body_text).toBe('BB.');
    expect((await getLatestReport(db, classId, 'week', 'Báo cáo tuần · Tuần 1'))?.body_text).toBe('BC.');
    db.close();
  });

  it('returns null when no matching report exists', async () => {
    const { db, classId } = await setup();
    expect(await getLatestReport(db, classId, 'month', 'Báo cáo tháng · Tháng 1/2025')).toBeNull();
    db.close();
  });
});
