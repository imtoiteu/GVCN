// Classes & Students page — M1 roster view + M9.1 practical CRUD.
//
// Thin UI over the typed DAL: manage classes (add/edit, delete only when empty) and students
// (add/edit, archive/restore as the safe "remove", hard delete only when no linked records).
// Duplicate class (name+year) and duplicate student_code (within a class) are blocked with a clear
// message. The "Tải dữ liệu mẫu 8A" button is idempotent and shows when demo data already exists.
// No DAL logic is reimplemented here.

import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../lib/db/tauri';
import {
  classExists,
  createClass,
  createStudent,
  deleteClassIfEmpty,
  deleteStudentIfNoRecords,
  listAllStudentsByClass,
  listClasses,
  seedDemoClass,
  setStudentActive,
  studentCodeExists,
  updateClass,
  updateStudent,
  DEMO_CLASS,
} from '../../lib/db';
import type { ClassRow, StudentRow } from '../../lib/db';
import { genderLabel, t } from '../../app/i18n';

type Status = 'loading' | 'error' | 'ready';

interface ClassForm {
  id: number | null; // null = new
  name: string;
  school_year: string;
  homeroom_teacher: string;
}

interface StudentForm {
  id: number | null; // null = new
  student_code: string;
  full_name: string;
  gender: string; // '', 'M', 'F'
  dob: string;
  note: string;
}

const emptyStudentForm = (): StudentForm => ({
  id: null,
  student_code: '',
  full_name: '',
  gender: '',
  dob: '',
  note: '',
});

export function ClassesPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [classForm, setClassForm] = useState<ClassForm | null>(null);
  const [classErr, setClassErr] = useState('');
  const [studentForm, setStudentForm] = useState<StudentForm | null>(null);
  const [studentErr, setStudentErr] = useState('');

  const selected = classes.find((c) => c.id === selectedId) ?? null;
  const demoExists = classes.some(
    (c) => c.name === DEMO_CLASS.name && c.school_year === DEMO_CLASS.school_year,
  );

  const loadRoster = useCallback(async (classId: number) => {
    const db = await getDb();
    setRoster(await listAllStudentsByClass(db, classId));
  }, []);

  const load = useCallback(
    async (preferId?: number) => {
      setStatus('loading');
      try {
        const db = await getDb();
        const found = await listClasses(db);
        setClasses(found);
        const pick = found.find((c) => c.id === preferId) ?? found[0] ?? null;
        setSelectedId(pick ? pick.id : null);
        if (pick) await loadRoster(pick.id);
        else setRoster([]);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    },
    [loadRoster],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectClass = useCallback(
    async (id: number) => {
      setSelectedId(id);
      setStudentForm(null);
      setClassForm(null);
      try {
        await loadRoster(id);
      } catch {
        setStatus('error');
      }
    },
    [loadRoster],
  );

  const seed = useCallback(async () => {
    setSeeding(true);
    try {
      const db = await getDb();
      const res = await seedDemoClass(db); // idempotent: never wipes, reuses if present
      await load(res.classId);
    } catch {
      setStatus('error');
    } finally {
      setSeeding(false);
    }
  }, [load]);

  // ---- class CRUD --------------------------------------------------------

  const saveClass = useCallback(async () => {
    if (!classForm) return;
    const name = classForm.name.trim();
    const year = classForm.school_year.trim();
    if (name === '' || year === '') {
      setClassErr(t.classes.classRequired);
      return;
    }
    try {
      const db = await getDb();
      if (await classExists(db, name, year, classForm.id ?? undefined)) {
        setClassErr(t.classes.dupClass);
        return;
      }
      const patch = { name, school_year: year, homeroom_teacher: classForm.homeroom_teacher.trim() || null };
      const id = classForm.id ?? (await createClass(db, patch));
      if (classForm.id) await updateClass(db, classForm.id, patch);
      setClassForm(null);
      setClassErr('');
      await load(id);
    } catch {
      setStatus('error');
    }
  }, [classForm, load]);

  const deleteClass = useCallback(async () => {
    if (!selected) return;
    try {
      const db = await getDb();
      const res = await deleteClassIfEmpty(db, selected.id);
      if (!res.deleted) {
        window.alert(t.classes.deleteClassBlocked(res.studentCount));
        return;
      }
      await load();
    } catch {
      setStatus('error');
    }
  }, [selected, load]);

  // ---- student CRUD ------------------------------------------------------

  const saveStudent = useCallback(async () => {
    if (!studentForm || selectedId == null) return;
    const code = studentForm.student_code.trim();
    const name = studentForm.full_name.trim();
    if (code === '' || name === '') {
      setStudentErr(t.classes.studentRequired);
      return;
    }
    try {
      const db = await getDb();
      if (await studentCodeExists(db, selectedId, code, studentForm.id ?? undefined)) {
        setStudentErr(t.classes.dupStudentCode);
        return;
      }
      const patch = {
        student_code: code,
        full_name: name,
        gender: studentForm.gender || null,
        dob: studentForm.dob.trim() || null,
        note: studentForm.note.trim() || null,
      };
      if (studentForm.id) await updateStudent(db, studentForm.id, patch);
      else await createStudent(db, { class_id: selectedId, ...patch });
      setStudentForm(null);
      setStudentErr('');
      await loadRoster(selectedId);
    } catch {
      setStatus('error');
    }
  }, [studentForm, selectedId, loadRoster]);

  const archiveStudent = useCallback(
    async (s: StudentRow) => {
      if (selectedId == null) return;
      if (s.is_active === 1 && !window.confirm(t.classes.archiveStudentConfirm)) return;
      try {
        const db = await getDb();
        await setStudentActive(db, s.id, s.is_active !== 1);
        await loadRoster(selectedId);
      } catch {
        setStatus('error');
      }
    },
    [selectedId, loadRoster],
  );

  const deleteStudent = useCallback(
    async (s: StudentRow) => {
      if (selectedId == null) return;
      if (!window.confirm(t.classes.deleteStudentConfirm)) return;
      try {
        const db = await getDb();
        const res = await deleteStudentIfNoRecords(db, s.id);
        if (!res.deleted) {
          window.alert(t.classes.deleteStudentBlocked(res.linkedCount));
          return;
        }
        await loadRoster(selectedId);
      } catch {
        setStatus('error');
      }
    },
    [selectedId, loadRoster],
  );

  // ---- render ------------------------------------------------------------

  if (status === 'loading') {
    return (
      <section className="page">
        <h1 className="page__title">{t.classes.title}</h1>
        <div className="state state--loading">{t.common.loading}</div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="page">
        <h1 className="page__title">{t.classes.title}</h1>
        <div className="state state--error">
          <p>{t.common.dbUnavailable}</p>
          <button type="button" className="btn" onClick={() => void load()}>
            {t.common.retry}
          </button>
        </div>
      </section>
    );
  }

  const visibleRoster = showArchived ? roster : roster.filter((s) => s.is_active === 1);

  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{t.classes.title}</h1>
        <div className="toolbar toolbar--tight">
          <button type="button" className="btn" onClick={seed} disabled={seeding}>
            {seeding ? t.classes.seeding : demoExists ? t.classes.reloadDemo : t.classes.seedDemo}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setClassErr('');
              setClassForm({ id: null, name: '', school_year: '', homeroom_teacher: '' });
            }}
          >
            {t.classes.addClass}
          </button>
        </div>
      </header>

      {demoExists && <p className="muted">{t.classes.seedExists}</p>}

      {classes.length === 0 && !classForm && (
        <div className="state state--empty">
          <h2>{t.classes.emptyTitle}</h2>
          <p>{t.classes.emptyHint}</p>
        </div>
      )}

      {/* class add/edit form */}
      {classForm && (
        <div className="card form-card">
          <h2 className="section-title">{classForm.id ? t.classes.editClass : t.classes.addClass}</h2>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">{t.classes.className}</span>
              <input
                className="field__input"
                value={classForm.name}
                onChange={(e) => setClassForm({ ...classForm, name: e.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">{t.classes.schoolYear}</span>
              <input
                className="field__input"
                placeholder="2025-2026"
                value={classForm.school_year}
                onChange={(e) => setClassForm({ ...classForm, school_year: e.currentTarget.value })}
              />
            </label>
            <label className="field">
              <span className="field__label">{t.classes.homeroomTeacher}</span>
              <input
                className="field__input"
                value={classForm.homeroom_teacher}
                onChange={(e) => setClassForm({ ...classForm, homeroom_teacher: e.currentTarget.value })}
              />
            </label>
          </div>
          {classErr && <p className="comment-warn">{classErr}</p>}
          <div className="toolbar toolbar--tight">
            <button type="button" className="btn btn--primary" onClick={saveClass}>{t.actions.save}</button>
            <button type="button" className="btn" onClick={() => { setClassForm(null); setClassErr(''); }}>
              {t.actions.cancel}
            </button>
          </div>
        </div>
      )}

      {classes.length > 0 && (
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
            {selected && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setClassErr('');
                    setClassForm({
                      id: selected.id,
                      name: selected.name,
                      school_year: selected.school_year,
                      homeroom_teacher: selected.homeroom_teacher ?? '',
                    });
                  }}
                >
                  {t.classes.editClass}
                </button>
                <button type="button" className="btn btn--danger" onClick={deleteClass}>
                  {t.classes.deleteClass}
                </button>
              </>
            )}
          </div>

          <div className="page__header">
            <h2 className="section-title">{t.classes.studentsTitle}</h2>
            <div className="toolbar toolbar--tight">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.currentTarget.checked)}
                />
                {t.classes.showArchived}
              </label>
              <button
                type="button"
                className="btn btn--primary"
                disabled={selectedId == null}
                onClick={() => { setStudentErr(''); setStudentForm(emptyStudentForm()); }}
              >
                {t.classes.addStudent}
              </button>
            </div>
          </div>

          {/* student add/edit form */}
          {studentForm && (
            <div className="card form-card">
              <h2 className="section-title">
                {studentForm.id ? t.classes.editStudent : t.classes.addStudent}
              </h2>
              <div className="form-grid">
                <label className="field">
                  <span className="field__label">{t.classes.colCode}</span>
                  <input
                    className="field__input"
                    value={studentForm.student_code}
                    onChange={(e) => setStudentForm({ ...studentForm, student_code: e.currentTarget.value })}
                  />
                </label>
                <label className="field">
                  <span className="field__label">{t.classes.colName}</span>
                  <input
                    className="field__input"
                    value={studentForm.full_name}
                    onChange={(e) => setStudentForm({ ...studentForm, full_name: e.currentTarget.value })}
                  />
                </label>
                <label className="field">
                  <span className="field__label">{t.classes.colGender}</span>
                  <select
                    className="field__input"
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.currentTarget.value })}
                  >
                    <option value="">{t.gender.unknown}</option>
                    <option value="M">{t.gender.male}</option>
                    <option value="F">{t.gender.female}</option>
                  </select>
                </label>
                <label className="field field--wide">
                  <span className="field__label">{t.classes.colNote}</span>
                  <input
                    className="field__input"
                    placeholder={t.classes.notePlaceholder}
                    value={studentForm.note}
                    onChange={(e) => setStudentForm({ ...studentForm, note: e.currentTarget.value })}
                  />
                </label>
              </div>
              {studentErr && <p className="comment-warn">{studentErr}</p>}
              <div className="toolbar toolbar--tight">
                <button type="button" className="btn btn--primary" onClick={saveStudent}>{t.actions.save}</button>
                <button type="button" className="btn" onClick={() => { setStudentForm(null); setStudentErr(''); }}>
                  {t.actions.cancel}
                </button>
              </div>
            </div>
          )}

          {visibleRoster.length === 0 ? (
            <div className="state state--empty">{t.classes.rosterEmpty}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t.classes.colCode}</th>
                  <th>{t.classes.colName}</th>
                  <th>{t.classes.colGender}</th>
                  <th>{t.classes.colNote}</th>
                  <th>{t.classes.colStatus}</th>
                  <th>{t.classes.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoster.map((s) => (
                  <tr key={s.id} className={s.is_active === 1 ? '' : 'row--archived'}>
                    <td>{s.student_code}</td>
                    <td>{s.full_name}</td>
                    <td>{genderLabel(s.gender)}</td>
                    <td>{s.note ?? '—'}</td>
                    <td>
                      <span className={'badge' + (s.is_active === 1 ? '' : ' badge--muted')}>
                        {s.is_active === 1 ? t.classes.activeBadge : t.classes.archivedBadge}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn btn--xs"
                        onClick={() => {
                          setStudentErr('');
                          setStudentForm({
                            id: s.id,
                            student_code: s.student_code,
                            full_name: s.full_name,
                            gender: s.gender ?? '',
                            dob: s.dob ?? '',
                            note: s.note ?? '',
                          });
                        }}
                      >
                        {t.actions.edit}
                      </button>
                      <button type="button" className="btn btn--xs" onClick={() => void archiveStudent(s)}>
                        {s.is_active === 1 ? t.actions.archive : t.actions.restore}
                      </button>
                      <button type="button" className="btn btn--xs btn--danger" onClick={() => void deleteStudent(s)}>
                        {t.actions.delete}
                      </button>
                    </td>
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
