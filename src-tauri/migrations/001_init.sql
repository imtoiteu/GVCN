-- GVCN AutoReport — initial schema (migration 001)
-- Local-first SQLite schema for one homeroom teacher (GVCN). Practical, not an ERP.
-- See SPEC.md §5 and docs/m1-data-layer.md for design notes.
--
-- All timestamps are ISO-8601 text via datetime('now'). Booleans are 0/1 integers.
-- Free text lives ONLY in students.note, weekly_records.teacher_notes, and the
-- generated *_text columns. No PII is ever required for the anonymized Claude Export
-- (student_code is the anonymization key).

-- ---------------------------------------------------------------------------
-- classes — one row per homeroom class (e.g. "8A")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,                 -- "8A"
  school_year       TEXT    NOT NULL,                 -- "2025-2026"
  homeroom_teacher  TEXT,                             -- display name of the GVCN
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (name, school_year)
);

-- ---------------------------------------------------------------------------
-- students — roster within a class. student_code is the anonymization key and
-- is unique *within* a class.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_code  TEXT    NOT NULL,                     -- "8A-01" — used in every export
  full_name     TEXT    NOT NULL,                     -- fake/demo data only in dev
  gender        TEXT,                                 -- optional, free-form/loose
  dob           TEXT,                                 -- optional ISO date
  note          TEXT,                                 -- optional free text
  is_active     INTEGER NOT NULL DEFAULT 1,           -- 0/1
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, student_code)
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);

-- ---------------------------------------------------------------------------
-- weeks — reporting period for a class. Monthly reports are derived by grouping
-- weeks (SPEC Risk #4), so no separate month entity.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weeks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  week_no     INTEGER NOT NULL,                       -- 1..N within the school year
  start_date  TEXT,                                   -- optional ISO date
  end_date    TEXT,                                   -- optional ISO date
  label       TEXT,                                   -- "Tuần 1 (02/09–08/09)"
  UNIQUE (class_id, week_no)
);
CREATE INDEX IF NOT EXISTS idx_weeks_class ON weeks(class_id);

-- ---------------------------------------------------------------------------
-- observation_tags — controlled vocabulary (SPEC.md calls this `tag`). Seeded in
-- migration 002. Generated text maps from these tags so wording stays consistent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observation_tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT    NOT NULL
              CHECK (category IN ('attendance','study','discipline','good_deed','support')),
  code        TEXT    NOT NULL UNIQUE,                -- stable machine code, e.g. "study.improved"
  label_vi    TEXT    NOT NULL,                       -- Vietnamese label shown in UI
  sentiment   TEXT    NOT NULL
              CHECK (sentiment IN ('positive','neutral','concern')),
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tags_category ON observation_tags(category);

-- ---------------------------------------------------------------------------
-- weekly_records — one record per (student, week). teacher_notes is free text.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id     INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_id        INTEGER NOT NULL REFERENCES weeks(id)    ON DELETE CASCADE,
  teacher_notes  TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, week_id)
);
CREATE INDEX IF NOT EXISTS idx_records_week ON weekly_records(week_id);

-- ---------------------------------------------------------------------------
-- record_tags — many-to-many join between a weekly_record and observation_tags.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS record_tags (
  record_id  INTEGER NOT NULL REFERENCES weekly_records(id)   ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES observation_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (record_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_record_tags_tag ON record_tags(tag_id);

-- ---------------------------------------------------------------------------
-- generated_comments — reviewed/edited student comment (nhận xét học sinh).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_id         INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  body_text       TEXT    NOT NULL,
  edited_by_user  INTEGER NOT NULL DEFAULT 0,         -- 0/1: teacher edited the draft
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_student ON generated_comments(student_id);

-- ---------------------------------------------------------------------------
-- parent_messages — cooperative, non-accusatory parent-message draft.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parent_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_id         INTEGER REFERENCES weeks(id) ON DELETE SET NULL,
  body_text       TEXT    NOT NULL,
  edited_by_user  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_parent_msgs_student ON parent_messages(student_id);

-- ---------------------------------------------------------------------------
-- homeroom_reports — class-level artifact. period_kind distinguishes weekly vs
-- monthly (monthly = grouped weeks). Meeting minutes are deferred to M6 and may
-- reuse this table or get their own; see docs/m1-data-layer.md.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS homeroom_reports (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id        INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  period_kind     TEXT    NOT NULL CHECK (period_kind IN ('week','month')),
  week_id         INTEGER REFERENCES weeks(id) ON DELETE SET NULL,  -- set for weekly reports
  period_label    TEXT,                              -- e.g. "Tháng 9" for monthly
  body_text       TEXT    NOT NULL,
  edited_by_user  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_class ON homeroom_reports(class_id);
