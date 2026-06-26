import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAnonymizedExport, type RawStudentWeek } from '../claudeExport';
import { REDACTED_NOTE } from '../anonymize';
import { setLocale, t } from '../../../app/i18n';

// Realistic-but-fake class data with names + PII embedded in a note.
const roster = [
  { studentCode: '8A-01', fullName: 'Nguyễn Văn An' },
  { studentCode: '8A-02', fullName: 'Trần Thị Bình' },
];

const students: RawStudentWeek[] = [
  {
    studentCode: '8A-01',
    fullName: 'Nguyễn Văn An',
    positiveTags: ['Đi học đầy đủ', 'Tích cực phát biểu'],
    supportTags: [],
    note: 'Em An tiến bộ rõ rệt trong tuần.',
  },
  {
    studentCode: '8A-02',
    fullName: 'Trần Thị Bình',
    positiveTags: [],
    supportTags: ['Cần hỗ trợ môn Toán'],
    note: 'Liên hệ mẹ Trần Thị Bình (phụ huynh Lê Văn Hùng), sđt 0901234567, email a.b@gmail.com, nhà số 12 đường Lê Lợi, sinh 12/05/2010',
  },
];

const params = {
  className: '8A',
  periodLabel: 'Tuần 1',
  roster,
  students,
  tone: 'balanced' as const,
};

afterEach(() => {
  vi.unstubAllGlobals();
  setLocale('vi');
});

describe('buildAnonymizedExport — no-PII gate', () => {
  const result = buildAnonymizedExport(params);

  it('contains no original student names', () => {
    expect(result.text).not.toContain('Nguyễn Văn An');
    expect(result.text).not.toContain('Trần Thị Bình');
    expect(result.text).not.toContain('Em An'); // first-name mention scrubbed too
  });

  it('contains no parent name, phone, email, address or birth date', () => {
    for (const leak of ['Lê Văn Hùng', '0901234567', 'a.b@gmail.com', 'Lê Lợi', '12/05/2010']) {
      expect(result.text).not.toContain(leak);
    }
  });

  it('uses stable aliases instead of real codes/names', () => {
    expect(result.text).toContain('[S001]');
    expect(result.text).toContain('[S002]');
    expect(result.text).not.toContain('8A-01');
    expect(result.aliasByCode['8A-01']).toBe('S001');
    expect(result.aliasByCode['8A-02']).toBe('S002');
  });

  it('keeps controlled tag labels (not PII)', () => {
    expect(result.text).toContain('Đi học đầy đủ');
    expect(result.text).toContain('Cần hỗ trợ môn Toán');
  });

  it('replaces the all-PII-heavy note path with sanitized/placeholder content, never raw PII', () => {
    // S002's note had heavy PII; it must be scrubbed (tokens) or the placeholder, never the raw text.
    const s002 = result.students.find((s) => s.alias === 'S002');
    expect(s002).toBeTruthy();
    const note = s002!.note;
    expect(note === REDACTED_NOTE || note.includes('[')).toBe(true);
    expect(note).not.toContain('0901234567');
  });

  it('is deterministic', () => {
    expect(buildAnonymizedExport(params).text).toBe(result.text);
  });

  it('never reaches the network (no external AI/API call)', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    buildAnonymizedExport(params);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('produces a safe export (no crash, count line) when there are no records', () => {
    const empty = buildAnonymizedExport({ ...params, students: [] });
    expect(empty.text).toContain('Số học sinh có ghi nhận: 0');
    expect(empty.text).toContain('Chưa có ghi nhận nào');
  });
});

describe('feature i18n labels exist in both locales', () => {
  it('has Vietnamese and English UI strings for the AI export page + nav', () => {
    setLocale('vi');
    expect(t.claudeExport.title.length).toBeGreaterThan(0);
    expect(t.nav.claude).toBe('Xuất ẩn danh cho AI');
    setLocale('en');
    expect(t.claudeExport.title.length).toBeGreaterThan(0);
    expect(t.nav.claude).toBe('Anonymized AI Export');
  });
});
