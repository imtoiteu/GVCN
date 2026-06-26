import { describe, it, expect } from 'vitest';
import { freshDb } from '../../../test/sqliteExecutor';
import { seedDemoClass, DEMO_STUDENTS, DEMO_WEEKS, DEMO_CLASS } from '../seed';
import { listStudentsByClass, getClass } from '../repositories';

describe('demo 8A seed', () => {
  it('creates the demo class, students and weeks with the expected shape', async () => {
    const db = freshDb();
    const result = await seedDemoClass(db);

    expect(result.created).toBe(true);
    expect(result.studentIds).toHaveLength(DEMO_STUDENTS.length);
    expect(result.weekIds).toHaveLength(DEMO_WEEKS.length);

    const cls = await getClass(db, result.classId);
    expect(cls?.name).toBe(DEMO_CLASS.name);
    expect(cls?.school_year).toBe(DEMO_CLASS.school_year);

    const students = await listStudentsByClass(db, result.classId);
    expect(students).toHaveLength(DEMO_STUDENTS.length);
    // codes follow the anonymization-key convention and are unique
    const codes = students.map((s) => s.student_code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain('8A-01');
    db.close();
  });

  it('demo data contains no obviously-real PII fields (codes only for export)', async () => {
    // Seed fixtures must never carry phone/address/email. We assert the demo students
    // only expose code/name/gender — the shape the seeder inserts.
    for (const s of DEMO_STUDENTS) {
      expect(Object.keys(s).sort()).toEqual(['full_name', 'gender', 'student_code']);
      expect(s.student_code).toMatch(/^8A-\d{2}$/);
    }
  });

  it('is idempotent: seeding twice reuses the same class', async () => {
    const db = freshDb();
    const first = await seedDemoClass(db);
    const second = await seedDemoClass(db);

    expect(second.created).toBe(false);
    expect(second.classId).toBe(first.classId);

    const students = await listStudentsByClass(db, first.classId);
    expect(students).toHaveLength(DEMO_STUDENTS.length); // not doubled
    db.close();
  });
});
