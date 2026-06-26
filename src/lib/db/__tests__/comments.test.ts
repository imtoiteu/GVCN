// M4 — generated_comments DAL test.
//
// Covers saving comments and the latest-per-student-per-week prefill reader the "Tạo nhận xét"
// screen uses. Runs against the shipped migrations (better-sqlite3 in-memory).

import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import {
  createClass,
  createComment,
  createStudent,
  createWeek,
  listLatestCommentsByWeek,
} from '../repositories';

async function setup() {
  const db = freshDb();
  const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
  const weekId = await createWeek(db, { class_id: classId, week_no: 1, label: 'Tuần 1' });
  const s1 = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
  const s2 = await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });
  return { db, classId, weekId, s1, s2 };
}

describe('M4 generated_comments DAL', () => {
  it('returns the latest comment per student for a week', async () => {
    const { db, weekId, s1, s2 } = await setup();
    await createComment(db, { student_id: s1, week_id: weekId, body_text: 'Bản nháp 1.' });
    await createComment(db, { student_id: s1, week_id: weekId, body_text: 'Bản đã sửa.', edited_by_user: true });
    await createComment(db, { student_id: s2, week_id: weekId, body_text: 'Nhận xét Bình.' });

    const latest = await listLatestCommentsByWeek(db, weekId);
    expect(latest).toHaveLength(2);
    const byStudent = new Map(latest.map((c) => [c.student_id, c]));
    expect(byStudent.get(s1)?.body_text).toBe('Bản đã sửa.');
    expect(byStudent.get(s1)?.edited_by_user).toBe(1);
    expect(byStudent.get(s2)?.body_text).toBe('Nhận xét Bình.');
    db.close();
  });

  it('a week with no comments returns empty', async () => {
    const { db, weekId } = await setup();
    expect(await listLatestCommentsByWeek(db, weekId)).toEqual([]);
    db.close();
  });
});
