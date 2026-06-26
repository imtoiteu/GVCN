// M9.1 — Pure dashboard summary calculations.
//
// Keeps the arithmetic (ratios, percentages, derived booleans) out of the React component so it can
// be unit-tested deterministically. No I/O, no Date/random — same input always yields the same
// summary. The DashboardPage gathers the raw counts via the DAL and feeds them here.

export interface DashboardInput {
  totalClasses: number;
  /** Active students in the currently selected class. */
  totalStudents: number;
  currentClassName: string | null;
  currentWeekLabel: string | null;
  /** Students that have a saved weekly record for the selected week. */
  studentsRecordedThisWeek: number;
  comments: number;
  parentMessages: number;
  reports: number;
}

export interface DashboardSummary extends DashboardInput {
  hasClass: boolean;
  hasWeek: boolean;
  /** studentsRecordedThisWeek / totalStudents, clamped to [0, 1]; 0 when there are no students. */
  recordedRatio: number;
  /** recordedRatio as a rounded 0–100 integer. */
  recordedPercent: number;
  /** True when every active student has a record for the selected week (and there is ≥1 student). */
  allRecorded: boolean;
}

export function computeDashboardSummary(i: DashboardInput): DashboardSummary {
  const totalStudents = Math.max(0, i.totalStudents);
  const recorded = Math.max(0, Math.min(i.studentsRecordedThisWeek, totalStudents));
  const recordedRatio = totalStudents > 0 ? recorded / totalStudents : 0;

  return {
    ...i,
    totalStudents,
    studentsRecordedThisWeek: recorded,
    hasClass: i.totalClasses > 0 && i.currentClassName !== null,
    hasWeek: i.currentWeekLabel !== null,
    recordedRatio,
    recordedPercent: Math.round(recordedRatio * 100),
    allRecorded: totalStudents > 0 && recorded === totalStudents,
  };
}
