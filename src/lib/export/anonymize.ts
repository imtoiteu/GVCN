// M8.2 — Anonymization boundary for the "Xuất ẩn danh cho AI" (Anonymized AI Export) feature.
//
// This is the SINGLE place that turns local student data into PII-free text safe for a teacher to
// paste into an external AI assistant. Everything here is pure and deterministic (no I/O, no network,
// no Date/random): the same input always yields the same output, which is what the no-PII test gate
// asserts.
//
// Privacy stance: bias toward OVER-redaction. For an anonymized export, removing a bit too much is
// safe; leaking a phone number, address, or real name is not. Free-text notes are therefore scrubbed
// aggressively (see redactGenericNames) and replaced wholesale with a placeholder if nothing safe is
// left. Controlled tag labels (from the seeded catalog) are NOT free text and are passed through as-is.

/** Redaction tokens (Vietnamese — the export body is Vietnamese regardless of UI locale). */
export const REDACTION = {
  email: '[email đã ẩn]',
  phone: '[số điện thoại đã ẩn]',
  date: '[ngày đã ẩn]',
  url: '[liên kết đã ẩn]',
  address: '[địa chỉ đã ẩn]',
  name: '[tên riêng đã ẩn]',
} as const;

/** Shown when a note has no safe content left after scrubbing. */
export const REDACTED_NOTE = '[ghi chú đã được ẩn để bảo vệ thông tin]';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- individual redactors (each is a pure string→string) --------------------------------

/** name@host.tld → token. */
export function redactEmails(s: string): string {
  return s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, REDACTION.email);
}

/** http(s):// or www. links → token. */
export function redactUrls(s: string): string {
  return s.replace(/\b(?:https?:\/\/|www\.)\S+/gi, REDACTION.url);
}

/** dd/mm/yyyy, dd-mm-yy, yyyy.mm.dd and similar numeric dates → token (run before phones). */
export function redactDates(s: string): string {
  return s
    .replace(/\b\d{4}[/.\-]\d{1,2}[/.\-]\d{1,2}\b/g, REDACTION.date)
    .replace(/\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b/g, REDACTION.date);
}

/**
 * Phone-like digit runs → token. Matches a run of digits with common separators
 * (spaces, dots, dashes, parens, optional +) and only redacts when it carries ≥8 digits, so short
 * counts ("số 12") survive but Vietnamese mobile/landline numbers do not.
 */
export function redactPhones(s: string): string {
  return s.replace(/\+?\d[\d().\s-]{6,}\d/g, (m) => {
    const digits = (m.match(/\d/g) ?? []).length;
    return digits >= 8 ? REDACTION.phone : m;
  });
}

/**
 * Vietnamese address fragments → token. Anchored on strong address keywords (đường/phố/ngõ/phường/
 * quận/huyện/tỉnh/…); consumes from the keyword to the next sentence punctuation. Heuristic and
 * deliberately greedy — an over-matched "đường lối" is an acceptable privacy trade.
 */
export function redactAddresses(s: string): string {
  // NOTE: JS `\b` is ASCII-only and fails around Vietnamese letters (e.g. `\bđường\b` is false), so we
  // anchor with a Unicode-safe lookbehind (start / whitespace / open-paren). The keyword must then be
  // followed by whitespace and a number or a capitalized word — real addresses carry one ("đường Lê
  // Lợi", "số nhà 12", "phường 5") — which avoids eating lookalikes where the keyword is a prefix or a
  // common phrase ("phối hợp", "đường lối", "xã hội", "tỉnh táo"). No `i` flag: it would make
  // `\p{Lu}` case-insensitive (matching lowercase too). Keywords are lowercase in notes; a
  // capitalized street name ("Đường Lê Lợi") is still caught by the generic-name redactor.
  return s.replace(
    /(?<=^|[\s(])(số nhà|đường|phố|ngõ|ngách|hẻm|khu phố|thôn|xóm|ấp|phường|xã|thị trấn|quận|huyện|tỉnh|thành phố)\s+(?=\d|\p{Lu})[^\n,.;]*/gu,
    REDACTION.address,
  );
}

/** Replace any occurrence of a known (roster) full name with the name token. Case-insensitive. */
export function redactKnownNames(s: string, knownNames: readonly string[]): string {
  const names = knownNames
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .sort((a, b) => b.length - a.length) // longest first so partials don't pre-empt full names
    .map(escapeRegExp);
  if (names.length === 0) return s;
  return s.replace(new RegExp(names.join('|'), 'gi'), REDACTION.name);
}

/**
 * Generic catch-all for personal names in free text: a run of 2–4 capitalized words
 * (e.g. "Lê Văn Hùng") → token. Catches parent/relative names that aren't on the roster. Vietnamese
 * prose only capitalizes sentence starts (single words), so requiring ≥2 consecutive capitalized
 * words keeps false positives low while still being intentionally cautious.
 */
export function redactGenericNames(s: string): string {
  return s.replace(/\p{Lu}[\p{Ll}']*(?:\s+\p{Lu}[\p{Ll}']*){1,3}/gu, REDACTION.name);
}

/** Run the full redaction pipeline over a free-text string. Order matters (dates before phones). */
export function sanitizeText(text: string, knownNames: readonly string[] = []): string {
  let out = text;
  out = redactEmails(out);
  out = redactUrls(out);
  out = redactDates(out);
  out = redactPhones(out);
  out = redactAddresses(out);
  out = redactKnownNames(out, knownNames);
  out = redactGenericNames(out);
  return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Defense-in-depth check: does the string still contain a high-risk raw pattern (email / link /
 * phone-length digit run)? Used to assert the pipeline worked and to trigger the note placeholder.
 */
export function looksUnsafe(text: string): boolean {
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) return true;
  if (/\b(?:https?:\/\/|www\.)\S+/i.test(text)) return true;
  for (const m of text.matchAll(/\+?\d[\d().\s-]{6,}\d/g)) {
    if ((m[0].match(/\d/g) ?? []).length >= 8) return true;
  }
  return false;
}

/**
 * Make a raw teacher note safe to share. Sanitizes it; if anything risky still slips through, or if
 * scrubbing left no human-readable content (the note was essentially all PII), returns a placeholder
 * instead of the fragment. Empty input → empty string (caller renders "(không có)").
 */
export function safeNote(raw: string | null | undefined, knownNames: readonly string[] = []): string {
  const text = (raw ?? '').trim();
  if (text === '') return '';
  const cleaned = sanitizeText(text, knownNames);
  if (looksUnsafe(cleaned)) return REDACTED_NOTE;
  // If everything that's left is redaction tokens / punctuation, there's no safe content to keep.
  const withoutTokens = cleaned.replace(/\[[^\]]*\]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
  return withoutTokens.length === 0 ? REDACTED_NOTE : cleaned;
}

// --- stable aliases ---------------------------------------------------------------------

/** Minimal roster entry needed to assign a stable alias. */
export interface RosterEntry {
  studentCode: string;
  fullName: string;
}

/**
 * Assign deterministic aliases (S001, S002, …) to a class roster, ordered by student code. The alias
 * is independent of the real name AND of the real code value, so the export reveals neither.
 */
export function makeAliases(roster: readonly RosterEntry[]): Map<string, string> {
  const sorted = [...roster].sort((a, b) => a.studentCode.localeCompare(b.studentCode));
  const aliases = new Map<string, string>();
  sorted.forEach((r, i) => aliases.set(r.studentCode, `S${String(i + 1).padStart(3, '0')}`));
  return aliases;
}
