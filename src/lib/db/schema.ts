// Schema / migration metadata shared across the data layer.
//
// The migration SQL itself lives in src-tauri/migrations/*.sql and is the single source of
// truth: the Tauri SQL plugin applies it at runtime (see src-tauri/src/lib.rs), and the
// tests apply the very same files against better-sqlite3 (see src/test/sqliteExecutor.ts).
// Keep this list in sync with both the migrations directory and the add_migrations() call
// in lib.rs.

/** SQLite connection string used with @tauri-apps/plugin-sql (file in the app data dir). */
export const DB_NAME = 'sqlite:gvcn.db';

/** Ordered migration files, relative to src-tauri/migrations/. */
export const MIGRATION_FILES = ['001_init.sql', '002_seed_tags.sql'] as const;

/** Tables created by 001_init.sql — used by the schema-creation test. */
export const EXPECTED_TABLES = [
  'classes',
  'students',
  'weeks',
  'observation_tags',
  'weekly_records',
  'record_tags',
  'generated_comments',
  'parent_messages',
  'homeroom_reports',
] as const;
