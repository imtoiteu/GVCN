# M3 — Weekly Records + Tag Entry

> Session scope: the **M3 vertical slice** only — a teacher can choose a class/week, record
> weekly observations per student using the existing tag catalog + a short note, save them,
> and read them back. **No** comment/parent-message/report generation, exports, charts, or
> tag-catalog CRUD (those are M4+). See [`../SPEC.md`](../SPEC.md) §4, [`../tasks/plan.md`](../tasks/plan.md) §M3.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was built

The data loop **class → students → week → records** is now complete and surfaced in the UI.
The per-record SQL primitives already existed from M1 (`upsertWeeklyRecord`, `setRecordTags`,
`getWeeklyRecord`, `listTagsForRecord`, `createWeek`, `listWeeksByClass`, `listTags*`). M3 adds
the **batch readers + one save helper** a roster screen needs, plus the screen itself.

| File | Role |
|------|------|
| `src/lib/db/repositories.ts` | **+3 functions** (see below). Existing functions unchanged. |
| `src/lib/db/__tests__/weekly.test.ts` | **+4 TDD tests** over save → read-back, tag replace, batch loaders, empty week. |
| `src/features/weekly/WeeklyRecordPage.tsx` | The "Ghi nhận tuần" screen (thin consumer). |
| `src/app/nav.tsx` | `weekly` slot wired from placeholder → `WeeklyRecordPage`. |
| `src/app/i18n.ts` | `weekly` copy block + `categoryLabel()` (the 5 practical groups). |
| `src/app/app-shell.css` | Student-card + tag-chip + note styles (plain CSS). |

### DAL additions (`repositories.ts`)

- `listWeeklyRecordsByWeek(exec, weekId)` → one row per student that has a saved record for the
  week. Batch read; avoids an N+1 per-student lookup when the screen loads.
- `listRecordTagIdsByWeek(exec, weekId)` → every `(record_id, tag_id)` pair for the week in a
  single query, so the UI rebuilds each student's selected-tag set without a query per record.
- `saveWeeklyRecord(exec, { student_id, week_id, teacher_notes, tagIds })` → composes the
  existing `upsertWeeklyRecord` + `setRecordTags` so **save and reload stay symmetric**
  (upsert the note, replace the full tag set, return the record id).

These reuse the M1 primitives; no existing DAL function was modified.

## Screen flow ("Ghi nhận tuần")

1. **Choose a class** (from `listClasses`). If none exist → empty state pointing to the
   "Lớp & Học sinh" screen to seed 8A / import first.
2. **Choose or create a week.** The week `<select>` lists `listWeeksByClass`; **"Tạo tuần mới"**
   calls `createWeek` with the next `week_no` (`max(existing)+1`, label `Tuần N`). Empty state if
   the class has no week yet.
3. **Per student** (one card per roster row): observation tags rendered as toggle chips
   **grouped by the 5 categories** — Chuyên cần / Học tập / Nề nếp / Việc tốt / Cần hỗ trợ — plus
   a short **note** textarea. Selections live in component state until saved.
4. **Save** persists every student that has ≥1 tag or a non-empty note (untouched students don't
   create empty records), via `saveWeeklyRecord`. A success banner reports how many were saved.
5. **Reload** happens automatically on class/week re-select (and after restart): the screen reads
   `listWeeklyRecordsByWeek` + `listRecordTagIdsByWeek` and repopulates the drafts, so prior
   selections are visible and editable. Re-saving replaces the tag set (no duplicates).

### Tone / safety (CLAUDE.md)

Tags come from the existing controlled catalog; "concern" tags read as *support* prompts, never
punitive. Chip styling tints **selected** chips only, with a soft amber for `concern` (not red
alarm) — the screen is "ghi nhận / hỗ trợ", not surveillance. Only fake/demo data is used; free
text lives in `teacher_notes` (no PII required).

## Tag taxonomy (Risk #3) — still provisional

Per SPEC Risk #3 the 22-tag catalog (migration `002_seed_tags.sql`) should be confirmed with a
real homeroom teacher. M3 **treats it as provisional and editable later** rather than blocking on
sign-off: tags are data, not code, so the catalog can change with no schema or screen change.
Full tag-catalog CRUD/settings is intentionally out of M3 scope. **Deferred, not resolved.**

## Commands run & results

| Command | Result |
|---------|--------|
| `npm run test` (`vitest run`) | ✅ **25 passed** (db 19 + import 6) — was 21; **+4** M3 weekly tests. |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; bundle 1,215 kB / 353 kB gzip; CSS 4.55 kB. |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: M3 changed only the web frontend + TS data layer — no
Tauri runtime, capability, or `tauri.conf.json` change — so the verified Linux bundle simply
repackages the build-verified `dist/`. Re-run it on a desktop machine alongside the GUI smoke
check below.

## Dependencies added

**None.** Consistent with M2.5: navigation is the in-memory switcher, styling is plain CSS, tag
chips are native `<button aria-pressed>`, notes a native `<textarea>`. No router / UI framework
was added (still deferred to a dedicated UI-foundation milestone).

## Deferred / not done (documented, not silently skipped)

- **Runtime GUI smoke-check** (Checkpoint C's manual half). This headless VPS has no WebKitGTK
  display, so the screen wasn't exercised live. On any desktop machine via `npm run tauri dev`:
  seed 8A → open "Ghi nhận tuần" → create a week → tag ≥3 students + notes → save → **restart**
  → reopen the week and confirm the saved tags/notes reappear. The save/reload paths are fully
  unit-tested; this is wiring verification, not a correctness gap.
- **Tag taxonomy sign-off** (Risk #3) and **tag-catalog CRUD** — deferred as above.
- **Component tests (RTL)** — still gated on the ask-first dependency decision; states covered by
  manual inspection.
- **Code-splitting** the `exceljs`/`plugin-sql` bundle — same deferred optimization noted in M2.5.
- Everything M4+ (comment/parent/report generation, exports, Claude Export, dashboard).

## Next recommended milestone

**M4 — Comment generation (TDD).** With the records loop closed, the pure generator
`lib/generate/comment.ts` (tags + notes → respectful Vietnamese comment, with the no-banned-phrase
guard) is the next slice; it reads the M3 records via the existing DAL. Confirm the tag taxonomy
(Risk #3) opportunistically before it hardens into generated text.
