# TODO — GVCN AutoReport MVP

> Checklist for [`plan.md`](plan.md) / [`../SPEC.md`](../SPEC.md). `[ ]` = pending. Each task notes Acceptance / Verify.
> **Do not start implementation until the spec + plan are approved** (Define+Plan gate).

## M0 — Foundation
- [~] Add deps (Tailwind v4, shadcn/ui, TanStack Table, RHF, Zod, Vitest, RTL, ESLint, `@tauri-apps/plugin-sql`, SheetJS, docxtemplater)
  - **Partial (data-layer slice, M1 session):** added `@tauri-apps/plugin-sql`, `vitest`, `better-sqlite3` (+ `@types/*`), `@types/node`. Still deferred to UI/import/export milestones: Tailwind v4, shadcn/ui, TanStack Table, RHF, Zod, RTL, ESLint, SheetJS, docxtemplater. Verify: `npm install` clean (0 vuln). ✅
- [~] Add scripts `test` / `lint` / `typecheck`; configure ESLint + Vitest
  - **Partial:** `typecheck` (`tsc --noEmit`) + `test` (`vitest run`) added & passing; Vitest configured (`vitest.config.ts`, node env). `lint`/ESLint still deferred to a UI milestone. Verify: `npm run typecheck` → 0; `npm run test` → 15 passed. ✅
- [x] Fix `tauri.conf.json` `identifier` → `vn.gvcn.autoreport` (Risk #1); window → 1200×800 (Risk #2)
  - **Done.** Valid JSON confirmed; `npm run build` + `cargo check` + release bundle pass with this identifier. Window *sizing* still needs a GUI display to eyeball (`tauri dev`); config is correct. See `docs/m0-scaffold-check.md`.
- [ ] App shell: sidebar + routing for 12 screens (SPEC §4); class-switcher placeholder
  - Verify: each route renders a stub; nav works.
- [x] SQLite plugin + capabilities; migration runner; create schema (SPEC §5); seed tag catalog
  - **Done + Rust-verified on Linux (Checkpoint A).** `tauri-plugin-sql` (sqlite) registered in `src-tauri/src/lib.rs` with migrations `001_init.sql` + `002_seed_tags.sql`; `sql:*` perms in `capabilities/default.json`. Schema tested via better-sqlite3 (9 tables, FK/UNIQUE/CHECK/CASCADE); 22-tag catalog seeded + idempotent. `cargo check` → 0; `tauri-plugin-sql v2.4.0`/`sqlx-sqlite` in tree; release `.deb`/`.rpm` binary embeds the migrations. See `docs/m1-data-layer.md`.
- [x] Thin typed DAL skeleton in `src/lib/db`
  - **Done (M1 session).** Typed rows (`types.ts`), `SqlExecutor` interface (Tauri + better-sqlite3 backends), create/read repositories, demo-8A seed. Verify: `npm run test` → 15 passed (schema/seed/DAL). ✅
- [~] **Checkpoint A:** shell boots, DB inits, typecheck/lint/test clean.
  - **Rust/Tauri half DONE (Linux, 2026-06-26):** `cargo check` → 0, SQL plugin compiles, `npm run test`/`typecheck`/`build` → 0, release `.deb`/`.rpm` build verified. **Still pending:** app shell + sidebar routing, `lint`/ESLint, and a runtime GUI smoke-check of `sqlite:gvcn.db` creation (needs a display — `npm run tauri dev`). See `docs/m1-data-layer.md` "Checkpoint A".

## M1 — Classes & Students + demo 8A
- [ ] Class CRUD (create/edit/list)
  - Verify: class persists across restart.
- [ ] Student CRUD + roster table (TanStack Table, RHF+Zod)
  - Verify: add/edit student; table sorts/filters.
- [~] Load demo class 8A (fake students, no PII)
  - **Data layer done (M1 session):** `seedDemoClass()` + fake 8A roster (12 students, codes `8A-NN`) + 2 demo weeks in `src/lib/db/seed.ts`; idempotent; tested. **UI one-click trigger still pending** (needs app shell/Classes screen). Verify: `npm run test` seed tests pass. ✅
- [ ] Empty/loading states for classes + students
  - Verify: RTL component tests.

## M2 — Excel import
- [~] SheetJS import: dialog → parse → Zod-validate → preview w/ row errors → commit
  - **Engine DONE, screen deferred.** `src/lib/import/`: `readStudentSheet` (exceljs) → `parseStudentRows` (pure Zod-validate/map/dedupe → `valid`/`errors[]`/`totalRows`) → `commitStudentImport` (reuses M1 DAL, skips existing). Accepts raw file bytes so it's runtime-source-agnostic. **Deferred:** the Tauri file-dialog + Students import-preview screen (needs the M0 app shell + a GUI). See `docs/m2-excel-import.md`.
- [x] **TDD** parser/mapper tests (missing cols, blank/bad rows, diacritics, dedupe by `student_code`)
  - **Done.** 6 tests over real `.xlsx` round-trips (VN + English headers, diacritics intact, gender map, missing column/value, in-file dedupe, demo+import commit). Verify: `npm run test` → 21 passed. ✅
- [x] Record SheetJS edition/version (Risk #6)
  - **Done — and changed the choice.** npm `xlsx@0.18.5` had 2 *high* unpatched advisories (prototype pollution + ReDoS); fixes only on SheetJS CDN. Per user directive (safer/maintainable, no CDN) switched to **`exceljs@^4.4.0`** (MIT, npm) + `zod@^3`; pinned `uuid ^11.1.1` via `overrides` → `npm audit` 0. Recorded in `docs/m2-excel-import.md`.
- [~] **Checkpoint B:** roster buildable via demo + import; tests green.
  - **Logic DONE:** `seedDemoClass` + import commit → roster built (12 demo + 2 imported, 1 skipped); tests green. **UI half deferred** with the import screen above.

## M3 — Weekly records + tag catalog
- [ ] Confirm tag taxonomy with teacher (Risk #3)
  - Verify: categories/labels signed off.
- [ ] Week management (create/select week per class)
  - Verify: week persists.
- [ ] Weekly Record screen: per-student tags + `teacher_notes` → `weekly_record`/`record_tag`
  - Verify: record ≥3 students; reopen after restart shows data.
- [ ] **Checkpoint C:** class→students→week→records loop works end-to-end (review point).

## M4 — Comment generation (TDD)
- [ ] **TDD** `lib/generate/comment.ts`: tags+notes → Vietnamese comment (sentiment balance, empty fallback)
  - Verify: unit tests green.
- [ ] **No-banned-phrase guard** test (no punitive/stigmatizing words)
  - Verify: guard test green.
- [ ] Comments screen: generate → edit → save to `generated_doc`
  - Verify: editable comment saved + reloads.

## M5 — Parent-message generation (TDD)
- [ ] **TDD** `lib/generate/parentMessage.ts`: cooperative, non-accusatory draft (tone tests + banned-phrase guard)
  - Verify: unit tests green.
- [ ] Parent Messages screen: generate → edit → save
  - Verify: draft saved + reloads.

## M6 — Meeting minutes + weekly/monthly reports (TDD)
- [ ] **TDD** aggregation: minutes (week/class)
  - Verify: counts/highlights/support list correct.
- [ ] **TDD** weekly/monthly report (monthly = grouped weeks, Risk #4; empty-period fallback)
  - Verify: unit tests green.
- [ ] Minutes + Reports screens preview from recorded data
  - Verify: previews render from real records.
- [ ] **Checkpoint D:** all 4 generators produce editable text; safety guards enforced.

## M7 — Exports: DOCX / PDF / XLSX
- [ ] Define generator→export **view-model contract** (before/at start of M7)
  - Verify: typed contract documented.
- [ ] DOCX via docxtemplater + generic template in `templates/` (Risk #5)
  - Verify: opens in Word, diacritics intact.
- [ ] PDF via print-friendly route (webview Save-as-PDF)
  - Verify: PDF opens, layout/diacritics OK.
- [ ] XLSX via SheetJS (roster/records/report)
  - Verify: opens in Excel; round-trips with M2.
- [ ] **TDD** view-model + mapper structure tests
  - Verify: tests green.
- [ ] **Checkpoint E (with M8):** all output paths work.

## M8 — Claude Export (anonymized) (TDD)
- [ ] `lib/export/anonymize.ts` (single boundary) + Claude Export screen → clipboard
  - Verify: summary copyable; codes only.
- [ ] **No-PII test** (no name/phone/address/grade leaks)
  - Verify: guard test green.

## M9 — Polish · review · security
- [ ] Empty/loading/error audit across all screens; Vietnamese copy pass; basic a11y
  - Verify: manual + component tests.
- [ ] Reproducible demo checklist (clean machine, offline, 8A end-to-end)
  - Verify: checklist runs without network.
- [ ] Run `code-review-and-quality`
  - Verify: no blocking findings.
- [ ] Run `security-and-hardening` (import validation, local storage, export safety, anonymization)
  - Verify: no blocking findings.
- [ ] **Checkpoint F:** SPEC §8 criteria 1–11 pass; lint/typecheck/test green → sign-off.
