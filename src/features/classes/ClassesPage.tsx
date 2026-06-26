// Classes & Students page — a thin UI consumer of the existing M1 data layer.
//
// Loads classes via the typed DAL, shows the selected class roster, and offers a one-click
// "Tải dữ liệu mẫu 8A" that calls seedDemoClass(). No DAL logic is reimplemented here.
// Covers loading / error / empty / ready states (frontend-ui-engineering).

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import { listClasses, listStudentsByClass, seedDemoClass } from '../../lib/db';
import type { ClassRow, StudentRow } from '../../lib/db';
import { genderLabel, t } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

export function ClassesPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async (preferId?: number) => {
    setStatus('loading');
    try {
      const db = await getDb();
      const found = await listClasses(db);
      setClasses(found);
      const pick = found.find((c) => c.id === preferId) ?? found[0] ?? null;
      setSelectedId(pick ? pick.id : null);
      setRoster(pick ? await listStudentsByClass(db, pick.id) : []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectClass = useCallback(async (id: number) => {
    setSelectedId(id);
    try {
      const db = await getDb();
      setRoster(await listStudentsByClass(db, id));
    } catch {
      setStatus('error');
    }
  }, []);

  const seed = useCallback(async () => {
    setSeeding(true);
    try {
      const db = await getDb();
      const res = await seedDemoClass(db);
      await load(res.classId);
    } catch {
      setStatus('error');
    } finally {
      setSeeding(false);
    }
  }, [load]);

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{t.classes.title}</h1>
        <button type="button" className="btn btn--primary" onClick={seed} disabled={seeding}>
          {seeding ? t.classes.seeding : t.classes.seedDemo}
        </button>
      </header>

      {status === 'loading' && <div className="state state--loading">{t.common.loading}</div>}

      {status === 'error' && (
        <div className="state state--error">
          <p>{t.common.dbUnavailable}</p>
          <button type="button" className="btn" onClick={() => void load()}>
            {t.common.retry}
          </button>
        </div>
      )}

      {status === 'ready' && classes.length === 0 && (
        <div className="state state--empty">
          <h2>{t.classes.emptyTitle}</h2>
          <p>{t.classes.emptyHint}</p>
        </div>
      )}

      {status === 'ready' && classes.length > 0 && (
        <>
          <div className="toolbar">
            <label className="field">
              <span className="field__label">{t.classes.title}:</span>
              <select
                className="field__input"
                value={selectedId ?? ''}
                onChange={(e) => void selectClass(Number(e.currentTarget.value))}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.school_year}
                  </option>
                ))}
              </select>
            </label>
            <span className="muted">{t.classes.countLabel(roster.length)}</span>
          </div>

          {roster.length === 0 ? (
            <div className="state state--empty">{t.classes.rosterEmpty}</div>
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
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td>{s.student_code}</td>
                    <td>{s.full_name}</td>
                    <td>{genderLabel(s.gender)}</td>
                    <td>{s.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
