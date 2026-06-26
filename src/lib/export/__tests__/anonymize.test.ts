import { describe, expect, it } from 'vitest';
import {
  REDACTED_NOTE,
  REDACTION,
  looksUnsafe,
  makeAliases,
  redactAddresses,
  redactEmails,
  redactGenericNames,
  redactKnownNames,
  redactPhones,
  safeNote,
  sanitizeText,
} from '../anonymize';

describe('individual redactors', () => {
  it('removes emails', () => {
    const out = redactEmails('liên hệ teacher.name@school.edu.vn nhé');
    expect(out).not.toContain('@school.edu.vn');
    expect(out).toContain(REDACTION.email);
  });

  it('removes phone numbers but keeps short counts', () => {
    expect(redactPhones('sđt 0901234567')).toContain(REDACTION.phone);
    expect(redactPhones('gọi +84 90 123 4567')).toContain(REDACTION.phone);
    expect(redactPhones('có số 12 bạn')).toBe('có số 12 bạn'); // 2 digits → kept
  });

  it('removes address fragments', () => {
    const out = redactAddresses('nhà ở số nhà 12 đường Lê Lợi, phường 5');
    expect(out).not.toContain('Lê Lợi');
    expect(out).toContain(REDACTION.address);
  });

  it('removes known roster names', () => {
    const out = redactKnownNames('Hôm nay Nguyễn Văn An tiến bộ', ['Nguyễn Văn An']);
    expect(out).not.toContain('Nguyễn Văn An');
    expect(out).toContain(REDACTION.name);
  });

  it('removes generic capitalized name sequences (e.g. parent names)', () => {
    const out = redactGenericNames('Phụ huynh là Lê Văn Hùng');
    expect(out).not.toContain('Lê Văn Hùng');
    expect(out).toContain(REDACTION.name);
  });
});

describe('sanitizeText (full pipeline)', () => {
  const note =
    'Liên hệ mẹ Trần Thị Bình, sđt 0901234567, email a.b@gmail.com, nhà số 12 đường Lê Lợi, sinh 12/05/2010';
  const cleaned = sanitizeText(note, ['Trần Thị Bình']);

  it('removes every PII type from a mixed note', () => {
    for (const leak of ['Trần Thị Bình', '0901234567', 'a.b@gmail.com', 'Lê Lợi', '12/05/2010']) {
      expect(cleaned).not.toContain(leak);
    }
  });

  it('leaves no high-risk pattern behind', () => {
    expect(looksUnsafe(cleaned)).toBe(false);
  });

  it('is deterministic', () => {
    expect(sanitizeText(note, ['Trần Thị Bình'])).toBe(cleaned);
  });
});

describe('safeNote', () => {
  it('returns empty for empty input', () => {
    expect(safeNote('', [])).toBe('');
    expect(safeNote(null, [])).toBe('');
  });

  it('replaces an all-PII note with a placeholder', () => {
    expect(safeNote('0901234567', [])).toBe(REDACTED_NOTE);
    expect(safeNote('a@b.com', [])).toBe(REDACTED_NOTE);
  });

  it('keeps a sanitized note that still has safe content', () => {
    const out = safeNote('Em tiến bộ, sđt 0901234567', []);
    expect(out).not.toBe(REDACTED_NOTE);
    expect(out).toContain('tiến bộ');
    expect(out).not.toContain('0901234567');
  });
});

describe('makeAliases', () => {
  const roster = [
    { studentCode: '8A-03', fullName: 'C' },
    { studentCode: '8A-01', fullName: 'A' },
    { studentCode: '8A-02', fullName: 'B' },
  ];

  it('assigns S001.. in student-code order, independent of name', () => {
    const a = makeAliases(roster);
    expect(a.get('8A-01')).toBe('S001');
    expect(a.get('8A-02')).toBe('S002');
    expect(a.get('8A-03')).toBe('S003');
  });

  it('is stable across calls', () => {
    expect([...makeAliases(roster)]).toEqual([...makeAliases(roster)]);
  });
});
