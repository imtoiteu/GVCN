// M6 — Weekly & monthly homeroom report generation tests.
//
// Pure generators: these tests pin the section structure, the weekly aggregation, the monthly
// week-grouping (merge students across weeks + per-week diễn biến), the supportive tone, the
// banned-phrase guard, and the empty-period fallback. No DB needed.

import { describe, it, expect } from 'vitest';
import { findBannedPhrases } from '../comment';
import { generateMonthlyReport, generateWeeklyReport } from '../homeroomReport';
import type { ReportTag, StudentObservation } from '../reportData';

const T = {
  full: { category: 'attendance', sentiment: 'positive', label_vi: 'Đi học đầy đủ' },
  active: { category: 'study', sentiment: 'positive', label_vi: 'Tích cực phát biểu' },
  needsFocus: { category: 'study', sentiment: 'concern', label_vi: 'Cần tập trung hơn trong giờ học' },
  supFamily: { category: 'support', sentiment: 'neutral', label_vi: 'Cần phối hợp với gia đình' },
} satisfies Record<string, ReportTag>;

const rec = (name: string, code: string, tags: ReportTag[]): StudentObservation => ({
  studentName: name,
  studentCode: code,
  tags,
});

describe('generateWeeklyReport', () => {
  const records = [
    rec('An', '8A-01', [T.full, T.active]),
    rec('Bình', '8A-02', [T.needsFocus]),
  ];

  it('emits the 6 numbered sections with header and disclaimer', () => {
    const r = generateWeeklyReport({ className: '8A', weekLabel: 'Tuần 1', records });
    expect(r.text).toContain('BÁO CÁO TUẦN');
    expect(r.text).toContain('Lớp: 8A');
    expect(r.text).toContain('Tuần: Tuần 1');
    for (const h of [
      '1. Tổng quan',
      '2. Ưu điểm nổi bật',
      '3. Điểm cần cố gắng',
      '4. Học sinh tiêu biểu',
      '5. Học sinh cần quan tâm, hỗ trợ',
      '6. Phương hướng tuần tới',
    ]) {
      expect(r.text).toContain(h);
    }
    expect(r.text).toContain('trong tuần');
  });

  it('surfaces positives, frames concerns supportively, and is banned-free', () => {
    const r = generateWeeklyReport({ className: '8A', weekLabel: 'Tuần 1', records });
    expect(r.text).toContain('đi học đầy đủ');
    expect(r.text).toContain('cần tập trung hơn trong giờ học');
    expect(r.text).toMatch(/nhắc nhở nhẹ nhàng|tiến bộ|động viên/);
    expect(r.aggregate.positiveStudents).toBe(1);
    expect(r.aggregate.concernStudents).toBe(1);
    expect(findBannedPhrases(r.text)).toEqual([]);
  });

  it('falls back safely for an empty week', () => {
    const r = generateWeeklyReport({ className: '8A', weekLabel: 'Tuần 9', records: [] });
    expect(r.text).toContain('chưa có ghi nhận quan sát nào được lưu');
    expect(r.text).toContain('Chưa ghi nhận học sinh tiêu biểu.');
    expect(findBannedPhrases(r.text)).toEqual([]);
  });
});

describe('generateMonthlyReport', () => {
  const weeks = [
    { weekLabel: 'Tuần 1', records: [rec('An', '8A-01', [T.full]), rec('Bình', '8A-02', [T.needsFocus])] },
    { weekLabel: 'Tuần 2', records: [rec('An', '8A-01', [T.active]), rec('Cường', '8A-03', [T.supFamily])] },
  ];

  it('groups weeks: merges each student across the period and lists per-week diễn biến', () => {
    const r = generateMonthlyReport({ className: '8A', periodLabel: 'Tháng 9/2025', weeks });
    expect(r.text).toContain('BÁO CÁO THÁNG');
    expect(r.text).toContain('Tháng 9/2025');
    expect(r.text).toContain('gồm 2 tuần');
    // An recorded in both weeks but counted once over the period.
    expect(r.aggregate.studentsRecorded).toBe(3);
    // An has 2 positive tags merged across weeks, no concern/support → exemplary.
    expect(r.aggregate.exemplary.map((s) => s.studentCode)).toEqual(['8A-01']);
    expect(r.aggregate.positiveStudents).toBe(1);
    expect(r.aggregate.concernStudents).toBe(1);
    expect(r.aggregate.supportStudents).toBe(1);
    // Per-week section present.
    expect(r.text).toContain('6. Diễn biến theo tuần');
    expect(r.text).toContain('- Tuần 1:');
    expect(r.text).toContain('- Tuần 2:');
    expect(r.text).toContain('7. Phương hướng kỳ tới');
    expect(findBannedPhrases(r.text)).toEqual([]);
  });

  it('falls back safely when no week has any record', () => {
    const r = generateMonthlyReport({
      className: '8A',
      periodLabel: 'Tháng 10/2025',
      weeks: [
        { weekLabel: 'Tuần 5', records: [] },
        { weekLabel: 'Tuần 6', records: [] },
      ],
    });
    expect(r.aggregate.studentsRecorded).toBe(0);
    expect(r.text).toContain('chưa có ghi nhận quan sát nào được lưu');
    expect(r.text).toContain('- Tuần 5: chưa có ghi nhận.');
    expect(findBannedPhrases(r.text)).toEqual([]);
  });

  it('handles a month with zero weeks without crashing', () => {
    const r = generateMonthlyReport({ className: '8A', periodLabel: 'Tháng 11/2025', weeks: [] });
    expect(r.aggregate.studentsRecorded).toBe(0);
    expect(r.text).toContain('Chưa có tuần nào được ghi nhận trong kỳ.');
    expect(findBannedPhrases(r.text)).toEqual([]);
  });

  it('is deterministic', () => {
    const input = { className: '8A', periodLabel: 'Tháng 9/2025', weeks };
    expect(generateMonthlyReport(input).text).toBe(generateMonthlyReport(input).text);
  });
});
