// Biên bản & Báo cáo page — the M6 vertical slice.
//
// A thin UI consumer of the M3 records DAL + the pure minutes/report generators. Choose a class →
// pick an artifact (weekly meeting minutes / weekly report / monthly report) → pick a week (or a
// month, grouped from the weeks' start dates) → generate a Vietnamese document → edit in place →
// save into homeroom_reports. Generation is local and deterministic; nothing is sent anywhere.

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  createReport,
  getLatestReport,
  listClasses,
  listRecordTagIdsByWeek,
  listStudentsByClass,
  listTags,
  listWeeklyRecordsByWeek,
  listWeeksByClass,
} from '../../lib/db';
import type {
  ClassRow,
  ObservationTagRow,
  ReportPeriodKind,
  SqlExecutor,
  WeekRow,
} from '../../lib/db';
import { findBannedPhrases } from '../../lib/generate/comment';
import { generateMeetingMinutes } from '../../lib/generate/meetingMinutes';
import { generateMonthlyReport, generateWeeklyReport } from '../../lib/generate/homeroomReport';
import type { StudentObservation } from '../../lib/generate/reportData';
import { reportKindLabel, t, type ReportKind } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

export interface MonthGroup {
  key: string; // 'YYYY-MM' or 'other'
  label: string;
  weeks: WeekRow[];
}

interface ReportTarget {
  periodKind: ReportPeriodKind;
  periodLabel: string;
  weekId: number | null;
}

const KIND_CHOICES: ReportKind[] = ['minutes', 'weekly', 'monthly'];

/** Human label for a week (its stored label, else "Tuần N"). */
export function weekLabel(w: WeekRow): string {
  return w.label ?? t.weekly.weekName(w.week_no);
}

function monthKeyLabel(key: string): string {
  if (key === 'other') return t.reports.otherMonths;
  const [y, m] = key.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

/** Group a class's weeks into months by start_date (YYYY-MM); undated weeks fall into 'other'. */
export function buildMonths(weeks: WeekRow[]): MonthGroup[] {
  const map = new Map<string, WeekRow[]>();
  for (const w of weeks) {
    const key = w.start_date && w.start_date.length >= 7 ? w.start_date.slice(0, 7) : 'other';
    map.set(key, [...(map.get(key) ?? []), w]);
  }
  return [...map.keys()].sort().map((key) => ({
    key,
    label: monthKeyLabel(key),
    weeks: (map.get(key) ?? []).slice().sort((a, b) => a.week_no - b.week_no),
  }));
}

/** Read one week's records and resolve them into per-student observations (tags in catalog order). */
export async function loadWeekObservations(
  db: SqlExecutor,
  classId: number,
  weekId: number,
): Promise<StudentObservation[]> {
  const [students, allTags, records, pairs] = [
    await listStudentsByClass(db, classId),
    await listTags(db),
    await listWeeklyRecordsByWeek(db, weekId),
    await listRecordTagIdsByWeek(db, weekId),
  ];
  const tagsById = new Map<number, ObservationTagRow>(allTags.map((tag) => [tag.id, tag]));
  const studentById = new Map(students.map((s) => [s.id, s]));
  const recToStudent = new Map(records.map((r) => [r.id, r.student_id]));

  const tagIdsByStudent = new Map<number, number[]>();
  for (const p of pairs) {
    const sid = recToStudent.get(p.record_id);
    if (sid == null) continue;
    tagIdsByStudent.set(sid, [...(tagIdsByStudent.get(sid) ?? []), p.tag_id]);
  }

  const obs: StudentObservation[] = [];
  for (const r of records) {
    const student = studentById.get(r.student_id);
    if (!student) continue;
    const tags = (tagIdsByStudent.get(r.student_id) ?? [])
      .map((id) => tagsById.get(id))
      .filter((tag): tag is ObservationTagRow => tag != null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tag) => ({ category: tag.category, sentiment: tag.sentiment, label_vi: tag.label_vi }));
    obs.push({ studentName: student.full_name, studentCode: student.student_code, tags });
  }
  return obs.sort((a, b) => a.studentCode.localeCompare(b.studentCode));
}

export function ReportsPage({ initialKind = 'weekly' }: { initialKind?: ReportKind }) {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [months, setMonths] = useState<MonthGroup[]>([]);
  const [kind, setKind] = useState<ReportKind>(initialKind);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [time, setTime] = useState('');

  const [generated, setGenerated] = useState('');
  const [text, setText] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [target, setTarget] = useState<ReportTarget | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [emptyData, setEmptyData] = useState(false);

  const className = classes.find((c) => c.id === classId)?.name ?? '';
  // Title + default artifact match the sidebar entry the screen was opened from (M9.1 clarity).
  const pageTitle = initialKind === 'minutes' ? t.reports.titleMinutes : t.reports.titleReports;

  // Generate the document for the current selection. `useSaved` prefills a previously saved version
  // (same class/kind/period) when one exists; otherwise the freshly generated text is shown.
  const rebuild = useCallback(
    async (p: {
      classId: number;
      className: string;
      kind: ReportKind;
      week: WeekRow | null;
      monthGroup: MonthGroup | null;
      time: string;
      useSaved: boolean;
    }) => {
      const db = await getDb();
      setSavedOk(false);

      let gen = '';
      let tgt: ReportTarget | null = null;
      let recordedCount = 0;

      if (p.kind === 'monthly') {
        if (!p.monthGroup) {
          setGenerated(''); setText(''); setHasSaved(false); setTarget(null); setEmptyData(false);
          return;
        }
        const weekInputs = [];
        for (const w of p.monthGroup.weeks) {
          const records = await loadWeekObservations(db, p.classId, w.id);
          recordedCount += records.length;
          weekInputs.push({ weekLabel: weekLabel(w), records });
        }
        gen = generateMonthlyReport({ className: p.className, periodLabel: p.monthGroup.label, weeks: weekInputs }).text;
        tgt = { periodKind: 'month', periodLabel: `Báo cáo tháng · ${p.monthGroup.label}`, weekId: null };
      } else if (p.week) {
        const records = await loadWeekObservations(db, p.classId, p.week.id);
        recordedCount = records.length;
        const wl = weekLabel(p.week);
        if (p.kind === 'minutes') {
          gen = generateMeetingMinutes({ className: p.className, weekLabel: wl, meetingTime: p.time, records }).text;
          tgt = { periodKind: 'week', periodLabel: `Biên bản · ${wl}`, weekId: p.week.id };
        } else {
          gen = generateWeeklyReport({ className: p.className, weekLabel: wl, records }).text;
          tgt = { periodKind: 'week', periodLabel: `Báo cáo tuần · ${wl}`, weekId: p.week.id };
        }
      } else {
        setGenerated(''); setText(''); setHasSaved(false); setTarget(null); setEmptyData(false);
        return;
      }

      setEmptyData(recordedCount === 0);

      let body = gen;
      let saved = false;
      if (p.useSaved && tgt) {
        const existing = await getLatestReport(db, p.classId, tgt.periodKind, tgt.periodLabel);
        if (existing) { body = existing.body_text; saved = true; }
      }
      setGenerated(gen);
      setText(body);
      setHasSaved(saved);
      setTarget(tgt);
    },
    [],
  );

  const selectClass = useCallback(
    async (cls: ClassRow) => {
      setStatus('loading');
      try {
        const db = await getDb();
        setClassId(cls.id);
        const wks = await listWeeksByClass(db, cls.id);
        setWeeks(wks);
        const ms = buildMonths(wks);
        setMonths(ms);
        const wid = wks[0]?.id ?? null;
        const mkey = ms[0]?.key ?? null;
        setWeekId(wid);
        setMonthKey(mkey);
        await rebuild({
          classId: cls.id,
          className: cls.name,
          kind,
          week: wks.find((w) => w.id === wid) ?? null,
          monthGroup: ms.find((g) => g.key === mkey) ?? null,
          time,
          useSaved: true,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [rebuild, kind, time],
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
      await selectClass(first);
    } catch {
      setStatus('error');
    }
  }, [selectClass]);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-run a generation for the current selection with one field overridden.
  const refresh = useCallback(
    async (over: { kind?: ReportKind; weekId?: number; monthKey?: string; useSaved: boolean }) => {
      if (classId == null) return;
      const k = over.kind ?? kind;
      const wid = over.weekId ?? weekId;
      const mkey = over.monthKey ?? monthKey;
      setStatus('loading');
      try {
        await rebuild({
          classId,
          className,
          kind: k,
          week: weeks.find((w) => w.id === wid) ?? null,
          monthGroup: months.find((g) => g.key === mkey) ?? null,
          time,
          useSaved: over.useSaved,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [classId, className, kind, weekId, monthKey, weeks, months, time, rebuild],
  );

  const save = useCallback(async () => {
    if (classId == null || target == null) return;
    const body = text.trim();
    if (body === '') return;
    setSaving(true);
    try {
      const db = await getDb();
      await createReport(db, {
        class_id: classId,
        period_kind: target.periodKind,
        week_id: target.weekId,
        period_label: target.periodLabel,
        body_text: body,
        edited_by_user: body !== generated.trim(),
      });
      setHasSaved(true);
      setSavedOk(true);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [classId, target, text, generated]);

  // ---- render ------------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{pageTitle}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="page">
        <h1 className="page__title">{pageTitle}</h1>
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
        <h1 className="page__title">{pageTitle}</h1>
        <div className="state state--empty">
          <h2>{t.reports.noClassTitle}</h2>
          <p>{t.reports.noClassHint}</p>
        </div>
      </section>
    );
  }

  const banned = findBannedPhrases(text);
  const isMonthly = kind === 'monthly';
  const noPeriod = isMonthly ? months.length === 0 : weeks.length === 0;

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{pageTitle}</h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={save}
          disabled={saving || target == null || text.trim() === ''}
        >
          {saving ? t.reports.saving : t.reports.save}
        </button>
      </header>

      <p className="muted">{t.reports.intro}</p>

      <div className="toolbar">
        <label className="field">
          <span className="field__label">{t.reports.classLabel}</span>
          <select
            className="field__input"
            value={classId ?? ''}
            onChange={(e) => {
              const cls = classes.find((c) => c.id === Number(e.currentTarget.value));
              if (cls) void selectClass(cls);
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.school_year}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t.reports.kindLabel}</span>
          <select
            className="field__input"
            value={kind}
            onChange={(e) => {
              const k = e.currentTarget.value as ReportKind;
              setKind(k);
              void refresh({ kind: k, useSaved: true });
            }}
          >
            {KIND_CHOICES.map((k) => (
              <option key={k} value={k}>
                {reportKindLabel(k)}
              </option>
            ))}
          </select>
        </label>

        {isMonthly ? (
          <label className="field">
            <span className="field__label">{t.reports.monthLabel}</span>
            <select
              className="field__input"
              value={monthKey ?? ''}
              disabled={months.length === 0}
              onChange={(e) => {
                const mkey = e.currentTarget.value;
                setMonthKey(mkey);
                void refresh({ monthKey: mkey, useSaved: true });
              }}
            >
              {months.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span className="field__label">{t.reports.weekLabel}</span>
            <select
              className="field__input"
              value={weekId ?? ''}
              disabled={weeks.length === 0}
              onChange={(e) => {
                const wid = Number(e.currentTarget.value);
                setWeekId(wid);
                void refresh({ weekId: wid, useSaved: true });
              }}
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {weekLabel(w)}
                </option>
              ))}
            </select>
          </label>
        )}

        {kind === 'minutes' && (
          <label className="field">
            <span className="field__label">{t.reports.timeLabel}</span>
            <input
              className="field__input"
              type="text"
              value={time}
              placeholder={t.reports.timePlaceholder}
              onChange={(e) => setTime(e.currentTarget.value)}
            />
          </label>
        )}

        <button type="button" className="btn" onClick={() => void refresh({ useSaved: false })}>
          {t.reports.regenerate}
        </button>
      </div>

      {savedOk && <div className="state state--success">{t.reports.savedOk}</div>}

      {!noPeriod && emptyData && (
        <div className="state state--warning">{t.reports.emptyDataWarning}</div>
      )}

      {noPeriod ? (
        <div className="state state--empty">
          <h2>{isMonthly ? t.reports.noMonthTitle : t.reports.noWeekTitle}</h2>
          <p>{isMonthly ? t.reports.noMonthHint : t.reports.noWeekHint}</p>
        </div>
      ) : (
        <article className="student-card">
          <header className="student-card__head">
            <span className="student-card__name">{reportKindLabel(kind)}</span>
            {hasSaved && <span className="badge">{t.reports.saved}</span>}
          </header>
          <textarea
            className="note-input comment-input"
            rows={20}
            value={text}
            onChange={(e) => {
              setSavedOk(false);
              setText(e.currentTarget.value);
            }}
          />
          {banned.length > 0 && <p className="comment-warn">{t.reports.warnBanned(banned.join(', '))}</p>}
        </article>
      )}
    </section>
  );
}
