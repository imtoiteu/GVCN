// M6 — Shared aggregation + text helpers for homeroom minutes and reports.
//
// Pure and deterministic: turns a list of per-student weekly observations into class-level
// counts, distinct tag highlights, and exemplary / needs-support student lists. The meeting-minutes
// and weekly/monthly report generators both build their Vietnamese prose on top of this.
//
// No I/O, no external AI, no Date/random — same input always yields the same aggregate. Raw teacher
// notes are intentionally NOT part of the aggregate: class-level documents summarise the controlled
// tag catalog, keeping the output guard-checkable and avoiding free-text leakage into shared minutes.

import type { ObservationTagRow } from '../db/types';

/** The slice of an observation tag the report generators need. */
export type ReportTag = Pick<ObservationTagRow, 'category' | 'sentiment' | 'label_vi'>;

/** One student's observations for a single week (tags only — see module note re: notes). */
export interface StudentObservation {
  studentName: string;
  studentCode: string;
  tags: ReportTag[];
}

/** A distinct tag label and how many students carried it. */
export interface LabelCount {
  label: string;
  count: number;
}

/** Class-level rollup of one week (or a merged set of weeks for monthly reports). */
export interface WeekAggregate {
  /** Students that have any saved record. */
  studentsRecorded: number;
  /** Students with ≥1 positive / concern / support tag respectively. */
  positiveStudents: number;
  concernStudents: number;
  supportStudents: number;
  /** Distinct labels, most common first (ties broken alphabetically, Vietnamese collation). */
  positiveLabels: LabelCount[];
  concernLabels: LabelCount[];
  supportLabels: LabelCount[];
  /** Students with positives and no concern/support — sorted by positive count, then code. */
  exemplary: StudentObservation[];
  /** Students with any concern or support tag — sorted by issue count, then code. */
  needSupport: StudentObservation[];
}

const isPositive = (t: ReportTag): boolean => t.sentiment === 'positive';
const isConcern = (t: ReportTag): boolean => t.sentiment === 'concern';
const isSupport = (t: ReportTag): boolean => t.category === 'support';

const positiveCount = (r: StudentObservation): number => r.tags.filter(isPositive).length;
const issueCount = (r: StudentObservation): number =>
  r.tags.filter((t) => isConcern(t) || isSupport(t)).length;

/** Count distinct students carrying each label among the tags matching `pred`. */
function countLabels(records: StudentObservation[], pred: (t: ReportTag) => boolean): LabelCount[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const seen = new Set<string>();
    for (const t of r.tags) {
      if (!pred(t) || seen.has(t.label_vi)) continue;
      seen.add(t.label_vi);
      counts.set(t.label_vi, (counts.get(t.label_vi) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));
}

/** Roll up a set of student observations into class-level counts and highlight lists. */
export function aggregateWeek(records: StudentObservation[]): WeekAggregate {
  const exemplary = records
    .filter((r) => r.tags.some(isPositive) && !r.tags.some(isConcern) && !r.tags.some(isSupport))
    .sort((a, b) => positiveCount(b) - positiveCount(a) || a.studentCode.localeCompare(b.studentCode));

  const needSupport = records
    .filter((r) => r.tags.some(isConcern) || r.tags.some(isSupport))
    .sort((a, b) => issueCount(b) - issueCount(a) || a.studentCode.localeCompare(b.studentCode));

  return {
    studentsRecorded: records.length,
    positiveStudents: records.filter((r) => r.tags.some(isPositive)).length,
    concernStudents: records.filter((r) => r.tags.some(isConcern)).length,
    supportStudents: records.filter((r) => r.tags.some(isSupport)).length,
    positiveLabels: countLabels(records, isPositive),
    concernLabels: countLabels(records, isConcern),
    supportLabels: countLabels(records, isSupport),
    exemplary,
    needSupport,
  };
}

/**
 * Merge several weeks' observations into one per-student set (union of a student's tags across the
 * weeks). Used by the monthly report so each student is counted once over the whole period.
 * Students are keyed by code; the first-seen display name wins. Output is sorted by code.
 */
export function mergeWeeks(weeks: StudentObservation[][]): StudentObservation[] {
  const byCode = new Map<string, StudentObservation>();
  for (const week of weeks) {
    for (const r of week) {
      const existing = byCode.get(r.studentCode);
      if (existing) {
        existing.tags = [...existing.tags, ...r.tags];
      } else {
        byCode.set(r.studentCode, { studentName: r.studentName, studentCode: r.studentCode, tags: [...r.tags] });
      }
    }
  }
  return [...byCode.values()].sort((a, b) => a.studentCode.localeCompare(b.studentCode));
}

// ---- text helpers ---------------------------------------------------------

/** Lowercase the first character (Vietnamese-aware) so a label can sit mid-sentence. */
export function lcFirst(s: string): string {
  return s.length ? s[0].toLocaleLowerCase('vi') + s.slice(1) : s;
}

/** Join Vietnamese clauses: "a", "a và b", "a, b và c". */
export function joinVi(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return parts.slice(0, -1).join(', ') + ' và ' + parts[parts.length - 1];
}

/** "Đi học đầy đủ và tích cực phát biểu" from a list of LabelCount (label_vi lowercased mid-sentence). */
export function joinLabels(labels: LabelCount[]): string {
  return joinVi(labels.map((l) => lcFirst(l.label)));
}

/** Render a student with the concern/support labels that flagged them: "An (8A-01): cần …". */
export function needLine(r: StudentObservation): string {
  const needs = r.tags
    .filter((t) => isConcern(t) || isSupport(t))
    .map((t) => lcFirst(t.label_vi));
  const distinct = [...new Set(needs)];
  return distinct.length > 0
    ? `${r.studentName} (${r.studentCode}): ${joinVi(distinct)}.`
    : `${r.studentName} (${r.studentCode}).`;
}
