// M6 — Meeting-minutes generation tests.
//
// The generator is pure: these tests pin the section structure, the aggregation (counts, ưu điểm,
// student lists), the supportive non-blaming framing, the banned-phrase guard, the empty-week
// fallback, and determinism. No DB needed.

import { describe, it, expect } from 'vitest';
import { findBannedPhrases } from '../comment';
import { generateMeetingMinutes } from '../meetingMinutes';
import type { ReportTag, StudentObservation } from '../reportData';

const T = {
  full: { category: 'attendance', sentiment: 'positive', label_vi: 'Đi học đầy đủ' },
  active: { category: 'study', sentiment: 'positive', label_vi: 'Tích cực phát biểu' },
  help: { category: 'good_deed', sentiment: 'positive', label_vi: 'Giúp đỡ bạn bè' },
  needsFocus: { category: 'study', sentiment: 'concern', label_vi: 'Cần tập trung hơn trong giờ học' },
  homework: { category: 'study', sentiment: 'concern', label_vi: 'Chưa hoàn thành bài tập về nhà' },
  supFamily: { category: 'support', sentiment: 'neutral', label_vi: 'Cần phối hợp với gia đình' },
} satisfies Record<string, ReportTag>;

function rec(name: string, code: string, tags: ReportTag[]): StudentObservation {
  return { studentName: name, studentCode: code, tags };
}

/** A mixed class: 2 clearly exemplary, 1 needs focus, 1 needs family support. */
const CLASS: StudentObservation[] = [
  rec('An', '8A-01', [T.full, T.active]),
  rec('Bình', '8A-02', [T.full, T.help]),
  rec('Cường', '8A-03', [T.full, T.needsFocus, T.homework]),
  rec('Dung', '8A-04', [T.supFamily]),
];

describe('generateMeetingMinutes — structure', () => {
  it('emits all 7 numbered sections with a class/week header and disclaimer', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 1', records: CLASS });
    expect(m.text).toContain('BIÊN BẢN HỌP LỚP');
    expect(m.text).toContain('Lớp: 8A');
    expect(m.text).toContain('Tuần: Tuần 1');
    for (const heading of [
      '1. Tình hình chung',
      '2. Ưu điểm',
      '3. Tồn tại / vấn đề cần khắc phục',
      '4. Học sinh tiêu biểu',
      '5. Học sinh cần quan tâm, hỗ trợ',
      '6. Biện pháp của giáo viên chủ nhiệm',
      '7. Phương hướng tuần tới',
    ]) {
      expect(m.text).toContain(heading);
    }
    expect(m.text).toContain('đã được ghi nhận');
  });

  it('uses the provided meeting time when given', () => {
    const m = generateMeetingMinutes({
      className: '8A',
      weekLabel: 'Tuần 1',
      meetingTime: '15h00 ngày 06/09/2025',
      records: CLASS,
    });
    expect(m.text).toContain('Thời gian: 15h00 ngày 06/09/2025');
  });
});

describe('generateMeetingMinutes — aggregation', () => {
  it('counts students by sentiment in tình hình chung', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 1', records: CLASS });
    expect(m.aggregate.studentsRecorded).toBe(4);
    expect(m.aggregate.positiveStudents).toBe(3);
    expect(m.aggregate.concernStudents).toBe(1);
    expect(m.aggregate.supportStudents).toBe(1);
    expect(m.text).toContain('4 học sinh');
  });

  it('rolls up distinct positive labels with student counts (most common first)', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 1', records: CLASS });
    // "Đi học đầy đủ" appears for An, Bình, Cường → 3 students, ranked first.
    expect(m.aggregate.positiveLabels[0]).toEqual({ label: 'Đi học đầy đủ', count: 3 });
    expect(m.text).toContain('Đi học đầy đủ (3 học sinh)');
  });

  it('lists exemplary students (positives, no concern/support) and excludes flagged ones', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 1', records: CLASS });
    const codes = m.aggregate.exemplary.map((r) => r.studentCode);
    expect(codes).toEqual(['8A-01', '8A-02']);
    expect(codes).not.toContain('8A-03'); // has a concern
    expect(m.text).toContain('An (8A-01)');
  });

  it('lists students needing support with what flagged them', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 1', records: CLASS });
    const codes = m.aggregate.needSupport.map((r) => r.studentCode);
    // Cường (2 issues) ranks before Dung (1 issue).
    expect(codes).toEqual(['8A-03', '8A-04']);
    expect(m.text).toContain('Dung (8A-04): cần phối hợp với gia đình.');
  });
});

describe('generateMeetingMinutes — tone + safety', () => {
  it('frames issues supportively and is banned-phrase free', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 1', records: CLASS });
    expect(m.text).toMatch(/phối hợp|hỗ trợ|động viên|tiến bộ/);
    expect(findBannedPhrases(m.text)).toEqual([]);
  });
});

describe('generateMeetingMinutes — empty week fallback', () => {
  it('produces a safe, complete document with zero records', () => {
    const m = generateMeetingMinutes({ className: '8A', weekLabel: 'Tuần 3', records: [] });
    expect(m.aggregate.studentsRecorded).toBe(0);
    expect(m.text).toContain('chưa có ghi nhận quan sát nào được lưu');
    expect(m.text).toContain('Chưa ghi nhận học sinh tiêu biểu trong tuần.');
    expect(m.text).toContain('Không có học sinh cần hỗ trợ đặc biệt trong tuần.');
    expect(findBannedPhrases(m.text)).toEqual([]);
  });
});

describe('generateMeetingMinutes — determinism', () => {
  it('identical input yields identical text', () => {
    const input = { className: '8A', weekLabel: 'Tuần 1', records: CLASS };
    expect(generateMeetingMinutes(input).text).toBe(generateMeetingMinutes(input).text);
  });
});
