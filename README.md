# GVCN AutoReport

Phần mềm hỗ trợ **giáo viên chủ nhiệm** (GVCN) bậc THCS: quản lý danh sách lớp, ghi nhận
tuần (chuyên cần · học tập · nề nếp · việc tốt · cần hỗ trợ), sinh **nhận xét học sinh**,
**tin nhắn phụ huynh**, **biên bản họp lớp**, **báo cáo tuần/tháng**, và **xuất file**
DOCX / PDF / XLSX phục vụ minh chứng hồ sơ "giáo viên chủ nhiệm giỏi".

> **Local-first · offline.** Toàn bộ dữ liệu nằm trong một file SQLite trên máy giáo viên
> (`sqlite:gvcn.db`). Ứng dụng **không** gọi API bên ngoài và **không** gửi dữ liệu học sinh
> đi đâu. Tin nhắn phụ huynh / báo cáo là **bản nháp** để giáo viên duyệt — không tự động gửi.

This is the MVP desktop app (**Tauri + React + TypeScript + Vite**, SQLite data layer).
All student data shown in development is **fake/demo data**.

---

## Yêu cầu môi trường (Prerequisites)

- **Node.js** ≥ 20 và **npm** ≥ 10
- **Rust** (stable) + Cargo — để chạy/đóng gói lớp vỏ Tauri
- Thư viện hệ thống của Tauri 2 (Linux: `webkit2gtk-4.1`, `libgtk-3`, `librsvg2`, `patchelf`…);
  xem https://tauri.app/start/prerequisites/

## Cài đặt (Install)

```bash
npm install
```

## Chạy thử (Run)

```bash
# Web/dev UI trong trình duyệt (nhanh, không cần Rust) — phần lớn màn hình chạy được
npm run dev

# Ứng dụng desktop thật (mở cửa sổ Tauri, dùng SQLite thật)
npm run tauri dev
```

> `npm run dev` đủ để xem giao diện và thao tác hầu hết luồng. Cần `npm run tauri dev` để
> kiểm tra **lưu trữ SQLite thật** và **mở lại app thấy dữ liệu còn nguyên**.

## Kiểm thử & chất lượng (Quality scripts)

```bash
npm run test        # vitest run — bộ test logic thuần (100 tests)
npm run typecheck   # tsc --noEmit
npm run build       # tsc && vite build (bản web tĩnh)
cd src-tauri && cargo check   # biên dịch kiểm tra lớp Rust
npm audit           # kiểm tra lỗ hổng phụ thuộc
```

> `lint` / ESLint **chưa được cấu hình** (deferred — xem `tasks/todo.md` M0). `typecheck` ở
> chế độ `strict` hiện đảm nhận phần kiểm tra tĩnh.

## Đóng gói desktop (Build installers)

```bash
npm run tauri build
```

Sản phẩm trên **Linux** nằm ở `src-tauri/target/release/bundle/`:

- `deb/gvcn-autoreport_0.1.0_amd64.deb`
- `rpm/gvcn-autoreport-0.1.0-1.x86_64.rpm`
- và binary `src-tauri/target/release/gvcn-autoreport`

> macOS (`.dmg`) và Windows (`.exe`/`.msi`) phải build trên đúng hệ điều hành đó (hoặc qua CI
> theo từng OS). CI đóng gói đa nền tảng **chưa** nằm trong phạm vi MVP này.

---

## Luồng demo (Demo workflow)

App khởi động vào lớp vỏ với thanh điều hướng tiếng Việt. Trình tự demo cho lớp mẫu **8A**:

1. **Lớp & Học sinh** → bấm **"Tải dữ liệu mẫu 8A"** → tạo lớp 8A với 12 học sinh giả
   (mã `8A-01`…`8A-12`) và 2 tuần mẫu.
2. *(tuỳ chọn)* **Nhập từ Excel** → chọn file `.xlsx` → xem trước + lỗi từng dòng → nhập
   các dòng hợp lệ vào lớp.
3. **Ghi nhận tuần** → chọn lớp + tuần (hoặc **"Tạo tuần mới"**) → gắn thẻ & ghi chú cho học sinh → lưu.
4. **Nhận xét học sinh** → chọn lớp + tuần → sinh nhận xét → sửa → lưu.
5. **Tin nhắn phụ huynh** → sinh bản nháp tin nhắn hợp tác → sửa → lưu *(không gửi)*.
6. **Biên bản họp lớp** và **Báo cáo tuần/tháng** → sinh từ dữ liệu đã ghi → sửa → lưu.
7. **Xuất DOCX/PDF/XLSX** → chọn lớp + loại tài liệu + tuần/tháng → xem trước → **Tải DOCX** /
   **Tải XLSX** / **In · Lưu PDF**.
8. **Mở lại app** → dữ liệu lớp/tuần/nhận xét/báo cáo vẫn còn (lưu trong SQLite cục bộ).

Bộ kiểm tra thủ công đầy đủ: **[`docs/demo-checklist.md`](docs/demo-checklist.md)**.

## Giới hạn đã biết (Known limitations)

- **Claude Export (xuất tóm tắt ẩn danh để dán vào Claude) chưa làm** — đây là mốc tiếp theo
  (M8 theo `tasks/plan.md`). Nav slot "Claude Export" hiện là placeholder.
- **PDF** xuất qua hộp thoại in của webview ("Save as PDF"); bố cục phụ thuộc thiết lập in.
- **DOCX** là bản tối giản (tiêu đề, mục, đoạn, bảng có viền) — chưa có letterhead/header/footer.
- **Lưu file** dùng tải Blob của trình duyệt, chưa có hộp thoại "Save As" gốc của hệ điều hành.
- **ESLint** chưa cấu hình; **router** dùng state in-memory (chưa có thư viện routing).
- Cần **chạy thử GUI trên máy có màn hình** để xác nhận: tạo file SQLite, dữ liệu còn sau khi
  mở lại, và mở được file DOCX/XLSX/PDF đã xuất (môi trường VPS không có màn hình).

## Cấu trúc & tài liệu (Structure & docs)

- `src/` — frontend (React/TS). `src-tauri/` — lớp vỏ Rust/Tauri + migrations SQLite.
- `docs/m0…m8-*.md` — ghi chú từng mốc. `SPEC.md`, `tasks/plan.md`, `tasks/todo.md` — đặc tả & kế hoạch.
- Dữ liệu học sinh trong repo là **giả/demo**. Không commit tên thật, SĐT, địa chỉ, điểm,
  hoàn cảnh, hay ghi chú nhạy cảm.
</content>
</invoke>
