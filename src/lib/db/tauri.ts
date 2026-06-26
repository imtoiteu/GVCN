// Runtime SqlExecutor backed by @tauri-apps/plugin-sql.
//
// This file is only imported inside the running Tauri webview. Migrations are applied on the
// Rust side via tauri_plugin_sql's add_migrations() (see src-tauri/src/lib.rs), so by the
// time Database.load() resolves, the schema + tag catalog already exist. We just wrap the
// Database in our SqlExecutor interface and enable foreign-key enforcement for this session.
//
// NOTE: not unit-tested on the headless VPS (no WebKit/Tauri runtime). The DAL it feeds IS
// fully tested through the better-sqlite3 adapter, which implements the same interface.

import Database from '@tauri-apps/plugin-sql';
import type { ExecuteResult, SqlExecutor } from './executor';
import { DB_NAME } from './schema';

class TauriSqlExecutor implements SqlExecutor {
  constructor(private readonly db: Database) {}

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const res = await this.db.execute(sql, params);
    return { rowsAffected: res.rowsAffected, lastInsertId: res.lastInsertId };
  }

  select<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.select<T[]>(sql, params);
  }
}

let cached: Promise<SqlExecutor> | null = null;

/**
 * Open (once) the local SQLite database and return a SqlExecutor over it.
 * SQLite does not enforce foreign keys unless asked per-connection, so we opt in here.
 */
export function getDb(): Promise<SqlExecutor> {
  if (!cached) {
    cached = (async () => {
      const db = await Database.load(DB_NAME);
      await db.execute('PRAGMA foreign_keys = ON;');
      return new TauriSqlExecutor(db);
    })();
  }
  return cached;
}
