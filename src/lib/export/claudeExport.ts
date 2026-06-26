// M8.2 — Anonymized AI Export model ("Xuất ẩn danh cho AI").
//
// Builds a deterministic, PII-free Vietnamese text block a teacher can manually copy into Claude (or
// another AI assistant) to get help drafting comments / parent messages — WITHOUT exposing any
// student identity. Pure: no I/O, no network, no Date/random.
//
// Safety by construction: the builder consumes only aliases (S001…), controlled tag labels, and
// notes ALREADY scrubbed through anonymize.ts. Real names never enter the produced text — see
// buildAnonymizedExport, which performs the anonymization and is the function the no-PII test gates.

import { makeAliases, safeNote, sanitizeText, type RosterEntry } from './anonymize';

/** Writing tone the teacher requests of the AI (mirrors the comment-generation tones). */
export type ExportTone = 'short' | 'balanced' | 'encouraging';

/** Vietnamese description of each tone, embedded in the AI instruction block. */
const TONE_VI: Record<ExportTone, string> = {
  short: 'ngắn gọn, súc tích',
  balanced: 'cân đối giữa ghi nhận và góp ý nhẹ nhàng',
  encouraging: 'động viên, khích lệ sự tiến bộ',
};

/** Raw per-student data for one period (tags are controlled labels; note is raw free text). */
export interface RawStudentWeek {
  studentCode: string;
  fullName: string;
  positiveTags: string[];
  supportTags: string[];
  note: string;
}

/** Anonymized per-student data (no real name/code) ready to render. */
export interface AnonStudent {
  alias: string;
  positiveTags: string[];
  supportTags: string[];
  note: string;
}

export interface AnonymizedExport {
  text: string;
  students: AnonStudent[];
  /** Real code → alias, for the UI to label a preview if needed (not part of the copyable text). */
  aliasByCode: Record<string, string>;
}

export interface BuildAnonymizedExportParams {
  className: string;
  periodLabel: string;
  /** Full class roster — drives stable aliases (so a student keeps one alias across periods). */
  roster: RosterEntry[];
  /** The students that have records this period. */
  students: RawStudentWeek[];
  tone: ExportTone;
}

const NONE_POSITIVE = '(chưa ghi nhận điểm tích cực)';
const NONE_SUPPORT = '(không có)';
const NONE_NOTE = '(không có)';

/**
 * Render the anonymized export text. Inputs are already anonymized (aliases + scrubbed notes); this
 * function only formats them, so it cannot reintroduce PII.
 */
export function buildClaudeExportText(params: {
  className: string;
  periodLabel: string;
  students: AnonStudent[];
  tone: ExportTone;
}): string {
  const { className, periodLabel, students, tone } = params;
  const lines: string[] = [];

  lines.push('=== DỮ LIỆU LỚP HỌC ĐÃ ẨN DANH (DÀNH CHO TRỢ LÝ AI) ===');
  lines.push('');
  lines.push('HƯỚNG DẪN CHO AI:');
  lines.push(
    '- Dữ liệu dưới đây đã được ẩn danh: chỉ dùng mã học sinh (S001, S002, …), không có tên thật hay thông tin cá nhân.',
  );
  lines.push(
    '- Hãy hỗ trợ giáo viên chủ nhiệm soạn nhận xét / tin nhắn phụ huynh bằng tiếng Việt cho từng học sinh, dựa trên các ghi nhận bên dưới.',
  );
  lines.push(`- Văn phong mong muốn: ${TONE_VI[tone]}.`);
  lines.push(
    '- Luôn tôn trọng, mang tính phối hợp và động viên; tập trung vào sự tiến bộ và hướng hỗ trợ.',
  );
  lines.push('- KHÔNG phê phán, KHÔNG quy chụp hay đổ lỗi cho học sinh hoặc gia đình.');
  lines.push('');
  lines.push('THÔNG TIN CHUNG:');
  lines.push(`- Lớp: ${className}`);
  lines.push(`- Kỳ: ${periodLabel}`);
  lines.push(`- Số học sinh có ghi nhận: ${students.length}`);
  lines.push('');
  lines.push('DANH SÁCH GHI NHẬN:');

  if (students.length === 0) {
    lines.push('(Chưa có ghi nhận nào trong kỳ này.)');
  } else {
    for (const s of students) {
      lines.push(`[${s.alias}]`);
      lines.push(`- Điểm tích cực: ${s.positiveTags.length ? s.positiveTags.join(', ') : NONE_POSITIVE}`);
      lines.push(`- Cần hỗ trợ: ${s.supportTags.length ? s.supportTags.join(', ') : NONE_SUPPORT}`);
      lines.push(`- Ghi chú (đã ẩn danh): ${s.note ? s.note : NONE_NOTE}`);
    }
  }

  lines.push('');
  lines.push('LƯU Ý AN TOÀN:');
  lines.push('- Đây là dữ liệu hỗ trợ. Giáo viên cần đọc lại và chịu trách nhiệm trước khi sử dụng kết quả.');
  lines.push('- Không dùng dữ liệu này để xếp loại hay đánh giá tiêu cực học sinh.');

  return lines.join('\n');
}

/**
 * Anonymize raw class data and build the copyable export. This is the privacy boundary: it assigns
 * aliases, scrubs every note (and the class name) through the anonymize pipeline, and never passes a
 * real name into the rendered text. Deterministic — the no-PII test relies on that.
 */
export function buildAnonymizedExport(params: BuildAnonymizedExportParams): AnonymizedExport {
  const knownNames = params.roster.map((r) => r.fullName);
  const aliases = makeAliases(params.roster);

  const students: AnonStudent[] = params.students
    .map((s) => ({
      alias: aliases.get(s.studentCode) ?? '(S???)',
      // Tag labels come from the controlled catalog (not free text); only de-dupe + keep order.
      positiveTags: [...new Set(s.positiveTags)],
      supportTags: [...new Set(s.supportTags)],
      note: safeNote(s.note, knownNames),
    }))
    .sort((a, b) => a.alias.localeCompare(b.alias));

  // The class name is usually just "8A", but it's user-editable free text — scrub it too.
  const safeClassName = sanitizeText(params.className, knownNames) || '(lớp)';

  const text = buildClaudeExportText({
    className: safeClassName,
    periodLabel: params.periodLabel,
    students,
    tone: params.tone,
  });

  return {
    text,
    students,
    aliasByCode: Object.fromEntries(aliases),
  };
}
