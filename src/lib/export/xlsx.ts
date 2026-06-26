// M7 — XLSX writer (reuses the existing ExcelJS dependency — no new package).
//
// Projects an ExportModel onto a single worksheet: when the model has a table (per-student list or a
// report summary), it writes a bold header row + data rows; otherwise it dumps the title/meta/blocks
// as single-column rows so any artifact still exports something useful. Async (ExcelJS is async).

import * as ExcelJS from 'exceljs';

import type { ExportModel } from './exportModel';

/** MIME type for a .xlsx download. */
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Worksheet names must be ≤ 31 chars and avoid []:*?/\\ — keep it short and safe. */
function sheetName(model: ExportModel): string {
  switch (model.artifactType) {
    case 'minutes':
      return 'Bien ban';
    case 'weeklyReport':
      return 'Bao cao tuan';
    case 'monthlyReport':
      return 'Bao cao thang';
    case 'comments':
      return 'Nhan xet';
    case 'parentMessages':
      return 'Tin nhan PH';
    default:
      return 'Export';
  }
}

/** Render an ExportModel as .xlsx bytes. */
export async function modelToXlsx(model: ExportModel): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName(model));

  const titleRow = ws.addRow([model.title]);
  titleRow.font = { bold: true, size: 14 };
  for (const m of model.meta) ws.addRow([m]);
  ws.addRow([]);

  if (model.table) {
    const header = ws.addRow(model.table.columns);
    header.font = { bold: true };
    for (const r of model.table.rows) ws.addRow(r);
    // Reasonable widths: first columns narrow, last (content) wide.
    ws.columns.forEach((col, i) => {
      col.width = i === model.table!.columns.length - 1 ? 80 : 18;
      col.alignment = { vertical: 'top', wrapText: true };
    });
  } else {
    for (const b of model.blocks) {
      const r = ws.addRow([b.text]);
      if (b.heading) r.font = { bold: true };
    }
    if (ws.columns[0]) ws.columns[0].width = 80;
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
