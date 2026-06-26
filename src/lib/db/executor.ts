// A minimal async SQL interface shared by the production runtime and the tests.
//
// At runtime this is backed by @tauri-apps/plugin-sql (see tauri.ts). In unit tests it
// is backed by an in-process better-sqlite3 adapter (see src/test/sqliteExecutor.ts).
// The DAL (repositories.ts) depends ONLY on this interface, so the exact same query code
// is exercised by tests and ships to the app.
//
// The shape intentionally matches @tauri-apps/plugin-sql's Database:
//   - execute(sql, params) -> { rowsAffected, lastInsertId }
//   - select(sql, params)  -> T[]
// Parameters use positional `?N` placeholders (SQLite native), which both backends accept.

export interface ExecuteResult {
  rowsAffected: number;
  /** Present for INSERT statements; undefined otherwise. */
  lastInsertId?: number;
}

export interface SqlExecutor {
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  select<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}
