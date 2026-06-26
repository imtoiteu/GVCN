import { describe, expect, it } from 'vitest';

import { modelToXlsx } from '../xlsx';
import type { ExportModel } from '../exportModel';

const model: ExportModel = {
  artifactType: 'comments',
  title: 'Danh sách nhận xét – Lớp 8A',
  meta: ['Tuần: Tuần 1'],
  blocks: [],
  table: {
    columns: ['Mã học sinh', 'Họ và tên', 'Nhận xét'],
    rows: [['8A-01', 'Nguyễn Văn An', 'Em đi học đầy đủ.']],
  },
  filenameBase: '8a-nhan-xet-tuan-1',
};

describe('modelToXlsx', () => {
  it('produces a non-empty XLSX (ZIP/PK) buffer', async () => {
    const bytes = await modelToXlsx(model);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });

  it('round-trips back through ExcelJS with the table content intact', async () => {
    const bytes = await modelToXlsx(model);
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    const allText = JSON.stringify(ws.getSheetValues());
    expect(allText).toContain('Nguyễn Văn An');
    expect(allText).toContain('Mã học sinh');
    expect(allText).toContain('8A-01');
  });
});
