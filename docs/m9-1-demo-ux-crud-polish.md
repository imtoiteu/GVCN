# M9.1 — Demo UX Polish + Basic CRUD

> Make the MVP feel complete for demo/review: real Dashboard + Settings screens, practical
> class/student CRUD (archive-first, non-destructive), clearer empty states with next-step CTAs,
> smarter demo-data button, reports-navigation clarity, i18n + visual polish. Local-first/offline
> preserved; no external APIs, no accounts, no new heavy dependencies, **no database migration**.
>
> Date: 2026-06-26 · Env: headless Linux VPS (GUI testing deferred to the MacBook).

## What changed

| Area | Change |
|------|--------|
| **Navigation** | New `src/app/nav-context.tsx` (`useAppNav` → `navigate(id)` + shared `locale`). Lets the dashboard quick-actions and empty-state CTAs jump screens, and the Settings page switch language. No router dependency. App now opens on the **Dashboard**. |
| **Dashboard** | `src/features/dashboard/DashboardPage.tsx` + pure `src/lib/dashboard/dashboardSummary.ts`: summary cards (classes, students, current class/week, recorded-this-week + %, comments/messages/reports), quick-action buttons, 4-step workflow guide. |
| **Settings** | `src/features/settings/SettingsPage.tsx`: language selector + local-first/privacy, anonymized-AI-export, storage, demo, and explicit "no cloud / nothing auto-sent" sections + app version. |
| **Class CRUD** | DAL `updateClass`, `classExists`, `countStudentsInClass`, `deleteClassIfEmpty`. UI add/edit; duplicate (name+year) blocked; delete blocked while the class has students. |
| **Student CRUD** | DAL `updateStudent`, `studentCodeExists`, `setStudentActive`, `countLinkedRecordsForStudent`, `deleteStudentIfNoRecords`, `listAllStudentsByClass`. UI add/edit, archive/restore, "show archived" toggle; duplicate code blocked; hard delete blocked when linked records exist. |
| **Roster semantics** | `listStudentsByClass` is now **active-only** (`is_active = 1`) so archived students drop out of records/generation/exports. Backward-compatible (all existing/seeded students are active). Management view uses `listAllStudentsByClass`. |
| **Demo button** | Idempotent `seedDemoClass` is surfaced: shows "Dữ liệu mẫu 8A đã có" + a non-wiping "Nạp lại dữ liệu mẫu" when the demo class already exists. No accidental duplicate import. |
| **Empty-state CTAs** | Comments / Parent messages / Anonymized AI Export "no records" states gain a **"Đi tới Ghi nhận tuần"** button. Reports + Exports show a clear **"this period has no recorded data"** warning when content is generated from an empty week/month. |
| **Reports clarity** | Both sidebar entries kept, but the screen **title now matches the entry**: "Biên bản họp lớp" vs "Báo cáo tuần/tháng" (default artifact already matched via `initialKind`). |
| **i18n** | Added `actions`, `dashboard`, `settings` blocks + class-CRUD + reports-title + empty-data-warning keys in **vi and en**. Missing-key fallback to Vietnamese is unchanged (never crashes). |
| **Visual** | CSS only: stat-card grid, quick-action row, settings sections, form cards/grids, archived-row styling, danger/extra-small buttons, language-selector consistency. No UI library. |

## CRUD supported

- **Classes:** create, edit (name / school year / homeroom teacher), delete **only when empty**.
  Duplicate `(name, school_year)` is rejected with a message (DB also enforces `UNIQUE`).
- **Students:** create, edit (code / name / gender / dob / note), **archive & restore**, hard delete
  **only when there are zero linked records**. Duplicate `student_code` within a class is rejected
  (DB also enforces `UNIQUE(class_id, student_code)`).

## Deletion / archive behavior (non-destructive by design)

- **Archive is the default "remove"** for students — sets `is_active = 0` (existing column, **no
  migration**). Archived students keep all their rows but disappear from the active roster, weekly
  records, generators, and exports. Restore flips it back.
- **Hard delete is gated:** `deleteStudentIfNoRecords` refuses when weekly records / comments /
  parent messages reference the student (returns `{deleted:false, linkedCount}`); the UI then tells
  the teacher to archive instead. `deleteClassIfEmpty` refuses when the class still has students.
  This is why the schema's `ON DELETE CASCADE` is never triggered on populated rows.
- No destructive reset, no silent data loss.

## Database migrations

**None.** All CRUD uses existing tables/columns (`is_active` already existed). The only query
change is adding `is_active = 1` to `listStudentsByClass`, which is backward-compatible.

## Tests

- `src/lib/db/__tests__/crud.test.ts` (**+7**): class dup-prevention + update; delete-only-when-empty;
  student dup-prevention (self-excluded on edit) + update; archive hides from active roster /
  keeps row / restore; hard-delete blocked when linked records exist & allowed otherwise; per-class
  comment count; **demo seed idempotency (no duplication on re-run)**.
- `src/lib/dashboard/__tests__/dashboardSummary.test.ts` (**+5**): ratio/percent, all-recorded,
  zero-students (no divide-by-zero), clamp, no-class/no-week flags.
- `src/app/__tests__/i18n.test.ts` (**+2**): new dashboard/settings/CRUD/empty-data keys present and
  non-empty in **both** locales; reports titles + demo-exists label translate.
- All existing generator / export / anonymization tests remain green.

## Verification (VPS)

| Command | Result |
|---------|--------|
| `npm run test` | ✅ **146 passed** (22 files; was 132, **+14**) |
| `npm run typecheck` | ✅ 0 |
| `npm run build` | ✅ 0 (pre-existing chunk-size warning only) |
| `cd src-tauri && cargo check` | ✅ Finished, 0 errors |
| `npm audit` | ✅ 0 vulnerabilities |
| `npm run tauri build` | **Not re-run** — no runtime/config/capability/migration/packaging change; the M8 Linux `.deb`/`.rpm` remain valid. |

**Dependencies added: none.**

## i18n notes

Vietnamese remains the default and is complete. English now covers all new navigation/dashboard/
settings/CRUD/empty-state strings. Generated educational artifacts (comments, messages, minutes,
reports) and the anonymized AI export body stay Vietnamese by design (M8.1/M8.2 decision). No
external translation API is used; any missing English key falls back to Vietnamese.

## Remaining limitations

- "Current class/week" on the dashboard is the **first** class and its **first** week (there is no
  global selection state yet) — a deliberate simple choice for the demo summary.
- No bulk student operations, no class-to-class student move (archive + re-add only).
- Hard delete is intentionally conservative (blocked when any record exists) — archive covers the
  practical "remove from roster" need.
- Confirmations use native `window.confirm/alert` (simple, offline) rather than custom modals.

## Needs manual GUI testing later (MacBook)

The VPS is headless; verify on macOS with `npm run tauri dev`:
1. App opens on the **Dashboard**; cards show correct counts; quick-action buttons navigate.
2. **Settings:** language switch (vi⇄en) updates the whole UI and persists across relaunch.
3. **Classes:** add/edit a class; duplicate name+year is blocked; delete blocked while it has
   students, allowed when empty.
4. **Students:** add/edit; duplicate code blocked; **archive** hides from roster + records + exports;
   restore brings it back; hard delete blocked when the student has records.
5. **Demo button** shows "đã có" after 8A exists; reload does not duplicate or wipe data.
6. Empty **Comments/Parent/AI-Export** show the "Go to Weekly Records" button and it navigates.
7. **Reports/Exports** show the empty-data warning for a week/month with no records.
8. Reports sidebar entries show distinct titles ("Biên bản họp lớp" vs "Báo cáo tuần/tháng").
