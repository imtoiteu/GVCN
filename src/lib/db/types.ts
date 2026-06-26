// Typed row shapes for the GVCN AutoReport local SQLite data layer.
// These mirror src-tauri/migrations/001_init.sql one-to-one. SQLite has no boolean
// type, so 0/1 integer columns are modelled as `0 | 1` and helpers convert at the edge.

export type SqlBool = 0 | 1;

export type TagCategory =
  | 'attendance'
  | 'study'
  | 'discipline'
  | 'good_deed'
  | 'support';

export type TagSentiment = 'positive' | 'neutral' | 'concern';

export type ReportPeriodKind = 'week' | 'month';

export const TAG_CATEGORIES: readonly TagCategory[] = [
  'attendance',
  'study',
  'discipline',
  'good_deed',
  'support',
];

export const TAG_SENTIMENTS: readonly TagSentiment[] = [
  'positive',
  'neutral',
  'concern',
];

export interface ClassRow {
  id: number;
  name: string;
  school_year: string;
  homeroom_teacher: string | null;
  created_at: string;
}

export interface StudentRow {
  id: number;
  class_id: number;
  student_code: string;
  full_name: string;
  gender: string | null;
  dob: string | null;
  note: string | null;
  is_active: SqlBool;
  created_at: string;
}

export interface WeekRow {
  id: number;
  class_id: number;
  week_no: number;
  start_date: string | null;
  end_date: string | null;
  label: string | null;
}

export interface ObservationTagRow {
  id: number;
  category: TagCategory;
  code: string;
  label_vi: string;
  sentiment: TagSentiment;
  sort_order: number;
}

export interface WeeklyRecordRow {
  id: number;
  student_id: number;
  week_id: number;
  teacher_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordTagRow {
  record_id: number;
  tag_id: number;
}

export interface GeneratedCommentRow {
  id: number;
  student_id: number;
  week_id: number | null;
  body_text: string;
  edited_by_user: SqlBool;
  created_at: string;
}

export interface ParentMessageRow {
  id: number;
  student_id: number;
  week_id: number | null;
  body_text: string;
  edited_by_user: SqlBool;
  created_at: string;
}

export interface HomeroomReportRow {
  id: number;
  class_id: number;
  period_kind: ReportPeriodKind;
  week_id: number | null;
  period_label: string | null;
  body_text: string;
  edited_by_user: SqlBool;
  created_at: string;
}

// ---- Insert payloads (id/created_at are DB-assigned) ----------------------

export type NewClass = {
  name: string;
  school_year: string;
  homeroom_teacher?: string | null;
};

export type NewStudent = {
  class_id: number;
  student_code: string;
  full_name: string;
  gender?: string | null;
  dob?: string | null;
  note?: string | null;
  is_active?: boolean;
};

export type NewWeek = {
  class_id: number;
  week_no: number;
  start_date?: string | null;
  end_date?: string | null;
  label?: string | null;
};

export type NewWeeklyRecord = {
  student_id: number;
  week_id: number;
  teacher_notes?: string | null;
};
