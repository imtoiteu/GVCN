# Demo Checklist — Manual GUI Test (GVCN AutoReport MVP)

> Reproducible end-to-end check on a **machine with a display**, run **offline** (no network).
> Logic paths are already covered by 100 automated tests; this checklist verifies the parts
> that need a real desktop: the **Tauri webview**, **SQLite persistence**, **file download**,
> and **print → PDF**. Tick each box. Stop and note any ✗.

**Build/run under test:** `npm run tauri dev` (real SQLite) — or the installed `.deb`/`.rpm`.
**Data:** fake demo class **8A** only. No real student data.

---

## 0. Launch & offline
- [ ] App opens to the shell (window ~1200×800, title "GVCN AutoReport"), Vietnamese sidebar with all screens.
- [ ] Disconnect network (or confirm airplane mode). Everything below must work **offline**.
- [ ] On first run a SQLite DB is created (`sqlite:gvcn.db` in the app data dir) — no error toast.

## 1. Lớp & Học sinh (Classes & students)
- [ ] Click **"Tải dữ liệu mẫu 8A"**.
- [ ] Class **8A** appears; roster shows **12 students** with codes `8A-01`…`8A-12`.
- [ ] *(optional)* Create a second class manually; add/edit a student.

## 2. Nhập từ Excel (Excel import) — optional
- [ ] Open **Nhập từ Excel**, pick a `.xlsx` with student rows.
- [ ] Preview table renders; invalid rows are listed with per-row errors and are **skipped**.
- [ ] Commit valid rows into a class → summary shows inserted/skipped counts; duplicates by `student_code` skipped.
- [ ] Vietnamese names with diacritics import intact (e.g. "Nguyễn", "Đặng").

## 3. Ghi nhận tuần (Weekly records)
- [ ] Open **Ghi nhận tuần**, select class 8A. A demo week is selectable, or click **"Tạo tuần mới"**.
- [ ] For ≥3 students, toggle tags across the 5 categories (chuyên cần / học tập / nề nếp / việc tốt / cần hỗ trợ) and type a note.
- [ ] **Save**. Re-select the week → saved tags + notes reload correctly.

## 4. Nhận xét học sinh (Comments)
- [ ] Open **Nhận xét học sinh**, select class 8A + the recorded week → generate.
- [ ] Each comment is **respectful, specific, non-judgmental**; concern phrased as support; no insulting/punitive wording.
- [ ] Edit one comment, **Save**. Re-open → the edited text is prefilled.

## 5. Tin nhắn phụ huynh (Parent messages)
- [ ] Open **Tin nhắn phụ huynh**, same class + week → generate (type selector incl. "Tự động").
- [ ] Tone is **cooperative, not accusatory** ("phối hợp / đồng hành / mong / cảm ơn"); never blame.
- [ ] Edit + **Save** a draft. Confirm there is **no send/SMS/Zalo/email** action — drafts only.

## 6. Biên bản & Báo cáo (Minutes / weekly / monthly)
- [ ] Open **Biên bản họp lớp** → generate from the recorded week → sections render → edit + **Save**.
- [ ] Open **Báo cáo tuần/tháng** → **Báo cáo tuần** for the week; **Báo cáo tháng** for the month (grouped weeks) → generate + **Save**.
- [ ] Counts/highlights/support lists match what was recorded; empty period shows a safe message, not a crash.

## 7. Xuất file (Exports) — DOCX / XLSX / PDF
For **each** artifact (Biên bản · Báo cáo tuần · Báo cáo tháng · Danh sách nhận xét · Danh sách tin nhắn phụ huynh):
- [ ] **Xuất file** → choose class + artifact + week/month → preview renders (title, meta, blocks or table).
- [ ] **Tải DOCX** → a `.docx` downloads (e.g. `8a-bien-ban-tuan-1.docx`) → **opens in Word/LibreOffice**, diacritics intact, layout readable.
- [ ] **Tải XLSX** → a `.xlsx` downloads → **opens in Excel/LibreOffice Calc**, headers + rows correct.
- [ ] **In · Lưu PDF** → print dialog opens → **Save as PDF** produces a readable PDF.
- [ ] Comment/message lists with **nothing saved** show the "tạo và lưu… trước" empty state — no crash.
- [ ] Open exported files and confirm **no hidden/real student data** — only demo names + codes from 8A.

## 8. Persistence (reopen)
- [ ] **Close the app completely** and reopen (`npm run tauri dev` again, or relaunch the installed app).
- [ ] Class 8A, its students, the recorded week (tags + notes), saved comments, parent messages, minutes, and reports are **all still present**.

## 9. Safety spot-check
- [ ] No screen sends data anywhere (offline the whole time; no network activity).
- [ ] No surveillance/behavior-scoring framing; copy uses "ghi nhận / hỗ trợ / phối hợp / tiến bộ".
- [ ] Exported filenames are ASCII slugs; exported text contains only fake demo data.

---

### Result
- Date / machine / OS: ____________________
- Tester: ____________________
- Pass / Fail (note any ✗ with the step number): ____________________
</content>
