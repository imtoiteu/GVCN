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
