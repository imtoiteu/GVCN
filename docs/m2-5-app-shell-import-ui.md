# M2.5 — App Shell + Import Preview UI (bridging milestone)

> Session scope: a **minimal** Tauri/React app shell plus a thin UI that surfaces the
> already-built M1 data layer and M2 import engine, so they can be exercised manually.
> **Not** full M3. No weekly records, generators, exports, or charts. See
> [`../SPEC.md`](../SPEC.md) §4, [`../tasks/plan.md`](../tasks/plan.md) (M0 app-shell item).
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## Why this milestone

M1 (data layer) and M2 (Excel import) were logic/data slices verified only through Vitest.
Before going deeper into M3 weekly-record logic, we need a navigable shell so a human can see
class 8A, load demo data, and run an import end-to-end. This bridges M1/M2 to the UI without
expanding scope.

## What was built

A thin UI layer under **`src/app/`** and **`src/features/`** — all of it a *consumer* of the
existing DAL/engine; **no M1 DAL or M2 engine code was changed**.

| File | Role |
|------|------|
| `src/app/AppShell.tsx` | Sidebar nav + title + offline indicator; in-memory page switcher. |
| `src/app/nav.tsx` | The 12 SPEC §4 screens as nav items (2 functional, 10 placeholders). |
| `src/app/i18n.ts` | Flat Vietnamese UX copy + `genderLabel` helper. |
| `src/app/pages/PlaceholderPage.tsx` | Generic "coming soon" stub for not-yet-built screens. |
| `src/app/app-shell.css` | Plain-CSS layout + table/button/state styling. |
| `src/features/classes/ClassesPage.tsx` | Loads classes/roster via the DAL; **"Tải dữ liệu mẫu 8A"** → `seedDemoClass`. |
| `src/features/import/ImportPage.tsx` | File picker → `importStudentsFromWorkbook` → preview + errors → `commitStudentImport`. |
| `src/App.tsx` | Reduced to `<AppShell/>` (scaffold greet demo removed). |

### Design choices

- **No new dependencies.** Navigation is `useState` (no react-router); styling is plain CSS
  (no Tailwind/shadcn); the file picker is a native `<input type="file">`. This honors the
  SPEC §13 / CLAUDE.md *"ask first before adding dependencies"* gate. Router, shadcn/ui +
  Tailwind, and TanStack Table remain deferred to a dedicated UI-foundation milestone — the
  in-memory switcher and hand-rolled table are explicitly a bridge, not the final UI stack.
- **Native file input, not the Tauri dialog plugin.** `<input type="file">` + `File.arrayBuffer()`
  works in both the Tauri webview and the plain dev server, and needs no new capability or
  plugin. The M2 engine already accepts raw bytes, so the page just feeds it `file.arrayBuffer()`.
- **Runtime DB access** uses the existing `getDb()` from `src/lib/db/tauri.ts` (the barrel
  deliberately doesn't re-export it). Pages call the typed DAL functions unchanged.
- **States** (frontend-ui-engineering): both functional pages render explicit
  loading / error / empty / ready states. When the SQLite backend isn't available (e.g. run in
  a plain browser instead of the desktop app), pages show a Vietnamese error prompting
  `npm run tauri dev` rather than crashing.

### Import page flow

`pick .xlsx → file.arrayBuffer() → importStudentsFromWorkbook() → { valid, errors, totalRows }`
→ preview table of valid rows + a table of row errors (row · field · message) → **commit** into
the selected class via `commitStudentImport()` → success summary (`inserted` / `skippedExisting`).
A non-`.xlsx`/corrupt file is caught and surfaced as a file-level error row.

## Bundle-size note

The frontend bundle grew from **194 kB → ~1.2 MB (351 kB gzip)**. This is expected and correct:
the pages now import the runtime DB backend (`@tauri-apps/plugin-sql`) **and** the import engine
(`exceljs`), which previously were pulled only into tests. No new dependency was added — this is
existing code finally reaching the app bundle. Code-splitting (lazy-loading the import engine /
`exceljs` only when the Import page opens) is a worthwhile **deferred** optimization, not needed
for a local desktop app's correctness.

## Commands run & results

| Command | Result |
|---------|--------|
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; 62 modules; bundle ~1.2 MB / 351 kB gzip. |
| `npm run test` (`vitest run`) | ✅ **21 passed** (db 15 + import 6) — unchanged; no UI tests added. |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: no Tauri runtime, capability, or `tauri.conf.json`
change this milestone — only the web frontend changed, and it is build-verified. The desktop
bundle would simply repackage the verified `dist/`. Re-run it on a machine with a display when
doing the GUI smoke-check below.

## Deferred / not done (documented, not silently skipped)

- **Runtime GUI smoke-check.** This headless VPS has no WebKitGTK display, so the shell, the
  "Tải dữ liệu mẫu 8A" button creating rows in `sqlite:gvcn.db`, and an actual `.xlsx` import
  through the webview were **not** exercised live. Verify on any desktop machine via
  `npm run tauri dev` (shell renders → Classes → seed 8A → Import a fixture `.xlsx`). The logic
  underneath is fully unit-tested; this is a wiring smoke-check, not a correctness gap.
- **Component tests (RTL).** React Testing Library / jsdom are not installed (new deps →
  ask-first gate), so empty/loading/error states are covered by manual inspection for now.
  Add RTL with the proper UI-foundation milestone.
- **Real UI stack** (react-router, shadcn/ui + Tailwind, TanStack Table) — deferred by design.
- **Other 9 screens** are placeholders (Dashboard, Weekly Record, Comments, Parent Messages,
  Minutes, Reports, Exports, Claude Export, Settings).
- **Class/Student CRUD** (create/edit forms) — only demo-seed + import build rosters here; full
  CRUD is the M1-UI item, still pending.

## Spec reconciliation (SheetJS → ExcelJS)

SPEC §10.2 / §6 and `tasks/plan.md` M2 still described XLSX via **SheetJS**. M2 switched to
**ExcelJS** for security (see `docs/m2-excel-import.md`). Small notes were added to SPEC §10.2
and Risk #6, and to `plan.md` M2, pointing here — without expanding scope.

## Next recommended milestone

**M3 — Weekly records + tag catalog.** The shell now has a "Ghi nhận tuần" slot ready to host
the weekly-record entry grid; the `weeks` / `weekly_records` / `record_tags` schema and tag
catalog already exist from M1. Confirm the tag taxonomy with a teacher (SPEC Risk #3) before
finalizing the seed.
