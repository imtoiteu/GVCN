import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import {
  classExists,
  countActiveStudents,
  countClasses,
  countCommentsByClass,
  countLinkedRecordsForStudent,
  countStudentsInClass,
  createClass,
  createComment,
  createStudent,
  createWeek,
  deleteClassIfEmpty,
  deleteStudentIfNoRecords,
  listAllStudentsByClass,
  listStudentsByClass,
  saveWeeklyRecord,
  setStudentActive,
  studentCodeExists,
  updateClass,
  updateStudent,
} from '../repositories';
import { seedDemoClass, DEMO_STUDENTS } from '../seed';

describe('class CRUD', () => {
  it('prevents duplicate (name, school_year) and supports update', async () => {
    const db = freshDb();
    await createClass(db, { name: '8A', school_year: '2025-2026' });
    expect(await classExists(db, '8A', '2025-2026')).toBe(true);
    expect(await classExists(db, '8B', '2025-2026')).toBe(false);

    const id2 = await createClass(db, { name: '8B', school_year: '2025-2026' });
    // renaming 8B -> 8A would collide; classExists (excluding self) catches it
    expect(await classExists(db, '8A', '2025-2026', id2)).toBe(true);

    await updateClass(db, id2, { name: '8C', school_year: '2025-2026', homeroom_teacher: 'GV X' });
    expect(await classExists(db, '8C', '2025-2026', id2)).toBe(false); // self excluded
    db.close();
  });

  it('deletes a class only when it has no students', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });

    const blocked = await deleteClassIfEmpty(db, classId);
    expect(blocked).toEqual({ deleted: false, studentCount: 1 });
    expect(await countClasses(db)).toBe(1);

    const empty = await createClass(db, { name: '9A', school_year: '2025-2026' });
    const ok = await deleteClassIfEmpty(db, empty);
    expect(ok.deleted).toBe(true);
    expect(await countClasses(db)).toBe(1);
    db.close();
  });
});

describe('student CRUD', () => {
  it('prevents duplicate student_code within a class (excluding self on edit)', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    const a = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
    await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });

    expect(await studentCodeExists(db, classId, '8A-02')).toBe(true);
    expect(await studentCodeExists(db, classId, '8A-09')).toBe(false);
    // editing student A keeping its own code is fine (self excluded)
    expect(await studentCodeExists(db, classId, '8A-01', a)).toBe(false);
    // but renaming A's code to 8A-02 collides
    expect(await studentCodeExists(db, classId, '8A-02', a)).toBe(true);

    await updateStudent(db, a, { student_code: '8A-01', full_name: 'An Updated', gender: 'M', dob: null, note: 'ghi chú' });
    const all = await listAllStudentsByClass(db, classId);
    expect(all.find((s) => s.id === a)?.full_name).toBe('An Updated');
    db.close();
  });

  it('archive hides a student from the active roster but keeps the row', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    const a = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
    await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });

    await setStudentActive(db, a, false);
    expect((await listStudentsByClass(db, classId)).map((s) => s.id)).not.toContain(a);
    expect((await listAllStudentsByClass(db, classId)).map((s) => s.id)).toContain(a);
    expect(await countActiveStudents(db, classId)).toBe(1);
    expect(await countStudentsInClass(db, classId)).toBe(2);

    await setStudentActive(db, a, true); // restore
    expect(await countActiveStudents(db, classId)).toBe(2);
    db.close();
  });

  it('blocks hard delete when linked records exist, allows it otherwise', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    const a = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
    const week = await createWeek(db, { class_id: classId, week_no: 1 });
    await saveWeeklyRecord(db, { student_id: a, week_id: week, teacher_notes: 'ok', tagIds: [] });

    expect(await countLinkedRecordsForStudent(db, a)).toBeGreaterThan(0);
    const blocked = await deleteStudentIfNoRecords(db, a);
    expect(blocked.deleted).toBe(false);
    expect(blocked.linkedCount).toBeGreaterThan(0);

    const b = await createStudent(db, { class_id: classId, student_code: '8A-02', full_name: 'Bình' });
    const ok = await deleteStudentIfNoRecords(db, b);
    expect(ok).toEqual({ deleted: true, linkedCount: 0 });
    db.close();
  });

  it('counts comments per class via the student join', async () => {
    const db = freshDb();
    const classId = await createClass(db, { name: '8A', school_year: '2025-2026' });
    const a = await createStudent(db, { class_id: classId, student_code: '8A-01', full_name: 'An' });
    await createComment(db, { student_id: a, body_text: 'Em tiến bộ.' });
    await createComment(db, { student_id: a, body_text: 'Em chăm chỉ.' });
    expect(await countCommentsByClass(db, classId)).toBe(2);
    db.close();
  });
});

describe('demo seed idempotency', () => {
  it('does not duplicate students or weeks when run twice', async () => {
    const db = freshDb();
    const first = await seedDemoClass(db);
    expect(first.created).toBe(true);

    const second = await seedDemoClass(db);
    expect(second.created).toBe(false);
    expect(second.classId).toBe(first.classId);

    const roster = await listStudentsByClass(db, first.classId);
    expect(roster).toHaveLength(DEMO_STUDENTS.length); // not doubled
    db.close();
  });
});
