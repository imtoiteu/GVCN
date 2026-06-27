import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCALE,
  categoryLabel,
  exportArtifactLabel,
  genderLabel,
  getLocale,
  loadLocale,
  navLabel,
  normalizeLocale,
  saveLocale,
  setLocale,
  t,
} from '../i18n';

// Module state (currentLocale / live `t`) is shared across tests in this file, so always
// reset to the default before each case.
beforeEach(() => {
  setLocale('vi');
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLocale('vi');
});

describe('default locale', () => {
  it('defaults to Vietnamese', () => {
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(getLocale()).toBe('vi');
    expect(t.classes.title).toBe('Lớp & Học sinh');
    expect(navLabel('weekly')).toBe('Ghi nhận tuần');
  });
});

describe('English locale', () => {
  it('returns English UI labels after switching', () => {
    expect(setLocale('en')).toBe('en');
    expect(getLocale()).toBe('en');
    expect(t.classes.title).toBe('Classes & Students');
    expect(navLabel('weekly')).toBe('Weekly records');
    // Helpers read the live dictionary, so they translate too.
    expect(genderLabel('M')).toBe('Male');
    expect(categoryLabel('study')).toBe('Study');
    expect(exportArtifactLabel('comments')).toBe('Student comment list');
  });

  it('translates function-valued strings', () => {
    setLocale('en');
    expect(t.classes.countLabel(3)).toBe('3 students');
    setLocale('vi');
    expect(t.classes.countLabel(3)).toBe('3 học sinh');
  });
});

describe('M9.1 dashboard / settings / CRUD keys exist in both locales', () => {
  it('has non-empty strings for the new screens and labels', () => {
    for (const loc of ['vi', 'en'] as const) {
      setLocale(loc);
      // dashboard
      expect(t.dashboard.title.length).toBeGreaterThan(0);
      expect(t.dashboard.quickActionsTitle.length).toBeGreaterThan(0);
      expect(t.dashboard.recordedOf(2, 5)).toContain('2');
      // settings
      expect(t.settings.title.length).toBeGreaterThan(0);
      expect(t.settings.noCloudDesc.length).toBeGreaterThan(0);
      // shared actions + CRUD
      expect(t.actions.goWeekly.length).toBeGreaterThan(0);
      expect(t.classes.addStudent.length).toBeGreaterThan(0);
      expect(t.classes.deleteStudentBlocked(3)).toContain('3');
      expect(t.classes.deleteClassBlocked(2)).toContain('2');
      // empty-data warnings
      expect(t.reports.emptyDataWarning.length).toBeGreaterThan(0);
      expect(t.exportsPage.emptyDataWarning.length).toBeGreaterThan(0);
    }
  });

  it('translates the reports screen titles and demo-exists label', () => {
    setLocale('vi');
    expect(t.reports.titleMinutes).toBe('Biên bản họp lớp');
    expect(t.classes.seedExists).toBe('Dữ liệu mẫu 8A đã có');
    setLocale('en');
    expect(t.reports.titleMinutes).toBe('Class meeting minutes');
    expect(t.classes.seedExists).toBe('Demo data 8A already loaded');
  });
});

describe('M9.2 export-save / Excel-format / copyright keys', () => {
  it('has non-empty strings in both locales', () => {
    for (const loc of ['vi', 'en'] as const) {
      setLocale(loc);
      // export save feedback + PDF hint
      expect(t.exportsPage.saved('a.docx')).toContain('a.docx');
      expect(t.exportsPage.printHint.length).toBeGreaterThan(0);
      // Excel-format help block
      expect(t.importPage.format.title.length).toBeGreaterThan(0);
      expect(t.importPage.format.colCode.length).toBeGreaterThan(0);
      expect(t.importPage.format.ruleUnique.length).toBeGreaterThan(0);
      expect(t.importPage.format.download.length).toBeGreaterThan(0);
      // copyright (proper name; same in both, vi value via fallback in en)
      expect(t.copyright).toBe('© Triền Trần - Trường THCS Lê Mao');
    }
  });
});

describe('safe fallback', () => {
  it('falls back to Vietnamese for keys missing in English', () => {
    setLocale('en');
    // `appTitle` is intentionally omitted from the English dictionary.
    expect(t.appTitle).toBe('GVCN AutoReport');
  });

  it('never yields undefined for a known UI string in either locale', () => {
    for (const loc of ['vi', 'en'] as const) {
      setLocale(loc);
      expect(typeof t.exportsPage.exportError).toBe('string');
      expect(t.exportsPage.exportError.length).toBeGreaterThan(0);
      expect(typeof t.common.dbUnavailable).toBe('string');
    }
  });

  it('normalizes unknown locale input to Vietnamese', () => {
    expect(normalizeLocale('fr')).toBe('vi');
    expect(normalizeLocale(undefined)).toBe('vi');
    expect(normalizeLocale(null)).toBe('vi');
    expect(setLocale('fr')).toBe('vi');
    expect(getLocale()).toBe('vi');
  });

  it('falls back gracefully for an unknown nav/category id', () => {
    expect(navLabel('does-not-exist')).toBe('does-not-exist');
    expect(categoryLabel('does-not-exist')).toBe('does-not-exist');
  });
});

describe('locale persistence', () => {
  it('round-trips through localStorage when available', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });

    expect(loadLocale()).toBe('vi'); // nothing stored yet → default
    saveLocale('en');
    expect(loadLocale()).toBe('en');
    saveLocale('vi');
    expect(loadLocale()).toBe('vi');
  });

  it('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => saveLocale('en')).not.toThrow();
    expect(loadLocale()).toBe('vi');
  });

  it('does not throw when localStorage access itself throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => saveLocale('en')).not.toThrow();
    expect(loadLocale()).toBe('vi');
  });
});
