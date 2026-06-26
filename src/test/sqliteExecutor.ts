// Test-only SqlExecutor backed by better-sqlite3 (synchronous, in-memory).
//
// It applies the EXACT migration .sql files shipped to the Tauri app, so the schema the
// tests exercise is the schema that ships. Used only by Vitest; never imported by app code.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExecuteResult, SqlExecutor } from '../lib/db/executor';
import { MIGRATION_FILES } from '../lib/db/schema';

const here = dirname(fileURLToPath(import.meta.url)); // src/test
const MIGRATIONS_DIR = resolve(here, '../../src-tauri/migrations');

export class BetterSqliteExecutor implements SqlExecutor {
  readonly db: Database.Database;

  constructor() {
    this.db = new Database(':memory:');
    this.db.pragma('foreign_keys = ON');
  }

  /** Apply every shipped migration file in order. */
  applyMigrations(): void {
    for (const file of MIGRATION_FILES) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
      this.db.exec(sql);
    }
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const info = this.db.prepare(sql).run(...(params as never[]));
    return {
      rowsAffected: info.changes,
      lastInsertId: Number(info.lastInsertRowid),
    };
  }

  async select<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }

  close(): void {
    this.db.close();
  }
}

/** Convenience: a fresh in-memory DB with all migrations applied. */
export function freshDb(): BetterSqliteExecutor {
  const exec = new BetterSqliteExecutor();
  exec.applyMigrations();
  return exec;
}
