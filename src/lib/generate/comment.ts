// M4 — Student comment generation (pure, local, deterministic).
//
// Converts a student's selected observation tags + teacher note into a respectful Vietnamese
// homeroom comment. No I/O, no external AI, no Date/random — the same input always produces the
// same text, so the output is unit-testable and reproducible.
//
// Tone (CLAUDE.md / SPEC §8.5): "ghi nhận / hỗ trợ / phối hợp / tiến bộ". The generator only ever
// emits supportive, cooperative phrasing; `concern` tags become gentle encouragement, never
// punishment. A banned-phrase guard (findBannedPhrases) backs this up: the generator self-checks
// its own controlled output, and the UI can scan the final (teacher-edited) text for warnings.

import type { ObservationTagRow } from '../db/types';

export type CommentTone = 'short' | 'balanced' | 'encouraging';

/** The slice of an observation tag the generator needs. */
export type CommentTag = Pick<ObservationTagRow, 'category' | 'sentiment' | 'label_vi'>;

export interface CommentInput {
  /** Display subject — usually the student's full name; a student code is also fine. */
  studentName: string;
  /** Selected observation tags from the controlled catalog. */
  tags: CommentTag[];
  /** Optional short free-text teacher note. */
  teacherNote?: string | null;
  /** Output style. Defaults to 'balanced'. */
  tone?: CommentTone;
}

export interface GeneratedComment {
  text: string;
  tone: CommentTone;
  /** Tag counts that drove generation — useful for the UI / debugging. */
  summary: { positive: number; neutral: number; concern: number; support: number };
}

/**
 * Punitive / stigmatizing wording that must never appear in a generated comment. Matched on
 * whole Vietnamese syllables (see findBannedPhrases) so innocuous words that merely *contain*
 * these letters (e.g. "như" vs "hư") are not falsely flagged.
 */
export const BANNED_PHRASES: readonly string[] = [
  'lười', 'lười biếng', 'chây lười', 'trây lười',
  'hư', 'hư hỏng', 'hư đốn',
  'dốt', 'dốt nát', 'ngu', 'ngu dốt', 'ngu si', 'đần', 'đần độn',
  'kém cỏi', 'yếu kém',
  'vô dụng', 'vô tích sự', 'vô giáo dục', 'mất dạy',
  'cá biệt',
  'bê tha', 'hết thuốc chữa', 'vô kỷ luật',
  'phá phách', 'quậy phá', 'ngỗ nghịch', 'côn đồ',
  'tệ hại', 'thảm hại', 'bết bát', 'đội sổ',
];

/** Split Vietnamese text into lowercase syllable tokens (drops punctuation/whitespace). */
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-zà-ỹ]+/u).filter(Boolean);
}

/**
 * Return the banned phrases present in `text`, matched as whole contiguous syllable sequences.
 * Token-exact matching means "như"/"nhưng" never trip the bare "hư" entry — only a standalone
 * "hư" syllable does. Returned in catalog order, de-duplicated.
 */
export function findBannedPhrases(text: string): string[] {
  const tokens = tokenize(text);
  const found: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    const needle = tokenize(phrase);
    if (needle.length === 0) continue;
    for (let i = 0; i + needle.length <= tokens.length; i++) {
      let match = true;
      for (let j = 0; j < needle.length; j++) {
        if (tokens[i + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        if (!found.includes(phrase)) found.push(phrase);
        break;
      }
    }
  }
  return found;
}

/** Lowercase the first character (Vietnamese-aware) so a label can sit mid-sentence. */
function lcFirst(s: string): string {
  return s.length ? s[0].toLocaleLowerCase('vi') + s.slice(1) : s;
}

/** Join Vietnamese clauses: "a", "a và b", "a, b và c". */
function joinVi(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return parts.slice(0, -1).join(', ') + ' và ' + parts[parts.length - 1];
}

function labels(tags: CommentTag[]): string[] {
  return tags.map((tag) => lcFirst(tag.label_vi));
}

/**
 * Generate a respectful Vietnamese comment from a student's tags + note.
 *
 * Segments, in order: positive praise → neutral observations → gentle growth points (concern) →
 * cooperation note (support category) → teacher note → closing. `short` drops the neutral segment
 * and closing; `encouraging` uses warmer leads and a hopeful closing.
 *
 * The function asserts its own controlled output (everything except the free-text teacher note)
 * contains no banned phrasing — a developer safety net guaranteeing the generator is never the
 * source of punitive wording.
 */
export function generateComment(input: CommentInput): GeneratedComment {
  const tone: CommentTone = input.tone ?? 'balanced';
  const name = input.studentName.trim() || 'em';
  const note = (input.teacherNote ?? '').trim();

  const positive = input.tags.filter((tag) => tag.sentiment === 'positive');
  const support = input.tags.filter((tag) => tag.category === 'support');
  // Neutral, excluding the support category (support tags are modelled as neutral sentiment).
  const neutral = input.tags.filter(
    (tag) => tag.sentiment === 'neutral' && tag.category !== 'support',
  );
  const concern = input.tags.filter((tag) => tag.sentiment === 'concern');

  const summary = {
    positive: positive.length,
    neutral: neutral.length,
    concern: concern.length,
    support: support.length,
  };

  // --- controlled (guarded) segments ---------------------------------------
  const body: string[] = [];

  if (positive.length > 0) {
    const lead =
      tone === 'encouraging'
        ? `Giáo viên rất vui khi thấy em ${name}`
        : tone === 'short'
          ? `Em ${name}`
          : `Trong tuần qua, em ${name}`;
    body.push(`${lead} ${joinVi(labels(positive))}.`);
  }

  if (neutral.length > 0 && tone !== 'short') {
    body.push(`Giáo viên cũng ghi nhận em ${joinVi(labels(neutral))}.`);
  }

  if (concern.length > 0) {
    const lead =
      tone === 'encouraging'
        ? `Giáo viên tin em sẽ sớm tiến bộ hơn ở`
        : tone === 'short'
          ? `Em cần cố gắng hơn ở`
          : `Bên cạnh đó, em cần cố gắng hơn ở`;
    body.push(`${lead}: ${joinVi(labels(concern))}.`);
    if (tone === 'balanced') {
      body.push('Giáo viên sẽ quan tâm, nhắc nhở nhẹ nhàng để em tiến bộ.');
    }
  }

  if (support.length > 0) {
    body.push(
      `Giáo viên mong tiếp tục phối hợp cùng gia đình để đồng hành với em về: ${joinVi(
        labels(support),
      )}.`,
    );
  }

  // Empty record → a safe, supportive fallback (still controlled vocabulary). The fallback
  // already carries its own sign-off, so the generic closing is suppressed below.
  const usedFallback = body.length === 0 && note === '';
  if (usedFallback) {
    body.push(
      tone === 'short'
        ? `Chưa có ghi nhận nổi bật cho em ${name} trong tuần.`
        : `Trong tuần qua, giáo viên chưa ghi nhận thông tin nổi bật cho em ${name}. Giáo viên sẽ tiếp tục quan tâm và đồng hành cùng em.`,
    );
  }

  const closing =
    tone === 'short' || usedFallback
      ? ''
      : tone === 'encouraging'
        ? 'Giáo viên tin rằng em sẽ tiếp tục cố gắng và tiến bộ hơn nữa.'
        : positive.length > 0
          ? 'Mong em tiếp tục phát huy.'
          : 'Giáo viên sẽ tiếp tục đồng hành cùng em.';

  // Self-check: our controlled contributions (body + closing, no free-text note) must be clean.
  const controlled = [...body, closing].filter(Boolean).join(' ');
  const offenders = findBannedPhrases(controlled);
  if (offenders.length > 0) {
    throw new Error(`generateComment produced banned phrasing: ${offenders.join(', ')}`);
  }

  // Final text inserts the teacher's own note (kept verbatim) before the closing.
  const out = [...body];
  if (note !== '') out.push(`Ghi chú của giáo viên: ${note}`);
  if (closing) out.push(closing);

  return { text: out.join(' '), tone, summary };
}
