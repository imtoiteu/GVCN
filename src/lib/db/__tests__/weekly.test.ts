// M3 — Weekly Records data-access tests.
//
// Covers the batch readers and the save helper the "Ghi nhận tuần" screen relies on:
// save a record (notes + tags) → read it back per week, replace tags, and confirm the
// batch loaders return one row per student with the correct tag sets. Runs against the
// same shipped migrations as the rest of the DAL (better-sqlite3 in-memory).

import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import {
  createClass,
  createStudent,
  createWeek,
  getTagByCode,
  getWeeklyRecord,
  listWeeklyRecordsByWeek,
  listRecordTagIdsByWeek,
  listTagsForRecord,
  saveWeeklyRecord,
} from '../repositories';

async function setupClassWeek() {
  const db = freshDb();
  const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
  const weekId = await createWeek(db, { class_id: classId, week_no: 1, label: 'Tuần 1' });
  const s1 = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
  const s2 = await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });
  const s3 = await createStudent(db, { class_id: classId, student_code: '8A-03', full_name: 'Cường' });
  return { db, classId, weekId, s1, s2, s3 };
}

describe('M3 weekly records DAL', () => {
  it('saves notes + tags and reads them back for a student', async () => {
    const { db, weekId, s1 } = await setupClassWeek();
    const full = await getTagByCode(db, 'attendance.full');
    const active = await getTagByCode(db, 'study.active');

    const recId = await saveWeeklyRecord(db, {
      student_id: s1,
      week_id: weekId,
      teacher_notes: 'Tuần đầu tích cực.',
      tagIds: [full!.id, active!.id],
    });
    expect(recId).toBeGreaterThan(0);

    const rec = await getWeeklyRecord(db, s1, weekId);
    expect(rec?.teacher_notes).toBe('Tuần đầu tích cực.');

    const tags = await listTagsForRecord(db, recId);
    expect(tags.map((t) => t.code).sort()).toEqual(['attendance.full', 'study.active']);
    db.close();
  });

  it('re-saving the same student replaces the tag set and updates notes (no duplicates)', async () => {
    const { db, weekId, s1 } = await setupClassWeek();
    const full = await getTagByCode(db, 'attendance.full');
    const active = await getTagByCode(db, 'study.active');
    const improved = await getTagByCode(db, 'study.improved');

    const first = await saveWeeklyRecord(db, {
      student_id: s1,
      week_id: weekId,
      teacher_notes: 'Bản nháp.',
      tagIds: [full!.id, active!.id],
    });
    const second = await saveWeeklyRecord(db, {
      student_id: s1,
      week_id: weekId,
      teacher_notes: 'Đã chỉnh sửa.',
      tagIds: [improved!.id],
    });
    expect(second).toBe(first); // same (student, week) record

    const rec = await getWeeklyRecord(db, s1, weekId);
    expect(rec?.teacher_notes).toBe('Đã chỉnh sửa.');
    const tags = await listTagsForRecord(db, first);
    expect(tags.map((t) => t.code)).toEqual(['study.improved']);
    db.close();
  });

  it('batch-loads records and tag ids for a whole week', async () => {
    const { db, weekId, s1, s2, s3 } = await setupClassWeek();
    const full = await getTagByCode(db, 'attendance.full');
    const active = await getTagByCode(db, 'study.active');
    const help = await getTagByCode(db, 'good_deed.help_friend');

    await saveWeeklyRecord(db, { student_id: s1, week_id: weekId, tagIds: [full!.id, active!.id] });
    await saveWeeklyRecord(db, { student_id: s2, week_id: weekId, teacher_notes: 'Giúp bạn.', tagIds: [help!.id] });
    // s3 deliberately left without a record.

    const records = await listWeeklyRecordsByWeek(db, weekId);
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.student_id).sort((a, b) => a - b)).toEqual([s1, s2]);

    const pairs = await listRecordTagIdsByWeek(db, weekId);
    // Rebuild student -> tag ids the way the UI does.
    const recById = new Map(records.map((r) => [r.id, r.student_id]));
    const byStudent = new Map<number, number[]>();
    for (const p of pairs) {
      const sid = recById.get(p.record_id)!;
      byStudent.set(sid, [...(byStudent.get(sid) ?? []), p.tag_id]);
    }
    expect((byStudent.get(s1) ?? []).sort((a, b) => a - b)).toEqual([full!.id, active!.id].sort((a, b) => a - b));
    expect(byStudent.get(s2)).toEqual([help!.id]);
    expect(byStudent.get(s3)).toBeUndefined();
    db.close();
  });

  it('a week with no records returns empty batch results', async () => {
    const { db, weekId } = await setupClassWeek();
    expect(await listWeeklyRecordsByWeek(db, weekId)).toEqual([]);
    expect(await listRecordTagIdsByWeek(db, weekId)).toEqual([]);
    db.close();
  });
});
