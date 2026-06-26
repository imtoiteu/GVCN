import { describe, expect, it } from 'vitest';

import {
  asciiSlug,
  buildListModel,
  buildReportModel,
  reportSummaryTable,
} from '../exportModel';
import type { WeekAggregate } from '../../generate/reportData';

const SAMPLE_MINUTES = [
  'BIÊN BẢN HỌP LỚP – SINH HOẠT CHỦ NHIỆM',
  'Lớp: 8A    Tuần: Tuần 1 (02/09–06/09)',
  'Thời gian: 15h00 ngày 06/09/2025',
  '',
  '1. Tình hình chung',
  'Trong tuần, giáo viên đã ghi nhận quan sát cho 4 học sinh.',
  '',
  '2. Ưu điểm',
  '- Đi học đầy đủ (3 học sinh)',
  '',
  '(Biên bản được tổng hợp từ các quan sát đã được ghi nhận trong tuần.)',
].join('\n');

describe('asciiSlug', () => {
  it('strips Vietnamese diacritics and maps đ → d', () => {
    expect(asciiSlug('Báo cáo tháng 9 lớp 8Đ')).toBe('bao-cao-thang-9-lop-8d');
  });

  it('collapses punctuation/spaces to single dashes and trims', () => {
    expect(asciiSlug('  Tuần 1 (02/09–06/09)  ')).toBe('tuan-1-02-09-06-09');
  });

  it('falls back to "export" when nothing remains', () => {
    expect(asciiSlug('—  —')).toBe('export');
  });
});

describe('buildReportModel', () => {
  const model = buildReportModel({
    artifactType: 'minutes',
    generatedText: SAMPLE_MINUTES,
    filenameBase: '8a-bien-ban-tuan-1',
  });

  it('takes the first line as the title', () => {
    expect(model.title).toBe('BIÊN BẢN HỌP LỚP – SINH HOẠT CHỦ NHIỆM');
  });

  it('keeps pre-section lines as meta', () => {
    expect(model.meta).toEqual([
      'Lớp: 8A    Tuần: Tuần 1 (02/09–06/09)',
      'Thời gian: 15h00 ngày 06/09/2025',
    ]);
  });

  it('marks numbered lines as headings and others as paragraphs', () => {
    const headings = model.blocks.filter((b) => b.heading).map((b) => b.text);
    expect(headings).toEqual(['1. Tình hình chung', '2. Ưu điểm']);
    const paras = model.blocks.filter((b) => !b.heading).map((b) => b.text);
    expect(paras).toContain('- Đi học đầy đủ (3 học sinh)');
    // The trailing disclaimer is a paragraph, not a heading.
    expect(paras.some((p) => p.startsWith('(Biên bản'))).toBe(true);
  });

  it('drops blank lines from the body', () => {
    expect(model.blocks.every((b) => b.text.trim() !== '')).toBe(true);
  });
});

describe('buildListModel', () => {
  const model = buildListModel({
    artifactType: 'comments',
    title: 'Danh sách nhận xét – Lớp 8A',
    meta: ['Tuần: Tuần 1'],
    items: [
      { code: '8A-01', name: 'Nguyễn Văn An', text: 'Em đi học đầy đủ.\nMong em phát huy.' },
      { code: '8A-02', name: 'Trần Thị Bình', text: 'Em tích cực phát biểu.' },
    ],
    contentColumn: 'Nhận xét',
    filenameBase: '8a-nhan-xet-tuan-1',
  });

  it('emits a bold name heading then text lines per student', () => {
    expect(model.blocks[0]).toEqual({ heading: true, text: 'Nguyễn Văn An (8A-01)' });
    expect(model.blocks[1]).toEqual({ heading: false, text: 'Em đi học đầy đủ.' });
    expect(model.blocks[2]).toEqual({ heading: false, text: 'Mong em phát huy.' });
    expect(model.blocks[3]).toEqual({ heading: true, text: 'Trần Thị Bình (8A-02)' });
  });

  it('builds a [code, name, content] table preserving the raw multi-line text', () => {
    expect(model.table?.columns).toEqual(['Mã học sinh', 'Họ và tên', 'Nhận xét']);
    expect(model.table?.rows[0]).toEqual([
      '8A-01',
      'Nguyễn Văn An',
      'Em đi học đầy đủ.\nMong em phát huy.',
    ]);
  });
});

describe('reportSummaryTable', () => {
  it('projects the aggregate counts into KPI rows', () => {
    const agg: WeekAggregate = {
      studentsRecorded: 4,
      positiveStudents: 3,
      concernStudents: 1,
      supportStudents: 1,
      positiveLabels: [],
      concernLabels: [],
      supportLabels: [],
      exemplary: [{ studentName: 'A', studentCode: '8A-01', tags: [] }],
      needSupport: [],
    };
    const table = reportSummaryTable(agg);
    expect(table.columns).toEqual(['Chỉ số', 'Số lượng']);
    expect(table.rows).toContainEqual(['Học sinh được ghi nhận', '4']);
    expect(table.rows).toContainEqual(['Có ghi nhận tích cực', '3']);
    expect(table.rows).toContainEqual(['Học sinh tiêu biểu', '1']);
  });
});
