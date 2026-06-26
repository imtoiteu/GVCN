// M6 — Weekly homeroom meeting-minutes generation (pure, local, deterministic).
//
// Builds Vietnamese "biên bản họp lớp / sinh hoạt chủ nhiệm" minutes from a week's aggregated
// observations. No I/O, no external AI, no Date/random — same input always yields the same text.
//
// Tone (CLAUDE.md / SPEC §13): respectful and supportive. Issues ("tồn tại") are framed as points
// to work on together with cooperative measures, never as blame against students or families. The
// shared banned-phrase guard (findBannedPhrases) backs this up — the generator self-checks its own
// controlled output. Empty weeks produce a safe fallback, not a crash.

import { findBannedPhrases } from './comment';
import {
  aggregateWeek,
  needLine,
  type StudentObservation,
  type WeekAggregate,
} from './reportData';

export interface MeetingMinutesInput {
  className: string;
  weekLabel: string;
  /** Optional free-text meeting time/date; a placeholder is used when omitted. */
  meetingTime?: string | null;
  records: StudentObservation[];
}

export interface MeetingMinutes {
  text: string;
  aggregate: WeekAggregate;
}

const DISCLAIMER = '(Biên bản được tổng hợp từ các quan sát đã được ghi nhận trong tuần.)';

/** "- a\n- b" bullet block, or a single fallback bullet when empty. */
function bullets(lines: string[], fallback: string): string {
  return (lines.length > 0 ? lines : [fallback]).map((l) => `- ${l}`).join('\n');
}

/** Generate respectful Vietnamese weekly meeting minutes from aggregated observations. */
export function generateMeetingMinutes(input: MeetingMinutesInput): MeetingMinutes {
  const agg = aggregateWeek(input.records);
  const time = (input.meetingTime ?? '').trim() || '……/……/………';

  const general =
    agg.studentsRecorded === 0
      ? 'Trong tuần, chưa có ghi nhận quan sát nào được lưu cho lớp. Nội dung dưới đây dựa trên dữ liệu hiện có.'
      : `Trong tuần, giáo viên đã ghi nhận quan sát cho ${agg.studentsRecorded} học sinh: ` +
        `${agg.positiveStudents} em có ghi nhận tích cực, ${agg.concernStudents} em cần cố gắng thêm ` +
        `và ${agg.supportStudents} em cần được quan tâm, hỗ trợ.`;

  const uuDiem = bullets(
    agg.positiveLabels.map((l) => `${l.label} (${l.count} học sinh)`),
    'Chưa có ghi nhận nổi bật trong tuần.',
  );

  const tonTai = bullets(
    agg.concernLabels.map((l) => `${l.label} (${l.count} học sinh)`),
    'Không có vấn đề nổi cộm; lớp duy trì nề nếp ổn định.',
  );

  const tieuBieu = bullets(
    agg.exemplary.map((r) => `${r.studentName} (${r.studentCode})`),
    'Chưa ghi nhận học sinh tiêu biểu trong tuần.',
  );

  const canHoTro = bullets(
    agg.needSupport.map(needLine),
    'Không có học sinh cần hỗ trợ đặc biệt trong tuần.',
  );

  const hasNeeds = agg.needSupport.length > 0;
  const bienPhap = bullets(
    [
      'Tiếp tục động viên, khích lệ những em có tiến bộ và giữ vững nề nếp lớp.',
      ...(hasNeeds
        ? ['Quan tâm, nhắc nhở nhẹ nhàng và phối hợp với gia đình để hỗ trợ kịp thời những em còn khó khăn.']
        : []),
    ],
    'Tiếp tục theo dõi, đồng hành cùng các em.',
  );

  const phuongHuong = bullets(
    [
      'Duy trì và phát huy những ưu điểm của tuần qua.',
      ...(hasNeeds ? ['Tiếp tục theo dõi, hỗ trợ những em cần giúp đỡ để các em tiến bộ.'] : []),
      'Phấn đấu nâng cao chất lượng học tập và rèn luyện nề nếp trong tuần tới.',
    ],
    'Duy trì nề nếp và tiếp tục đồng hành cùng các em.',
  );

  const text = [
    'BIÊN BẢN HỌP LỚP – SINH HOẠT CHỦ NHIỆM',
    `Lớp: ${input.className}    Tuần: ${input.weekLabel}`,
    `Thời gian: ${time}`,
    '',
    '1. Tình hình chung',
    general,
    '',
    '2. Ưu điểm',
    uuDiem,
    '',
    '3. Tồn tại / vấn đề cần khắc phục',
    tonTai,
    '',
    '4. Học sinh tiêu biểu',
    tieuBieu,
    '',
    '5. Học sinh cần quan tâm, hỗ trợ',
    canHoTro,
    '',
    '6. Biện pháp của giáo viên chủ nhiệm',
    bienPhap,
    '',
    '7. Phương hướng tuần tới',
    phuongHuong,
    '',
    DISCLAIMER,
  ].join('\n');

  // Self-check: the minutes are built entirely from controlled vocabulary + the catalog labels +
  // class/week/student identifiers — no free-text teacher notes — so the whole document must be clean.
  const offenders = findBannedPhrases(text);
  if (offenders.length > 0) {
    throw new Error(`generateMeetingMinutes produced banned phrasing: ${offenders.join(', ')}`);
  }

  return { text, aggregate: agg };
}
