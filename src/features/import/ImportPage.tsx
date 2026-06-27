// Excel Import page — a thin UI consumer of the existing M2 import engine.
//
// Flow: pick a .xlsx → read its bytes → importStudentsFromWorkbook (parse/validate/dedupe)
// → preview valid rows + list row errors → commitStudentImport into the chosen class.
// The engine is NOT reimplemented here; this page only feeds it bytes and renders results.
//
// File input is a native <input type="file">, which works both in the Tauri webview and the
// dev server — no Tauri dialog plugin/capability needed, keeping the milestone cross-platform.

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import { listClasses } from '../../lib/db';
import type { ClassRow } from '../../lib/db';
import {
  buildStudentTemplateWorkbook,
  commitStudentImport,
  importStudentsFromWorkbook,
  TEMPLATE_FILENAME,
} from '../../lib/import';
import type { CommitResult, StudentImportResult } from '../../lib/import';
import { saveBytes, XLSX_MIME } from '../../lib/export';
import { genderLabel, t } from '../../app/i18n';

type Phase = 'idle' | 'parsing' | 'parsed' | 'committing' | 'committed';

export function ImportPage() {
  const [dbError, setDbError] = useState(false);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [committed, setCommitted] = useState<CommitResult | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<'saved' | 'error' | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      const db = await getDb();
      const found = await listClasses(db);
      setClasses(found);
      setTargetId((prev) => prev ?? found[0]?.id ?? null);
    } catch {
      setDbError(true);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const onPickFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setPhase('parsing');
    setResult(null);
    setCommitted(null);
    try {
      const bytes = await file.arrayBuffer();
      const res = await importStudentsFromWorkbook(bytes);
      setResult(res);
      setPhase('parsed');
    } catch {
      // A non-.xlsx or corrupt file lands here; surface as a parse failure.
      setResult({ valid: [], errors: [{ row: 0, code: 'missing_column', message: t.importPage.readError }], totalRows: 0 });
      setPhase('parsed');
    }
  }, []);

  const downloadTemplate = useCallback(async () => {
    setTemplateBusy(true);
    setTemplateNotice(null);
    try {
      const bytes = await buildStudentTemplateWorkbook();
      const outcome = await saveBytes(TEMPLATE_FILENAME, XLSX_MIME, bytes);
      if (outcome === 'saved') setTemplateNotice('saved');
    } catch {
      setTemplateNotice('error');
    } finally {
      setTemplateBusy(false);
    }
  }, []);

  const commit = useCallback(async () => {
    if (!result || targetId == null || result.valid.length === 0) return;
    setPhase('committing');
    try {
      const db = await getDb();
      const res = await commitStudentImport(db, targetId, result.valid);
      setCommitted(res);
      setPhase('committed');
    } catch {
      setDbError(true);
      setPhase('parsed');
    }
  }, [result, targetId]);

  if (dbError) {
    return (
      <section className="page">
        <h1 className="page__title">{t.importPage.title}</h1>
        <div className="state state--error">
          <p>{t.common.dbUnavailable}</p>
          <button type="button" className="btn" onClick={() => { setDbError(false); void loadClasses(); }}>
            {t.common.retry}
          </button>
        </div>
      </section>
    );
  }

  if (classes !== null && classes.length === 0) {
    return (
      <section className="page">
        <h1 className="page__title">{t.importPage.title}</h1>
        <div className="state state--empty">
          <h2>{t.importPage.noClassTitle}</h2>
          <p>{t.importPage.noClassHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h1 className="page__title">{t.importPage.title}</h1>
      <p className="muted">{t.importPage.intro}</p>

      <section className="help-card">
        <h2 className="help-card__title">{t.importPage.format.title}</h2>
        <div className="help-card__cols">
          <div>
            <h3 className="help-card__subtitle">{t.importPage.format.requiredTitle}</h3>
            <ul className="help-card__list">
              <li><code>{t.importPage.format.colCode}</code></li>
              <li><code>{t.importPage.format.colName}</code></li>
            </ul>
          </div>
          <div>
            <h3 className="help-card__subtitle">{t.importPage.format.optionalTitle}</h3>
            <ul className="help-card__list">
              <li><code>{t.importPage.format.colGender}</code></li>
              <li><code>{t.importPage.format.colDob}</code></li>
              <li><code>{t.importPage.format.colNote}</code></li>
            </ul>
          </div>
        </div>
        <ul className="help-card__rules">
          <li>{t.importPage.format.ruleXlsx}</li>
          <li>{t.importPage.format.ruleHeader}</li>
          <li>{t.importPage.format.ruleSheet}</li>
          <li>{t.importPage.format.ruleUnique}</li>
        </ul>
        <div className="toolbar toolbar--tight">
          <button type="button" className="btn" disabled={templateBusy} onClick={() => void downloadTemplate()}>
            {templateBusy ? t.importPage.format.downloading : t.importPage.format.download}
          </button>
          {templateNotice === 'saved' && (
            <span className="help-card__notice">{t.importPage.format.saved}</span>
          )}
          {templateNotice === 'error' && (
            <span className="help-card__notice help-card__notice--error">{t.importPage.format.error}</span>
          )}
        </div>
      </section>

      <div className="toolbar">
        <label className="field">
          <span className="field__label">{t.importPage.targetClass}</span>
          <select
            className="field__input"
            value={targetId ?? ''}
            onChange={(e) => setTargetId(Number(e.currentTarget.value))}
          >
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.school_year}
              </option>
            ))}
          </select>
        </label>

        <label className="btn btn--file">
          {t.importPage.pickFile}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => void onPickFile(e.currentTarget.files?.[0])}
          />
        </label>
      </div>

      {phase === 'parsing' && <div className="state state--loading">{t.importPage.parsing}</div>}

      {result && phase !== 'parsing' && (
        <>
          <p className="muted">{t.importPage.rowsSummary(result.valid.length, result.totalRows)}</p>

          <h2 className="section-title">{t.importPage.previewTitle}</h2>
          {result.valid.length === 0 ? (
            <div className="state state--empty">{t.importPage.noValid}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t.classes.colCode}</th>
                  <th>{t.classes.colName}</th>
                  <th>{t.classes.colGender}</th>
                  <th>{t.classes.colNote}</th>
                </tr>
              </thead>
              <tbody>
                {result.valid.map((s) => (
                  <tr key={s.student_code}>
                    <td>{s.student_code}</td>
                    <td>{s.full_name}</td>
                    <td>{genderLabel(s.gender)}</td>
                    <td>{s.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="section-title">{t.importPage.errorsTitle}</h2>
          {result.errors.length === 0 ? (
            <div className="state state--empty">{t.importPage.noErrors}</div>
          ) : (
            <table className="table table--errors">
              <thead>
                <tr>
                  <th>{t.importPage.colRow}</th>
                  <th>{t.importPage.colField}</th>
                  <th>{t.importPage.colMessage}</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((err, i) => (
                  <tr key={`${err.row}-${err.field ?? ''}-${i}`}>
                    <td>{err.row === 0 ? '—' : err.row}</td>
                    <td>{err.field ?? '—'}</td>
                    <td>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="toolbar">
            <button
              type="button"
              className="btn btn--primary"
              onClick={commit}
              disabled={result.valid.length === 0 || targetId == null || phase === 'committing'}
            >
              {phase === 'committing' ? t.importPage.committing : t.importPage.commit}
            </button>
          </div>
        </>
      )}

      {committed && phase === 'committed' && (
        <div className="state state--success">
          <h2>{t.importPage.committedTitle}</h2>
          <p>{t.importPage.committedSummary(committed.inserted, committed.skippedExisting)}</p>
        </div>
      )}
    </section>
  );
}
