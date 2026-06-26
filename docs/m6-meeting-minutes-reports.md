# M6 — Meeting Minutes + Weekly/Monthly Reports

> Session scope: the **M6 vertical slice** only — pure, local, deterministic generators that
> aggregate a class's saved weekly records into a Vietnamese **homeroom meeting-minutes** document
> and **weekly / monthly homeroom reports**, plus a "Biên bản & Báo cáo" screen to generate → edit →
> save into `homeroom_reports`. **No** DOCX/PDF/XLSX export (M7), no Claude Export (M8), no dashboard
> charts, no external AI, no Zalo/SMS/email, no report-template designer, no router/UI-framework
> migration, no tag-catalog CRUD. See [`../SPEC.md`](../SPEC.md) §4/§16 and
> [`../tasks/plan.md`](../tasks/plan.md) §M6.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was built

| File | Role |
|------|------|
| `src/lib/generate/reportData.ts` | **New** shared aggregation (`aggregateWeek`, `mergeWeeks`) + text helpers. |
| `src/lib/generate/meetingMinutes.ts` | **New** pure weekly meeting-minutes generator. Reuses M4's `findBannedPhrases`. |
| `src/lib/generate/homeroomReport.ts` | **New** pure weekly + monthly report generators. |
| `src/lib/generate/__tests__/meetingMinutes.test.ts` | **+9 TDD tests** (sections, aggregation, tone, empty, determinism). |
| `src/lib/generate/__tests__/homeroomReport.test.ts` | **+7 TDD tests** (weekly + monthly grouping, empty-period). |
| `src/lib/db/repositories.ts` | **+1 function** `getLatestReport` (prefill). Existing funcs unchanged. |
| `src/lib/db/__tests__/homeroomReports.test.ts` | **+4 DAL tests** for save + the latest-by-(class,kind,label) reader. |
| `src/features/reports/ReportsPage.tsx` | The "Biên bản & Báo cáo" screen (thin consumer; mounted in both nav slots). |
| `src/app/nav.tsx` | `minutes` + `reports` slots wired from placeholders → `ReportsPage`. |
| `src/app/i18n.ts` | `reports` copy block + `reportKindLabel()` helper + `ReportKind` type. |

(No CSS change — the screen reuses the M3/M4 `.page` / `.toolbar` / `.field` / `.state` /
`.note-input` / `.badge` / `.comment-warn` styles.)

## The generators

All three are **pure and deterministic** — no I/O, no external AI, no `Date`/`Math.random`. Same
input → same text, so output is golden-testable and reproducible offline.

### Shared aggregation (`reportData.ts`)

`aggregateWeek(records)` rolls a list of per-student observations into a `WeekAggregate`:
student counts by sentiment (positive / concern / support), **distinct tag labels** with per-label
student counts (most common first, ties broken by Vietnamese collation), an **exemplary** list
(positives, no concern/support — ranked by positive count) and a **needs-support** list (any concern
or support — ranked by issue count). `mergeWeeks()` unions each student's tags across several weeks so
the **monthly** report counts each student once over the period. Helpers: `joinVi`, `joinLabels`,
`needLine`, `lcFirst`.

> **Design choice — raw notes stay out of class-level documents.** The aggregate is built from the
> controlled tag catalog only; verbatim `teacher_notes` are **not** transcribed into shared minutes
> or reports. This keeps every word of the output guard-checkable and avoids leaking sensitive
> free-text into a class-level document. Notes remain visible on the weekly screen and feed the
> per-student comment (M4).

### Meeting minutes (`meetingMinutes.ts`)

`generateMeetingMinutes({ className, weekLabel, meetingTime?, records })` →
`{ text, aggregate }`. Emits the 8 requested sections: header (thời gian / lớp / tuần) →
**1.** Tình hình chung → **2.** Ưu điểm → **3.** Tồn tại / vấn đề cần khắc phục → **4.** Học sinh
tiêu biểu → **5.** Học sinh cần quan tâm, hỗ trợ → **6.** Biện pháp của GVCN → **7.** Phương hướng
tuần tới. Measures and direction adapt to whether anyone needs support.

### Weekly / monthly reports (`homeroomReport.ts`)

`generateWeeklyReport({ className, weekLabel, records })` and
`generateMonthlyReport({ className, periodLabel, weeks[] })` → `{ text, aggregate }`. They share a
5-section body (tổng quan → ưu điểm → điểm cần cố gắng → tiêu biểu → cần hỗ trợ) + a phương-hướng
block. The **monthly** report adds a *"Diễn biến theo tuần"* section (one line per week) and merges
students across the period (Risk #4 — grouping weeks → month).

### Tone + safety (shared guard with M4)

Issues are framed as **shared growth points with cooperative measures** ("nhắc nhở nhẹ nhàng",
"phối hợp với gia đình", "để các em tiến bộ") — never blame against students or families. Each
generator self-asserts its **entire** controlled output is banned-phrase-free via the M4
`findBannedPhrases` guard (the documents contain no free-text, so the whole document is checked).
**Empty weeks/months** produce a safe, complete document with explicit fallbacks and a
*"tổng hợp từ các quan sát đã được ghi nhận"* disclaimer — never a crash.

## Persistence — reusing `homeroom_reports` (no migration)

All three artifacts save into the existing `homeroom_reports` table via `createReport` — **no
data-model change**. The table's `period_kind` CHECK already allows `week` / `month`:

| Artifact | `period_kind` | `week_id` | `period_label` |
|----------|---------------|-----------|----------------|
| Meeting minutes | `week` | the week | `Biên bản · <tuần>` |
| Weekly report | `week` | the week | `Báo cáo tuần · <tuần>` |
| Monthly report | `month` | `null` | `Báo cáo tháng · <Tháng M/YYYY>` |

The artifact kind is encoded in `period_label`, so `(class_id, period_kind, period_label)` uniquely
identifies one artifact instance. The new `getLatestReport(exec, classId, periodKind, periodLabel)`
reader returns the latest saved version (max `id`) for prefill, and cleanly distinguishes minutes
from the weekly report for the *same* week.

## Screen flow ("Biên bản & Báo cáo")

Mounted in **both** the "Biên bản họp lớp" (`initialKind="minutes"`) and "Báo cáo tuần/tháng"
(`initialKind="weekly"`) sidebar slots — one reusable component.

1. **Choose a class** (`listClasses`). Empty state → points to "Lớp & Học sinh".
2. **Choose an artifact** (Biên bản họp lớp / Báo cáo tuần / Báo cáo tháng).
3. **Choose a period:** a **week** (`listWeeksByClass`) for minutes/weekly, or a **month** for the
   monthly report. Months are grouped from the weeks' `start_date` (`YYYY-MM` → "Tháng M/YYYY");
   undated weeks fall into "Các tuần khác". Minutes also take an optional free-text meeting time.
4. The screen reads each week's records via the M3 DAL (`listWeeklyRecordsByWeek` +
   `listRecordTagIdsByWeek`, resolved against `listTags` + `listStudentsByClass`), aggregates, and
   **generates the document**. A previously saved version (`getLatestReport`) is prefilled.
5. The document shows in an **editable textarea**; a warning appears if the (edited) text contains
   banned phrasing. **"Tạo lại văn bản"** regenerates fresh text (discarding edits).
6. **Lưu văn bản** inserts the current text into `homeroom_reports`
   (`edited_by_user` = whether it differs from the generated baseline). Nothing is sent.

## Sample output (real generator output)

```
BIÊN BẢN HỌP LỚP – SINH HOẠT CHỦ NHIỆM
Lớp: 8A    Tuần: Tuần 1 (02/09–06/09)
Thời gian: 15h00 ngày 06/09/2025

1. Tình hình chung
Trong tuần, giáo viên đã ghi nhận quan sát cho 4 học sinh: 3 em có ghi nhận tích cực, 1 em cần cố
gắng thêm và 1 em cần được quan tâm, hỗ trợ.

2. Ưu điểm
- Đi học đầy đủ (3 học sinh)
- Giúp đỡ bạn bè (1 học sinh)
- Tích cực phát biểu (1 học sinh)

3. Tồn tại / vấn đề cần khắc phục
- Cần tập trung hơn trong giờ học (1 học sinh)

4. Học sinh tiêu biểu
- Nguyễn Văn An (8A-01)
- Trần Thị Bình (8A-02)

5. Học sinh cần quan tâm, hỗ trợ
- Lê Hoàng Cường (8A-03): cần tập trung hơn trong giờ học.
- Phạm Thị Dung (8A-04): cần phối hợp với gia đình.

6. Biện pháp của giáo viên chủ nhiệm
- Tiếp tục động viên, khích lệ những em có tiến bộ và giữ vững nề nếp lớp.
- Quan tâm, nhắc nhở nhẹ nhàng và phối hợp với gia đình để hỗ trợ kịp thời những em còn khó khăn.

7. Phương hướng tuần tới
- Duy trì và phát huy những ưu điểm của tuần qua.
- Tiếp tục theo dõi, hỗ trợ những em cần giúp đỡ để các em tiến bộ.
- Phấn đấu nâng cao chất lượng học tập và rèn luyện nề nếp trong tuần tới.

(Biên bản được tổng hợp từ các quan sát đã được ghi nhận trong tuần.)
```

```
BÁO CÁO THÁNG – CÔNG TÁC CHỦ NHIỆM
Lớp: 8A    Kỳ: Tháng 9/2025 (gồm 2 tuần: Tuần 1, Tuần 2; 2 tuần có ghi nhận)
… (5 body sections) …
6. Diễn biến theo tuần
- Tuần 1: 3 em tích cực, 1 em cần cố gắng, 1 em cần hỗ trợ.
- Tuần 2: 2 em tích cực, 0 em cần cố gắng, 0 em cần hỗ trợ.
7. Phương hướng kỳ tới
…
(Báo cáo được tổng hợp từ các quan sát đã được ghi nhận trong các tuần của kỳ.)
```

Empty week → a safe report ("Trong tuần, chưa có ghi nhận quan sát nào được lưu… Báo cáo dựa trên dữ
liệu hiện có.") with each section carrying its own fallback line — no crash.

## Commands run & results

| Command | Result |
|---------|--------|
| `npm run test` (`vitest run`) | ✅ **75 passed** (was 55; **+20** = 9 minutes + 7 reports + 4 reports DAL). |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; bundle 1,253.15 kB / 361.75 kB gzip; CSS 4.90 kB. |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: M6 changed only the web frontend + TS modules — no Tauri
runtime, capability, or `tauri.conf.json` change, and no data-model/migration change.

## Dependencies added

**None.** The generators are plain TypeScript reusing M4's guard; the screen reuses the in-memory
page switcher, native controls, and plain CSS established in M2.5/M3/M4/M5. No router / UI framework.

## Risks / deferred (documented, not silently skipped)

- **Teacher / school sign-off of wording.** The standard headings and phrasings ("BIÊN BẢN HỌP
  LỚP…", biện pháp/phương hướng templates) should be reviewed by a real homeroom teacher against
  local school report norms before they harden. Templates are plain strings → re-wording needs no
  structural change.
- **Monthly grouping depends on week `start_date`.** Weeks are bucketed by calendar month from their
  start date; undated weeks fall into a single "Các tuần khác" bucket. A richer term/semester model
  is out of M6 scope (Risk #4).
- **Notes intentionally excluded** from class-level documents (see Design choice above) — a
  deliberate privacy + guard-integrity decision, not an omission.
- **Tag taxonomy (Risk #3)** still feeds generated text (same provisional 22-tag catalog as M3–M5).
- **Runtime GUI smoke-check.** Headless VPS has no WebKitGTK display. On a desktop via
  `npm run tauri dev`: seed 8A → "Ghi nhận tuần" (record ≥3 students across 2 weeks) → "Biên bản họp
  lớp" / "Báo cáo tuần/tháng" → switch artifact/week/month → edit → save → reopen and confirm
  prefill. Generation + save/reload are fully unit-tested; this is wiring verification.
- **Component tests (RTL)** — still gated on the ask-first dependency decision.
- **Report history UI** — `homeroom_reports` keeps every save; the screen surfaces only the latest
  per (class, kind, period). A history/version view is out of M6 scope.
- **Code-splitting** the `exceljs`/`plugin-sql` bundle — same deferred optimization as M2.5–M5.

## Next recommended milestone

**M7 — Exports: DOCX / PDF / XLSX.** Define the generator→export **view-model contract** first
(plan.md §M7), then build `lib/export/` mappers (`docxtemplater` over a `templates/` file, a
print-friendly route for PDF, a SheetJS workbook) wired to the current artifact, with view-model +
mapper structure tests and a manual open-in-Word/Excel/PDF diacritics check.
