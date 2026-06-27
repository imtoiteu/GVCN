// UI copy for the app shell + every functional page.
//
// Vietnamese-first by design: `vi` is the canonical, complete dictionary and the default
// locale. `en` is a *partial* English dictionary — any key it omits falls back to the
// Vietnamese value via deepMerge, so a missing English string can never crash the UI.
//
// Reactivity without an i18n framework: `t` is an exported *live binding* (an exported
// `let`). `setLocale()` swaps it to the resolved dictionary for the chosen locale; the app
// shell holds the locale in React state, so switching re-renders the tree and every page
// (which reads `t` as a module import) picks up the new strings. No per-page wiring needed.
//
// Generated GVCN artifact bodies (comments, parent messages, minutes, weekly/monthly
// reports, exported document text) stay Vietnamese regardless of UI locale — see
// docs/m8-1-i18n-polish.md. Only the UI chrome here is bilingual.

export type Locale = 'vi' | 'en';

/** Default UI language. Vietnamese — the product's primary audience. */
export const DEFAULT_LOCALE: Locale = 'vi';

const STORAGE_KEY = 'gvcn.locale';

// --- Vietnamese (canonical, complete) ---------------------------------------------------

const vi = {
  appTitle: 'GVCN AutoReport',
  appSubtitle: 'Trợ lý chủ nhiệm lớp',
  offline: 'Ngoại tuyến • dữ liệu lưu trên máy',
  copyright: '© Triền Trần - Trường THCS Lê Mao',

  lang: {
    label: 'Ngôn ngữ',
    vi: 'Tiếng Việt',
    en: 'English',
  },

  nav: {
    dashboard: 'Bảng điều khiển',
    classes: 'Lớp & Học sinh',
    import: 'Nhập từ Excel',
    weekly: 'Ghi nhận tuần',
    comments: 'Nhận xét học sinh',
    parent: 'Tin nhắn phụ huynh',
    minutes: 'Biên bản họp lớp',
    reports: 'Báo cáo tuần/tháng',
    exports: 'Xuất DOCX/PDF/XLSX',
    claude: 'Xuất ẩn danh cho AI',
    settings: 'Cài đặt',
  },

  a11y: {
    mainNav: 'Điều hướng chính',
  },

  common: {
    loading: 'Đang tải…',
    retry: 'Thử lại',
    // Shown when the live SQLite backend is unavailable (e.g. running in a plain browser
    // instead of the desktop app). The data layer only loads inside the Tauri webview.
    dbUnavailable:
      'Chưa kết nối được cơ sở dữ liệu cục bộ. Hãy mở ứng dụng desktop bằng lệnh “npm run tauri dev”.',
    comingSoon: 'Màn hình này sẽ được bổ sung ở các bước tiếp theo.',
  },

  actions: {
    add: 'Thêm',
    edit: 'Sửa',
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    archive: 'Lưu trữ',
    restore: 'Khôi phục',
    confirm: 'Xác nhận',
    goWeekly: 'Đi tới Ghi nhận tuần',
    goClasses: 'Đi tới Lớp & Học sinh',
  },

  dashboard: {
    title: 'Bảng điều khiển',
    intro: 'Tổng quan nhanh về lớp và tiến độ ghi nhận. Mọi dữ liệu được lưu cục bộ trên máy.',
    statClasses: 'Số lớp',
    statStudents: 'Học sinh (lớp hiện tại)',
    statCurrentClass: 'Lớp hiện tại',
    statCurrentWeek: 'Tuần hiện tại',
    statRecorded: 'Đã ghi nhận tuần này',
    statComments: 'Nhận xét đã lưu',
    statMessages: 'Tin nhắn đã lưu',
    statReports: 'Biên bản / báo cáo đã lưu',
    recordedOf: (done: number, total: number) => `${done}/${total} học sinh`,
    none: '—',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Bắt đầu bằng cách tải dữ liệu mẫu 8A hoặc tạo lớp ở màn hình “Lớp & Học sinh”.',
    quickActionsTitle: 'Thao tác nhanh',
    qaClasses: 'Lớp & Học sinh',
    qaWeekly: 'Ghi nhận tuần',
    qaComments: 'Tạo nhận xét',
    qaParent: 'Tin nhắn phụ huynh',
    qaReports: 'Biên bản & Báo cáo',
    qaExports: 'Xuất file',
    qaClaude: 'Xuất ẩn danh cho AI',
    workflowTitle: 'Quy trình gợi ý',
    step1: 'Thêm hoặc nhập danh sách học sinh.',
    step2: 'Ghi nhận quan sát theo tuần.',
    step3: 'Tạo nhận xét / tin nhắn phụ huynh.',
    step4: 'Tạo biên bản, báo cáo và xuất file.',
  },

  settings: {
    title: 'Cài đặt',
    intro: 'Tùy chọn hiển thị và thông tin về cách ứng dụng bảo vệ dữ liệu.',
    langTitle: 'Ngôn ngữ',
    langDesc: 'Chọn ngôn ngữ giao diện. Tiếng Việt là mặc định; văn bản giáo dục được tạo vẫn ở tiếng Việt.',
    privacyTitle: 'Cục bộ & riêng tư',
    privacyDesc:
      'Toàn bộ dữ liệu nằm trong một tệp cơ sở dữ liệu trên máy của bạn. Ứng dụng hoạt động ngoại tuyến và không gửi dữ liệu học sinh ra ngoài.',
    aiTitle: 'Xuất ẩn danh cho AI',
    aiDesc:
      'Tính năng “Xuất ẩn danh cho AI” tạo bản tóm tắt chỉ dùng mã ẩn danh (S001…), loại bỏ tên/số điện thoại/email/địa chỉ. Bạn tự sao chép thủ công; ứng dụng không tự gửi.',
    versionLabel: 'Phiên bản ứng dụng',
    storageTitle: 'Lưu trữ dữ liệu',
    storageDesc: 'Cơ sở dữ liệu SQLite cục bộ (sqlite:gvcn.db) trong thư mục dữ liệu của ứng dụng.',
    demoTitle: 'Dữ liệu mẫu & thử nghiệm',
    demoDesc: 'Dùng dữ liệu học sinh giả định cho demo. Không nhập dữ liệu cá nhân thật của học sinh.',
    noCloudTitle: 'Không có đám mây',
    noCloudDesc: 'Không tài khoản, không đồng bộ đám mây, không gọi API bên ngoài, không tự động gửi tin.',
  },

  classes: {
    title: 'Lớp & Học sinh',
    seedDemo: 'Tải dữ liệu mẫu 8A',
    seeding: 'Đang tạo dữ liệu mẫu…',
    seedExists: 'Dữ liệu mẫu 8A đã có',
    reloadDemo: 'Nạp lại dữ liệu mẫu',
    emptyTitle: 'Chưa có lớp nào',
    emptyHint: 'Bấm “Tải dữ liệu mẫu 8A” để tạo một lớp mẫu (học sinh giả định, không có dữ liệu thật).',
    rosterEmpty: 'Lớp này chưa có học sinh.',
    colCode: 'Mã học sinh',
    colName: 'Họ và tên',
    colGender: 'Giới tính',
    colNote: 'Ghi chú',
    colStatus: 'Trạng thái',
    colActions: 'Thao tác',
    countLabel: (n: number) => `${n} học sinh`,
    // class CRUD
    addClass: 'Thêm lớp',
    editClass: 'Sửa lớp',
    className: 'Tên lớp',
    schoolYear: 'Năm học',
    homeroomTeacher: 'GVCN (tùy chọn)',
    deleteClass: 'Xóa lớp',
    deleteClassConfirm: 'Xóa lớp trống này?',
    deleteClassBlocked: (n: number) =>
      `Không thể xóa: lớp còn ${n} học sinh. Hãy chuyển/lưu trữ học sinh trước, hoặc giữ lại lớp.`,
    dupClass: 'Đã có lớp cùng tên và năm học.',
    classRequired: 'Cần nhập tên lớp và năm học.',
    // student CRUD
    studentsTitle: 'Danh sách học sinh',
    addStudent: 'Thêm học sinh',
    editStudent: 'Sửa học sinh',
    showArchived: 'Hiện học sinh đã lưu trữ',
    activeBadge: 'Đang học',
    archivedBadge: 'Đã lưu trữ',
    archiveStudentConfirm: 'Lưu trữ học sinh này? Dữ liệu vẫn được giữ, chỉ ẩn khỏi danh sách hoạt động.',
    deleteStudentConfirm: 'Xóa vĩnh viễn học sinh này?',
    deleteStudentBlocked: (n: number) =>
      `Không thể xóa: học sinh có ${n} bản ghi liên quan. Hãy dùng “Lưu trữ” để giữ an toàn dữ liệu.`,
    dupStudentCode: 'Mã học sinh đã tồn tại trong lớp này.',
    studentRequired: 'Cần nhập mã học sinh và họ tên.',
    notePlaceholder: 'Ghi chú (tùy chọn, không nhập thông tin nhạy cảm)…',
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
    readError: 'Không đọc được tệp Excel.',
    format: {
      title: 'Định dạng file Excel',
      requiredTitle: 'Cột bắt buộc',
      optionalTitle: 'Cột tùy chọn',
      colCode: 'Mã học sinh',
      colName: 'Họ và tên',
      colGender: 'Giới tính',
      colDob: 'Ngày sinh',
      colNote: 'Ghi chú',
      ruleXlsx: 'Tệp phải có định dạng .xlsx (Excel).',
      ruleHeader: 'Dòng đầu tiên phải là tên các cột (tiêu đề).',
      ruleSheet: 'Dữ liệu nằm ở trang tính (sheet) đầu tiên.',
      ruleUnique: '“Mã học sinh” phải là duy nhất trong lớp được chọn.',
      download: 'Tải file Excel mẫu',
      downloading: 'Đang tạo…',
      saved: 'Đã lưu file mẫu.',
      error: 'Không tạo được file mẫu.',
    },
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
    titleMinutes: 'Biên bản họp lớp',
    titleReports: 'Báo cáo tuần/tháng',
    emptyDataWarning: 'Kỳ này chưa có ghi nhận nào. Nội dung dưới đây chỉ là khung mẫu — hãy ghi nhận ở màn hình “Ghi nhận tuần” để có dữ liệu thật.',
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
    saved: (name: string) => `Đã lưu tệp: ${name}`,
    printHint: 'PDF sử dụng hộp thoại in của hệ thống. Chọn “Lưu thành PDF” trong hộp thoại in.',
    printPreviewTitle: 'Bản in (Lưu thành PDF)',
    printNow: 'In ngay',
    printBack: 'Quay lại',
    printFallback:
      'Nếu hộp thoại in không tự mở, nhấn Cmd+P trên macOS hoặc Ctrl+P trên Windows/Linux, sau đó chọn “Lưu thành PDF”.',
    emptyDataWarning: 'Kỳ này chưa có ghi nhận nào. Tệp xuất sẽ chỉ chứa khung mẫu — hãy ghi nhận ở màn hình “Ghi nhận tuần” trước.',
  },

  claudeExport: {
    title: 'Xuất ẩn danh cho AI',
    intro:
      'Tạo bản tóm tắt đã ẩn danh (chỉ dùng mã ẩn danh S001, S002…) từ dữ liệu lớp để bạn tự sao chép vào Claude hoặc trợ lý AI khác. Ứng dụng KHÔNG tự gửi dữ liệu đi đâu; mọi thao tác là cục bộ và do bạn chủ động.',
    classLabel: 'Lớp:',
    periodKindLabel: 'Kỳ:',
    kindWeek: 'Theo tuần',
    kindMonth: 'Theo tháng',
    weekLabel: 'Tuần:',
    monthLabel: 'Tháng:',
    toneLabel: 'Văn phong mong muốn:',
    previewTitle: 'Xem trước nội dung đã ẩn danh',
    copy: 'Sao chép vào bộ nhớ tạm',
    copied: 'Đã sao chép',
    copyFailed: 'Không sao chép được. Hãy bôi đen nội dung và sao chép thủ công.',
    privacyTitle: 'Hãy kiểm tra trước khi sao chép',
    privacyBody:
      'Nội dung đã được ẩn danh tự động (loại bỏ tên, số điện thoại, email, địa chỉ, ngày sinh…), nhưng KHÔNG có công cụ nào hoàn hảo. Vui lòng đọc kỹ và tự chịu trách nhiệm trước khi sao chép sang bất kỳ công cụ AI bên ngoài nào. Tuyệt đối không dán nếu còn thấy thông tin nhận dạng thật.',
    noClassTitle: 'Chưa có lớp nào',
    noClassHint: 'Hãy sang màn hình “Lớp & Học sinh” để tải dữ liệu mẫu 8A hoặc nhập danh sách trước.',
    noWeekTitle: 'Lớp này chưa có tuần nào',
    noWeekHint: 'Hãy sang màn hình “Ghi nhận tuần” để tạo tuần và ghi nhận quan sát trước.',
    noMonthTitle: 'Chưa nhóm được tháng nào',
    noMonthHint: 'Các tuần cần có ngày bắt đầu để nhóm theo tháng. Hãy tạo tuần ở màn hình “Ghi nhận tuần”.',
    noDataTitle: 'Chưa có ghi nhận để tóm tắt',
    noDataHint: 'Kỳ này chưa có học sinh nào được ghi nhận. Hãy ghi nhận ở màn hình “Ghi nhận tuần” trước.',
  },

  gender: {
    male: 'Nam',
    female: 'Nữ',
    unknown: '—',
  },

  category: {
    attendance: 'Chuyên cần',
    study: 'Học tập',
    discipline: 'Nề nếp',
    good_deed: 'Việc tốt',
    support: 'Cần hỗ trợ',
  },
};

/** The full UI dictionary shape (inferred from the canonical Vietnamese copy). */
export type Dict = typeof vi;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

// --- English (partial — anything omitted falls back to Vietnamese) ----------------------
//
// `appTitle` is intentionally omitted (product name; identical in both languages) so the
// deepMerge fallback path is exercised in real use and in tests.

const en: DeepPartial<Dict> = {
  appSubtitle: 'Homeroom teacher assistant',
  offline: 'Offline • data stored on this device',

  lang: { label: 'Language', vi: 'Tiếng Việt', en: 'English' },

  nav: {
    dashboard: 'Dashboard',
    classes: 'Classes & Students',
    import: 'Import from Excel',
    weekly: 'Weekly records',
    comments: 'Student comments',
    parent: 'Parent messages',
    minutes: 'Class meeting minutes',
    reports: 'Weekly/monthly reports',
    exports: 'Export DOCX/PDF/XLSX',
    claude: 'Anonymized AI Export',
    settings: 'Settings',
  },

  a11y: { mainNav: 'Main navigation' },

  common: {
    loading: 'Loading…',
    retry: 'Retry',
    dbUnavailable:
      'Could not connect to the local database. Please open the desktop app with “npm run tauri dev”.',
    comingSoon: 'This screen will be added in later steps.',
  },

  actions: {
    add: 'Add',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    archive: 'Archive',
    restore: 'Restore',
    confirm: 'Confirm',
    goWeekly: 'Go to Weekly Records',
    goClasses: 'Go to Classes & Students',
  },

  dashboard: {
    title: 'Dashboard',
    intro: 'A quick overview of your class and recording progress. All data is stored locally on this device.',
    statClasses: 'Classes',
    statStudents: 'Students (current class)',
    statCurrentClass: 'Current class',
    statCurrentWeek: 'Current week',
    statRecorded: 'Recorded this week',
    statComments: 'Saved comments',
    statMessages: 'Saved messages',
    statReports: 'Saved minutes / reports',
    recordedOf: (done: number, total: number) => `${done}/${total} students`,
    none: '—',
    noClassTitle: 'No classes yet',
    noClassHint: 'Start by loading demo data 8A or creating a class on the “Classes & Students” screen.',
    quickActionsTitle: 'Quick actions',
    qaClasses: 'Classes & Students',
    qaWeekly: 'Weekly records',
    qaComments: 'Generate comments',
    qaParent: 'Parent messages',
    qaReports: 'Minutes & Reports',
    qaExports: 'Export files',
    qaClaude: 'Anonymized AI Export',
    workflowTitle: 'Suggested workflow',
    step1: 'Add or import students.',
    step2: 'Record weekly observations.',
    step3: 'Generate comments / parent messages.',
    step4: 'Generate minutes, reports and exports.',
  },

  settings: {
    title: 'Settings',
    intro: 'Display options and information about how the app protects your data.',
    langTitle: 'Language',
    langDesc: 'Choose the interface language. Vietnamese is the default; generated educational documents stay in Vietnamese.',
    privacyTitle: 'Local & private',
    privacyDesc:
      'All data lives in a single database file on your device. The app works offline and never sends student data anywhere.',
    aiTitle: 'Anonymized AI Export',
    aiDesc:
      'The “Anonymized AI Export” builds a summary using alias codes (S001…) only, stripping names/phones/emails/addresses. You copy it manually; the app never sends it.',
    versionLabel: 'App version',
    storageTitle: 'Data storage',
    storageDesc: 'A local SQLite database (sqlite:gvcn.db) in the app data directory.',
    demoTitle: 'Demo & testing',
    demoDesc: 'Use fake student data for demos. Do not enter real student personal data.',
    noCloudTitle: 'No cloud',
    noCloudDesc: 'No accounts, no cloud sync, no external API calls, no automatic message sending.',
  },

  classes: {
    title: 'Classes & Students',
    seedDemo: 'Load demo data 8A',
    seeding: 'Creating demo data…',
    seedExists: 'Demo data 8A already loaded',
    reloadDemo: 'Reload demo data',
    emptyTitle: 'No classes yet',
    emptyHint: 'Click “Load demo data 8A” to create a sample class (fake students, no real data).',
    rosterEmpty: 'This class has no students yet.',
    colCode: 'Student code',
    colName: 'Full name',
    colGender: 'Gender',
    colNote: 'Note',
    colStatus: 'Status',
    colActions: 'Actions',
    countLabel: (n: number) => `${n} students`,
    addClass: 'Add class',
    editClass: 'Edit class',
    className: 'Class name',
    schoolYear: 'School year',
    homeroomTeacher: 'Homeroom teacher (optional)',
    deleteClass: 'Delete class',
    deleteClassConfirm: 'Delete this empty class?',
    deleteClassBlocked: (n: number) =>
      `Cannot delete: the class still has ${n} students. Move/archive students first, or keep the class.`,
    dupClass: 'A class with this name and school year already exists.',
    classRequired: 'Class name and school year are required.',
    studentsTitle: 'Student list',
    addStudent: 'Add student',
    editStudent: 'Edit student',
    showArchived: 'Show archived students',
    activeBadge: 'Active',
    archivedBadge: 'Archived',
    archiveStudentConfirm: 'Archive this student? Their data is kept, just hidden from the active list.',
    deleteStudentConfirm: 'Permanently delete this student?',
    deleteStudentBlocked: (n: number) =>
      `Cannot delete: the student has ${n} linked records. Use “Archive” to keep the data safe.`,
    dupStudentCode: 'This student code already exists in this class.',
    studentRequired: 'Student code and full name are required.',
    notePlaceholder: 'Note (optional — do not enter sensitive info)…',
  },

  importPage: {
    title: 'Import student list from Excel',
    intro:
      'Choose a .xlsx file with the student list. It must include “Student code” and “Full name” columns. Other columns (gender, date of birth, note) are optional.',
    pickFile: 'Choose Excel file (.xlsx)',
    targetClass: 'Import into class:',
    noClassTitle: 'No class to import into',
    noClassHint: 'Please create a sample class on the “Classes & Students” screen first, then come back here.',
    parsing: 'Reading file…',
    previewTitle: 'Preview valid rows',
    errorsTitle: 'Rows with errors (will be skipped)',
    noErrors: 'No error rows.',
    noValid: 'No valid rows to import.',
    rowsSummary: (valid: number, total: number) => `${valid}/${total} valid rows.`,
    commit: 'Import into class',
    committing: 'Importing…',
    committedTitle: 'Import complete',
    committedSummary: (inserted: number, skipped: number) =>
      `Added ${inserted} new students; skipped ${skipped} existing codes.`,
    colRow: 'Row',
    colField: 'Column',
    colMessage: 'Error',
    readError: 'Could not read the Excel file.',
    format: {
      title: 'Excel file format',
      requiredTitle: 'Required columns',
      optionalTitle: 'Optional columns',
      colCode: 'Student code',
      colName: 'Full name',
      colGender: 'Gender',
      colDob: 'Date of birth',
      colNote: 'Note',
      ruleXlsx: 'The file must be .xlsx (Excel).',
      ruleHeader: 'The first row must contain the column headers.',
      ruleSheet: 'Data must be in the first worksheet.',
      ruleUnique: '“Student code” must be unique within the selected class.',
      download: 'Download Excel template',
      downloading: 'Generating…',
      saved: 'Template saved.',
      error: 'Could not generate the template.',
    },
  },

  weekly: {
    title: 'Weekly records',
    intro:
      'Choose a class and week, then record observations for each student by selecting tags and adding a short note. Use the language of acknowledgement – support – cooperation, not criticism.',
    classLabel: 'Class:',
    weekLabel: 'Week:',
    newWeek: 'Create new week',
    creatingWeek: 'Creating week…',
    noClassTitle: 'No classes yet',
    noClassHint: 'Please go to the “Classes & Students” screen to load demo data 8A or import a list first.',
    noWeekTitle: 'This class has no weeks yet',
    noWeekHint: 'Click “Create new week” to start recording the first week.',
    rosterEmpty: 'This class has no students to record.',
    notePlaceholder: 'Short note for the student (optional)…',
    save: 'Save weekly records',
    saving: 'Saving…',
    reload: 'Reload',
    savedTitle: 'Records saved',
    savedSummary: (n: number) => `Saved records for ${n} students this week.`,
    nothingToSave: 'No student has tags or a note selected to save.',
    selectedCount: (n: number) => `${n} tags selected`,
    weekName: (no: number) => `Week ${no}`,
  },

  comments: {
    title: 'Generate student comments',
    intro:
      'Choose a recorded class and week. The app generates Vietnamese comments from that week’s tags and notes. You can edit before saving. Comments are generated locally and never sent anywhere.',
    classLabel: 'Class:',
    weekLabel: 'Week:',
    toneLabel: 'Tone:',
    toneShort: 'Short',
    toneBalanced: 'Balanced',
    toneEncouraging: 'Encouraging',
    regenerate: 'Regenerate comments',
    save: 'Save comments',
    saving: 'Saving…',
    noClassTitle: 'No classes yet',
    noClassHint: 'Please go to the “Classes & Students” screen to load demo data 8A or import a list first.',
    noWeekTitle: 'This class has no weeks yet',
    noWeekHint: 'Please go to the “Weekly records” screen to create a week and record observations first.',
    noRecords: 'No students recorded for this week yet. Please record on the “Weekly records” screen first.',
    editedBadge: 'saved',
    warnBanned: (phrases: string) =>
      `Note: the comment contains words to avoid (${phrases}). Please soften it to be supportive.`,
    savedSummary: (n: number) => `Saved ${n} comments for this week.`,
    nothingToSave: 'No comments to save.',
  },

  parent: {
    title: 'Parent messages',
    intro:
      'Choose a recorded class and week. The app generates a draft Vietnamese message for parents that is cooperative and respectful. This is only a draft for you to edit and send yourself; the app does not send messages.',
    classLabel: 'Class:',
    weekLabel: 'Week:',
    typeLabel: 'Message type:',
    typeAuto: 'Automatic from records',
    typePraise: 'Praise / positive update',
    typeReminder: 'Gentle reminder',
    typeCooperation: 'Cooperation request',
    typeSupport: 'Follow-up & support',
    regenerate: 'Regenerate message',
    save: 'Save message',
    saving: 'Saving…',
    noClassTitle: 'No classes yet',
    noClassHint: 'Please go to the “Classes & Students” screen to load demo data 8A or import a list first.',
    noWeekTitle: 'This class has no weeks yet',
    noWeekHint: 'Please go to the “Weekly records” screen to create a week and record observations first.',
    noRecords: 'No students recorded for this week yet. Please record on the “Weekly records” screen first.',
    savedBadge: 'saved',
    warnBanned: (phrases: string) =>
      `Note: the message contains words to avoid (${phrases}). Please soften it to be cooperative.`,
    savedSummary: (n: number) => `Saved ${n} parent messages for this week.`,
    nothingToSave: 'No messages to save.',
  },

  reports: {
    title: 'Minutes & Reports',
    intro:
      'Choose a class and document type. The app aggregates saved records into class meeting minutes or a weekly/monthly report in Vietnamese. You can edit before saving. Everything is generated locally and never sent anywhere.',
    kindLabel: 'Document type:',
    kindMinutes: 'Class meeting minutes (week)',
    kindWeekly: 'Weekly report',
    kindMonthly: 'Monthly report',
    classLabel: 'Class:',
    weekLabel: 'Week:',
    monthLabel: 'Month:',
    timeLabel: 'Meeting time (optional):',
    timePlaceholder: 'e.g. 3:00 PM on 06/09/2025',
    regenerate: 'Regenerate document',
    save: 'Save document',
    saving: 'Saving…',
    saved: 'saved',
    noClassTitle: 'No classes yet',
    noClassHint: 'Please go to the “Classes & Students” screen to load demo data 8A or import a list first.',
    noWeekTitle: 'This class has no weeks yet',
    noWeekHint: 'Please go to the “Weekly records” screen to create a week and record observations first.',
    noMonthTitle: 'No months grouped yet',
    noMonthHint: 'Weeks need a start date to group by month. Please create weeks on the “Weekly records” screen.',
    otherMonths: 'Other weeks',
    warnBanned: (phrases: string) =>
      `Note: the document contains words to avoid (${phrases}). Please soften it to be supportive.`,
    savedOk: 'Saved the document for this class.',
    titleMinutes: 'Class meeting minutes',
    titleReports: 'Weekly/monthly reports',
    emptyDataWarning: 'This period has no records yet. The content below is only a template — record on the “Weekly records” screen to get real data.',
  },

  exportsPage: {
    title: 'Export files (DOCX / PDF / XLSX)',
    intro:
      'Choose a class, document type and week/month to preview, then download a DOCX, XLSX, or print/save a PDF. Files are generated locally, never sent anywhere, and only use recorded data.',
    classLabel: 'Class:',
    artifactLabel: 'Document type:',
    weekLabel: 'Week:',
    monthLabel: 'Month:',
    timeLabel: 'Meeting time (optional):',
    timePlaceholder: 'e.g. 3:00 PM on 06/09/2025',
    artMinutes: 'Class meeting minutes (week)',
    artWeekly: 'Weekly report',
    artMonthly: 'Monthly report',
    artComments: 'Student comment list',
    artParentMessages: 'Parent message list',
    previewTitle: 'Preview the content to export',
    downloadDocx: 'Download DOCX',
    downloadXlsx: 'Download XLSX',
    printPdf: 'Print / Save PDF',
    exporting: 'Exporting…',
    docxOnly: '* Comments/messages export to DOCX and XLSX; print/save PDF via the browser.',
    listFromSaved:
      'The list is taken from the comments/messages you saved on the matching screens.',
    noClassTitle: 'No classes yet',
    noClassHint: 'Please go to the “Classes & Students” screen to load demo data 8A or import a list first.',
    noWeekTitle: 'This class has no weeks yet',
    noWeekHint: 'Please go to the “Weekly records” screen to create a week and record observations first.',
    noMonthTitle: 'No months grouped yet',
    noMonthHint: 'Weeks need a start date to group by month. Please create weeks on the “Weekly records” screen.',
    emptyListTitle: 'No content to export',
    emptyListHint:
      'No comments/messages saved for this week yet. Please create and save them on the matching screen first, then come back here to export.',
    exportError: 'Could not export the file. Please try again in the desktop app.',
    saved: (name: string) => `File saved: ${name}`,
    printHint: 'PDF uses the system print dialog. Choose “Save as PDF” in the print dialog.',
    printPreviewTitle: 'Print view (Save as PDF)',
    printNow: 'Print now',
    printBack: 'Back',
    printFallback:
      'If the print dialog does not open automatically, press Cmd+P on macOS or Ctrl+P on Windows/Linux, then choose “Save as PDF”.',
    emptyDataWarning: 'This period has no records yet. The exported file will contain only a template — record on the “Weekly records” screen first.',
  },

  claudeExport: {
    title: 'Anonymized AI Export',
    intro:
      'Create an anonymized summary (alias codes S001, S002… only) from your class data so you can copy it into Claude or another AI assistant yourself. The app does NOT send anything anywhere; everything is local and initiated by you.',
    classLabel: 'Class:',
    periodKindLabel: 'Period:',
    kindWeek: 'By week',
    kindMonth: 'By month',
    weekLabel: 'Week:',
    monthLabel: 'Month:',
    toneLabel: 'Requested tone:',
    previewTitle: 'Preview the anonymized content',
    copy: 'Copy to clipboard',
    copied: 'Copied',
    copyFailed: 'Could not copy. Please select the text and copy it manually.',
    privacyTitle: 'Review before copying',
    privacyBody:
      'The content is anonymized automatically (names, phone numbers, emails, addresses, birth dates… are removed), but no tool is perfect. Please read it carefully and take responsibility before copying it into any external AI tool. Do not paste it if you still see any real identifying information.',
    noClassTitle: 'No classes yet',
    noClassHint: 'Please go to the “Classes & Students” screen to load demo data 8A or import a list first.',
    noWeekTitle: 'This class has no weeks yet',
    noWeekHint: 'Please go to the “Weekly records” screen to create a week and record observations first.',
    noMonthTitle: 'No months grouped yet',
    noMonthHint: 'Weeks need a start date to group by month. Please create weeks on the “Weekly records” screen.',
    noDataTitle: 'No records to summarize',
    noDataHint: 'No students recorded for this period yet. Please record on the “Weekly records” screen first.',
  },

  gender: {
    male: 'Male',
    female: 'Female',
    unknown: '—',
  },

  category: {
    attendance: 'Attendance',
    study: 'Study',
    discipline: 'Discipline',
    good_deed: 'Good deeds',
    support: 'Needs support',
  },
};

// --- Resolution + live binding ----------------------------------------------------------

function isMergeable(v: unknown): v is Record<string, unknown> {
  // Plain objects only — functions (typeof 'function') and null are treated as leaves.
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge `over` onto `base`; any key absent in `over` keeps the `base` value. */
function deepMerge<T>(base: T, over: unknown): T {
  if (!isMergeable(base) || !isMergeable(over)) {
    return (over === undefined ? base : (over as T));
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(over)) {
    const o = over[key];
    if (o === undefined) continue;
    const b = (base as Record<string, unknown>)[key];
    out[key] = isMergeable(b) && isMergeable(o) ? deepMerge(b, o) : o;
  }
  return out as T;
}

// Resolve both dictionaries once. `en` falls back to every untranslated `vi` value.
const dictionaries: Record<Locale, Dict> = {
  vi,
  en: deepMerge(vi, en),
};

let currentLocale: Locale = DEFAULT_LOCALE;

/**
 * The active UI dictionary. Exported as a live binding: `setLocale()` reassigns it and every
 * module that imported `t` sees the new value on its next render.
 */
export let t: Dict = dictionaries[DEFAULT_LOCALE];

/** Normalize any input to a supported locale (defaults to Vietnamese). */
export function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'vi';
}

/** The locale currently shown in the UI. */
export function getLocale(): Locale {
  return currentLocale;
}

/** Switch the active UI dictionary. Returns the (normalized) locale that was applied. */
export function setLocale(value: unknown): Locale {
  currentLocale = normalizeLocale(value);
  t = dictionaries[currentLocale];
  return currentLocale;
}

/** Read the saved language preference. Safe in any environment (no localStorage → default). */
export function loadLocale(): Locale {
  try {
    return normalizeLocale(globalThis.localStorage?.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Persist the language preference. Never throws if localStorage is unavailable. */
export function saveLocale(value: unknown): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, normalizeLocale(value));
  } catch {
    /* localStorage unavailable (e.g. tests / SSR) — preference simply isn't persisted. */
  }
}

// --- Label helpers (read the live `t`, so they translate with the active locale) --------

/** Sidebar label for a nav id; falls back to the id if somehow missing. */
export function navLabel(id: string): string {
  return (t.nav as Record<string, string>)[id] ?? id;
}

/** Which report artifact the "Biên bản & Báo cáo" screen is producing. */
export type ReportKind = 'minutes' | 'weekly' | 'monthly';

/** Label for a report-kind choice. */
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

/** Label for a parent-message type choice. */
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

/** Label for a comment tone. */
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

/** Label for an export-artifact choice. */
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

/** Display a stored gender code (M/F or null) in the active locale. */
export function genderLabel(gender: string | null): string {
  if (gender === 'M') return t.gender.male;
  if (gender === 'F') return t.gender.female;
  return t.gender.unknown;
}

/** Label for an observation-tag category (the 5 practical groups). */
export function categoryLabel(category: string): string {
  return (t.category as Record<string, string>)[category] ?? category;
}
