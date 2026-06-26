// Demo data for class 8A — FAKE students only (CLAUDE.md: never commit real PII).
//
// The controlled tag catalog is seeded by migration 002 (always present). This module
// seeds an optional *demo class*, triggered by the future "Tải dữ liệu mẫu 8A" action
// (M1 UI). It is idempotent at the class level: if an 8A class for the school year already
// exists it is reused rather than duplicated.

import { createClass, createStudent, createWeek, getStudentByCode } from './repositories';
import type { SqlExecutor } from './executor';

export interface DemoStudent {
  student_code: string;
  full_name: string;
  gender: 'M' | 'F';
}

export const DEMO_CLASS = {
  name: '8A',
  school_year: '2025-2026',
  homeroom_teacher: 'GV. Nguyễn Demo',
} as const;

// 12 fake students — enough to exercise tables/forms without being a full 40-row roster.
// Names are invented; codes follow the "<class>-NN" anonymization-key convention.
export const DEMO_STUDENTS: readonly DemoStudent[] = [
  { student_code: '8A-01', full_name: 'Nguyễn Văn An', gender: 'M' },
  { student_code: '8A-02', full_name: 'Trần Thị Bình', gender: 'F' },
  { student_code: '8A-03', full_name: 'Lê Hoàng Cường', gender: 'M' },
  { student_code: '8A-04', full_name: 'Phạm Thị Dung', gender: 'F' },
  { student_code: '8A-05', full_name: 'Hoàng Minh Đức', gender: 'M' },
  { student_code: '8A-06', full_name: 'Vũ Thị Giang', gender: 'F' },
  { student_code: '8A-07', full_name: 'Đặng Văn Hải', gender: 'M' },
  { student_code: '8A-08', full_name: 'Bùi Thị Hoa', gender: 'F' },
  { student_code: '8A-09', full_name: 'Đỗ Quang Huy', gender: 'M' },
  { student_code: '8A-10', full_name: 'Ngô Thị Lan', gender: 'F' },
  { student_code: '8A-11', full_name: 'Dương Văn Nam', gender: 'M' },
  { student_code: '8A-12', full_name: 'Phan Thị Oanh', gender: 'F' },
];

// Two example weeks so weekly-record features have a period to attach to.
export const DEMO_WEEKS = [
  { week_no: 1, start_date: '2025-09-02', end_date: '2025-09-06', label: 'Tuần 1 (02/09–06/09)' },
  { week_no: 2, start_date: '2025-09-08', end_date: '2025-09-13', label: 'Tuần 2 (08/09–13/09)' },
] as const;

export interface SeedResult {
  classId: number;
  studentIds: number[];
  weekIds: number[];
  created: boolean; // false if the demo class already existed and was reused
}

/**
 * Seed (or reuse) the demo 8A class with fake students and example weeks.
 * Looks up an existing 8A/school-year class via its first student code to stay idempotent.
 */
export async function seedDemoClass(exec: SqlExecutor): Promise<SeedResult> {
  // Detect an existing demo class by probing for the first demo student's code across classes.
  const existing = await exec.select<{ id: number; class_id: number }>(
    `SELECT s.id, s.class_id
       FROM students s
       JOIN classes c ON c.id = s.class_id
      WHERE c.name = ? AND c.school_year = ? AND s.student_code = ?
      LIMIT 1`,
    [DEMO_CLASS.name, DEMO_CLASS.school_year, DEMO_STUDENTS[0].student_code],
  );
  if (existing.length > 0) {
    const classId = existing[0].class_id;
    const students = await exec.select<{ id: number }>(
      `SELECT id FROM students WHERE class_id = ? ORDER BY student_code ASC`,
      [classId],
    );
    const weeks = await exec.select<{ id: number }>(
      `SELECT id FROM weeks WHERE class_id = ? ORDER BY week_no ASC`,
      [classId],
    );
    return {
      classId,
      studentIds: students.map((r) => r.id),
      weekIds: weeks.map((r) => r.id),
      created: false,
    };
  }

  const classId = await createClass(exec, DEMO_CLASS);

  const studentIds: number[] = [];
  for (const s of DEMO_STUDENTS) {
    // getStudentByCode guards against partial re-seeds within the same class.
    const found = await getStudentByCode(exec, classId, s.student_code);
    studentIds.push(
      found
        ? found.id
        : await createStudent(exec, {
            class_id: classId,
            student_code: s.student_code,
            full_name: s.full_name,
            gender: s.gender,
          }),
    );
  }

  const weekIds: number[] = [];
  for (const w of DEMO_WEEKS) {
    weekIds.push(
      await createWeek(exec, {
        class_id: classId,
        week_no: w.week_no,
        start_date: w.start_date,
        end_date: w.end_date,
        label: w.label,
      }),
    );
  }

  return { classId, studentIds, weekIds, created: true };
}
