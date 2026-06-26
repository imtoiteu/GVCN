import { describe, it, expect } from 'vitest';
import * as ExcelJS from 'exceljs';

import {
  importStudentsFromWorkbook,
  parseStudentRows,
  commitStudentImport,
} from '../studentImport';
import { freshDb } from '../../../test/sqliteExecutor';
import { seedDemoClass } from '../../db/seed';
import { listStudentsByClass } from '../../db/repositories';

/** Build a real .xlsx in memory from an array-of-arrays (header row first). */
async function buildWorkbook(aoa: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  for (const row of aoa) ws.addRow(row);
  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

describe('parseStudentRows (pure)', () => {
  it('flags a missing required column at file level and parses nothing', () => {
    // No student_code column.
    const res = parseStudentRows(['full_name', 'gender'], [['Nguyễn Văn An', 'Nam']]);
    expect(res.valid).toHaveLength(0);
    expect(res.totalRows).toBe(0);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatchObject({ row: 0, field: 'student_code', code: 'missing_column' });
    expect(res.errors[0].message).toContain('Mã học sinh');
  });

  it('skips blank rows, errors rows missing a required value, keeps valid rows', () => {
    const res = parseStudentRows(
      ['student_code', 'full_name'],
      [
        ['8A-01', 'Nguyễn Văn An'], // valid
        ['', ''], // blank -> skipped, not counted
        ['8A-02', ''], // missing name -> error
        ['8A-03', 'Lê Hoàng Cường'], // valid
      ],
    );
    expect(res.valid.map((s) => s.student_code)).toEqual(['8A-01', '8A-03']);
    expect(res.totalRows).toBe(3); // blank row excluded
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatchObject({ row: 3, field: 'full_name', code: 'missing_value' });
  });

  it('de-duplicates by student_code within the file (case/space-insensitive, first wins)', () => {
    const res = parseStudentRows(
      ['student_code', 'full_name'],
      [
        ['8A-01', 'Nguyễn Văn An'],
        [' 8a-01 ', 'Trùng mã'], // same code after trim+upper -> duplicate
        ['8A-02', 'Trần Thị Bình'],
      ],
    );
    expect(res.valid.map((s) => s.student_code)).toEqual(['8A-01', '8A-02']);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatchObject({ row: 2, field: 'student_code', code: 'duplicate_in_file' });
  });
});

describe('importStudentsFromWorkbook (exceljs round-trip)', () => {
  it('imports a valid sheet with Vietnamese headers, diacritics, and gender mapping', async () => {
    const buf = await buildWorkbook([
      ['Mã học sinh', 'Họ và tên', 'Giới tính', 'Ngày sinh', 'Ghi chú'],
      ['8A-01', 'Nguyễn Văn An', 'Nam', '2011-05-02', 'Cần hỗ trợ môn Toán'],
      ['8A-02', 'Trần Thị Bình', 'Nữ', '', ''],
    ]);
    const res = await importStudentsFromWorkbook(buf);

    expect(res.errors).toHaveLength(0);
    expect(res.valid).toHaveLength(2);
    expect(res.valid[0]).toEqual({
      student_code: '8A-01',
      full_name: 'Nguyễn Văn An', // diacritics intact through the .xlsx round-trip
      gender: 'M',
      dob: '2011-05-02',
      note: 'Cần hỗ trợ môn Toán',
    });
    expect(res.valid[1]).toMatchObject({ student_code: '8A-02', gender: 'F', dob: null, note: null });
  });

  it('recognizes English headers and ignores unknown columns', async () => {
    const buf = await buildWorkbook([
      ['code', 'name', 'gender', 'favorite_color'],
      ['8A-09', 'Đỗ Quang Huy', 'M', 'blue'],
    ]);
    const res = await importStudentsFromWorkbook(buf);
    expect(res.errors).toHaveLength(0);
    expect(res.valid).toEqual([
      { student_code: '8A-09', full_name: 'Đỗ Quang Huy', gender: 'M', dob: null, note: null },
    ]);
  });
});

describe('commitStudentImport (Checkpoint B: demo + import build a roster)', () => {
  it('inserts new students and skips ones already in the class', async () => {
    const db = freshDb();
    const seed = await seedDemoClass(db); // demo 8A: codes 8A-01..8A-12

    const buf = await buildWorkbook([
      ['Mã học sinh', 'Họ và tên'],
      ['8A-01', 'Nguyễn Văn An'], // already exists -> skipped
      ['8A-13', 'Mai Văn Tùng'], // new
      ['8A-14', 'Lý Thị Vân'], // new
    ]);
    const { valid, errors } = await importStudentsFromWorkbook(buf);
    expect(errors).toHaveLength(0);

    const commit = await commitStudentImport(db, seed.classId, valid);
    expect(commit.inserted).toBe(2);
    expect(commit.skippedExisting).toBe(1);
    expect(commit.insertedCodes.sort()).toEqual(['8A-13', '8A-14']);

    const roster = await listStudentsByClass(db, seed.classId);
    expect(roster).toHaveLength(14); // 12 demo + 2 imported
    db.close();
  });
});
