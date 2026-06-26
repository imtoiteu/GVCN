# M1 — Local Data Layer + Core Schema

> Session scope: build **only** the local SQLite data foundation. No UI screens, no
> Excel/DOCX/PDF, no comment generation. See [`../SPEC.md`](../SPEC.md) §5 and
> [`../tasks/plan.md`](../tasks/plan.md).
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## Naming note (read first)

This session was scoped as **"M1: Local Data Layer."** In `plan.md`/`todo.md` the SQLite +
DAL work actually lives under **M0** (plan.md's own "M1" is the Classes/Students *UI*, still
deferred). So the completed items here are checked off under **M0** in `todo.md`. No
renumbering was done — the divergence is flagged instead.

## Dependencies added

| Package | Where | Why |
|---------|-------|-----|
| `@tauri-apps/plugin-sql` `^2` | dependency | Runtime SQLite access from the webview (sqlx-backed). |
| `tauri-plugin-sql` `2` (feature `sqlite`) | `src-tauri/Cargo.toml` | Rust side of the same plugin; runs migrations on startup. |
| `better-sqlite3` `^11` | devDependency | In-process SQLite engine for tests (Node 20 has no `node:sqlite`). |
| `@types/better-sqlite3`, `@types/node` | devDependency | Types for the test adapter (uses `node:fs`/`node:url`). |
| `vitest` `^3` | devDependency | Test runner for schema/seed/DAL verification. |

**Deliberately NOT added** (deferred to their milestones, per "add only what the data layer
needs"): Tailwind/shadcn/ui, TanStack Table, RHF, Zod, RTL, ESLint (UI milestones); SheetJS
(M2); docxtemplater (M7).

Scripts added: `test` (`vitest run`), `test:watch` (`vitest`). `lint`/ESLint still deferred.

## Schema decisions

Canonical SQL lives in **`src-tauri/migrations/`** and is the single source of truth:
- `001_init.sql` — all tables + indexes.
- `002_seed_tags.sql` — the controlled observation-tag catalog (idempotent `INSERT OR IGNORE`).

The Tauri SQL plugin applies these at runtime (`add_migrations("sqlite:gvcn.db", …)` in
`src-tauri/src/lib.rs`); the **tests apply the exact same files** via better-sqlite3, so the
tested schema is the shipped schema.

**Tables (9).** The 7 entities requested this session, plus 2 supporting tables required to
make them relational:

| Table | Role | Note vs SPEC §5 |
|-------|------|-----------------|
| `classes` | homeroom class | = SPEC `class` |
| `students` | roster; `student_code` unique per class (anonymization key) | = SPEC `student` |
| `weeks` | reporting period | **supporting** — needed by `weekly_records`; = SPEC `week` |
| `observation_tags` | controlled tag catalog | = SPEC `tag`, renamed per request |
| `weekly_records` | one row per (student, week) | = SPEC `weekly_record` |
| `record_tags` | M:N record↔tag join | **supporting** — = SPEC `record_tag` |
| `generated_comments` | reviewed student comment | split from SPEC `generated_doc` |
| `parent_messages` | parent-message draft | split from SPEC `generated_doc` |
| `homeroom_reports` | class report (`period_kind` week/month) | split from SPEC `generated_doc` |

**Decisions & divergences (documented, not silent):**
1. **`generated_doc` split into three typed tables** (`generated_comments`, `parent_messages`,
   `homeroom_reports`) per this session's explicit entity list. Trade-off: simpler typed
   queries per artifact vs. one polymorphic table. **Meeting minutes** (a 4th SPEC `kind`) was
   not in the requested list — deferred to **M6**, where it can reuse `homeroom_reports`
   (e.g. a `minutes` period/kind) or get its own table. Flagged for a SPEC §5 update.
2. **Added `weeks` + `record_tags`** (not in the 7-name list) because `weekly_records` and tag
   selection are meaningless without them. Kept minimal; matches SPEC §5.
3. **Monthly reports = grouped weeks** (no month entity), per SPEC Risk #4 — `homeroom_reports`
   carries `period_kind` + `period_label`.
4. **Booleans as `0/1` INTEGER**, timestamps as ISO text via `datetime('now')` — SQLite-native.
5. **Foreign keys + CHECK constraints on** (`category`, `sentiment`, `period_kind`). FK
   enforcement is per-connection in SQLite: tests enable `PRAGMA foreign_keys = ON`, and the
   runtime executor (`src/lib/db/tauri.ts`) runs the same pragma on load. See Risks.
6. **Tag catalog is a draft** (22 tags across all 5 categories) — SPEC Risk #3 says confirm
   labels with a real teacher before M3. Tags are data, so changes need no schema change.

**TypeScript layer** (`src/lib/db/`): `types.ts` (row + insert types), `executor.ts` (the
`SqlExecutor` interface both backends implement), `repositories.ts` (thin typed create/read
DAL), `seed.ts` (fake demo 8A), `schema.ts` (DB name + migration metadata), `tauri.ts`
(runtime backend, **runtime-only, not unit-tested**), `index.ts` (barrel, excludes `tauri.ts`).

## Commands run & results

| Command | Result |
|---------|--------|
| `npm install` | ✅ 78 packages added, **0 vulnerabilities** (~15s); `better-sqlite3` prebuilt binary, no native compile. |
| `npm run test` (`vitest run`) | ✅ **15 passed** across 3 files (schema 7, seed 3, DAL 5). |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Built in ~3s. |
| Independent SQL sanity check (Node + better-sqlite3) | ✅ 9 tables created; 22 tags seeded. |

What the tests assert: all 9 tables exist; `UNIQUE(class_id, student_code)`; FK rejects an
orphan student; CHECK rejects a bad tag category; `ON DELETE CASCADE`; tag catalog covers all
5 categories and is idempotent across re-runs; demo-8A seed shape (12 students, `8A-NN` codes,
no PII fields beyond code/name/gender) and idempotency; DAL create/read for classes, students,
weeks, tags, weekly-record upsert + tag attach/replace, comments/messages/reports.

## Checkpoint A — Rust/Tauri verification (Linux VPS, 2026-06-26)

A Rust toolchain is now available on this VPS, so the previously-deferred Rust/desktop half
was verified here. **The earlier "must confirm on a Mac" caveat is resolved on Linux.**

| Check | Result |
|-------|--------|
| Rust toolchain | ✅ `cargo 1.96.0`, `rustc 1.96.0`. |
| `npm run test` | ✅ **15 passed** (schema 7, seed 3, DAL 5). |
| `npm run typecheck` | ✅ Exit 0. |
| `npm run build` | ✅ Exit 0 (32 modules). |
| `cd src-tauri && cargo check` | ✅ Exit 0 (~9s). |
| SQL plugin in dependency tree | ✅ `tauri-plugin-sql v2.4.0` → `sqlx v0.8.6` with `sqlx-sqlite` feature. |
| Linux release bundle exists | ✅ `.deb` + `.rpm` present (see paths below), built 16:58 — **newer** than the latest source change (16:38), so not stale. |
| Migration SQL embedded in the packaged binary | ✅ binary (`usr/bin/gvcn-autoreport`, 16.9 MB ELF x86-64) contains `observation_tags`, `seed_observation_tag_catalog`, the VN tag label `Có tiến bộ trong học tập`, and `sqlite:gvcn.db` — proving the bundle reflects the current M1 wiring. |

**Linux bundle paths:**
- `src-tauri/target/release/bundle/deb/gvcn-autoreport_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/rpm/gvcn-autoreport-0.1.0-1.x86_64.rpm`
- extracted deb internals: `src-tauri/target/release/bundle/deb/gvcn-autoreport_0.1.0_amd64/`

**`npm run tauri build` was NOT re-run:** the existing artifacts post-date the latest source
change and the packaged binary verifiably embeds the current migrations, so a rebuild would
only reproduce identical output. Re-run it only after a future source change.

**Still not exercised here (low risk):** launching the GUI binary to watch `sqlite:gvcn.db`
get created and `observation_tags` populate at runtime needs a WebKitGTK display (this is a
headless VPS). The migrations are compiled into the binary and the schema/DAL are fully
covered in-process, so this is a runtime smoke-check, not a correctness gap — do it on any
machine with a display (`npm run tauri dev`).

## Build & release targets

- **Current build/test target:** this **Linux VPS** (`.deb` + `.rpm`, `x86_64`).
- **Future release targets (deferred):** Windows `.exe`/installer and macOS `.dmg`.
- **Requirement:** keep the implementation **cross-platform**. No Linux-only assumptions in
  app code. The data layer already honors this — SQLite via `@tauri-apps/plugin-sql` and the
  `SqlExecutor` abstraction are OS-agnostic, the DB path is resolved by Tauri per-platform
  (`sqlite:gvcn.db` in the app data dir), and migrations are embedded in the binary. Windows
  `.exe`/macOS `.dmg` bundling is a CI/packaging concern, not a code change.

## Remaining risks / notes

- **Runtime FK pragma:** sqlx (tauri-plugin-sql) does not enable foreign keys by default;
  `getDb()` issues `PRAGMA foreign_keys = ON` per connection. Compiles fine; confirm it holds
  on the live connection during the first GUI run (low risk, standard).
- **Placeholder style:** queries use SQLite-native positional `?` so both backends bind a
  plain array. Confirmed against better-sqlite3; verify once against the live plugin at runtime.
- **`generated_doc` divergence** (decision #1) should be reflected in SPEC §5 / §9.2 on the
  next spec pass, including where meeting minutes land.
- **Tag taxonomy is provisional** (Risk #3) — confirm before M3.
- **Demo seed is fake** and idempotent; never replace with real student data (CLAUDE.md).

## Next recommended milestone

Checkpoint A's Rust/Tauri verification is **green on Linux** (`cargo check` + release bundle),
so M2 (Excel import) can start — it is frontend/SheetJS work that does not depend on the
remaining UI-shell items. The rest of **M0 foundation** still remains in parallel: app shell +
sidebar routing for the 12 screens, then wire one screen to the DAL (Classes list + the
"Tải dữ liệu mẫu 8A" button calling `seedDemoClass`), plus `lint`/ESLint alongside the UI
dependencies. The only unrun item is a runtime GUI smoke-check of `sqlite:gvcn.db` creation,
which needs a display (`npm run tauri dev` on any desktop machine).
