// M4 — Student comment generation tests.
//
// The generator is pure: these tests pin its Vietnamese output, the sentiment/category framing,
// the tones, the empty-record fallback, and the banned-phrase safety guard. No DB needed.

import { describe, it, expect } from 'vitest';
import {
  BANNED_PHRASES,
  findBannedPhrases,
  generateComment,
  type CommentTag,
} from '../comment';

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
} satisfies Record<string, CommentTag>;

describe('generateComment — positive tags', () => {
  it('praises the student and names the positive tags', () => {
    const c = generateComment({ studentName: 'An', tags: [T.full, T.active, T.help] });
    expect(c.text).toContain('An');
    expect(c.text).toContain('đi học đầy đủ');
    expect(c.text).toContain('tích cực phát biểu');
    expect(c.text).toContain('giúp đỡ bạn bè');
    // Vietnamese list joiner.
    expect(c.text).toContain(' và ');
    expect(c.summary.positive).toBe(3);
    expect(findBannedPhrases(c.text)).toEqual([]);
  });
});

describe('generateComment — mixed positive + concern', () => {
  it('includes both a praise segment and a gentle, non-punitive growth segment', () => {
    const c = generateComment({
      studentName: 'Bình',
      tags: [T.full, T.needsFocus, T.homework],
    });
    expect(c.text).toContain('đi học đầy đủ'); // positive present
    expect(c.text).toContain('cần tập trung hơn trong giờ học'); // concern present
    expect(c.text).toContain('chưa hoàn thành bài tập về nhà');
    // Supportive framing, never punitive.
    expect(c.text).toMatch(/cố gắng|tiến bộ|quan tâm/);
    expect(c.summary.positive).toBe(1);
    expect(c.summary.concern).toBe(2);
    expect(findBannedPhrases(c.text)).toEqual([]);
  });
});

describe('generateComment — support-needed tags', () => {
  it('uses cooperative phối-hợp framing for support tags', () => {
    const c = generateComment({ studentName: 'Cường', tags: [T.supAcademic, T.supFamily] });
    expect(c.text).toMatch(/phối hợp|đồng hành/);
    expect(c.text).toContain('gia đình');
    expect(c.text).toContain('cần hỗ trợ thêm về học tập');
    expect(c.summary.support).toBe(2);
    expect(findBannedPhrases(c.text)).toEqual([]);
  });
});

describe('generateComment — teacher note', () => {
  it('includes the teacher note verbatim', () => {
    const note = 'Em tiến bộ rõ rệt sau khi đổi chỗ ngồi.';
    const c = generateComment({ studentName: 'An', tags: [T.full], teacherNote: note });
    expect(c.text).toContain(note);
  });

  it('a note alone (no tags) still produces a comment containing the note', () => {
    const note = 'Cần theo dõi thêm tuần sau.';
    const c = generateComment({ studentName: 'An', tags: [], teacherNote: note });
    expect(c.text).toContain(note);
    expect(findBannedPhrases(c.text)).toEqual([]);
  });
});

describe('generateComment — empty / minimal record', () => {
  it('produces a safe, supportive fallback when there are no tags and no note', () => {
    const c = generateComment({ studentName: 'An', tags: [] });
    expect(c.text.length).toBeGreaterThan(0);
    expect(c.text).toContain('An');
    expect(c.text).toMatch(/chưa ghi nhận|chưa có ghi nhận/);
    expect(c.summary).toEqual({ positive: 0, neutral: 0, concern: 0, support: 0 });
    expect(findBannedPhrases(c.text)).toEqual([]);
  });

  it('whitespace-only note is treated as empty → fallback', () => {
    const c = generateComment({ studentName: 'An', tags: [], teacherNote: '   ' });
    expect(c.text).toMatch(/chưa ghi nhận|chưa có ghi nhận/);
  });
});

describe('generateComment — tones', () => {
  it('short omits the closing flourish; balanced and encouraging include one', () => {
    const tags = [T.full, T.needsFocus];
    const short = generateComment({ studentName: 'An', tags, tone: 'short' });
    const balanced = generateComment({ studentName: 'An', tags, tone: 'balanced' });
    const encouraging = generateComment({ studentName: 'An', tags, tone: 'encouraging' });

    expect(short.text.length).toBeLessThan(balanced.text.length);
    expect(balanced.text).toMatch(/phát huy|đồng hành/);
    expect(encouraging.text).toContain('tiến bộ hơn nữa');
  });

  it('is deterministic — identical input yields identical text', () => {
    const input = { studentName: 'An', tags: [T.full, T.needsFocus, T.supFamily], tone: 'balanced' as const };
    expect(generateComment(input).text).toBe(generateComment(input).text);
  });
});

describe('findBannedPhrases — safety guard', () => {
  it('detects planted punitive words as whole tokens', () => {
    expect(findBannedPhrases('Em này rất lười và hư.')).toEqual(
      expect.arrayContaining(['lười', 'hư']),
    );
    expect(findBannedPhrases('Học sinh cá biệt, vô dụng.')).toEqual(
      expect.arrayContaining(['cá biệt', 'vô dụng']),
    );
  });

  it('does NOT flag innocuous words that merely contain the same letters', () => {
    // "như"/"nhưng" contain the letters of "hư" but are different syllables.
    expect(findBannedPhrases('Em làm như vậy là đúng, nhưng cần cố gắng thêm.')).toEqual([]);
    // "chữ" is unrelated to "hư".
    expect(findBannedPhrases('Em viết chữ đẹp.')).toEqual([]);
  });

  it('every generated comment across all single tags is banned-free', () => {
    const allTags: CommentTag[] = Object.values(T);
    for (const tone of ['short', 'balanced', 'encouraging'] as const) {
      for (const tag of allTags) {
        const c = generateComment({ studentName: 'An', tags: [tag], tone });
        expect(findBannedPhrases(c.text)).toEqual([]);
      }
      // and the full combination
      const all = generateComment({ studentName: 'An', tags: allTags, tone });
      expect(findBannedPhrases(all.text)).toEqual([]);
    }
  });

  it('the banned list itself is non-empty (guard is actually configured)', () => {
    expect(BANNED_PHRASES.length).toBeGreaterThan(0);
  });
});
