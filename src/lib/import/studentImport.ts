// M2 — Excel student import (parse -> Zod-validate -> map -> dedupe -> commit).
//
// Split into a thin I/O boundary (`readStudentSheet`, the only exceljs call) and a PURE
// core (`parseStudentRows`) so the validation/mapping/dedupe logic is unit-tested without
// any file or DB. `commitStudentImport` reuses the M1 DAL — no new SQL here.
//
// Security notes (CLAUDE.md import-safety):
//   - Columns are matched against a fixed allowlist of canonical fields, so a malicious
//     header can never inject an arbitrary/`__proto__` key into a row object.
//   - exceljs replaces npm `xlsx`, which carried two unpatched high-severity advisories
//     (prototype pollution + ReDoS). See docs/m2-excel-import.md.

import * as ExcelJS from 'exceljs';
import { z } from 'zod';

import { createStudent, getStudentByCode } from '../db/repositories';
import type { SqlExecutor } from '../db/executor';
import type {
  CommitResult,
  Gender,
  ImportRowError,
  ParsedStudent,
  StudentImportResult,
} from './types';

// ---- column model ---------------------------------------------------------

const CANONICAL_FIELDS = ['student_code', 'full_name', 'gender', 'dob', 'note'] as const;
type CanonicalField = (typeof CANONICAL_FIELDS)[number];

const REQUIRED_FIELDS = ['student_code', 'full_name'] as const;

const REQUIRED_LABEL: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  student_code: 'Mã học sinh',
  full_name: 'Họ và tên',
};

// Accepts Vietnamese (with/without diacritics) and English headers. Keys are normalized
// (lowercased, trimmed, spaces collapsed) before lookup — see normalizeHeader.
const HEADER_ALIASES: Record<string, CanonicalField> = {
  // student_code
  student_code: 'student_code',
  code: 'student_code',
  'student code': 'student_code',
  stt: 'student_code',
  'mã': 'student_code',
  ma: 'student_code',
  'mã hs': 'student_code',
  'ma hs': 'student_code',
  'mã học sinh': 'student_code',
  'ma hoc sinh': 'student_code',
  'mã số': 'student_code',
  'ma so': 'student_code',
  // full_name
  full_name: 'full_name',
  name: 'full_name',
  'full name': 'full_name',
  'student name': 'full_name',
  'họ và tên': 'full_name',
  'ho va ten': 'full_name',
  'họ tên': 'full_name',
  'ho ten': 'full_name',
  'tên': 'full_name',
  ten: 'full_name',
  'họ và tên học sinh': 'full_name',
  // gender
  gender: 'gender',
  sex: 'gender',
  'giới tính': 'gender',
  'gioi tinh': 'gender',
  'phái': 'gender',
  phai: 'gender',
  // dob
  dob: 'dob',
  'date of birth': 'dob',
  birthday: 'dob',
  'ngày sinh': 'dob',
  'ngay sinh': 'dob',
  ns: 'dob',
  // note
  note: 'note',
  notes: 'note',
  'ghi chú': 'note',
  'ghi chu': 'note',
  remark: 'note',
  remarks: 'note',
};

function normalizeHeader(h: string): string {
  return h.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');
}

const MALE = new Set(['m', 'nam', 'male', 'boy', 'trai', '1']);
const FEMALE = new Set(['f', 'nữ', 'nu', 'female', 'girl', 'gái', 'gai', '0']);

function normalizeGender(raw: string): Gender | null {
  const v = raw.trim().toLocaleLowerCase('vi');
  if (MALE.has(v)) return 'M';
  if (FEMALE.has(v)) return 'F';
  return null; // unknown/blank — gender is optional, not an error
}

// ---- Zod row schema (required-field validation) ---------------------------

const StudentRowSchema = z.object({
  student_code: z.string().trim().min(1, 'Thiếu mã học sinh.'),
  full_name: z.string().trim().min(1, 'Thiếu họ và tên.'),
  gender: z.string().trim(),
  dob: z.string().trim(),
  note: z.string().trim(),
});

// ---- cell coercion --------------------------------------------------------

/** Coerce any exceljs cell value (string, number, date, rich text, hyperlink, formula) to a string. */
function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text.trim(); // hyperlink / shared string
    if (Array.isArray(o.richText)) {
      return o.richText
        .map((rt) => (rt && typeof rt === 'object' ? String((rt as { text?: unknown }).text ?? '') : ''))
        .join('')
        .trim();
    }
    if ('result' in o) return cellToString(o.result); // formula cell
    if (typeof o.hyperlink === 'string') return o.hyperlink.trim();
  }
  return String(v).trim();
}

// ---- I/O boundary (the only exceljs touch point) --------------------------

export interface SheetRows {
  /** Canonical field per column, or null for unrecognized columns. */
  headerFields: (CanonicalField | null)[];
  /** Data rows (header excluded), each a string array aligned to headerFields. */
  dataRows: string[][];
}

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof Uint8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  }
  return data;
}

/** Read the first worksheet into a header map + raw string rows. Async (exceljs is async). */
export async function readStudentSheet(data: ArrayBuffer | Uint8Array): Promise<SheetRows> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(toArrayBuffer(data));
  const ws = wb.worksheets[0];
  if (!ws) return { headerFields: [], dataRows: [] };

  const rawRows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]; // exceljs row.values is 1-indexed; [0] is empty
    const cells: string[] = [];
    for (let i = 1; i < values.length; i++) cells.push(cellToString(values[i]));
    rawRows.push(cells);
  });

  if (rawRows.length === 0) return { headerFields: [], dataRows: [] };

  const headerFields = rawRows[0].map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
  return { headerFields, dataRows: rawRows.slice(1) };
}

// ---- pure validation / mapping / dedupe -----------------------------------

/**
 * Validate + map raw sheet rows into students, collecting per-row errors and de-duplicating
 * by student_code (case/space-insensitive; first occurrence wins). Pure and synchronous.
 */
export function parseStudentRows(
  headerFields: (CanonicalField | null)[],
  dataRows: string[][],
): StudentImportResult {
  const errors: ImportRowError[] = [];
  const present = new Set(headerFields.filter((f): f is CanonicalField => f !== null));

  for (const req of REQUIRED_FIELDS) {
    if (!present.has(req)) {
      errors.push({
        row: 0,
        field: req,
        code: 'missing_column',
        message: `Thiếu cột bắt buộc: ${REQUIRED_LABEL[req]}.`,
      });
    }
  }
  // A missing required column makes every row unparseable — stop before per-row work.
  if (errors.length > 0) return { valid: [], errors, totalRows: 0 };

  const valid: ParsedStudent[] = [];
  const seen = new Set<string>();
  let totalRows = 0;

  dataRows.forEach((cells, i) => {
    const rowNo = i + 1;
    // Build the row object from the allowlist only (never from raw header text).
    const rec: Record<CanonicalField, string> = {
      student_code: '',
      full_name: '',
      gender: '',
      dob: '',
      note: '',
    };
    headerFields.forEach((field, col) => {
      if (field) rec[field] = (cells[col] ?? '').trim();
    });

    // Skip fully-blank rows (trailing rows, spacer rows) without counting them.
    if (!rec.student_code && !rec.full_name && !rec.gender && !rec.dob && !rec.note) return;
    totalRows++;

    const parsed = StudentRowSchema.safeParse(rec);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row: rowNo,
          field: typeof issue.path[0] === 'string' ? issue.path[0] : undefined,
          code: 'missing_value',
          message: issue.message,
        });
      }
      return;
    }

    const code = parsed.data.student_code;
    const key = code.toLocaleUpperCase('vi');
    if (seen.has(key)) {
      errors.push({
        row: rowNo,
        field: 'student_code',
        code: 'duplicate_in_file',
        message: `Mã học sinh bị trùng trong tệp: ${code}.`,
      });
      return;
    }
    seen.add(key);

    valid.push({
      student_code: code,
      full_name: parsed.data.full_name,
      gender: normalizeGender(parsed.data.gender),
      dob: parsed.data.dob || null,
      note: parsed.data.note || null,
    });
  });

  return { valid, errors, totalRows };
}

/** Read + validate a workbook's first sheet in one call. */
export async function importStudentsFromWorkbook(
  data: ArrayBuffer | Uint8Array,
): Promise<StudentImportResult> {
  const { headerFields, dataRows } = await readStudentSheet(data);
  return parseStudentRows(headerFields, dataRows);
}

// ---- commit (reuses the M1 DAL) -------------------------------------------

/**
 * Insert validated students into a class, skipping any whose student_code already exists
 * there (dedupe against the existing roster — e.g. demo 8A). Returns counts for the UI.
 */
export async function commitStudentImport(
  exec: SqlExecutor,
  classId: number,
  students: ParsedStudent[],
): Promise<CommitResult> {
  let inserted = 0;
  let skippedExisting = 0;
  const insertedCodes: string[] = [];

  for (const s of students) {
    const existing = await getStudentByCode(exec, classId, s.student_code);
    if (existing) {
      skippedExisting++;
      continue;
    }
    await createStudent(exec, {
      class_id: classId,
      student_code: s.student_code,
      full_name: s.full_name,
      gender: s.gender,
      dob: s.dob,
      note: s.note,
    });
    inserted++;
    insertedCodes.push(s.student_code);
  }

  return { inserted, skippedExisting, insertedCodes };
}
