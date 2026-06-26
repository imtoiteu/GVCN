import { describe, it, expect } from 'vitest';
import { freshDb, BetterSqliteExecutor } from '../../../test/sqliteExecutor';
import { EXPECTED_TABLES } from '../schema';
import { TAG_CATEGORIES } from '../types';

describe('schema migrations', () => {
  it('creates every expected table', async () => {
    const db = freshDb();
    const rows = await db.select<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
    );
    const names = rows.map((r) => r.name);
    for (const table of EXPECTED_TABLES) {
      expect(names).toContain(table);
    }
    db.close();
  });

  it('students enforces UNIQUE(class_id, student_code)', async () => {
    const db = freshDb();
    await db.execute(
      `INSERT INTO classes (name, school_year) VALUES ('8A', '2025-2026')`,
    );
    await db.execute(
      `INSERT INTO students (class_id, student_code, full_name) VALUES (1, '8A-01', 'A')`,
    );
    await expect(
      db.execute(
        `INSERT INTO students (class_id, student_code, full_name) VALUES (1, '8A-01', 'B')`,
      ),
    ).rejects.toThrow();
    db.close();
  });

  it('enforces foreign keys (no orphan student)', async () => {
    const db = freshDb();
    await expect(
      db.execute(
        `INSERT INTO students (class_id, student_code, full_name) VALUES (999, '8A-01', 'A')`,
      ),
    ).rejects.toThrow();
    db.close();
  });

  it('rejects an invalid tag category via CHECK constraint', async () => {
    const db = freshDb();
    await expect(
      db.execute(
        `INSERT INTO observation_tags (category, code, label_vi, sentiment)
         VALUES ('not_a_category', 'x.y', 'X', 'positive')`,
      ),
    ).rejects.toThrow();
    db.close();
  });

  it('ON DELETE CASCADE removes students when their class is deleted', async () => {
    const db: BetterSqliteExecutor = freshDb();
    await db.execute(`INSERT INTO classes (name, school_year) VALUES ('8A', '2025-2026')`);
    await db.execute(
      `INSERT INTO students (class_id, student_code, full_name) VALUES (1, '8A-01', 'A')`,
    );
    await db.execute(`DELETE FROM classes WHERE id = 1`);
    const left = await db.select(`SELECT * FROM students`);
    expect(left).toHaveLength(0);
    db.close();
  });

  it('seeds the controlled tag catalog covering all categories', async () => {
    const db = freshDb();
    const tags = await db.select<{ category: string }>(`SELECT category FROM observation_tags`);
    expect(tags.length).toBeGreaterThanOrEqual(20);
    const categories = new Set(tags.map((t) => t.category));
    for (const cat of TAG_CATEGORIES) {
      expect(categories.has(cat)).toBe(true);
    }
    db.close();
  });

  it('tag seed is idempotent (re-applying 002 adds no duplicates)', async () => {
    const db = new BetterSqliteExecutor();
    db.applyMigrations();
    db.applyMigrations(); // re-run all migrations
    const [{ n }] = await db.select<{ n: number }>(
      `SELECT COUNT(*) AS n FROM observation_tags`,
    );
    const [{ d }] = await db.select<{ d: number }>(
      `SELECT COUNT(DISTINCT code) AS d FROM observation_tags`,
    );
    expect(n).toBe(d);
    db.close();
  });
});
