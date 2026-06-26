// Types for the M2 Excel student-import slice.
//
// The import engine is deliberately runtime-source-agnostic: it works on raw bytes
// (ArrayBuffer/Uint8Array) so the same code is driven by Vitest fixtures now and, later,
// by a Tauri file dialog feeding the bytes of a teacher-selected .xlsx. No PII assumptions:
// only the controlled columns below are read; everything else in the sheet is ignored.

export type Gender = 'M' | 'F';

/** A validated, mapped student row ready to commit via the M1 DAL. */
export interface ParsedStudent {
  student_code: string;
  full_name: string;
  gender: Gender | null;
  dob: string | null;
  note: string | null;
}

export type ImportErrorCode =
  | 'missing_column' // a required column header is absent (file-level)
  | 'missing_value' // a required cell is blank/invalid on a row
  | 'duplicate_in_file'; // student_code repeats earlier in the same sheet

export interface ImportRowError {
  /** 1-based data-row number (excludes the header row). 0 = file-level error. */
  row: number;
  field?: string;
  code: ImportErrorCode;
  /** Vietnamese message, shown in the import preview. */
  message: string;
}

export interface StudentImportResult {
  /** Rows that passed validation and are unique within the file. */
  valid: ParsedStudent[];
  /** Per-row + file-level problems, for the preview's "row errors" panel. */
  errors: ImportRowError[];
  /** Non-empty data rows considered (valid + errored); blank rows are not counted. */
  totalRows: number;
}

export interface CommitResult {
  inserted: number;
  /** Valid rows whose student_code already existed in the target class (skipped). */
  skippedExisting: number;
  insertedCodes: string[];
}
