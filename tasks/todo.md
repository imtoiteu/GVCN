# TODO — GVCN AutoReport MVP

> Checklist for [`plan.md`](plan.md) / [`../SPEC.md`](../SPEC.md). `[ ]` = pending. Each task notes Acceptance / Verify.
> **Do not start implementation until the spec + plan are approved** (Define+Plan gate).

## M0 — Foundation
- [ ] Add deps (Tailwind v4, shadcn/ui, TanStack Table, RHF, Zod, Vitest, RTL, ESLint, `@tauri-apps/plugin-sql`, SheetJS, docxtemplater)
  - Verify: `npm install` clean; versions recorded.
- [~] Add scripts `test` / `lint` / `typecheck`; configure ESLint + Vitest
  - **Partial:** `typecheck` (`tsc --noEmit`) added & passing. `test`/`lint` deferred (need Vitest/ESLint deps — out of this session's scope). Verify: `npm run typecheck` → exit 0. ✅
- [x] Fix `tauri.conf.json` `identifier` → `vn.gvcn.autoreport` (Risk #1); window → 1200×800 (Risk #2)
  - **Done.** Valid JSON confirmed; `npm run build` passes. `tauri dev` window sizing un-runnable here (no Rust toolchain) — verify on local Mac. See `docs/m0-scaffold-check.md`.
- [ ] App shell: sidebar + routing for 12 screens (SPEC §4); class-switcher placeholder
  - Verify: each route renders a stub; nav works.
- [ ] SQLite plugin + capabilities; migration runner; create schema (SPEC §5); seed tag catalog
  - Verify: DB file created on first run; tables + seed tags present.
- [ ] Thin typed DAL skeleton in `src/lib/db`
  - Verify: a sample typed query compiles + runs.
- [ ] **Checkpoint A:** shell boots, DB inits, typecheck/lint/test clean.

## M1 — Classes & Students + demo 8A
- [ ] Class CRUD (create/edit/list)
  - Verify: class persists across restart.
- [ ] Student CRUD + roster table (TanStack Table, RHF+Zod)
  - Verify: add/edit student; table sorts/filters.
- [ ] Load demo class 8A (fake students, no PII)
  - Verify: one click populates 8A roster.
- [ ] Empty/loading states for classes + students
  - Verify: RTL component tests.

## M2 — Excel import
- [ ] SheetJS import: dialog → parse → Zod-validate → preview w/ row errors → commit
  - Verify: fixture import; bad rows flagged+skipped, valid imported.
- [ ] **TDD** parser/mapper tests (missing cols, blank/bad rows, diacritics, dedupe by `student_code`)
  - Verify: `npm run test` green.
- [ ] Record SheetJS edition/version (Risk #6)
  - Verify: noted in source-driven notes.
- [ ] **Checkpoint B:** roster buildable via demo + import; tests green.

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
