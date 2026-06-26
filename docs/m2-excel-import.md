# M2 — Excel Student Import

> Session scope: build **only** the M2 Excel-import slice (parse → validate → map → dedupe →
> commit) as a tested, cross-platform engine. No M3+ features. See [`../SPEC.md`](../SPEC.md)
> §4 (Students screen), [`../tasks/plan.md`](../tasks/plan.md) §M2, and `tasks/todo.md` M2.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was built

A runtime-source-agnostic import engine under **`src/lib/import/`**:

| File | Role |
|------|------|
| `types.ts` | `ParsedStudent`, `ImportRowError`, `StudentImportResult`, `CommitResult`. |
| `studentImport.ts` | I/O boundary (`readStudentSheet` — the only exceljs call) + **pure** core (`parseStudentRows`) + `commitStudentImport` (reuses the M1 DAL). |
| `index.ts` | Barrel (environment-agnostic). |
| `__tests__/studentImport.test.ts` | 6 TDD tests over real `.xlsx` round-trips. |

The engine consumes **raw bytes** (`ArrayBuffer`/`Uint8Array`), so the same code is driven by
Vitest fixtures now and, later, by a Tauri file dialog feeding the bytes of a teacher-selected
`.xlsx`. The validation/mapping/dedupe logic is a pure function — no file or DB needed to test it.

### Import contract

- **Columns** are matched against a fixed allowlist (`student_code`, `full_name`, `gender`,
  `dob`, `note`) via a header-alias map. Accepts Vietnamese (with/without diacritics) and
  English headers (e.g. `Mã học sinh` / `Họ và tên` / `Giới tính`, or `code` / `name`).
  Unrecognized columns are ignored.
- **Required:** `student_code`, `full_name`. A missing required *column header* is a
  file-level error (`row: 0`, `code: missing_column`) and nothing is parsed.
- **Per row:** blank rows are skipped (not counted); a missing required *value* yields a
  `missing_value` row error; valid rows are mapped. `gender` is normalized to `M`/`F`
  (`Nam`/`Nữ`/`M`/`F`/…) or `null` if unknown (gender is optional — not an error).
- **Dedupe by `student_code`** within the file, case/space-insensitive, first occurrence wins
  (`duplicate_in_file` error on later rows).
- **Commit** (`commitStudentImport`) inserts valid rows into a class via the M1 DAL, **skipping**
  any `student_code` already present in that class (dedupe vs. the existing/demo roster).

## Dependency decision (SPEC Risk #6 — "pin a known-good edition")

**Chosen: `exceljs@^4.4.0` (MIT, npm).** Replaces the originally-planned SheetJS (`xlsx`).

| Option | Advisories | Source | Decision |
|--------|-----------|--------|----------|
| `xlsx` (SheetJS) `0.18.5` | **2 high, no npm fix** — Prototype Pollution (CVE-2023-30533) + ReDoS (CVE-2024-22363), both in the parse path | npm frozen at 0.18.5; fixes only on SheetJS CDN | **Rejected** |
| SheetJS CDN `0.20.x` | patched | CDN tarball | **Rejected** — user directive: no CDN-installed packages |
| **`exceljs` `4.4.0`** | clean after override (below) | npm, MIT, actively maintained | **Chosen** |

Per the user's directive for this local-first student-data app: *prefer the safer, more
maintainable dependency; only basic XLSX import is needed for M2; revisit export later; do not
use CDN-installed packages.* exceljs is the lowest security/supply-chain-risk option on npm and
keeps a single library available for the future XLSX **export** (M7) too.

### Transitive `uuid` advisory → fixed via override

exceljs pulls `uuid@^8.3.0`, which carried a **moderate** advisory (GHSA-w5hq-g745-h8pq:
missing buffer bounds check in `v3/v5/v6` *when a `buf` arg is provided*). exceljs only calls
`uuid.v4()` (no `buf`), so it was **not on our code path** — but to keep `npm audit` clean for
the M9 security gate we pin:

```json
"overrides": { "uuid": "^11.1.1" }
```

Verified: `npm audit` → **0 vulnerabilities**; exceljs `require('uuid').v4` still resolves and a
read/write round-trip (incl. Vietnamese diacritics) works.

### Import-safety notes (CLAUDE.md)

- **No prototype-pollution surface from headers:** row objects are built only from the
  canonical allowlist, so a hostile header (e.g. `__proto__`) can never become a row key.
- **Local-first / offline:** parsing is fully in-process; no network. Demo/test data is fake.

## Dependencies added

| Package | Where | Why |
|---------|-------|-----|
| `exceljs` `^4.4.0` | dependency | Parse `.xlsx` (and future XLSX export). MIT, npm, no CDN. |
| `zod` `^3` | dependency | Per-row validation (the plan's chosen validator; reused later by RHF+Zod forms). |
| override `uuid` `^11.1.1` | `overrides` | Clears the transitive moderate advisory; keeps `npm audit` at 0. |

`xlsx` (SheetJS) was installed then **removed** in favor of exceljs.

## Commands run & results

| Command | Result |
|---------|--------|
| `npm run test` (`vitest run`) | ✅ **21 passed** (db 15 + import 6). |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; 32 modules; bundle **194 kB** (unchanged — exceljs is not pulled into the frontend yet). |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed this milestone). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: M2 touches no Tauri/Rust code, so the M1-verified
Linux bundle is unaffected.

## Deferred (documented, not silently skipped)

- **Tauri file dialog + the Students "Import from Excel" preview screen** (SPEC screen #4,
  states `import-preview` / `row-error`). These need the **M0 app shell** (still pending) and a
  GUI to verify; this headless VPS can't exercise them. The engine already returns exactly what
  the preview needs (`valid`, `errors[]`, `totalRows`) and accepts raw file bytes, so the screen
  is a thin future consumer — no engine rework expected.
- **dob format validation** is lenient for MVP (kept as a trimmed string). Tighten if teachers
  need normalized dates.

## Verification of Checkpoint B

todo.md Checkpoint B: *"roster buildable via demo + import; tests green."* Covered by the
`commitStudentImport` test: `seedDemoClass` (12 demo students) + import of 3 rows (one existing,
two new) → 2 inserted, 1 skipped, roster = 14. The **UI** half of Checkpoint B (clicking through
a screen) remains deferred with the import screen above.

## Next recommended milestone

**M3 — Weekly records + tag catalog** (the next item on the sequential foundation path
M0→M1→M3). The tag catalog and `weekly_records`/`record_tags` schema already exist (M1), so M3
is mostly the week-management + per-student tag-entry logic. Note the still-pending **M0 app
shell** is the shared prerequisite for surfacing M1/M2/M3 in the UI; the import screen + file
dialog should be wired when that shell lands.
