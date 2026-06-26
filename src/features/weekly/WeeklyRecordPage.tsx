// Weekly Record page ("Ghi nhận tuần") — the M3 vertical slice.
//
// A thin UI consumer of the existing data layer: choose a class → choose or create a week →
// for each student in the roster, toggle observation tags (grouped by the 5 categories) and
// add a short note → save → reload. No generation/export here (those are M4+). The save and
// reload paths use saveWeeklyRecord / listWeeklyRecordsByWeek / listRecordTagIdsByWeek from
// the DAL; this page only orchestrates state and renders.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  createWeek,
  listClasses,
  listStudentsByClass,
  listTags,
  listWeeksByClass,
  listWeeklyRecordsByWeek,
  listRecordTagIdsByWeek,
  saveWeeklyRecord,
  TAG_CATEGORIES,
} from '../../lib/db';
import type { ClassRow, ObservationTagRow, StudentRow, WeekRow } from '../../lib/db';
import { categoryLabel, genderLabel, t } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

/** Per-student editable draft held in component state until saved. */
interface Draft {
  tagIds: Set<number>;
  note: string;
}

function emptyDraft(): Draft {
  return { tagIds: new Set(), note: '' };
}

export function WeeklyRecordPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [tags, setTags] = useState<ObservationTagRow[]>([]);
  const [drafts, setDrafts] = useState<Map<number, Draft>>(new Map());

  const [creatingWeek, setCreatingWeek] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // Tags grouped into the 5 practical categories, in catalog order.
  const tagGroups = useMemo(
    () =>
      TAG_CATEGORIES.map((category) => ({
        category,
        items: tags.filter((tag) => tag.category === category),
      })).filter((g) => g.items.length > 0),
    [tags],
  );

  // ---- loading -----------------------------------------------------------

  // Load roster + tags + saved drafts for a (class, week) pair.
  const loadWeekData = useCallback(async (cid: number, wid: number | null) => {
    const db = await getDb();
    const students = await listStudentsByClass(db, cid);
    setRoster(students);
    setSavedCount(null);

    const next = new Map<number, Draft>();
    for (const s of students) next.set(s.id, emptyDraft());

    if (wid != null) {
      const records = await listWeeklyRecordsByWeek(db, wid);
      const pairs = await listRecordTagIdsByWeek(db, wid);
      const recToStudent = new Map(records.map((r) => [r.id, r.student_id]));
      for (const r of records) {
        const d = next.get(r.student_id);
        if (d) d.note = r.teacher_notes ?? '';
      }
      for (const p of pairs) {
        const sid = recToStudent.get(p.record_id);
        if (sid != null) next.get(sid)?.tagIds.add(p.tag_id);
      }
    }
    setDrafts(next);
  }, []);

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
        await loadWeekData(cid, wid);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [loadWeekData],
  );

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const db = await getDb();
      const [foundClasses, allTags] = [await listClasses(db), await listTags(db)];
      setClasses(foundClasses);
      setTags(allTags);
      const first = foundClasses[0] ?? null;
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
        await loadWeekData(classId, wid);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [classId, loadWeekData],
  );

  // ---- mutations ---------------------------------------------------------

  const createNextWeek = useCallback(async () => {
    if (classId == null) return;
    setCreatingWeek(true);
    try {
      const db = await getDb();
      const nextNo = weeks.length ? Math.max(...weeks.map((w) => w.week_no)) + 1 : 1;
      const newId = await createWeek(db, {
        class_id: classId,
        week_no: nextNo,
        label: t.weekly.weekName(nextNo),
      });
      const wks = await listWeeksByClass(db, classId);
      setWeeks(wks);
      setWeekId(newId);
      await loadWeekData(classId, newId);
    } catch {
      setStatus('error');
    } finally {
      setCreatingWeek(false);
    }
  }, [classId, weeks, loadWeekData]);

  const toggleTag = useCallback((studentId: number, tagId: number) => {
    setSavedCount(null);
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) ?? emptyDraft();
      const tagIds = new Set(current.tagIds);
      if (tagIds.has(tagId)) tagIds.delete(tagId);
      else tagIds.add(tagId);
      next.set(studentId, { ...current, tagIds });
      return next;
    });
  }, []);

  const setNote = useCallback((studentId: number, note: string) => {
    setSavedCount(null);
    setDrafts((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) ?? emptyDraft();
      next.set(studentId, { ...current, note });
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (weekId == null) return;
    setSaving(true);
    try {
      const db = await getDb();
      // Only persist students with at least one tag or a non-empty note — avoids creating
      // empty records for untouched students.
      let count = 0;
      for (const s of roster) {
        const d = drafts.get(s.id);
        if (!d) continue;
        const note = d.note.trim();
        if (d.tagIds.size === 0 && note === '') continue;
        await saveWeeklyRecord(db, {
          student_id: s.id,
          week_id: weekId,
          teacher_notes: note === '' ? null : note,
          tagIds: [...d.tagIds],
        });
        count += 1;
      }
      setSavedCount(count);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [weekId, roster, drafts]);

  // ---- render ------------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{t.weekly.title}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="page">
        <h1 className="page__title">{t.weekly.title}</h1>
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
        <h1 className="page__title">{t.weekly.title}</h1>
        <div className="state state--empty">
          <h2>{t.weekly.noClassTitle}</h2>
          <p>{t.weekly.noClassHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{t.weekly.title}</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={save}
          disabled={saving || weekId == null || roster.length === 0}
        >
          {saving ? t.weekly.saving : t.weekly.save}
        </button>
      </header>

      <p className="muted">{t.weekly.intro}</p>

      <div className="toolbar">
        <label className="field">
          <span className="field__label">{t.weekly.classLabel}</span>
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
          <span className="field__label">{t.weekly.weekLabel}</span>
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

        <button type="button" className="btn" onClick={createNextWeek} disabled={creatingWeek}>
          {creatingWeek ? t.weekly.creatingWeek : t.weekly.newWeek}
        </button>
      </div>

      {savedCount != null && (
        <div className="state state--success">
          {savedCount > 0 ? t.weekly.savedSummary(savedCount) : t.weekly.nothingToSave}
        </div>
      )}

      {weeks.length === 0 ? (
        <div className="state state--empty">
          <h2>{t.weekly.noWeekTitle}</h2>
          <p>{t.weekly.noWeekHint}</p>
        </div>
      ) : roster.length === 0 ? (
        <div className="state state--empty">{t.weekly.rosterEmpty}</div>
      ) : (
        <div className="student-list">
          {roster.map((s) => {
            const draft = drafts.get(s.id) ?? emptyDraft();
            return (
              <article key={s.id} className="student-card">
                <header className="student-card__head">
                  <span className="student-card__code">{s.student_code}</span>
                  <span className="student-card__name">{s.full_name}</span>
                  <span className="muted">{genderLabel(s.gender)}</span>
                  <span className="student-card__count">
                    {t.weekly.selectedCount(draft.tagIds.size)}
                  </span>
                </header>

                <div className="tag-groups">
                  {tagGroups.map((group) => (
                    <div key={group.category} className="tag-group">
                      <div className="tag-group__title">{categoryLabel(group.category)}</div>
                      <div className="tag-group__chips">
                        {group.items.map((tag) => {
                          const on = draft.tagIds.has(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              className={`tag-chip tag-chip--${tag.sentiment}${on ? ' tag-chip--on' : ''}`}
                              aria-pressed={on}
                              onClick={() => toggleTag(s.id, tag.id)}
                            >
                              {tag.label_vi}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <textarea
                  className="note-input"
                  rows={2}
                  placeholder={t.weekly.notePlaceholder}
                  value={draft.note}
                  onChange={(e) => setNote(s.id, e.currentTarget.value)}
                />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
