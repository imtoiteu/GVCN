// M7 — "Xuất file" page.
//
// A thin UI consumer of the M4/M5/M6 generators + saved artifacts and the pure export writers.
// Choose a class → an artifact (minutes / weekly / monthly report / comment list / parent-message
// list) → a week or month → preview the normalized model → download DOCX / XLSX or print-to-PDF.
//
// Reports are generated live from the recorded weeks (reusing the pure generators — not duplicating
// logic). The per-student comment / parent-message lists are read from what the teacher already
// generated and saved on those screens, so exports reflect their reviewed, edited wording. Nothing
// is sent anywhere; saving uses a local Blob download (no Tauri fs/dialog plugin).

import { useCallback, useEffect, useRef, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  listClasses,
  listLatestCommentsByWeek,
  listLatestParentMessagesByWeek,
  listStudentsByClass,
  listWeeksByClass,
} from '../../lib/db';
import type { ClassRow, SqlExecutor, WeekRow } from '../../lib/db';
import { generateMeetingMinutes } from '../../lib/generate/meetingMinutes';
import { generateMonthlyReport, generateWeeklyReport } from '../../lib/generate/homeroomReport';
import {
  buildListModel,
  buildReportModel,
  reportSummaryTable,
  asciiSlug,
  DOCX_MIME,
  XLSX_MIME,
  saveBytes,
  modelToDocx,
  modelToXlsx,
  type ExportModel,
} from '../../lib/export';
import {
  buildMonths,
  loadWeekObservations,
  weekLabel,
  type MonthGroup,
} from '../reports/ReportsPage';
import {
  exportArtifactLabel,
  t,
  type ExportArtifactChoice,
} from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

const ARTIFACT_CHOICES: ExportArtifactChoice[] = [
  'minutes',
  'weeklyReport',
  'monthlyReport',
  'comments',
  'parentMessages',
];

const TYPE_SLUG: Record<ExportArtifactChoice, string> = {
  minutes: 'bien-ban',
  weeklyReport: 'bao-cao-tuan',
  monthlyReport: 'bao-cao-thang',
  comments: 'nhan-xet',
  parentMessages: 'tin-nhan-ph',
};

const isMonthly = (a: ExportArtifactChoice): boolean => a === 'monthlyReport';
const isList = (a: ExportArtifactChoice): boolean => a === 'comments' || a === 'parentMessages';

/** Read the latest saved per-student comments/messages for a week as export list items. */
async function loadSavedList(
  db: SqlExecutor,
  classId: number,
  weekId: number,
  artifact: 'comments' | 'parentMessages',
): Promise<Array<{ code: string; name: string; text: string }>> {
  const students = await listStudentsByClass(db, classId);
  const byId = new Map(students.map((s) => [s.id, s]));
  const rows =
    artifact === 'comments'
      ? await listLatestCommentsByWeek(db, weekId)
      : await listLatestParentMessagesByWeek(db, weekId);
  return rows
    .map((r) => {
      const s = byId.get(r.student_id);
      return s ? { code: s.student_code, name: s.full_name, text: r.body_text } : null;
    })
    .filter((x): x is { code: string; name: string; text: string } => x != null)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function ExportsPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [months, setMonths] = useState<MonthGroup[]>([]);
  const [artifact, setArtifact] = useState<ExportArtifactChoice>('minutes');
  const [weekId, setWeekId] = useState<number | null>(null);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [time, setTime] = useState('');

  const [model, setModel] = useState<ExportModel | null>(null);
  const [emptyList, setEmptyList] = useState(false);
  const [emptyData, setEmptyData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportErr, setExportErr] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);

  const className = classes.find((c) => c.id === classId)?.name ?? '';

  // Build the export model for the current selection. Returns nothing; sets model/emptyList state.
  const rebuild = useCallback(
    async (p: {
      classId: number;
      className: string;
      artifact: ExportArtifactChoice;
      week: WeekRow | null;
      monthGroup: MonthGroup | null;
      time: string;
    }) => {
      const db = await getDb();
      setEmptyList(false);
      setEmptyData(false);
      setExportErr(false);
      setPrintMode(false);
      setSavedName(null);

      if (p.artifact === 'monthlyReport') {
        if (!p.monthGroup) {
          setModel(null);
          return;
        }
        const weekInputs = [];
        let monthRecorded = 0;
        for (const w of p.monthGroup.weeks) {
          const records = await loadWeekObservations(db, p.classId, w.id);
          monthRecorded += records.length;
          weekInputs.push({ weekLabel: weekLabel(w), records });
        }
        setEmptyData(monthRecorded === 0);
        const report = generateMonthlyReport({
          className: p.className,
          periodLabel: p.monthGroup.label,
          weeks: weekInputs,
        });
        setModel(
          buildReportModel({
            artifactType: 'monthlyReport',
            generatedText: report.text,
            table: reportSummaryTable(report.aggregate),
            filenameBase: `${asciiSlug(p.className)}-${TYPE_SLUG.monthlyReport}-${asciiSlug(p.monthGroup.label)}`,
          }),
        );
        return;
      }

      if (!p.week) {
        setModel(null);
        return;
      }
      const wl = weekLabel(p.week);
      const base = `${asciiSlug(p.className)}-${TYPE_SLUG[p.artifact]}-${asciiSlug(wl)}`;

      if (p.artifact === 'minutes' || p.artifact === 'weeklyReport') {
        const records = await loadWeekObservations(db, p.classId, p.week.id);
        setEmptyData(records.length === 0);
        const gen =
          p.artifact === 'minutes'
            ? generateMeetingMinutes({ className: p.className, weekLabel: wl, meetingTime: p.time, records })
            : generateWeeklyReport({ className: p.className, weekLabel: wl, records });
        setModel(
          buildReportModel({
            artifactType: p.artifact,
            generatedText: gen.text,
            table: p.artifact === 'weeklyReport' ? reportSummaryTable(gen.aggregate) : null,
            filenameBase: base,
          }),
        );
        return;
      }

      // Comments / parent messages — read the teacher's saved per-student drafts.
      const items = await loadSavedList(db, p.classId, p.week.id, p.artifact);
      if (items.length === 0) {
        setModel(null);
        setEmptyList(true);
        return;
      }
      const isComments = p.artifact === 'comments';
      setModel(
        buildListModel({
          artifactType: p.artifact,
          title: `${isComments ? 'Danh sách nhận xét học sinh' : 'Danh sách tin nhắn phụ huynh'} – Lớp ${p.className}`,
          meta: [`Tuần: ${wl}`],
          items,
          contentColumn: isComments ? 'Nhận xét' : 'Tin nhắn',
          filenameBase: base,
        }),
      );
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
          artifact,
          week: wks.find((w) => w.id === wid) ?? null,
          monthGroup: ms.find((g) => g.key === mkey) ?? null,
          time,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [rebuild, artifact, time],
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

  // Re-run model building for the current selection with one field overridden.
  const refresh = useCallback(
    async (over: { artifact?: ExportArtifactChoice; weekId?: number; monthKey?: string; time?: string }) => {
      if (classId == null) return;
      const a = over.artifact ?? artifact;
      const wid = over.weekId ?? weekId;
      const mkey = over.monthKey ?? monthKey;
      const tm = over.time ?? time;
      setStatus('loading');
      try {
        await rebuild({
          classId,
          className,
          artifact: a,
          week: weeks.find((w) => w.id === wid) ?? null,
          monthGroup: months.find((g) => g.key === mkey) ?? null,
          time: tm,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [classId, className, artifact, weekId, monthKey, time, weeks, months, rebuild],
  );

  // PDF is print-based: switch the app into a top-level print mode (a clean preview rendered in
  // the main window) and let the user "Save as PDF" in the system print dialog. We print the
  // top-level window (not a hidden iframe, which silently no-ops in the macOS Tauri webview); the
  // `@media print` rules hide the sidebar/controls so only the document prints. It never touches
  // the binary save/download path, so it cannot raise the DOCX/XLSX export error.
  const doPrintPdf = useCallback(() => {
    if (!model) return;
    setExportErr(false);
    setPrintMode(true);
  }, [model]);

  const closePrint = useCallback(() => setPrintMode(false), []);

  // Avoid re-firing the print dialog on unrelated re-renders while print mode stays open.
  const printedRef = useRef(false);
  useEffect(() => {
    if (!printMode) {
      printedRef.current = false;
      return;
    }
    if (printedRef.current) return;
    if (typeof window === 'undefined' || typeof window.print !== 'function') return;
    printedRef.current = true;
    // Wait for the print DOM to render before opening the dialog.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => cancelAnimationFrame(id);
  }, [printMode]);

  const doExport = useCallback(
    async (format: 'docx' | 'xlsx') => {
      if (!model) return;
      setBusy(true);
      setExportErr(false);
      setSavedName(null);
      try {
        const filename = `${model.filenameBase}.${format}`;
        const mime = format === 'docx' ? DOCX_MIME : XLSX_MIME;
        const bytes = format === 'docx' ? modelToDocx(model) : await modelToXlsx(model);
        const outcome = await saveBytes(filename, mime, bytes);
        if (outcome === 'saved') setSavedName(filename);
      } catch {
        setExportErr(true);
      } finally {
        setBusy(false);
      }
    },
    [model],
  );

  // ---- render ------------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{t.exportsPage.title}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="page">
        <h1 className="page__title">{t.exportsPage.title}</h1>
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
        <h1 className="page__title">{t.exportsPage.title}</h1>
        <div className="state state--empty">
          <h2>{t.exportsPage.noClassTitle}</h2>
          <p>{t.exportsPage.noClassHint}</p>
        </div>
      </section>
    );
  }

  const monthly = isMonthly(artifact);
  const noPeriod = monthly ? months.length === 0 : weeks.length === 0;

  return (
    <section className="page">
      <h1 className="page__title">{t.exportsPage.title}</h1>
      <p className="muted">{t.exportsPage.intro}</p>

      <div className="toolbar">
        <label className="field">
          <span className="field__label">{t.exportsPage.classLabel}</span>
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
          <span className="field__label">{t.exportsPage.artifactLabel}</span>
          <select
            className="field__input"
            value={artifact}
            onChange={(e) => {
              const a = e.currentTarget.value as ExportArtifactChoice;
              setArtifact(a);
              void refresh({ artifact: a });
            }}
          >
            {ARTIFACT_CHOICES.map((a) => (
              <option key={a} value={a}>
                {exportArtifactLabel(a)}
              </option>
            ))}
          </select>
        </label>

        {monthly ? (
          <label className="field">
            <span className="field__label">{t.exportsPage.monthLabel}</span>
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
            <span className="field__label">{t.exportsPage.weekLabel}</span>
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

        {artifact === 'minutes' && (
          <label className="field">
            <span className="field__label">{t.exportsPage.timeLabel}</span>
            <input
              className="field__input"
              type="text"
              value={time}
              placeholder={t.exportsPage.timePlaceholder}
              onChange={(e) => setTime(e.currentTarget.value)}
              onBlur={() => void refresh({ time })}
            />
          </label>
        )}
      </div>

      {noPeriod ? (
        <div className="state state--empty">
          <h2>{monthly ? t.exportsPage.noMonthTitle : t.exportsPage.noWeekTitle}</h2>
          <p>{monthly ? t.exportsPage.noMonthHint : t.exportsPage.noWeekHint}</p>
        </div>
      ) : emptyList ? (
        <div className="state state--empty">
          <h2>{t.exportsPage.emptyListTitle}</h2>
          <p>{t.exportsPage.emptyListHint}</p>
        </div>
      ) : model ? (
        <>
          <div className="toolbar">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void doExport('docx')}>
              {busy ? t.exportsPage.exporting : t.exportsPage.downloadDocx}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => void doExport('xlsx')}>
              {busy ? t.exportsPage.exporting : t.exportsPage.downloadXlsx}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={doPrintPdf}>
              {t.exportsPage.printPdf}
            </button>
          </div>

          {exportErr && <div className="state state--error">{t.exportsPage.exportError}</div>}
          {savedName && <div className="state state--success">{t.exportsPage.saved(savedName)}</div>}
          {emptyData && <div className="state state--warning">{t.exportsPage.emptyDataWarning}</div>}
          <p className="muted">{t.exportsPage.printHint}</p>
          {isList(artifact) && <p className="muted">{t.exportsPage.listFromSaved}</p>}

          <article className="student-card">
            <header className="student-card__head">
              <span className="student-card__name">{t.exportsPage.previewTitle}</span>
            </header>
            <ExportPreview model={model} />
          </article>
        </>
      ) : null}

      {printMode && model && (
        <div className="print-overlay" role="dialog" aria-label={t.exportsPage.printPreviewTitle}>
          <div className="print-toolbar no-print">
            <div className="print-toolbar__actions">
              <button type="button" className="btn btn--primary" onClick={() => window.print()}>
                {t.exportsPage.printNow}
              </button>
              <button type="button" className="btn" onClick={closePrint}>
                {t.exportsPage.printBack}
              </button>
            </div>
            <p className="print-toolbar__hint">{t.exportsPage.printFallback}</p>
          </div>
          <div className="print-document">
            <ExportPreview model={model} />
          </div>
        </div>
      )}
    </section>
  );
}

/** Render the normalized model: title + meta, then the document blocks or the table. */
function ExportPreview({ model }: { model: ExportModel }) {
  return (
    <div className="export-preview">
      <h2 className="section-title">{model.title}</h2>
      {model.meta.map((m, i) => (
        <p key={i} className="muted">{m}</p>
      ))}
      {model.blocks.length > 0 ? (
        model.blocks.map((b, i) =>
          b.heading ? (
            <p key={i} className="export-preview__heading"><strong>{b.text}</strong></p>
          ) : (
            <p key={i}>{b.text}</p>
          ),
        )
      ) : model.table ? (
        <table className="table">
          <thead>
            <tr>{model.table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {model.table.rows.map((r, i) => (
              <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
