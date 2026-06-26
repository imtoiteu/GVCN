# M7 — Exports: DOCX / PDF / XLSX

> Session scope: the **M7 vertical slice** only — a shared export view-model + DOCX / XLSX / print-PDF
> writers that map the **already-generated, guard-checked** GVCN artifacts (M4 comments, M5 parent
> messages, M6 minutes + weekly/monthly reports) into downloadable teacher files, plus a "Xuất file"
> screen. **No** Claude Export / anonymize (M8), no charts, no template designer, no external AI, no
> Zalo/SMS/email, no router migration, no CI packaging. See [`../SPEC.md`](../SPEC.md) §4/§10 and
> [`../tasks/plan.md`](../tasks/plan.md) §M7.
>
> Date: 2026-06-26 · Env: headless Linux VPS, Node v20.20.2, npm 10.8.2.

## What was built

| File | Role |
|------|------|
| `src/lib/export/exportModel.ts` | **New** normalized `ExportModel` + pure builders (`buildReportModel`, `buildListModel`, `reportSummaryTable`, `asciiSlug`). |
| `src/lib/export/zip.ts` | **New** minimal store-only ZIP writer + CRC-32 (deterministic, no dependency). |
| `src/lib/export/docx.ts` | **New** minimal OOXML (.docx) writer (`buildDocumentXml`, `modelToDocx`, `DOCX_MIME`). |
| `src/lib/export/xlsx.ts` | **New** XLSX writer reusing **ExcelJS** (`modelToXlsx`, `XLSX_MIME`). |
| `src/lib/export/printHtml.ts` | **New** print-ready HTML (the PDF path) (`modelToPrintHtml`). |
| `src/lib/export/download.ts` | **New** Blob/anchor download + print-window helpers (the only DOM-touching part). |
| `src/lib/export/index.ts` | **New** barrel. |
| `src/lib/export/__tests__/*.test.ts` | **+25 tests** (model, zip/CRC, docx XML+bytes, xlsx round-trip, print-HTML). |
| `src/features/exports/ExportsPage.tsx` | The "Xuất file" screen. |
| `src/features/reports/ReportsPage.tsx` | `weekLabel` / `buildMonths` / `loadWeekObservations` / `MonthGroup` **exported** for reuse (no logic change). |
| `src/app/nav.tsx` | `exports` slot wired from placeholder → `ExportsPage`. |
| `src/app/i18n.ts` | `exportsPage` copy block + `exportArtifactLabel()` + `ExportArtifactChoice`. |
| `src/app/app-shell.css` | small `.export-preview` block (scrollable preview). |

## The view-model (`exportModel.ts`)

One format-agnostic shape that every writer consumes:

```ts
interface ExportModel {
  artifactType: 'minutes' | 'weeklyReport' | 'monthlyReport' | 'comments' | 'parentMessages';
  title: string;
  meta: string[];               // sub-header lines
  blocks: { heading: boolean; text: string }[];  // document body (DOCX / PDF)
  table: { columns: string[]; rows: string[][] } | null;  // tabular view (XLSX)
  filenameBase: string;         // ASCII slug, no extension
}
```

The builders **map already-generated prose** — they never re-derive Vietnamese text:

- `buildReportModel(...)` parses a generated minutes/report string: first line → title, lines before
  the first numbered section → meta, the rest → blocks (numbered lines flagged as headings). Optional
  `reportSummaryTable(aggregate)` provides the XLSX KPI rows.
- `buildListModel(...)` turns saved per-student comments/messages into "Name (Code)" heading blocks +
  text, and a `[Mã học sinh, Họ và tên, <Nhận xét|Tin nhắn>]` table.
- `asciiSlug(...)` strips Vietnamese diacritics (NFD + đ→d) for safe filenames.

This honors the plan's "define the generator→export view-model contract" (plan.md §M7) and the rule
**"export code must not duplicate the generation logic from M4/M5/M6."** Reports are generated live by
calling the *pure* M6 generators (reuse, not duplication); comment/message **lists are read from the
teacher's saved drafts** (`listLatestCommentsByWeek` / `listLatestParentMessagesByWeek`) so exports
carry their reviewed, edited wording.

## Formats & the zero-dependency decision

**No new dependencies were added** — the lowest supply-chain-risk path, consistent with M2.5–M6 and
the project dependency policy (prefer safest/most-maintainable deps, no CDN installs, `npm audit`).

| Format | How | Why |
|--------|-----|-----|
| **XLSX** | reuse **ExcelJS** (already vetted; replaced `xlsx` for security in M2) | round-trips with the import engine |
| **DOCX** | hand-rolled minimal OOXML + a store-only ZIP writer (`zip.ts`/`docx.ts`) | deterministic, unit-testable, integrity-verifiable with `unzip -t`; avoids adding `docxtemplater`+`pizzip` or `docx` |
| **PDF** | print-friendly HTML (`printHtml.ts`) + webview/browser **Save as PDF** | safest path for this codebase; no PDF engine bundled |
| **File save** | Blob + `<a download>` (`download.ts`); PDF opens a print window | no Tauri fs/dialog plugin, no capability/packaging change |

> **Deferred upgrade paths (documented, not silently skipped):** `docxtemplater` over a hand-editable
> `templates/*.docx` (plan Risk #5) for richer templates, and `@tauri-apps/plugin-dialog` + `-fs` for a
> native "Save As" dialog. Both are pure additions over the stable `ExportModel` contract.

The DOCX writer emits exactly the three parts Word needs and is **deterministic** (fixed 1980-01-01 DOS
timestamp → identical bytes for identical input).

## Screen flow ("Xuất file")

1. **Choose a class** (`listClasses`). Empty → points to "Lớp & Học sinh".
2. **Choose an artifact:** Biên bản họp lớp / Báo cáo tuần / Báo cáo tháng / Danh sách nhận xét /
   Danh sách tin nhắn phụ huynh.
3. **Choose a period:** a **week** (most artifacts) or a **month** (monthly report; grouped from week
   `start_date`, reusing M6's `buildMonths`). Minutes also take an optional meeting time.
4. **Preview** the normalized model (title + meta + blocks, or the table for lists).
5. **Export:** *Tải DOCX*, *Tải XLSX*, or *In / Lưu PDF*. Comment/message lists with nothing saved
   show a clear "tạo và lưu ở màn hình tương ứng trước" empty state — never a crash.

All export is **local/offline**; nothing is sent. Filenames are ASCII slugs, e.g.
`8a-bien-ban-tuan-1.docx`, `8a-bao-cao-thang-thang-9-2025.xlsx`, `8a-nhan-xet-tuan-1.docx`.

## Verification

| Command | Result |
|---------|--------|
| `npm run test` (`vitest run`) | ✅ **100 passed** (was 75; **+25** export tests across 5 files). |
| `npm run typecheck` (`tsc --noEmit`) | ✅ Exit 0. |
| `npm run build` (`tsc && vite build`) | ✅ Exit 0; bundle 1,271.66 kB / 367.18 kB gzip; CSS 5.05 kB. |
| `cd src-tauri && cargo check` | ✅ Finished (no Rust changed). |
| `npm audit` | ✅ 0 vulnerabilities. |

`npm run tauri build` was **not** re-run: M7 changed only the web frontend + TS modules — no Tauri
runtime, capability, `tauri.conf.json`, migration, or dependency change.

### Real-file integrity check (reproducible on the VPS, no Word/Excel needed)

A throwaway emitter wrote real files to scratch and verified them with the system `unzip` (then was
removed):

```
$ unzip -t sample-minutes.docx
    testing: [Content_Types].xml      OK
    testing: _rels/.rels              OK
    testing: word/document.xml        OK
No errors detected in compressed data of sample-minutes.docx.

$ unzip -l sample-minutes.docx
      429  1980-01-01 00:00   [Content_Types].xml
      297  1980-01-01 00:00   _rels/.rels
     2818  1980-01-01 00:00   word/document.xml

$ unzip -p sample-minutes.docx word/document.xml | grep -o "BIÊN BẢN HỌP LỚP|Đi học đầy đủ|Cần tập trung"
BIÊN BẢN HỌP LỚP
Cần tập trung
Đi học đầy đủ
```

`unzip -t` validates every entry's **CRC-32** (so the hand-rolled ZIP is byte-correct), and the
Vietnamese diacritics survive intact in `word/document.xml`. The ExcelJS `.xlsx` passes `unzip -t`
too. The `.xlsx` is additionally **round-tripped back through ExcelJS** in the test suite
(`xlsx.test.ts`) to confirm the cell content.

## Risks / deferred (documented, not silently skipped)

- **Headless-VPS limitation — visual open in Word/Excel/PDF.** The VPS has no Word/Excel/WebKitGTK
  display, so the final "opens cleanly in Microsoft Word / Excel / a PDF viewer with correct layout"
  check is the one manual step left. Byte/structure/CRC integrity and diacritics **are** verified here
  via `unzip -t` + the XLSX round-trip; on a desktop, open each exported file once to confirm rendering.
- **PDF fidelity depends on the print engine.** PDF is produced by the webview/browser print dialog
  over `printHtml.ts`; pagination/margins follow the user's print settings. A bundled PDF engine
  (`pdfmake`) remains the documented fallback if pixel-exact layout is later required.
- **DOCX is intentionally minimal** (title, meta, headings, paragraphs, bordered tables — no styles
  part, headers/footers, or page numbers). `docxtemplater` + a `templates/` file is the upgrade path
  for letterhead/branded documents (plan Risk #5).
- **Save uses a Blob download, not a native dialog.** Works in the webview + dev server with zero
  deps; `@tauri-apps/plugin-dialog`/`-fs` is the upgrade path for a native "Save As…" location picker.
- **Comment/message exports require saved drafts.** They read the teacher's saved per-student artifacts
  (so edits are respected); an unworked week shows a clear empty state rather than auto-generating.
- **Runtime GUI smoke-check** (needs a display): seed 8A → record a week → "Xuất file" → for each
  artifact, preview → download DOCX/XLSX → open them → In/Lưu PDF. The model→bytes path is unit-tested;
  this verifies the browser download + print wiring.
- **Tag taxonomy (Risk #3)** still feeds the generated text exported here (same provisional catalog).

## Next recommended milestone

**M8 — Claude Export (anonymized).** Add `src/lib/export/anonymize.ts` as the single PII boundary and
a "Claude Export" screen that produces a **student-code-only** summary to the clipboard, gated by a
**no-PII test** (asserts no name/phone/address/grade leaks — only codes). The M7 `ExportModel` +
`asciiSlug` give it a foundation; anonymization must run *before* any model is built for that path.
