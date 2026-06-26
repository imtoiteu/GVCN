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
- [~] App shell: sidebar + routing for 12 screens (SPEC §4); class-switcher placeholder
  - **Shell done (M2.5 bridging session).** `src/app/AppShell.tsx` + `nav.tsx`: Vietnamese sidebar listing all 12 SPEC §4 screens, app title, offline indicator, in-memory page switcher (no router dep yet). 2 screens functional (Lớp & Học sinh, Nhập từ Excel); other 10 are placeholder stubs. Verify: `npm run build`/`typecheck` → 0; each nav item renders. **Deferred:** real router + shadcn/Tailwind UI stack; runtime GUI nav smoke-check (needs a display). See `docs/m2-5-app-shell-import-ui.md`.
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
  - **Data layer done (M1 session):** `seedDemoClass()` + fake 8A roster (12 students, codes `8A-NN`) + 2 demo weeks in `src/lib/db/seed.ts`; idempotent; tested. **UI one-click trigger now wired (M2.5):** Classes page "Tải dữ liệu mẫu 8A" button calls `seedDemoClass` then renders the roster table. Verify: `npm run test` seed tests pass ✅; build/typecheck 0. **Runtime GUI smoke-check** (button creates rows in `sqlite:gvcn.db`, persists across restart) still pending a display.
- [ ] Empty/loading states for classes + students
  - Verify: RTL component tests.

## M2 — Excel import
- [x] ~~SheetJS~~ **ExcelJS** import: file picker → parse → Zod-validate → preview w/ row errors → commit
  - **Engine + screen DONE.** Engine (M2): `src/lib/import/` `readStudentSheet` (exceljs) → `parseStudentRows` (pure Zod-validate/map/dedupe → `valid`/`errors[]`/`totalRows`) → `commitStudentImport` (reuses M1 DAL, skips existing); accepts raw bytes. Screen (M2.5): `src/features/import/ImportPage.tsx` — native `<input type="file">` → `file.arrayBuffer()` → preview table + row-error table → commit into a selected class → inserted/skipped summary. No Tauri dialog plugin needed (works in webview + dev server). Verify: build/typecheck 0; engine tests 6 ✅. **Runtime GUI smoke-check** of a real `.xlsx` through the webview still pending a display. See `docs/m2-5-app-shell-import-ui.md`.
- [x] **TDD** parser/mapper tests (missing cols, blank/bad rows, diacritics, dedupe by `student_code`)
  - **Done.** 6 tests over real `.xlsx` round-trips (VN + English headers, diacritics intact, gender map, missing column/value, in-file dedupe, demo+import commit). Verify: `npm run test` → 21 passed. ✅
- [x] Record SheetJS edition/version (Risk #6)
  - **Done — and changed the choice.** npm `xlsx@0.18.5` had 2 *high* unpatched advisories (prototype pollution + ReDoS); fixes only on SheetJS CDN. Per user directive (safer/maintainable, no CDN) switched to **`exceljs@^4.4.0`** (MIT, npm) + `zod@^3`; pinned `uuid ^11.1.1` via `overrides` → `npm audit` 0. Recorded in `docs/m2-excel-import.md`.
- [~] **Checkpoint B:** roster buildable via demo + import; tests green.
  - **Logic + UI DONE (M2.5):** `seedDemoClass` + import commit → roster built (12 demo + 2 imported, 1 skipped); tests green. Classes + Import screens now drive this path through the UI. **Remaining:** a single runtime GUI run (seed 8A → import a fixture `.xlsx` → see roster grow) on a machine with a display.

## M3 — Weekly records + tag catalog
- [~] Confirm tag taxonomy with teacher (Risk #3)
  - **Deferred, not blocking (M3 session).** The 22-tag catalog (`002_seed_tags.sql`) is treated as *provisional* — tags are data, so the catalog can change with no schema/screen change. M3 ships against it; sign-off + tag-catalog CRUD remain open. See `docs/m3-weekly-records.md`. Verify: categories/labels signed off (pending teacher).
- [x] Week management (create/select week per class)
  - **Done (M3 session).** "Ghi nhận tuần" screen: class `<select>` → week `<select>` + **"Tạo tuần mới"** (`createWeek`, next `week_no`). DAL `createWeek`/`listWeeksByClass` (M1) drive it. Verify: build/typecheck 0; tests green. Week-persists-across-restart is the runtime GUI smoke-check (needs a display).
- [x] Weekly Record screen: per-student tags + `teacher_notes` → `weekly_record`/`record_tag`
  - **Logic + UI done (M3 session).** `src/features/weekly/WeeklyRecordPage.tsx`: per-student tag chips grouped by the 5 categories + note textarea → `saveWeeklyRecord` (upsert record + replace tags); reload via `listWeeklyRecordsByWeek`/`listRecordTagIdsByWeek`. DAL: +3 functions in `repositories.ts`, +4 TDD tests (`__tests__/weekly.test.ts`). Verify: `npm run test` → **25 passed**; build/typecheck 0. **Runtime GUI smoke-check** (record ≥3 students; reopen after restart shows data) still pending a display. See `docs/m3-weekly-records.md`.
- [~] **Checkpoint C:** class→students→week→records loop works end-to-end (review point).
  - **Logic + UI done (M3 session):** the full loop (seed/import roster → create/select week → tag + note per student → save → reload) is wired and unit-tested. **Remaining:** a single runtime GUI run on a machine with a display (`npm run tauri dev`) to confirm persistence across restart.

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
