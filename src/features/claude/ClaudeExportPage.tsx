// M8.2 — "Xuất ẩn danh cho AI" (Anonymized AI Export) page.
//
// Choose a class → a period (week or month) → a tone, then preview a PII-free, alias-only Vietnamese
// summary the teacher can copy into Claude / another AI assistant MANUALLY. The app never sends
// anything: anonymization (src/lib/export/anonymize.ts) + text building (claudeExport.ts) are pure
// and local, and copying is an explicit button press. A prominent warning asks the teacher to review
// the text before copying. Empty periods show a safe message, never a crash.

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  listClasses,
  listRecordTagIdsByWeek,
  listStudentsByClass,
  listTags,
  listWeeklyRecordsByWeek,
  listWeeksByClass,
} from '../../lib/db';
import type { ClassRow, ObservationTagRow, SqlExecutor, WeekRow } from '../../lib/db';
import {
  buildAnonymizedExport,
  type RawStudentWeek,
  type ExportTone,
} from '../../lib/export';
import type { RosterEntry } from '../../lib/export';
import { buildMonths, weekLabel, type MonthGroup } from '../reports/ReportsPage';
import { t, toneLabel } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';
type PeriodKind = 'week' | 'month';

const TONE_CHOICES: ExportTone[] = ['short', 'balanced', 'encouraging'];

/**
 * Load raw per-student data for one or more weeks, merged by student code (union of tags, notes
 * concatenated). Tags are split into positive vs. needs-support using the controlled catalog; notes
 * are kept raw here and scrubbed downstream by buildAnonymizedExport.
 */
async function loadPeriodRaw(
  db: SqlExecutor,
  classId: number,
  weekIds: number[],
): Promise<{ roster: RosterEntry[]; students: RawStudentWeek[] }> {
  const students = await listStudentsByClass(db, classId);
  const allTags = await listTags(db);
  const tagsById = new Map<number, ObservationTagRow>(allTags.map((tag) => [tag.id, tag]));
  const studentById = new Map(students.map((s) => [s.id, s]));

  const acc = new Map<
    string,
    { fullName: string; pos: Set<string>; sup: Set<string>; notes: string[] }
  >();

  for (const weekId of weekIds) {
    const records = await listWeeklyRecordsByWeek(db, weekId);
    const pairs = await listRecordTagIdsByWeek(db, weekId);
    const recToStudent = new Map(records.map((r) => [r.id, r.student_id]));
    const tagIdsByStudent = new Map<number, number[]>();
    for (const p of pairs) {
      const sid = recToStudent.get(p.record_id);
      if (sid == null) continue;
      tagIdsByStudent.set(sid, [...(tagIdsByStudent.get(sid) ?? []), p.tag_id]);
    }
    for (const r of records) {
      const s = studentById.get(r.student_id);
      if (!s) continue;
      const entry = acc.get(s.student_code) ?? {
        fullName: s.full_name,
        pos: new Set<string>(),
        sup: new Set<string>(),
        notes: [],
      };
      for (const id of tagIdsByStudent.get(r.student_id) ?? []) {
        const tag = tagsById.get(id);
        if (!tag) continue;
        if (tag.sentiment === 'positive') entry.pos.add(tag.label_vi);
        if (tag.sentiment === 'concern' || tag.category === 'support') entry.sup.add(tag.label_vi);
      }
      if (r.teacher_notes && r.teacher_notes.trim()) entry.notes.push(r.teacher_notes.trim());
      acc.set(s.student_code, entry);
    }
  }

  const out: RawStudentWeek[] = [...acc.entries()]
    .map(([code, e]) => ({
      studentCode: code,
      fullName: e.fullName,
      positiveTags: [...e.pos],
      supportTags: [...e.sup],
      note: e.notes.join(' | '),
    }))
    .sort((a, b) => a.studentCode.localeCompare(b.studentCode));

  const roster: RosterEntry[] = students.map((s) => ({
    studentCode: s.student_code,
    fullName: s.full_name,
  }));
  return { roster, students: out };
}

export function ClaudeExportPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [months, setMonths] = useState<MonthGroup[]>([]);
  const [kind, setKind] = useState<PeriodKind>('week');
  const [weekId, setWeekId] = useState<number | null>(null);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [tone, setTone] = useState<ExportTone>('balanced');

  const [text, setText] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState(false);

  const className = classes.find((c) => c.id === classId)?.name ?? '';

  const rebuild = useCallback(
    async (p: {
      classId: number;
      className: string;
      kind: PeriodKind;
      week: WeekRow | null;
      monthGroup: MonthGroup | null;
      tone: ExportTone;
    }) => {
      const db = await getDb();
      setNoData(false);
      setCopied(false);
      setCopyErr(false);

      const weekIds =
        p.kind === 'month'
          ? (p.monthGroup?.weeks ?? []).map((w) => w.id)
          : p.week
            ? [p.week.id]
            : [];
      const periodLabel = p.kind === 'month' ? (p.monthGroup?.label ?? '') : p.week ? weekLabel(p.week) : '';

      if (weekIds.length === 0) {
        setText(null);
        return;
      }

      const { roster, students } = await loadPeriodRaw(db, p.classId, weekIds);
      if (students.length === 0) {
        setText(null);
        setNoData(true);
        return;
      }
      const result = buildAnonymizedExport({
        className: p.className,
        periodLabel,
        roster,
        students,
        tone: p.tone,
      });
      setText(result.text);
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
          tone,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [rebuild, kind, tone],
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

  const refresh = useCallback(
    async (over: { kind?: PeriodKind; weekId?: number; monthKey?: string; tone?: ExportTone }) => {
      if (classId == null) return;
      const k = over.kind ?? kind;
      const wid = over.weekId ?? weekId;
      const mkey = over.monthKey ?? monthKey;
      const tn = over.tone ?? tone;
      setStatus('loading');
      try {
        await rebuild({
          classId,
          className,
          kind: k,
          week: weeks.find((w) => w.id === wid) ?? null,
          monthGroup: months.find((g) => g.key === mkey) ?? null,
          tone: tn,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [classId, className, kind, weekId, monthKey, tone, weeks, months, rebuild],
  );

  const copy = useCallback(async () => {
    if (!text) return;
    setCopied(false);
    setCopyErr(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopyErr(true);
    }
  }, [text]);

  // ---- render ------------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{t.claudeExport.title}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="page">
        <h1 className="page__title">{t.claudeExport.title}</h1>
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
        <h1 className="page__title">{t.claudeExport.title}</h1>
        <div className="state state--empty">
          <h2>{t.claudeExport.noClassTitle}</h2>
          <p>{t.claudeExport.noClassHint}</p>
        </div>
      </section>
    );
  }

  const monthly = kind === 'month';
  const noPeriod = monthly ? months.length === 0 : weeks.length === 0;

  return (
    <section className="page">
      <h1 className="page__title">{t.claudeExport.title}</h1>
      <p className="muted">{t.claudeExport.intro}</p>

      <div className="toolbar">
        <label className="field">
          <span className="field__label">{t.claudeExport.classLabel}</span>
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
          <span className="field__label">{t.claudeExport.periodKindLabel}</span>
          <select
            className="field__input"
            value={kind}
            onChange={(e) => {
              const k = e.currentTarget.value as PeriodKind;
              setKind(k);
              void refresh({ kind: k });
            }}
          >
            <option value="week">{t.claudeExport.kindWeek}</option>
            <option value="month">{t.claudeExport.kindMonth}</option>
          </select>
        </label>

        {monthly ? (
          <label className="field">
            <span className="field__label">{t.claudeExport.monthLabel}</span>
            <select
              className="field__input"
              value={monthKey ?? ''}
              disabled={months.length === 0}
              onChange={(e) => {
                const mkey = e.currentTarget.value;
                setMonthKey(mkey);
                void refresh({ monthKey: mkey });
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
            <span className="field__label">{t.claudeExport.weekLabel}</span>
            <select
              className="field__input"
              value={weekId ?? ''}
              disabled={weeks.length === 0}
              onChange={(e) => {
                const wid = Number(e.currentTarget.value);
                setWeekId(wid);
                void refresh({ weekId: wid });
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

        <label className="field">
          <span className="field__label">{t.claudeExport.toneLabel}</span>
          <select
            className="field__input"
            value={tone}
            onChange={(e) => {
              const tn = e.currentTarget.value as ExportTone;
              setTone(tn);
              void refresh({ tone: tn });
            }}
          >
            {TONE_CHOICES.map((tn) => (
              <option key={tn} value={tn}>
                {toneLabel(tn)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="state state--warning privacy-warning" role="note">
        <strong>{t.claudeExport.privacyTitle}</strong>
        <p>{t.claudeExport.privacyBody}</p>
      </div>

      {noPeriod ? (
        <div className="state state--empty">
          <h2>{monthly ? t.claudeExport.noMonthTitle : t.claudeExport.noWeekTitle}</h2>
          <p>{monthly ? t.claudeExport.noMonthHint : t.claudeExport.noWeekHint}</p>
        </div>
      ) : noData ? (
        <div className="state state--empty">
          <h2>{t.claudeExport.noDataTitle}</h2>
          <p>{t.claudeExport.noDataHint}</p>
        </div>
      ) : text ? (
        <>
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => void copy()}>
              {copied ? t.claudeExport.copied : t.claudeExport.copy}
            </button>
          </div>
          {copyErr && <div className="state state--error">{t.claudeExport.copyFailed}</div>}

          <article className="student-card">
            <header className="student-card__head">
              <span className="student-card__name">{t.claudeExport.previewTitle}</span>
            </header>
            <textarea className="claude-export__text" readOnly value={text} rows={20} />
          </article>
        </>
      ) : null}
    </section>
  );
}
