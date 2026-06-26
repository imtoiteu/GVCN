import { describe, it, expect } from 'vitest';
import { computeDashboardSummary, type DashboardInput } from '../dashboardSummary';

const base: DashboardInput = {
  totalClasses: 1,
  totalStudents: 12,
  currentClassName: '8A',
  currentWeekLabel: 'Tuần 1',
  studentsRecordedThisWeek: 6,
  comments: 3,
  parentMessages: 2,
  reports: 1,
};

describe('computeDashboardSummary', () => {
  it('computes ratio and percent', () => {
    const s = computeDashboardSummary(base);
    expect(s.recordedRatio).toBeCloseTo(0.5);
    expect(s.recordedPercent).toBe(50);
    expect(s.hasClass).toBe(true);
    expect(s.hasWeek).toBe(true);
    expect(s.allRecorded).toBe(false);
  });

  it('reports allRecorded when every student has a record', () => {
    const s = computeDashboardSummary({ ...base, studentsRecordedThisWeek: 12 });
    expect(s.recordedPercent).toBe(100);
    expect(s.allRecorded).toBe(true);
  });

  it('handles zero students without dividing by zero', () => {
    const s = computeDashboardSummary({ ...base, totalStudents: 0, studentsRecordedThisWeek: 0 });
    expect(s.recordedRatio).toBe(0);
    expect(s.recordedPercent).toBe(0);
    expect(s.allRecorded).toBe(false);
  });

  it('clamps recorded count to the number of students', () => {
    const s = computeDashboardSummary({ ...base, totalStudents: 5, studentsRecordedThisWeek: 99 });
    expect(s.studentsRecordedThisWeek).toBe(5);
    expect(s.recordedPercent).toBe(100);
  });

  it('flags no class / no week', () => {
    const s = computeDashboardSummary({
      ...base,
      totalClasses: 0,
      currentClassName: null,
      currentWeekLabel: null,
    });
    expect(s.hasClass).toBe(false);
    expect(s.hasWeek).toBe(false);
  });
});
