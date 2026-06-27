// M9.2 — Sample Excel template for the student-import screen.
//
// Builds a small .xlsx the teacher can download, fill in, and re-import. The header row uses the
// exact Vietnamese labels the import engine recognizes (see HEADER_ALIASES in studentImport.ts),
// and the gender / date / note values match what the parser accepts — so the generated template
// round-trips cleanly through importStudentsFromWorkbook. Reuses the existing exceljs dependency;
// no new package. Pure data only (fake demo rows), never real student PII.

import * as ExcelJS from 'exceljs';

/** Canonical header labels (must match the import engine's recognized aliases). */
export const TEMPLATE_HEADERS = [
  'Mã học sinh',
  'Họ và tên',
  'Giới tính',
  'Ngày sinh',
  'Ghi chú',
] as const;

/** A few fake sample rows so the format is obvious. Not real students. */
export const TEMPLATE_SAMPLE_ROWS: string[][] = [
  ['8A-01', 'Nguyễn Văn An', 'Nam', '01/01/2012', 'Lớp trưởng'],
  ['8A-02', 'Trần Thị Bình', 'Nữ', '12/03/2012', ''],
  ['8A-03', 'Lê Hoàng Cường', 'Nam', '20/05/2012', 'Cần theo dõi thêm'],
];

/** Suggested filename for the downloaded template (ASCII-safe). */
export const TEMPLATE_FILENAME = 'gvcn-mau-danh-sach-hoc-sinh.xlsx';

/** Build the sample student-list workbook as .xlsx bytes. Async (exceljs is async). */
export async function buildStudentTemplateWorkbook(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Danh sach hoc sinh');

  const header = ws.addRow([...TEMPLATE_HEADERS]);
  header.font = { bold: true };
  for (const row of TEMPLATE_SAMPLE_ROWS) ws.addRow(row);

  // Readable widths: codes/gender/date narrow, name + note wide.
  const widths = [14, 28, 10, 14, 32];
  ws.columns.forEach((col, i) => {
    col.width = widths[i] ?? 16;
    col.alignment = { vertical: 'top', wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
