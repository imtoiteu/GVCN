# Implementation Plan: GVCN AutoReport — MVP

> Companion to [`../SPEC.md`](../SPEC.md). Checklist form in [`todo.md`](todo.md).
> Phase: **Plan** (no code yet). Milestones are vertical slices; each ends in a verifiable output.

## Overview

Deliver the MVP described in `SPEC.md` as 10 milestones (M0–M9), bottom-up along the
dependency graph (SPEC §9.4): foundation → data CRUD → records → generators → exports →
Claude Export → polish. Each milestone is a working, demoable slice. Pure logic (generators,
import/export mappers, safety guards) is built test-first.

## Architecture Decisions (from SPEC §10)

- **Data:** SQLite via `tauri-plugin-sql`, explicit SQL migrations, typed DAL in `src/lib/db`.
- **DOCX:** `docxtemplater` over hand-editable `.docx` templates in `templates/`.
- **PDF:** print-friendly HTML route → webview "Save as PDF". (`pdfmake` = documented fallback.)
- **XLSX:** `SheetJS` for import + export round-trip.
- **UI:** shadcn/ui (Radix + Tailwind v4) + TanStack Table + React Hook Form + Zod.
- **Tests:** Vitest (TDD on pure logic) + React Testing Library (component states).
- **Anonymization:** a single `lib/export/anonymize` boundary; Claude Export and AI summaries
  pass through it and are guarded by a no-PII test.

## Milestones

### M0 — Foundation `[Small–Medium]`
Replace scaffold demo with an app shell and wire the core libraries.
- Add deps: Tailwind v4, shadcn/ui primitives, TanStack Table, RHF, Zod, Vitest, RTL, ESLint,
  `@tauri-apps/plugin-sql`, SheetJS, docxtemplater.
- Add scripts: `test`, `lint`, `typecheck`. Configure ESLint + Vitest.
- Fix scaffold bugs: `tauri.conf.json` `identifier` (Risk #1) → `com.gvcn.autoreport`; window 1200×800 (Risk #2).
- App shell: sidebar nav (12 routes from SPEC §4), class switcher placeholder, routing.
- SQLite: register plugin + capabilities; migration runner; create schema (SPEC §5); seed tag catalog.
- Thin typed DAL skeleton in `src/lib/db`.
- **Verify:** `npm run tauri dev` boots to shell; DB file created on first run; `npm run typecheck`/`lint`/`test` run (even if near-empty). *Failing-fast: hardest infra (SQLite + Tauri capabilities) lives here.*

### Checkpoint A — after M0
- App launches, sidebar navigates, empty DB initializes, all three quality scripts run clean.

### M1 — Classes & Students + demo 8A `[Medium]`
- CRUD classes; CRUD students (roster table via TanStack Table, RHF+Zod forms).
- Seed/load **demo class 8A** with fake students (no real PII).
- **Verify:** create a class, add/edit students, load demo 8A → roster renders; data persists across restart. Component tests for empty/loading states.

### M2 — Excel import `[Medium]`
- SheetJS import: file dialog → parse `.xlsx` → Zod-validate rows → preview with per-row errors → commit valid rows.
- **TDD:** parser/mapper unit tests (valid file, missing columns, bad/blank rows, diacritics, dedupe by `student_code`).
- **Verify:** import a fixture `.xlsx`; invalid rows flagged + skipped, valid rows imported. Record SheetJS edition/version (Risk #6).

### Checkpoint B — after M1–M2
- A teacher can build a real-shaped roster (demo + import) end-to-end. Tests green.

### M3 — Weekly records + tag catalog `[Medium]`
- Week management (create/select week per class).
- Weekly Record screen: per-student entry of tags (attendance/study/discipline/good-deed/support) + `teacher_notes`, persisted via `weekly_record` + `record_tag`.
- Confirm tag taxonomy with teacher before finalizing seed (Risk #3).
- **Verify:** record a full week for ≥3 students; reopen after restart shows saved tags/notes.

### Checkpoint C — after M3
- Core data loop (class → students → week → records) works end-to-end. **Highest-value review point before generators.**

### M4 — Comment generation `[Medium]` *(TDD)*
- Pure generator `lib/generate/comment.ts`: (tags + notes) → respectful, specific Vietnamese comment.
- Comments screen: generate → editable → save to `generated_doc`.
- **TDD:** unit tests for tag→sentence mapping, positive/concern balance, empty-record fallback, **no-banned-phrase guard** (no punitive/stigmatizing words).
- **Verify:** tests green; UI shows editable generated comment.

### M5 — Parent-message generation `[Small–Medium]` *(TDD)*
- Pure generator `lib/generate/parentMessage.ts`: cooperative, non-accusatory Vietnamese draft.
- **TDD:** tone tests (cooperation framing), no-banned-phrase guard, edit+save flow.
- **Verify:** tests green; UI generates + saves draft.

### M6 — Meeting minutes + weekly/monthly reports `[Medium]` *(TDD)*
- Aggregation in `lib/generate/`: minutes (per week/class) and weekly/monthly report (group weeks → month, Risk #4).
- **TDD:** aggregation correctness (counts/highlights/support list), monthly = grouped weeks, empty-period fallback.
- **Verify:** tests green; UI previews minutes + weekly/monthly report from recorded data.

### Checkpoint D — after M4–M6
- All four generators produce reviewed, editable Vietnamese text. Safety guards enforced by tests.

### M7 — Exports: DOCX / PDF / XLSX `[Medium]`
- View-model builders + mappers in `lib/export/`: `docxtemplater` (template in `templates/`), print route for PDF, SheetJS workbook.
- Exports screen wired to current artifact; Tauri fs/dialog save.
- **TDD:** view-model + mapper structure tests; manual open-in-Word/Excel/PDF check (diacritics intact).
- **Verify:** export each format; files open correctly. Ship a generic `.docx` template (Risk #5).

### M8 — Claude Export (anonymized) `[Small]` *(TDD)*
- `lib/export/anonymize.ts` + Claude Export screen: student-code-only summary → clipboard.
- **TDD:** **no-PII test** (asserts no name/phone/address/grade strings leak; only codes present).
- **Verify:** generated summary contains codes, zero PII.

### Checkpoint E — after M7–M8
- Every output path (files + Claude) works and is anonymized where required.

### M9 — Polish · review · security `[Medium]`
- Empty/loading/error states audit across all screens; Vietnamese copy pass; basic a11y (labels, focus, keyboard nav).
- Reproducible **demo checklist** (clean machine, offline, 8A end-to-end).
- Run `code-review-and-quality` and `security-and-hardening` (import validation, local storage, export safety, anonymization).
- **Verify:** SPEC §8 acceptance criteria 1–11 all pass; review skills report clean.

### Checkpoint F — Complete
- All SPEC §8 acceptance criteria met; lint/typecheck/test green; reviews done; ready for sign-off.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| SQLite + Tauri capabilities/migrations complexity | Med | Front-loaded in M0 (fail fast); thin DAL isolates SQL. |
| Invalid `identifier` blocks desktop bundle (SPEC Risk #1) | High | Fixed in M0 before any `tauri build`. |
| Generated text feels judgmental / surveillance-like | High | No-banned-phrase + tone tests (M4–M6); cooperation framing enforced. |
| PII leak via Claude/AI export | High | Single `anonymize` boundary + no-PII test (M8). |
| DOCX diacritics / template fidelity | Med | docxtemplater + manual open check; print-to-PDF fallback. |
| Tag taxonomy churn | Med | Confirm with teacher before M3; catalog is data, not code. |
| Scope creep toward ERP | Med | Boundaries in SPEC §13; "Ask first" gate on new screens/deps. |

## Parallelization

- **Sequential (foundation/data):** M0 → M1 → M3 (shared schema/DAL).
- **Parallel after M3:** M4, M5, M6 generators are independent pure modules (share only the read DAL).
- **Parallel after M1:** M2 (import) is independent of the records loop.
- **Converge:** M7 needs M4–M6 + M2; M8 needs M3–M4; M9 last.
- Define the generator→export **view-model contract** before parallelizing M4–M6 so M7 mappers are stable.

## Open Questions

Tracked in SPEC §14 (Risks #1–#8). Resolve #1, #3 early (M0/M3); #5, #6 during M7/M2.
