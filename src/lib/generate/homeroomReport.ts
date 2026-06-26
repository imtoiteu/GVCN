// M6 — Weekly & monthly homeroom report generation (pure, local, deterministic).
//
// Builds Vietnamese homeroom report summaries from aggregated weekly observations: a weekly report
// for one class/week, and a monthly report that groups several weeks of the same class (each
// student's tags are merged across the month). No I/O, no external AI, no Date/random — same input
// always yields the same text.
//
// Tone (CLAUDE.md / SPEC §13): respectful, cooperative. "Điểm cần cố gắng" are framed as shared
// growth points with supportive measures, never blame. The shared banned-phrase guard
// (findBannedPhrases) self-checks the controlled output. Empty periods produce a safe fallback.

import { findBannedPhrases } from './comment';
import {
  aggregateWeek,
  joinLabels,
  mergeWeeks,
  needLine,
  type StudentObservation,
  type WeekAggregate,
} from './reportData';

export interface WeeklyReportInput {
  className: string;
  weekLabel: string;
  records: StudentObservation[];
}

/** One week within a monthly report. */
export interface MonthlyWeekInput {
  weekLabel: string;
  records: StudentObservation[];
}

export interface MonthlyReportInput {
  className: string;
  /** Human label for the period, e.g. "Tháng 9/2025". */
  periodLabel: string;
  weeks: MonthlyWeekInput[];
}

export interface HomeroomReport {
  text: string;
  aggregate: WeekAggregate;
}

const WEEK_DISCLAIMER = '(Báo cáo được tổng hợp từ các quan sát đã được ghi nhận trong tuần.)';
const MONTH_DISCLAIMER = '(Báo cáo được tổng hợp từ các quan sát đã được ghi nhận trong các tuần của kỳ.)';

/** Build the 5 shared body sections (tổng quan → … → cần hỗ trợ) for an aggregate. */
function bodySections(agg: WeekAggregate, scope: 'tuần' | 'kỳ'): string[] {
  const overview =
    agg.studentsRecorded === 0
      ? `Trong ${scope}, chưa có ghi nhận quan sát nào được lưu cho lớp. Báo cáo dựa trên dữ liệu hiện có.`
      : `Trong ${scope}, giáo viên đã ghi nhận cho ${agg.studentsRecorded} học sinh: ` +
        `${agg.positiveStudents} em có ghi nhận tích cực, ${agg.concernStudents} em cần cố gắng thêm ` +
        `và ${agg.supportStudents} em cần được quan tâm, hỗ trợ.`;

  const uuDiem =
    agg.positiveLabels.length > 0
      ? `Nổi bật, các em ${joinLabels(agg.positiveLabels)}.`
      : 'Chưa có ưu điểm nổi bật được ghi nhận.';

  const canCoGang =
    agg.concernLabels.length > 0
      ? `Một số em cần cố gắng thêm ở: ${joinLabels(agg.concernLabels)}. Giáo viên sẽ quan tâm, nhắc nhở nhẹ nhàng để các em tiến bộ.`
      : 'Không có điểm nào đáng lo ngại; các em duy trì nề nếp tốt.';

  const tieuBieu =
    agg.exemplary.length > 0
      ? agg.exemplary.map((r) => `${r.studentName} (${r.studentCode})`).join(', ') + '.'
      : 'Chưa ghi nhận học sinh tiêu biểu.';

  const canHoTro =
    agg.needSupport.length > 0
      ? agg.needSupport.map(needLine).join(' ')
      : 'Không có học sinh cần hỗ trợ đặc biệt.';

  return [
    '1. Tổng quan',
    overview,
    '',
    '2. Ưu điểm nổi bật',
    uuDiem,
    '',
    '3. Điểm cần cố gắng',
    canCoGang,
    '',
    '4. Học sinh tiêu biểu',
    tieuBieu,
    '',
    '5. Học sinh cần quan tâm, hỗ trợ',
    canHoTro,
  ];
}

function nextDirection(agg: WeekAggregate, scope: 'tuần' | 'kỳ'): string {
  const parts = ['Duy trì và phát huy những ưu điểm đã đạt được.'];
  if (agg.needSupport.length > 0) {
    parts.push('Tiếp tục theo dõi, phối hợp với gia đình để hỗ trợ những em cần giúp đỡ.');
  }
  parts.push(`Phấn đấu nâng cao chất lượng học tập và rèn luyện nề nếp trong ${scope} tới.`);
  return parts.map((p) => `- ${p}`).join('\n');
}

function guard(text: string, who: string): void {
  const offenders = findBannedPhrases(text);
  if (offenders.length > 0) {
    throw new Error(`${who} produced banned phrasing: ${offenders.join(', ')}`);
  }
}

/** Generate a respectful Vietnamese weekly homeroom report for one class/week. */
export function generateWeeklyReport(input: WeeklyReportInput): HomeroomReport {
  const agg = aggregateWeek(input.records);
  const text = [
    'BÁO CÁO TUẦN – CÔNG TÁC CHỦ NHIỆM',
    `Lớp: ${input.className}    Tuần: ${input.weekLabel}`,
    '',
    ...bodySections(agg, 'tuần'),
    '',
    '6. Phương hướng tuần tới',
    nextDirection(agg, 'tuần'),
    '',
    WEEK_DISCLAIMER,
  ].join('\n');

  guard(text, 'generateWeeklyReport');
  return { text, aggregate: agg };
}

/**
 * Generate a respectful Vietnamese monthly homeroom report by grouping several weeks of one class.
 * Each student's tags are merged across the period (counted once), plus a per-week "diễn biến" line.
 * An empty period (no records in any week) still yields a safe, structured report.
 */
export function generateMonthlyReport(input: MonthlyReportInput): HomeroomReport {
  const merged = mergeWeeks(input.weeks.map((w) => w.records));
  const agg = aggregateWeek(merged);

  const recordedWeeks = input.weeks.filter((w) => w.records.length > 0).length;
  const weekNames = input.weeks.map((w) => w.weekLabel).join(', ');

  const perWeek = input.weeks
    .map((w) => {
      const a = aggregateWeek(w.records);
      const summary =
        a.studentsRecorded === 0
          ? 'chưa có ghi nhận'
          : `${a.positiveStudents} em tích cực, ${a.concernStudents} em cần cố gắng, ${a.supportStudents} em cần hỗ trợ`;
      return `- ${w.weekLabel}: ${summary}.`;
    })
    .join('\n');

  const header =
    `Kỳ: ${input.periodLabel}` +
    (input.weeks.length > 0
      ? ` (gồm ${input.weeks.length} tuần: ${weekNames}; ${recordedWeeks} tuần có ghi nhận)`
      : '');

  const text = [
    'BÁO CÁO THÁNG – CÔNG TÁC CHỦ NHIỆM',
    `Lớp: ${input.className}    ${header}`,
    '',
    ...bodySections(agg, 'kỳ'),
    '',
    '6. Diễn biến theo tuần',
    input.weeks.length > 0 ? perWeek : '- Chưa có tuần nào được ghi nhận trong kỳ.',
    '',
    '7. Phương hướng kỳ tới',
    nextDirection(agg, 'kỳ'),
    '',
    MONTH_DISCLAIMER,
  ].join('\n');

  guard(text, 'generateMonthlyReport');
  return { text, aggregate: agg };
}
