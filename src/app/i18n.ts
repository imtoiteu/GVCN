// Minimal Vietnamese UX copy for the app shell + the two functional pages.
// Kept as a flat object (no i18n library yet) — the app is Vietnamese-first for the MVP.
// A real i18n layer (src/lib/i18n) is deferred to a later UI polish milestone.

export const t = {
  appTitle: 'GVCN AutoReport',
  appSubtitle: 'Trợ lý chủ nhiệm lớp',
  offline: 'Ngoại tuyến • dữ liệu lưu trên máy',

  common: {
    loading: 'Đang tải…',
    retry: 'Thử lại',
    // Shown when the live SQLite backend is unavailable (e.g. running in a plain browser
    // instead of the desktop app). The data layer only loads inside the Tauri webview.
    dbUnavailable:
      'Chưa kết nối được cơ sở dữ liệu cục bộ. Hãy mở ứng dụng desktop bằng lệnh “npm run tauri dev”.',
    comingSoon: 'Màn hình này sẽ được bổ sung ở các bước tiếp theo.',
  },

  classes: {
    title: 'Lớp & Học sinh',
    seedDemo: 'Tải dữ liệu mẫu 8A',
    seeding: 'Đang tạo dữ liệu mẫu…',
    emptyTitle: 'Chưa có lớp nào',
    emptyHint: 'Bấm “Tải dữ liệu mẫu 8A” để tạo một lớp mẫu (học sinh giả định, không có dữ liệu thật).',
    rosterEmpty: 'Lớp này chưa có học sinh.',
    colCode: 'Mã học sinh',
    colName: 'Họ và tên',
    colGender: 'Giới tính',
    colNote: 'Ghi chú',
    countLabel: (n: number) => `${n} học sinh`,
  },

  importPage: {
    title: 'Nhập danh sách từ Excel',
    intro:
      'Chọn tệp .xlsx chứa danh sách học sinh. Cần có cột “Mã học sinh” và “Họ và tên”. Các cột khác (giới tính, ngày sinh, ghi chú) là tùy chọn.',
    pickFile: 'Chọn tệp Excel (.xlsx)',
    targetClass: 'Nhập vào lớp:',
    noClassTitle: 'Chưa có lớp để nhập',
    noClassHint: 'Hãy tạo lớp mẫu ở màn hình “Lớp & Học sinh” trước, rồi quay lại đây.',
    parsing: 'Đang đọc tệp…',
    previewTitle: 'Xem trước dữ liệu hợp lệ',
    errorsTitle: 'Dòng có lỗi (sẽ bị bỏ qua)',
    noErrors: 'Không có dòng lỗi.',
    noValid: 'Không có dòng hợp lệ nào để nhập.',
    rowsSummary: (valid: number, total: number) =>
      `${valid}/${total} dòng hợp lệ.`,
    commit: 'Nhập vào lớp',
    committing: 'Đang nhập…',
    committedTitle: 'Đã nhập xong',
    committedSummary: (inserted: number, skipped: number) =>
      `Đã thêm ${inserted} học sinh mới; bỏ qua ${skipped} mã đã tồn tại.`,
    colRow: 'Dòng',
    colField: 'Cột',
    colMessage: 'Lỗi',
  },
} as const;

/** Display a stored gender code (M/F or null) as Vietnamese. */
export function genderLabel(gender: string | null): string {
  if (gender === 'M') return 'Nam';
  if (gender === 'F') return 'Nữ';
  return '—';
}
