# M9.2 — Export Fix + Excel Template + Copyright Polish

> Fix unreliable DOCX/XLSX export in the Tauri desktop app, add a downloadable Excel import
> template with a clear format guide, and add an unobtrusive copyright line. Local-first/offline
> preserved; no cloud, accounts, AI APIs, or sending. Vietnamese default, English supported.
>
> Date: 2026-06-26 · Env: headless Linux VPS (GUI testing + `.dmg` deferred to the MacBook).

## Cause of the export failure

The export "download" used a browser Blob + a temporary `<a download>` click
(`src/lib/export/download.ts`). That works in a normal browser but **not inside the macOS Tauri
webview (WKWebView), which ignores the HTML `download` attribute and blocks blob-URL navigation**.
The click did nothing, and the surrounding `try/catch` surfaced it as the red error
*"Không xuất được tệp. Vui lòng thử lại trong ứng dụng desktop."* DOCX and XLSX generation
itself was fine — only the save mechanism was webview-incompatible.

## Export fix

New runtime-aware `saveBytes(filename, mime, bytes)` in `download.ts`:

- **Inside the Tauri desktop app** (detected via `window.__TAURI_INTERNALS__`): open the native
  **Save dialog** (`@tauri-apps/plugin-dialog` `save()`), then write the chosen path with a tiny
  Rust command `write_file_bytes(path, contents)` (`std::fs::write`). Returns `'cancelled'` if the
  user dismisses the dialog (not an error).
- **In a plain browser** (dev server): falls back to the existing Blob + `<a download>` download.

`ExportsPage` now `await`s `saveBytes` and shows a clear **success** message
("Đã lưu tệp: …" / "File saved: …"), keeps the Vietnamese/English **error** message, and silently
ignores a cancelled dialog. Filenames remain ASCII slugs; Vietnamese content/diacritics inside the
DOCX/XLSX are unchanged (generation path untouched).

### Why a tiny Rust command instead of the fs plugin

Writing the user-picked path with `std::fs::write` needs **no fs-plugin scope configuration**, which
can't be runtime-verified on the headless VPS. The path comes only from the native Save dialog the
user just confirmed, so it is never attacker-controlled. Smallest robust fix for a reliable result
on the MacBook.

## Tauri plugins / capabilities changed

- **npm:** added `@tauri-apps/plugin-dialog` (official first-party plugin).
- **Cargo:** added `tauri-plugin-dialog = "2"`; registered `tauri_plugin_dialog::init()` in
  `src-tauri/src/lib.rs`.
- **Command:** added `write_file_bytes` to the invoke handler (own command — no ACL permission
  needed).
- **Capabilities** (`src-tauri/capabilities/default.json`): added `dialog:default` and
  `dialog:allow-save`. No `fs` permissions added.

`cargo check` passes. The packaged app must be **rebuilt on the MacBook** (`npm run tauri build` /
`.dmg`) for the new plugin + capability to take effect — the VPS does not run the packaging step.

## PDF behavior (clarified, mechanism unchanged)

PDF stays a **print-to-PDF** flow (`openPrintHtml` → system print dialog → "Save as PDF"). The
button label is already "In / Lưu PDF" / "Print / Save PDF". Added an honest help line under the
export buttons (`exportsPage.printHint`) so the UI does not pretend a native PDF file is generated.

## Excel import template + format guide

- New pure builder `src/lib/import/template.ts` → `buildStudentTemplateWorkbook()` produces a
  `.xlsx` (reusing the existing **exceljs** dependency — no new package) with header row
  `Mã học sinh · Họ và tên · Giới tính · Ngày sinh · Ghi chú` and 3 fake sample rows
  (`8A-01 Nguyễn Văn An …`). Headers match the import engine's recognized aliases, so the template
  **round-trips** back through `importStudentsFromWorkbook` (covered by a test).
- `ImportPage` gains a **"Định dạng file Excel"** help card listing required vs optional columns and
  the rules (`.xlsx`, header row first, first worksheet, unique `Mã học sinh` per class), plus a
  **"Tải file Excel mẫu" / "Download Excel template"** button (saved through the same `saveBytes`
  path, so it works in the desktop app too).

## Copyright

Single source: `t.copyright = '© Triền Trần - Trường THCS Lê Mao'` rendered once in the app-shell
sidebar footer (`.shell__copyright`) under the offline/local status, which stays visible. Same
proper-name string in Vietnamese and English (the English dictionary falls back to it).

## i18n

Added (vi + en where they differ; copyright via fallback):
`importPage.format.*` (title/required/optional/columns/rules/download/notices),
`exportsPage.saved(name)` + `exportsPage.printHint`, and top-level `copyright`. Missing English keys
still fall back to Vietnamese — no crash.

## Verification (VPS)

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ 0 |
| `npm run build` | ✅ 0 (pre-existing chunk-size + informational dynamic-import notes only) |
| `npm run test` | ✅ **148 passed** (23 files; was 146, **+2**) |
| `cd src-tauri && cargo check` | ✅ Finished, 0 errors (dialog plugin compiled) |
| `npm audit` | ✅ 0 vulnerabilities |
| `npm run tauri build` | **Not run on VPS** — packaging/`.dmg` is the MacBook's job. |

**Dependencies added:** `@tauri-apps/plugin-dialog` (npm) + `tauri-plugin-dialog` (Cargo) — official
Tauri plugins. No other deps.

## Tests

- `src/lib/import/__tests__/template.test.ts` (**+1**): generated template re-imports to 3 valid
  students with correct codes, diacritics, normalized gender (Nam→M / Nữ→F), kept date, blank→null
  note.
- `src/app/__tests__/i18n.test.ts` (**+1**): new export-save / Excel-format / copyright keys present
  and non-empty in both locales.

## Needs manual GUI testing later (MacBook)

After `npm run tauri dev` (or the rebuilt `.dmg`):
1. **Export DOCX** for an artifact → native Save dialog opens → save → file opens in Word/LibreOffice,
   Vietnamese diacritics intact, "Đã lưu tệp: …" shown.
2. **Export XLSX** → same, opens in Excel/Calc with correct headers/rows.
3. **Cancel** the Save dialog → no error, no file.
4. **In / Lưu PDF** → system print dialog → "Save as PDF" produces a readable PDF; help line is clear.
5. **Import page** → "Tải file Excel mẫu" saves the template; re-importing it adds the 3 sample
   students (then duplicates are skipped on a second import).
6. **Copyright** "© Triền Trần - Trường THCS Lê Mao" visible in the sidebar in both vi and en; offline
   status still shown.
