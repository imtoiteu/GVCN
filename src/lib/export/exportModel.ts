// M7 — Shared export view-model.
//
// A single normalized shape (`ExportModel`) that the DOCX / XLSX / print-PDF writers all consume.
// The builders here MAP already-generated, guard-checked artifact text (from the M4/M5/M6
// generators or saved rows) into that shape — they do NOT re-derive or re-generate any Vietnamese
// prose. Pure and deterministic: no I/O, no external AI, no Date/random.

import type { WeekAggregate } from '../generate/reportData';

/** Which generated artifact an export represents. */
export type ExportArtifactType =
  | 'minutes'
  | 'weeklyReport'
  | 'monthlyReport'
  | 'comments'
  | 'parentMessages';

/** One line of a document body: a section heading or a normal paragraph. */
export interface ExportBlock {
  heading: boolean;
  text: string;
}

/** A simple tabular view (header row + data rows) — the XLSX-oriented projection. */
export interface ExportTable {
  columns: string[];
  rows: string[][];
}

/**
 * The normalized artifact, format-agnostic. `blocks` is the readable document body (used by DOCX /
 * PDF); `table` is the tabular projection (used by XLSX — a per-student list or a report summary).
 * `filenameBase` is an ASCII slug (no extension) safe for a download filename.
 */
export interface ExportModel {
  artifactType: ExportArtifactType;
  title: string;
  /** Sub-header lines shown under the title (e.g. "Lớp: 8A    Tuần: …"). */
  meta: string[];
  blocks: ExportBlock[];
  table: ExportTable | null;
  filenameBase: string;
}

/**
 * Turn a Vietnamese string into a lowercase ASCII slug for filenames: strips diacritics, maps đ→d,
 * collapses every other run of non-alphanumerics to a single dash. Falls back to "export" if empty.
 */
export function asciiSlug(s: string): string {
  const slug = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritic marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'export';
}

/**
 * Build an export model for a *document* artifact (minutes / weekly / monthly report) from its
 * already-generated text. The first line becomes the title; lines before the first numbered section
 * ("1. …") become meta; the rest become blocks (numbered lines are headings). `table` is an optional
 * summary projection (used for XLSX). No text is regenerated — the generated prose is mapped as-is.
 */
export function buildReportModel(params: {
  artifactType: ExportArtifactType;
  generatedText: string;
  filenameBase: string;
  table?: ExportTable | null;
}): ExportModel {
  const lines = params.generatedText.split('\n');
  const title = (lines[0] ?? '').trim();
  const meta: string[] = [];
  const blocks: ExportBlock[] = [];
  let inBody = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const isHeading = /^\d+\.\s/.test(line);
    if (!inBody && !isHeading) {
      meta.push(line);
      continue;
    }
    inBody = true;
    blocks.push({ heading: isHeading, text: line });
  }

  return {
    artifactType: params.artifactType,
    title,
    meta,
    blocks,
    table: params.table ?? null,
    filenameBase: params.filenameBase,
  };
}

/** One per-student entry of a list artifact (comments / parent messages). */
export interface ExportListItem {
  code: string;
  name: string;
  text: string;
}

/**
 * Build an export model for a *list* artifact (per-student comments / parent messages). Each item
 * becomes a bold "Name (Code)" heading block followed by its (already-generated) text, and the whole
 * set becomes a [Mã học sinh, Họ và tên, <contentColumn>] table for XLSX.
 */
export function buildListModel(params: {
  artifactType: ExportArtifactType;
  title: string;
  meta: string[];
  items: ExportListItem[];
  contentColumn: string;
  filenameBase: string;
}): ExportModel {
  const blocks: ExportBlock[] = [];
  for (const it of params.items) {
    blocks.push({ heading: true, text: `${it.name} (${it.code})` });
    for (const line of it.text.split('\n')) blocks.push({ heading: false, text: line });
  }

  const table: ExportTable = {
    columns: ['Mã học sinh', 'Họ và tên', params.contentColumn],
    rows: params.items.map((it) => [it.code, it.name, it.text]),
  };

  return {
    artifactType: params.artifactType,
    title: params.title,
    meta: params.meta,
    blocks,
    table,
    filenameBase: params.filenameBase,
  };
}

/** A small two-column KPI summary of a week/period aggregate — the XLSX projection for reports. */
export function reportSummaryTable(agg: WeekAggregate): ExportTable {
  return {
    columns: ['Chỉ số', 'Số lượng'],
    rows: [
      ['Học sinh được ghi nhận', String(agg.studentsRecorded)],
      ['Có ghi nhận tích cực', String(agg.positiveStudents)],
      ['Cần cố gắng thêm', String(agg.concernStudents)],
      ['Cần quan tâm, hỗ trợ', String(agg.supportStudents)],
      ['Học sinh tiêu biểu', String(agg.exemplary.length)],
    ],
  };
}
