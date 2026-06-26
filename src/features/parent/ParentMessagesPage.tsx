// Parent messages page ("Tin nhắn phụ huynh") — the M5 vertical slice.
//
// A thin UI consumer of the M3 records DAL + the pure parent-message generator: choose a class →
// choose a recorded week → for every student that has a weekly record, generate a respectful,
// cooperative Vietnamese draft addressed to the parents → edit in place → save into
// parent_messages. The latest M4 comment is passed as fallback context for note/comment-only
// weeks. Generation is local and deterministic; these are DRAFTS — nothing is sent anywhere.

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  createParentMessage,
  listClasses,
  listLatestCommentsByWeek,
  listLatestParentMessagesByWeek,
  listRecordTagIdsByWeek,
  listStudentsByClass,
  listTags,
  listWeeklyRecordsByWeek,
  listWeeksByClass,
} from '../../lib/db';
import type { ClassRow, ObservationTagRow, StudentRow, WeekRow } from '../../lib/db';
import { findBannedPhrases } from '../../lib/generate/comment';
import {
  generateParentMessage,
  type ParentTag,
} from '../../lib/generate/parentMessage';
import { parentTypeLabel, t, type ParentTypeChoice } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

/** One generated parent message in the editor, keyed by the student. */
interface MessageItem {
  student: StudentRow;
  generated: string; // baseline generated text for the current type choice
  text: string; // editable
  hasSaved: boolean; // prefilled from a previously saved message
}

const TYPE_CHOICES: ParentTypeChoice[] = [
  'auto',
  'praise',
  'reminder',
  'cooperation',
  'support',
];

export function ParentMessagesPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [choice, setChoice] = useState<ParentTypeChoice>('auto');
  const [items, setItems] = useState<MessageItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // Build the editable message list for a (class, week). `useSaved` prefills the latest saved
  // message text where one exists; otherwise the freshly generated text is shown.
  const buildItems = useCallback(
    async (cid: number, wid: number | null, useChoice: ParentTypeChoice, useSaved: boolean) => {
      const db = await getDb();
      setSavedCount(null);
      if (wid == null) {
        setItems([]);
        return;
      }

      const [students, allTags, records, pairs, comments, saved] = [
        await listStudentsByClass(db, cid),
        await listTags(db),
        await listWeeklyRecordsByWeek(db, wid),
        await listRecordTagIdsByWeek(db, wid),
        await listLatestCommentsByWeek(db, wid),
        useSaved ? await listLatestParentMessagesByWeek(db, wid) : [],
      ];

      const tagsById = new Map<number, ObservationTagRow>(allTags.map((tag) => [tag.id, tag]));
      const studentById = new Map<number, StudentRow>(students.map((s) => [s.id, s]));
      const recToStudent = new Map(records.map((r) => [r.id, r.student_id]));
      const commentByStudent = new Map(comments.map((c) => [c.student_id, c.body_text]));
      const savedByStudent = new Map(saved.map((m) => [m.student_id, m.body_text]));

      // Collect each student's tag ids (in catalog order) from the week's record/tag pairs.
      const tagIdsByStudent = new Map<number, number[]>();
      for (const p of pairs) {
        const sid = recToStudent.get(p.record_id);
        if (sid == null) continue;
        tagIdsByStudent.set(sid, [...(tagIdsByStudent.get(sid) ?? []), p.tag_id]);
      }

      const next: MessageItem[] = [];
      for (const r of records) {
        const student = studentById.get(r.student_id);
        if (!student) continue;
        const tags: ParentTag[] = (tagIdsByStudent.get(r.student_id) ?? [])
          .map((id) => tagsById.get(id))
          .filter((tag): tag is ObservationTagRow => tag != null)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((tag) => ({ category: tag.category, sentiment: tag.sentiment, label_vi: tag.label_vi }));

        const generated = generateParentMessage({
          studentName: student.full_name,
          tags,
          teacherNote: r.teacher_notes ?? '',
          comment: commentByStudent.get(r.student_id) ?? null,
          type: useChoice === 'auto' ? undefined : useChoice,
        }).text;
        const savedText = savedByStudent.get(r.student_id);
        next.push({
          student,
          generated,
          text: savedText ?? generated,
          hasSaved: savedText != null,
        });
      }
      next.sort((a, b) => a.student.student_code.localeCompare(b.student.student_code));
      setItems(next);
    },
    [],
  );

  const selectClass = useCallback(
    async (cid: number) => {
      setStatus('loading');
      try {
        const db = await getDb();
        setClassId(cid);
        const wks = await listWeeksByClass(db, cid);
        setWeeks(wks);
        const wid = wks[0]?.id ?? null;
        setWeekId(wid);
        await buildItems(cid, wid, choice, true);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [buildItems, choice],
  );

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const db = await getDb();
      const found = await listClasses(db);
      setClasses(found);
      const first = found[0] ?? null;
      if (!first) {
        setClassId(null);
        setStatus('ready');
        return;
      }
      await selectClass(first.id);
    } catch {
      setStatus('error');
    }
  }, [selectClass]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectWeek = useCallback(
    async (wid: number) => {
      if (classId == null) return;
      setStatus('loading');
      try {
        setWeekId(wid);
        await buildItems(classId, wid, choice, true);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [classId, choice, buildItems],
  );

  // Changing the type (or pressing "Tạo lại") regenerates fresh text and discards in-editor edits.
  const regenerate = useCallback(
    async (nextChoice: ParentTypeChoice) => {
      if (classId == null) return;
      setChoice(nextChoice);
      setStatus('loading');
      try {
        await buildItems(classId, weekId, nextChoice, false);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [classId, weekId, buildItems],
  );

  const setText = useCallback((studentId: number, text: string) => {
    setSavedCount(null);
    setItems((prev) =>
      prev.map((it) => (it.student.id === studentId ? { ...it, text } : it)),
    );
  }, []);

  const save = useCallback(async () => {
    if (weekId == null) return;
    setSaving(true);
    try {
      const db = await getDb();
      let count = 0;
      for (const it of items) {
        const body = it.text.trim();
        if (body === '') continue;
        await createParentMessage(db, {
          student_id: it.student.id,
          week_id: weekId,
          body_text: body,
          edited_by_user: body !== it.generated.trim(),
        });
        count += 1;
      }
      setSavedCount(count);
      // Re-mark items as saved so reopening reflects persistence.
      setItems((prev) => prev.map((it) => ({ ...it, hasSaved: true })));
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [weekId, items]);

  // ---- render ------------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{t.parent.title}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="page">
        <h1 className="page__title">{t.parent.title}</h1>
        <div className="state state--error">
          <p>{t.common.dbUnavailable}</p>
          <button type="button" className="btn" onClick={() => void load()}>
            {t.common.retry}
          </button>
        </div>
      </section>
    );
  }

  if (classes.length === 0) {
    return (
      <section className="page">
        <h1 className="page__title">{t.parent.title}</h1>
        <div className="state state--empty">
          <h2>{t.parent.noClassTitle}</h2>
          <p>{t.parent.noClassHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{t.parent.title}</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={save}
          disabled={saving || items.length === 0}
        >
          {saving ? t.parent.saving : t.parent.save}
        </button>
      </header>

      <p className="muted">{t.parent.intro}</p>

      <div className="toolbar">
        <label className="field">
          <span className="field__label">{t.parent.classLabel}</span>
          <select
            className="field__input"
            value={classId ?? ''}
            onChange={(e) => void selectClass(Number(e.currentTarget.value))}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.school_year}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t.parent.weekLabel}</span>
          <select
            className="field__input"
            value={weekId ?? ''}
            disabled={weeks.length === 0}
            onChange={(e) => void selectWeek(Number(e.currentTarget.value))}
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label ?? t.weekly.weekName(w.week_no)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t.parent.typeLabel}</span>
          <select
            className="field__input"
            value={choice}
            onChange={(e) => void regenerate(e.currentTarget.value as ParentTypeChoice)}
          >
            {TYPE_CHOICES.map((ch) => (
              <option key={ch} value={ch}>
                {parentTypeLabel(ch)}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn" onClick={() => void regenerate(choice)}>
          {t.parent.regenerate}
        </button>
      </div>

      {savedCount != null && (
        <div className="state state--success">
          {savedCount > 0 ? t.parent.savedSummary(savedCount) : t.parent.nothingToSave}
        </div>
      )}

      {weeks.length === 0 ? (
        <div className="state state--empty">
          <h2>{t.parent.noWeekTitle}</h2>
          <p>{t.parent.noWeekHint}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="state state--empty">{t.parent.noRecords}</div>
      ) : (
        <div className="student-list">
          {items.map((it) => {
            const banned = findBannedPhrases(it.text);
            return (
              <article key={it.student.id} className="student-card">
                <header className="student-card__head">
                  <span className="student-card__code">{it.student.student_code}</span>
                  <span className="student-card__name">{it.student.full_name}</span>
                  {it.hasSaved && <span className="badge">{t.parent.savedBadge}</span>}
                </header>

                <textarea
                  className="note-input comment-input"
                  rows={6}
                  value={it.text}
                  onChange={(e) => setText(it.student.id, e.currentTarget.value)}
                />

                {banned.length > 0 && (
                  <p className="comment-warn">{t.parent.warnBanned(banned.join(', '))}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
