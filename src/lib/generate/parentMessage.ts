// M5 — Parent-message generation (pure, local, deterministic).
//
// Converts a student's weekly observation tags + teacher note (and, where useful, an existing M4
// student comment) into a respectful, cooperative Vietnamese message addressed to the parents.
// No I/O, no external AI, no Date/random — same input always yields the same text, so output is
// unit-testable and reproducible offline.
//
// Tone (CLAUDE.md / SPEC §13): parent messages are framed as cooperation, never accusation —
// "phối hợp / đồng hành / hỗ trợ / mong / cảm ơn". The generator only ever emits cooperative
// phrasing; `concern` tags become a gentle, shared "cùng động viên em" reminder, never blame. The
// M4 banned-phrase guard (findBannedPhrases) backs this up: the generator self-checks its own
// controlled output, and the UI can scan the final (teacher-edited) text for warnings.
//
// IMPORTANT: this produces a *draft only*. Nothing is sent — no SMS, email, or Zalo.

import type { ObservationTagRow } from '../db/types';
import { findBannedPhrases } from './comment';

/** The kind of parent message. Drives the opening and closing framing. */
export type ParentMessageType = 'praise' | 'reminder' | 'cooperation' | 'support';

/** The slice of an observation tag the generator needs. */
export type ParentTag = Pick<ObservationTagRow, 'category' | 'sentiment' | 'label_vi'>;

export interface ParentMessageInput {
  /** Display subject — the student's full name (a student code is also fine). */
  studentName: string;
  /** Selected observation tags from the controlled catalog. */
  tags: ParentTag[];
  /** Optional short free-text teacher note. Kept verbatim. */
  teacherNote?: string | null;
  /**
   * Optional existing M4 student comment. Used only as fallback content when the week has no tags
   * to describe (so a note/comment-only week still yields a meaningful message). Kept verbatim.
   */
  comment?: string | null;
  /** Message type. When omitted, derived from the tags (see deriveParentMessageType). */
  type?: ParentMessageType;
}

export interface GeneratedParentMessage {
  text: string;
  type: ParentMessageType;
  /** Tag counts that drove generation — useful for the UI / debugging. */
  summary: { positive: number; neutral: number; concern: number; support: number };
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

function labels(tags: ParentTag[]): string[] {
  return tags.map((tag) => lcFirst(tag.label_vi));
}

/**
 * Pick a default message type from the week's tags, in priority order:
 * support-category present → 'support'; otherwise a concern → 'reminder'; otherwise any positive
 * → 'praise'; otherwise a neutral general 'cooperation' check-in.
 */
export function deriveParentMessageType(tags: ParentTag[]): ParentMessageType {
  if (tags.some((t) => t.category === 'support')) return 'support';
  if (tags.some((t) => t.sentiment === 'concern')) return 'reminder';
  if (tags.some((t) => t.sentiment === 'positive')) return 'praise';
  return 'cooperation';
}

/** Opening line per message type (controlled vocabulary). */
function opening(type: ParentMessageType, name: string): string {
  switch (type) {
    case 'praise':
      return `Giáo viên xin chia sẻ với quý phụ huynh một số ghi nhận tích cực của em ${name} trong tuần qua.`;
    case 'reminder':
      return `Giáo viên xin trao đổi với quý phụ huynh một vài điểm em ${name} cần cố gắng thêm trong tuần qua.`;
    case 'support':
      return `Giáo viên mong được phối hợp cùng gia đình để hỗ trợ em ${name} trong thời gian tới.`;
    case 'cooperation':
      return `Giáo viên mong được phối hợp cùng quý phụ huynh để cùng đồng hành và hỗ trợ em ${name} trong học tập và rèn luyện.`;
  }
}

/** Closing line per message type (controlled vocabulary, cooperative). */
function closing(type: ParentMessageType): string {
  switch (type) {
    case 'praise':
      return 'Rất mong quý phụ huynh tiếp tục động viên để em phát huy.';
    case 'reminder':
      return 'Giáo viên sẽ quan tâm, nhắc nhở em ở lớp và rất mong quý phụ huynh cùng động viên em ở nhà để em tiến bộ.';
    case 'support':
      return 'Giáo viên rất mong quý phụ huynh cùng đồng hành để em được hỗ trợ kịp thời và tiến bộ.';
    case 'cooperation':
      return 'Rất mong quý phụ huynh dành thời gian trao đổi cùng giáo viên khi cần.';
  }
}

const THANKS = 'Trân trọng cảm ơn sự phối hợp của quý phụ huynh.';

/**
 * Generate a respectful, cooperative Vietnamese parent-message draft from a student's tags + note.
 *
 * Layout (three logical lines): greeting → body (opening → tag details → free-text → closing) →
 * thanks. `concern` tags are framed as a shared, gentle reminder ("cùng động viên em … để em tiến
 * bộ"), never as blame. `support` tags use cooperative "phối hợp / đồng hành" framing.
 *
 * The function asserts its own controlled output (greeting, opening, tag-derived details, closing,
 * thanks — everything except the free-text teacher note / comment) contains no banned phrasing — a
 * developer safety net guaranteeing the generator is never the source of accusatory wording.
 */
export function generateParentMessage(input: ParentMessageInput): GeneratedParentMessage {
  const name = input.studentName.trim() || 'em';
  const note = (input.teacherNote ?? '').trim();
  const comment = (input.comment ?? '').trim();
  const type = input.type ?? deriveParentMessageType(input.tags);

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

  // --- controlled (guarded) tag detail segments ----------------------------
  const details: string[] = [];
  if (positive.length > 0) {
    details.push(`Cụ thể, em ${joinVi(labels(positive))}.`);
  }
  if (neutral.length > 0) {
    details.push(`Giáo viên cũng ghi nhận em ${joinVi(labels(neutral))}.`);
  }
  if (concern.length > 0) {
    details.push(`Em cần cố gắng thêm ở: ${joinVi(labels(concern))}.`);
  }
  if (support.length > 0) {
    details.push(`Em cần được hỗ trợ thêm về: ${joinVi(labels(support))}.`);
  }

  const greeting = `Kính gửi quý phụ huynh em ${name},`;
  const open = opening(type, name);
  const close = closing(type);

  // Self-check: our controlled contributions must be clean (free-text note/comment excluded).
  const controlled = [greeting, open, ...details, close, THANKS].join(' ');
  const offenders = findBannedPhrases(controlled);
  if (offenders.length > 0) {
    throw new Error(`generateParentMessage produced banned phrasing: ${offenders.join(', ')}`);
  }

  // --- free-text (verbatim, not guarded) -----------------------------------
  // The existing comment is used only when there are no tag details to describe, so a
  // note/comment-only week still produces meaningful content rather than an empty body.
  const freeText: string[] = [];
  if (details.length === 0 && comment !== '') {
    freeText.push(`Giáo viên xin chia sẻ thêm: ${comment}`);
  }
  if (note !== '') {
    freeText.push(`Trao đổi thêm từ giáo viên: ${note}`);
  }

  const body = [open, ...details, ...freeText, close].filter(Boolean).join(' ');
  const text = [greeting, body, THANKS].join('\n');

  return { text, type, summary };
}
