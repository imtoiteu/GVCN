// Thin, typed data-access layer for GVCN AutoReport.
//
// Every function takes a SqlExecutor so the same code runs against the Tauri SQL plugin
// (runtime) and better-sqlite3 (tests). Scope for M1 is the data foundation: create + read
// operations. Heavier query/aggregation logic arrives with the feature milestones (M3+).
//
// Placeholders use SQLite-native positional `?` so both backends bind a plain array.

import type { SqlExecutor } from './executor';
import type {
  ClassRow,
  GeneratedCommentRow,
  HomeroomReportRow,
  NewClass,
  NewStudent,
  NewWeek,
  NewWeeklyRecord,
  ObservationTagRow,
  ParentMessageRow,
  RecordTagRow,
  ReportPeriodKind,
  StudentRow,
  TagCategory,
  WeeklyRecordRow,
  WeekRow,
} from './types';

const bool = (v: boolean | undefined, fallback: 0 | 1): 0 | 1 =>
  v === undefined ? fallback : v ? 1 : 0;

async function insert(exec: SqlExecutor, sql: string, params: unknown[]): Promise<number> {
  const res = await exec.execute(sql, params);
  if (res.lastInsertId === undefined) {
    throw new Error('Insert did not return a lastInsertId');
  }
  return res.lastInsertId;
}

async function one<T>(exec: SqlExecutor, sql: string, params: unknown[]): Promise<T | null> {
  const rows = await exec.select<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// ---- classes --------------------------------------------------------------

export function createClass(exec: SqlExecutor, c: NewClass): Promise<number> {
  return insert(
    exec,
    `INSERT INTO classes (name, school_year, homeroom_teacher) VALUES (?, ?, ?)`,
    [c.name, c.school_year, c.homeroom_teacher ?? null],
  );
}

export function getClass(exec: SqlExecutor, id: number): Promise<ClassRow | null> {
  return one<ClassRow>(exec, `SELECT * FROM classes WHERE id = ?`, [id]);
}

export function listClasses(exec: SqlExecutor): Promise<ClassRow[]> {
  return exec.select<ClassRow>(`SELECT * FROM classes ORDER BY school_year DESC, name ASC`);
}

// ---- students -------------------------------------------------------------

export function createStudent(exec: SqlExecutor, s: NewStudent): Promise<number> {
  return insert(
    exec,
    `INSERT INTO students (class_id, student_code, full_name, gender, dob, note, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      s.class_id,
      s.student_code,
      s.full_name,
      s.gender ?? null,
      s.dob ?? null,
      s.note ?? null,
      bool(s.is_active, 1),
    ],
  );
}

export function listStudentsByClass(exec: SqlExecutor, classId: number): Promise<StudentRow[]> {
  return exec.select<StudentRow>(
    `SELECT * FROM students WHERE class_id = ? ORDER BY student_code ASC`,
    [classId],
  );
}

export function getStudentByCode(
  exec: SqlExecutor,
  classId: number,
  code: string,
): Promise<StudentRow | null> {
  return one<StudentRow>(
    exec,
    `SELECT * FROM students WHERE class_id = ? AND student_code = ?`,
    [classId, code],
  );
}

// ---- weeks ----------------------------------------------------------------

export function createWeek(exec: SqlExecutor, w: NewWeek): Promise<number> {
  return insert(
    exec,
    `INSERT INTO weeks (class_id, week_no, start_date, end_date, label) VALUES (?, ?, ?, ?, ?)`,
    [w.class_id, w.week_no, w.start_date ?? null, w.end_date ?? null, w.label ?? null],
  );
}

export function listWeeksByClass(exec: SqlExecutor, classId: number): Promise<WeekRow[]> {
  return exec.select<WeekRow>(
    `SELECT * FROM weeks WHERE class_id = ? ORDER BY week_no ASC`,
    [classId],
  );
}

// ---- observation tags (controlled catalog) --------------------------------

export function listTags(exec: SqlExecutor): Promise<ObservationTagRow[]> {
  return exec.select<ObservationTagRow>(`SELECT * FROM observation_tags ORDER BY sort_order ASC`);
}

export function listTagsByCategory(
  exec: SqlExecutor,
  category: TagCategory,
): Promise<ObservationTagRow[]> {
  return exec.select<ObservationTagRow>(
    `SELECT * FROM observation_tags WHERE category = ? ORDER BY sort_order ASC`,
    [category],
  );
}

export function getTagByCode(exec: SqlExecutor, code: string): Promise<ObservationTagRow | null> {
  return one<ObservationTagRow>(exec, `SELECT * FROM observation_tags WHERE code = ?`, [code]);
}

// ---- weekly records + tags ------------------------------------------------

/**
 * Insert a weekly record, or update teacher_notes if one already exists for the
 * (student, week) pair. Returns the record id either way. Avoids RETURNING for
 * cross-backend compatibility.
 */
export async function upsertWeeklyRecord(
  exec: SqlExecutor,
  r: NewWeeklyRecord,
): Promise<number> {
  await exec.execute(
    `INSERT INTO weekly_records (student_id, week_id, teacher_notes)
     VALUES (?, ?, ?)
     ON CONFLICT (student_id, week_id)
     DO UPDATE SET teacher_notes = excluded.teacher_notes, updated_at = datetime('now')`,
    [r.student_id, r.week_id, r.teacher_notes ?? null],
  );
  const row = await one<{ id: number }>(
    exec,
    `SELECT id FROM weekly_records WHERE student_id = ? AND week_id = ?`,
    [r.student_id, r.week_id],
  );
  if (!row) throw new Error('upsertWeeklyRecord: record not found after upsert');
  return row.id;
}

export function getWeeklyRecord(
  exec: SqlExecutor,
  studentId: number,
  weekId: number,
): Promise<WeeklyRecordRow | null> {
  return one<WeeklyRecordRow>(
    exec,
    `SELECT * FROM weekly_records WHERE student_id = ? AND week_id = ?`,
    [studentId, weekId],
  );
}

/** Replace the full set of tags attached to a record (delete-then-insert). */
export async function setRecordTags(
  exec: SqlExecutor,
  recordId: number,
  tagIds: number[],
): Promise<void> {
  await exec.execute(`DELETE FROM record_tags WHERE record_id = ?`, [recordId]);
  for (const tagId of tagIds) {
    await exec.execute(
      `INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?, ?)`,
      [recordId, tagId],
    );
  }
}

export function listTagsForRecord(
  exec: SqlExecutor,
  recordId: number,
): Promise<ObservationTagRow[]> {
  return exec.select<ObservationTagRow>(
    `SELECT t.* FROM observation_tags t
       JOIN record_tags rt ON rt.tag_id = t.id
      WHERE rt.record_id = ?
      ORDER BY t.sort_order ASC`,
    [recordId],
  );
}

/**
 * All weekly records for a given week (one row per student that has a saved record).
 * Batch read for the Weekly Record screen — avoids an N+1 per-student lookup.
 */
export function listWeeklyRecordsByWeek(
  exec: SqlExecutor,
  weekId: number,
): Promise<WeeklyRecordRow[]> {
  return exec.select<WeeklyRecordRow>(
    `SELECT * FROM weekly_records WHERE week_id = ? ORDER BY student_id ASC`,
    [weekId],
  );
}

/**
 * Every (record_id, tag_id) pair for all records in a week, in one query, so the UI can
 * rebuild each student's selected-tag set without a query per record.
 */
export function listRecordTagIdsByWeek(
  exec: SqlExecutor,
  weekId: number,
): Promise<RecordTagRow[]> {
  return exec.select<RecordTagRow>(
    `SELECT rt.record_id, rt.tag_id
       FROM record_tags rt
       JOIN weekly_records wr ON wr.id = rt.record_id
      WHERE wr.week_id = ?`,
    [weekId],
  );
}

/**
 * Save a student's weekly observation in one call: upsert the (student, week) record's
 * teacher_notes and replace its full tag set. Returns the record id. Composes the existing
 * upsertWeeklyRecord + setRecordTags primitives so save and reload stay symmetric.
 */
export async function saveWeeklyRecord(
  exec: SqlExecutor,
  input: {
    student_id: number;
    week_id: number;
    teacher_notes?: string | null;
    tagIds: number[];
  },
): Promise<number> {
  const recordId = await upsertWeeklyRecord(exec, {
    student_id: input.student_id,
    week_id: input.week_id,
    teacher_notes: input.teacher_notes ?? null,
  });
  await setRecordTags(exec, recordId, input.tagIds);
  return recordId;
}

// ---- generated artifacts --------------------------------------------------

export function createComment(
  exec: SqlExecutor,
  c: { student_id: number; week_id?: number | null; body_text: string; edited_by_user?: boolean },
): Promise<number> {
  return insert(
    exec,
    `INSERT INTO generated_comments (student_id, week_id, body_text, edited_by_user)
     VALUES (?, ?, ?, ?)`,
    [c.student_id, c.week_id ?? null, c.body_text, bool(c.edited_by_user, 0)],
  );
}

export function listCommentsByStudent(
  exec: SqlExecutor,
  studentId: number,
): Promise<GeneratedCommentRow[]> {
  return exec.select<GeneratedCommentRow>(
    `SELECT * FROM generated_comments WHERE student_id = ? ORDER BY created_at DESC, id DESC`,
    [studentId],
  );
}

export function createParentMessage(
  exec: SqlExecutor,
  m: { student_id: number; week_id?: number | null; body_text: string; edited_by_user?: boolean },
): Promise<number> {
  return insert(
    exec,
    `INSERT INTO parent_messages (student_id, week_id, body_text, edited_by_user)
     VALUES (?, ?, ?, ?)`,
    [m.student_id, m.week_id ?? null, m.body_text, bool(m.edited_by_user, 0)],
  );
}

export function listParentMessagesByStudent(
  exec: SqlExecutor,
  studentId: number,
): Promise<ParentMessageRow[]> {
  return exec.select<ParentMessageRow>(
    `SELECT * FROM parent_messages WHERE student_id = ? ORDER BY created_at DESC, id DESC`,
    [studentId],
  );
}

export function createReport(
  exec: SqlExecutor,
  r: {
    class_id: number;
    period_kind: ReportPeriodKind;
    week_id?: number | null;
    period_label?: string | null;
    body_text: string;
    edited_by_user?: boolean;
  },
): Promise<number> {
  return insert(
    exec,
    `INSERT INTO homeroom_reports (class_id, period_kind, week_id, period_label, body_text, edited_by_user)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      r.class_id,
      r.period_kind,
      r.week_id ?? null,
      r.period_label ?? null,
      r.body_text,
      bool(r.edited_by_user, 0),
    ],
  );
}

export function listReportsByClass(
  exec: SqlExecutor,
  classId: number,
): Promise<HomeroomReportRow[]> {
  return exec.select<HomeroomReportRow>(
    `SELECT * FROM homeroom_reports WHERE class_id = ? ORDER BY created_at DESC, id DESC`,
    [classId],
  );
}
