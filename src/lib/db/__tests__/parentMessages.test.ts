// M5 — parent_messages DAL test.
//
// Covers saving parent-message drafts and the latest-per-student-per-week prefill reader the
// "Tin nhắn phụ huynh" screen uses. Runs against the shipped migrations (better-sqlite3 in-memory).

import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import {
  createClass,
  createParentMessage,
  createStudent,
  createWeek,
  listLatestParentMessagesByWeek,
} from '../repositories';

async function setup() {
  const db = freshDb();
  const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
  const weekId = await createWeek(db, { class_id: classId, week_no: 1, label: 'Tuần 1' });
  const s1 = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
  const s2 = await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });
  return { db, classId, weekId, s1, s2 };
}

describe('M5 parent_messages DAL', () => {
  it('returns the latest parent message per student for a week', async () => {
    const { db, weekId, s1, s2 } = await setup();
    await createParentMessage(db, { student_id: s1, week_id: weekId, body_text: 'Bản nháp 1.' });
    await createParentMessage(db, {
      student_id: s1,
      week_id: weekId,
      body_text: 'Bản đã sửa.',
      edited_by_user: true,
    });
    await createParentMessage(db, { student_id: s2, week_id: weekId, body_text: 'Tin nhắn Bình.' });

    const latest = await listLatestParentMessagesByWeek(db, weekId);
    expect(latest).toHaveLength(2);
    const byStudent = new Map(latest.map((m) => [m.student_id, m]));
    expect(byStudent.get(s1)?.body_text).toBe('Bản đã sửa.');
    expect(byStudent.get(s1)?.edited_by_user).toBe(1);
    expect(byStudent.get(s2)?.body_text).toBe('Tin nhắn Bình.');
    db.close();
  });

  it('a week with no parent messages returns empty', async () => {
    const { db, weekId } = await setup();
    expect(await listLatestParentMessagesByWeek(db, weekId)).toEqual([]);
    db.close();
  });
});
