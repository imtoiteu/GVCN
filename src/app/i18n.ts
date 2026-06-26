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

  weekly: {
    title: 'Ghi nhận tuần',
    intro:
      'Chọn lớp và tuần, sau đó ghi nhận quan sát cho từng học sinh bằng cách chọn các nhãn và thêm ghi chú ngắn. Dùng ngôn ngữ ghi nhận – hỗ trợ – phối hợp, không phê phán.',
    classLabel: 'Lớp:',
    weekLabel: 'Tuần:',
    newWeek: 'Tạo tuần mới',
    creatingWeek: 'Đang tạo tuần…',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Hãy sang màn hình “Lớp & Học sinh” để tải dữ liệu mẫu 8A hoặc nhập danh sách trước.',
    noWeekTitle: 'Lớp này chưa có tuần nào',
    noWeekHint: 'Bấm “Tạo tuần mới” để bắt đầu ghi nhận cho tuần đầu tiên.',
    rosterEmpty: 'Lớp này chưa có học sinh để ghi nhận.',
    notePlaceholder: 'Ghi chú ngắn cho học sinh (tùy chọn)…',
    save: 'Lưu ghi nhận tuần',
    saving: 'Đang lưu…',
    reload: 'Tải lại',
    savedTitle: 'Đã lưu ghi nhận',
    savedSummary: (n: number) => `Đã lưu ghi nhận cho ${n} học sinh trong tuần này.`,
    nothingToSave: 'Chưa có học sinh nào được chọn nhãn hoặc ghi chú để lưu.',
    selectedCount: (n: number) => `${n} nhãn đã chọn`,
    weekName: (no: number) => `Tuần ${no}`,
  },

  comments: {
    title: 'Tạo nhận xét học sinh',
    intro:
      'Chọn lớp và tuần đã ghi nhận. Ứng dụng tạo nhận xét tiếng Việt từ các nhãn và ghi chú của tuần đó. Bạn có thể chỉnh sửa trước khi lưu. Nhận xét được tạo cục bộ trên máy, không gửi ra ngoài.',
    classLabel: 'Lớp:',
    weekLabel: 'Tuần:',
    toneLabel: 'Văn phong:',
    toneShort: 'Ngắn gọn',
    toneBalanced: 'Cân đối',
    toneEncouraging: 'Động viên',
    regenerate: 'Tạo lại nhận xét',
    save: 'Lưu nhận xét',
    saving: 'Đang lưu…',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Hãy sang màn hình “Lớp & Học sinh” để tải dữ liệu mẫu 8A hoặc nhập danh sách trước.',
    noWeekTitle: 'Lớp này chưa có tuần nào',
    noWeekHint: 'Hãy sang màn hình “Ghi nhận tuần” để tạo tuần và ghi nhận quan sát trước.',
    noRecords: 'Tuần này chưa có học sinh nào được ghi nhận. Hãy ghi nhận ở màn hình “Ghi nhận tuần” trước.',
    editedBadge: 'đã lưu',
    warnBanned: (phrases: string) =>
      `Lưu ý: nhận xét có chứa từ ngữ nên tránh (${phrases}). Hãy chỉnh lại cho nhẹ nhàng, mang tính hỗ trợ.`,
    savedSummary: (n: number) => `Đã lưu ${n} nhận xét cho tuần này.`,
    nothingToSave: 'Chưa có nhận xét nào để lưu.',
  },

  parent: {
    title: 'Tin nhắn phụ huynh',
    intro:
      'Chọn lớp và tuần đã ghi nhận. Ứng dụng tạo bản nháp tin nhắn tiếng Việt gửi phụ huynh, mang tính phối hợp và tôn trọng. Đây chỉ là bản nháp để bạn chỉnh sửa rồi tự gửi; ứng dụng không gửi tin nhắn ra ngoài.',
    classLabel: 'Lớp:',
    weekLabel: 'Tuần:',
    typeLabel: 'Loại tin nhắn:',
    typeAuto: 'Tự động theo ghi nhận',
    typePraise: 'Khen ngợi / cập nhật tích cực',
    typeReminder: 'Nhắc nhở nhẹ nhàng',
    typeCooperation: 'Đề nghị phối hợp',
    typeSupport: 'Theo dõi & hỗ trợ',
    regenerate: 'Tạo lại tin nhắn',
    save: 'Lưu tin nhắn',
    saving: 'Đang lưu…',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Hãy sang màn hình “Lớp & Học sinh” để tải dữ liệu mẫu 8A hoặc nhập danh sách trước.',
    noWeekTitle: 'Lớp này chưa có tuần nào',
    noWeekHint: 'Hãy sang màn hình “Ghi nhận tuần” để tạo tuần và ghi nhận quan sát trước.',
    noRecords: 'Tuần này chưa có học sinh nào được ghi nhận. Hãy ghi nhận ở màn hình “Ghi nhận tuần” trước.',
    savedBadge: 'đã lưu',
    warnBanned: (phrases: string) =>
      `Lưu ý: tin nhắn có chứa từ ngữ nên tránh (${phrases}). Hãy chỉnh lại cho nhẹ nhàng, mang tính phối hợp.`,
    savedSummary: (n: number) => `Đã lưu ${n} tin nhắn phụ huynh cho tuần này.`,
    nothingToSave: 'Chưa có tin nhắn nào để lưu.',
  },

  reports: {
    title: 'Biên bản & Báo cáo',
    intro:
      'Chọn lớp và loại văn bản. Ứng dụng tổng hợp các ghi nhận đã lưu thành biên bản họp lớp hoặc báo cáo tuần/tháng bằng tiếng Việt. Bạn có thể chỉnh sửa trước khi lưu. Tất cả được tạo cục bộ trên máy, không gửi ra ngoài.',
    kindLabel: 'Loại văn bản:',
    kindMinutes: 'Biên bản họp lớp (tuần)',
    kindWeekly: 'Báo cáo tuần',
    kindMonthly: 'Báo cáo tháng',
    classLabel: 'Lớp:',
    weekLabel: 'Tuần:',
    monthLabel: 'Tháng:',
    timeLabel: 'Thời gian họp (tùy chọn):',
    timePlaceholder: 'VD: 15h00 ngày 06/09/2025',
    regenerate: 'Tạo lại văn bản',
    save: 'Lưu văn bản',
    saving: 'Đang lưu…',
    saved: 'đã lưu',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Hãy sang màn hình “Lớp & Học sinh” để tải dữ liệu mẫu 8A hoặc nhập danh sách trước.',
    noWeekTitle: 'Lớp này chưa có tuần nào',
    noWeekHint: 'Hãy sang màn hình “Ghi nhận tuần” để tạo tuần và ghi nhận quan sát trước.',
    noMonthTitle: 'Chưa nhóm được tháng nào',
    noMonthHint: 'Các tuần cần có ngày bắt đầu để nhóm theo tháng. Hãy tạo tuần ở màn hình “Ghi nhận tuần”.',
    otherMonths: 'Các tuần khác',
    warnBanned: (phrases: string) =>
      `Lưu ý: văn bản có chứa từ ngữ nên tránh (${phrases}). Hãy chỉnh lại cho nhẹ nhàng, mang tính hỗ trợ.`,
    savedOk: 'Đã lưu văn bản cho lớp này.',
  },

  exportsPage: {
    title: 'Xuất file (DOCX / PDF / XLSX)',
    intro:
      'Chọn lớp, loại văn bản và tuần/tháng để xem trước, sau đó tải xuống bản DOCX, XLSX hoặc in/lưu PDF. Tệp được tạo cục bộ trên máy, không gửi ra ngoài và chỉ dùng dữ liệu đã ghi nhận.',
    classLabel: 'Lớp:',
    artifactLabel: 'Loại văn bản:',
    weekLabel: 'Tuần:',
    monthLabel: 'Tháng:',
    timeLabel: 'Thời gian họp (tùy chọn):',
    timePlaceholder: 'VD: 15h00 ngày 06/09/2025',
    artMinutes: 'Biên bản họp lớp (tuần)',
    artWeekly: 'Báo cáo tuần',
    artMonthly: 'Báo cáo tháng',
    artComments: 'Danh sách nhận xét học sinh',
    artParentMessages: 'Danh sách tin nhắn phụ huynh',
    previewTitle: 'Xem trước nội dung sẽ xuất',
    downloadDocx: 'Tải DOCX',
    downloadXlsx: 'Tải XLSX',
    printPdf: 'In / Lưu PDF',
    exporting: 'Đang xuất…',
    docxOnly: '* Nhận xét/tin nhắn xuất DOCX và XLSX; in/lưu PDF qua trình duyệt.',
    listFromSaved:
      'Danh sách lấy từ các nhận xét/tin nhắn bạn đã lưu ở những màn hình tương ứng.',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Hãy sang màn hình “Lớp & Học sinh” để tải dữ liệu mẫu 8A hoặc nhập danh sách trước.',
    noWeekTitle: 'Lớp này chưa có tuần nào',
    noWeekHint: 'Hãy sang màn hình “Ghi nhận tuần” để tạo tuần và ghi nhận quan sát trước.',
    noMonthTitle: 'Chưa nhóm được tháng nào',
    noMonthHint: 'Các tuần cần có ngày bắt đầu để nhóm theo tháng. Hãy tạo tuần ở màn hình “Ghi nhận tuần”.',
    emptyListTitle: 'Chưa có nội dung để xuất',
    emptyListHint:
      'Tuần này chưa có nhận xét/tin nhắn nào được lưu. Hãy tạo và lưu ở màn hình tương ứng trước, rồi quay lại đây để xuất.',
    exportError: 'Không xuất được tệp. Vui lòng thử lại trong ứng dụng desktop.',
  },
} as const;

/** Which report artifact the "Biên bản & Báo cáo" screen is producing. */
export type ReportKind = 'minutes' | 'weekly' | 'monthly';

/** Vietnamese label for a report-kind choice. */
export function reportKindLabel(kind: ReportKind): string {
  switch (kind) {
    case 'minutes':
      return t.reports.kindMinutes;
    case 'monthly':
      return t.reports.kindMonthly;
    default:
      return t.reports.kindWeekly;
  }
}

/** Parent-message type as picked in the UI ('auto' lets the generator derive it per student). */
export type ParentTypeChoice = 'auto' | 'praise' | 'reminder' | 'cooperation' | 'support';

/** Vietnamese label for a parent-message type choice. */
export function parentTypeLabel(choice: ParentTypeChoice): string {
  switch (choice) {
    case 'praise':
      return t.parent.typePraise;
    case 'reminder':
      return t.parent.typeReminder;
    case 'cooperation':
      return t.parent.typeCooperation;
    case 'support':
      return t.parent.typeSupport;
    default:
      return t.parent.typeAuto;
  }
}

/** Vietnamese label for a comment tone. */
export function toneLabel(tone: 'short' | 'balanced' | 'encouraging'): string {
  switch (tone) {
    case 'short':
      return t.comments.toneShort;
    case 'encouraging':
      return t.comments.toneEncouraging;
    default:
      return t.comments.toneBalanced;
  }
}

/** Which artifact the "Xuất file" screen exports. Mirrors ExportArtifactType in lib/export. */
export type ExportArtifactChoice =
  | 'minutes'
  | 'weeklyReport'
  | 'monthlyReport'
  | 'comments'
  | 'parentMessages';

/** Vietnamese label for an export-artifact choice. */
export function exportArtifactLabel(choice: ExportArtifactChoice): string {
  switch (choice) {
    case 'minutes':
      return t.exportsPage.artMinutes;
    case 'weeklyReport':
      return t.exportsPage.artWeekly;
    case 'monthlyReport':
      return t.exportsPage.artMonthly;
    case 'comments':
      return t.exportsPage.artComments;
    case 'parentMessages':
      return t.exportsPage.artParentMessages;
  }
}

/** Display a stored gender code (M/F or null) as Vietnamese. */
export function genderLabel(gender: string | null): string {
  if (gender === 'M') return 'Nam';
  if (gender === 'F') return 'Nữ';
  return '—';
}

/** Vietnamese label for an observation-tag category (the 5 practical groups). */
export function categoryLabel(category: string): string {
  switch (category) {
    case 'attendance':
      return 'Chuyên cần';
    case 'study':
      return 'Học tập';
    case 'discipline':
      return 'Nề nếp';
    case 'good_deed':
      return 'Việc tốt';
    case 'support':
      return 'Cần hỗ trợ';
    default:
      return category;
  }
}
