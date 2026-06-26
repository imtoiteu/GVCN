// M5 — Parent-message generation tests.
//
// The generator is pure: these tests pin its Vietnamese output, the message-type framing, the
// cooperative (non-accusatory) tone, the teacher-note/comment passthrough, the empty-record
// behaviour, and the shared banned-phrase safety guard. No DB needed.

import { describe, it, expect } from 'vitest';
import { findBannedPhrases } from '../comment';
import {
  deriveParentMessageType,
  generateParentMessage,
  type ParentTag,
} from '../parentMessage';

// Tag fixtures mirror the seeded catalog (002_seed_tags.sql) shapes.
const T = {
  full: { category: 'attendance', sentiment: 'positive', label_vi: 'Đi học đầy đủ' },
  active: { category: 'study', sentiment: 'positive', label_vi: 'Tích cực phát biểu' },
  help: { category: 'good_deed', sentiment: 'positive', label_vi: 'Giúp đỡ bạn bè' },
  excused: { category: 'attendance', sentiment: 'neutral', label_vi: 'Nghỉ học có phép' },
  needsFocus: { category: 'study', sentiment: 'concern', label_vi: 'Cần tập trung hơn trong giờ học' },
  homework: { category: 'study', sentiment: 'concern', label_vi: 'Chưa hoàn thành bài tập về nhà' },
  supAcademic: { category: 'support', sentiment: 'neutral', label_vi: 'Cần hỗ trợ thêm về học tập' },
  supFamily: { category: 'support', sentiment: 'neutral', label_vi: 'Cần phối hợp với gia đình' },
} satisfies Record<string, ParentTag>;

/** Cooperative markers that must appear in every parent message (CLAUDE.md / SPEC §13). */
const COOP = /phối hợp|đồng hành|mong|cảm ơn/;

describe('generateParentMessage — addressing + structure', () => {
  it('always opens with a respectful greeting and ends with a thank-you', () => {
    const m = generateParentMessage({ studentName: 'An', tags: [T.full] });
    expect(m.text).toContain('Kính gửi quý phụ huynh em An,');
    expect(m.text).toContain('Trân trọng cảm ơn sự phối hợp của quý phụ huynh.');
    expect(m.text).toMatch(COOP);
    expect(findBannedPhrases(m.text)).toEqual([]);
  });
});

describe('generateParentMessage — positive-only record', () => {
  it('shares the positive observations and defaults to the praise type', () => {
    const m = generateParentMessage({ studentName: 'An', tags: [T.full, T.active, T.help] });
    expect(m.type).toBe('praise');
    expect(m.text).toContain('tích cực');
    expect(m.text).toContain('đi học đầy đủ');
    expect(m.text).toContain('giúp đỡ bạn bè');
    expect(m.text).toContain(' và ');
    expect(m.summary.positive).toBe(3);
    expect(findBannedPhrases(m.text)).toEqual([]);
  });
});

describe('generateParentMessage — mixed record', () => {
  it('leads with positives, frames concerns as a shared gentle reminder (no blame)', () => {
    const m = generateParentMessage({
      studentName: 'Bình',
      tags: [T.full, T.needsFocus, T.homework],
    });
    expect(m.type).toBe('reminder'); // concern present, no support tag
    expect(m.text).toContain('đi học đầy đủ'); // positive still surfaced
    expect(m.text).toContain('cần tập trung hơn trong giờ học'); // concern surfaced gently
    expect(m.text).toContain('chưa hoàn thành bài tập về nhà');
    // Cooperative, growth-oriented framing — never accusatory.
    expect(m.text).toMatch(/cố gắng|tiến bộ|động viên|cùng/);
    expect(m.summary.positive).toBe(1);
    expect(m.summary.concern).toBe(2);
    expect(findBannedPhrases(m.text)).toEqual([]);
  });
});

describe('generateParentMessage — support-needed record', () => {
  it('uses cooperative phối-hợp / gia-đình framing and the support type', () => {
    const m = generateParentMessage({ studentName: 'Cường', tags: [T.supAcademic, T.supFamily] });
    expect(m.type).toBe('support');
    expect(m.text).toMatch(/phối hợp|đồng hành/);
    expect(m.text).toContain('gia đình');
    expect(m.text).toContain('cần hỗ trợ thêm về học tập');
    expect(m.summary.support).toBe(2);
    expect(findBannedPhrases(m.text)).toEqual([]);
  });
});

describe('generateParentMessage — teacher note + comment', () => {
  it('includes the teacher note verbatim', () => {
    const note = 'Em tiến bộ rõ rệt sau khi đổi chỗ ngồi.';
    const m = generateParentMessage({ studentName: 'An', tags: [T.full], teacherNote: note });
    expect(m.text).toContain(note);
  });

  it('falls back to the existing comment when there are no tags to describe', () => {
    const comment = 'Em An có nhiều tiến bộ trong tuần qua.';
    const m = generateParentMessage({ studentName: 'An', tags: [], comment });
    expect(m.text).toContain(comment);
    expect(findBannedPhrases(m.text)).toEqual([]);
  });

  it('does not repeat the comment when tag details already describe the week', () => {
    const comment = 'Một câu nhận xét dài dòng không cần thiết.';
    const m = generateParentMessage({ studentName: 'An', tags: [T.full], comment });
    expect(m.text).not.toContain(comment);
  });
});

describe('generateParentMessage — empty / minimal record', () => {
  it('still produces a valid cooperative draft (no tags, no note)', () => {
    const m = generateParentMessage({ studentName: 'An', tags: [] });
    expect(m.text.length).toBeGreaterThan(0);
    expect(m.text).toContain('An');
    expect(m.type).toBe('cooperation');
    expect(m.text).toMatch(COOP);
    expect(m.summary).toEqual({ positive: 0, neutral: 0, concern: 0, support: 0 });
    expect(findBannedPhrases(m.text)).toEqual([]);
  });

  it('treats a whitespace-only note as empty', () => {
    const m = generateParentMessage({ studentName: 'An', tags: [], teacherNote: '   ' });
    expect(m.text).not.toContain('Trao đổi thêm từ giáo viên:');
  });
});

describe('generateParentMessage — message types + determinism', () => {
  it('respects an explicit type override', () => {
    const m = generateParentMessage({ studentName: 'An', tags: [T.full], type: 'cooperation' });
    expect(m.type).toBe('cooperation');
    expect(m.text).toContain('mong được phối hợp');
  });

  it('derives the default type by tag priority (support > concern > positive > neutral)', () => {
    expect(deriveParentMessageType([T.full])).toBe('praise');
    expect(deriveParentMessageType([T.full, T.needsFocus])).toBe('reminder');
    expect(deriveParentMessageType([T.needsFocus, T.supFamily])).toBe('support');
    expect(deriveParentMessageType([T.excused])).toBe('cooperation');
    expect(deriveParentMessageType([])).toBe('cooperation');
  });

  it('is deterministic — identical input yields identical text', () => {
    const input = { studentName: 'An', tags: [T.full, T.needsFocus, T.supFamily] };
    expect(generateParentMessage(input).text).toBe(generateParentMessage(input).text);
  });
});

describe('generateParentMessage — non-accusatory tone guard', () => {
  it('every message across all tags and types is cooperative and banned-free', () => {
    const allTags: ParentTag[] = Object.values(T);
    const types = ['praise', 'reminder', 'cooperation', 'support'] as const;
    for (const type of types) {
      for (const tag of allTags) {
        const m = generateParentMessage({ studentName: 'An', tags: [tag], type });
        expect(findBannedPhrases(m.text)).toEqual([]);
        expect(m.text).toMatch(COOP);
      }
      const all = generateParentMessage({ studentName: 'An', tags: allTags, type });
      expect(findBannedPhrases(all.text)).toEqual([]);
      expect(all.text).toMatch(COOP);
    }
  });
});
