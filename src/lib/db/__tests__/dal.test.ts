import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import {
  createClass,
  createStudent,
  createWeek,
  listClasses,
  listStudentsByClass,
  getStudentByCode,
  listTags,
  listTagsByCategory,
  getTagByCode,
  upsertWeeklyRecord,
  getWeeklyRecord,
  setRecordTags,
  listTagsForRecord,
  createComment,
  listCommentsByStudent,
  createParentMessage,
  listParentMessagesByStudent,
  createReport,
  listReportsByClass,
} from '../repositories';

describe('DAL create/read', () => {
  it('creates and reads a class', async () => {
    const db = freshDb();
    const id = await createClass(db, { name: '8B', school_year: '2025-2026' });
    expect(id).toBeGreaterThan(0);
    const all = await listClasses(db);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('8B');
    db.close();
  });

  it('creates students and looks them up by code', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
    await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });

    const list = await listStudentsByClass(db, classId);
    expect(list).toHaveLength(2);
    expect(list[0].is_active).toBe(1); // default applied

    const found = await getStudentByCode(db, classId, '8A-02');
    expect(found?.full_name).toBe('Bình');
    expect(await getStudentByCode(db, classId, 'nope')).toBeNull();
    db.close();
  });

  it('reads the seeded tag catalog', async () => {
    const db = freshDb();
    const all = await listTags(db);
    expect(all.length).toBeGreaterThanOrEqual(20);

    const study = await listTagsByCategory(db, 'study');
    expect(study.every((t) => t.category === 'study')).toBe(true);

    const tag = await getTagByCode(db, 'study.improved');
    expect(tag?.sentiment).toBe('positive');
    db.close();
  });

  it('upserts a weekly record and attaches tags', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    const studentId = await createStudent(db, {
      class_id: classId,
      student_code: '8A-01',
      full_name: 'An',
    });
    const weekId = await createWeek(db, { class_id: classId, week_no: 1 });

    const recId = await upsertWeeklyRecord(db, {
      student_id: studentId,
      week_id: weekId,
      teacher_notes: 'Tuần đầu ổn định.',
    });
    expect(recId).toBeGreaterThan(0);

    // upsert again with new notes -> same record id, updated notes
    const recId2 = await upsertWeeklyRecord(db, {
      student_id: studentId,
      week_id: weekId,
      teacher_notes: 'Có tiến bộ.',
    });
    expect(recId2).toBe(recId);
    const rec = await getWeeklyRecord(db, studentId, weekId);
    expect(rec?.teacher_notes).toBe('Có tiến bộ.');

    const improved = await getTagByCode(db, 'study.improved');
    const active = await getTagByCode(db, 'study.active');
    await setRecordTags(db, recId, [improved!.id, active!.id]);
    let tags = await listTagsForRecord(db, recId);
    expect(tags.map((t) => t.code).sort()).toEqual(['study.active', 'study.improved']);

    // setRecordTags replaces the full set
    await setRecordTags(db, recId, [improved!.id]);
    tags = await listTagsForRecord(db, recId);
    expect(tags.map((t) => t.code)).toEqual(['study.improved']);
    db.close();
  });

  it('stores generated comments, parent messages and reports', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    const studentId = await createStudent(db, {
      class_id: classId,
      student_code: '8A-01',
      full_name: 'An',
    });

    await createComment(db, { student_id: studentId, body_text: 'Em có tiến bộ.' });
    const comments = await listCommentsByStudent(db, studentId);
    expect(comments).toHaveLength(1);
    expect(comments[0].edited_by_user).toBe(0);

    await createParentMessage(db, {
      student_id: studentId,
      body_text: 'Kính mời phụ huynh phối hợp cùng nhà trường.',
      edited_by_user: true,
    });
    const msgs = await listParentMessagesByStudent(db, studentId);
    expect(msgs[0].edited_by_user).toBe(1);

    await createReport(db, {
      class_id: classId,
      period_kind: 'week',
      period_label: 'Tuần 1',
      body_text: 'Báo cáo tuần 1.',
    });
    const reports = await listReportsByClass(db, classId);
    expect(reports).toHaveLength(1);
    expect(reports[0].period_kind).toBe('week');
    db.close();
  });
});
