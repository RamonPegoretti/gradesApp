import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { OverallAvg, SubjectAvg } from '../components/Average';
import {
  addSubject,
  createYear,
  deleteSubject,
  fetchGrades,
  fetchHistory,
  fetchProfiles,
  fetchSignupOpen,
  fetchSubjects,
  fetchYears,
  renameSubject,
  setSignupOpen,
  type HistoryEntry,
  type Profile,
  type StoredGrade,
  type Subject,
  type Year,
} from '../lib/data';
import { formatRaw, overallAverage, subjectAverage } from '../lib/grades';
import { isAdminEmail, supabase } from '../lib/supabase';

interface AdminData {
  years: Year[];
  activeYear: Year | null;
  subjects: Subject[];
  grades: StoredGrade[];
  profiles: Profile[];
  history: HistoryEntry[];
  signupOpen: boolean;
}

export function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const years = await fetchYears();
      const activeYear = years.find((y) => !y.archived) ?? null;
      const subjects = activeYear ? await fetchSubjects([activeYear.id]) : [];
      const [grades, profiles, history, signupOpen] = await Promise.all([
        fetchGrades(subjects.map((s) => s.id)),
        fetchProfiles(),
        fetchHistory(),
        fetchSignupOpen(),
      ]);
      setData({ years, activeYear, subjects, grades, profiles, history, signupOpen });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs an admin action, then reloads everything (history included). */
  const run = useCallback(
    async (action: () => Promise<void>) => {
      try {
        await action();
      } catch (e) {
        setError((e as Error).message);
      }
      await load();
    },
    [load],
  );

  return (
    <div className="admin">
      <header className="topbar">
        <span className="brand">Grades · Admin</span>
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </header>
      <main className="admin-main">
        {error && <p className="error">Error: {error}</p>}
        {!data ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <div className="admin-grid">
              <div className="stack-lg">
                <SignupSwitch open={data.signupOpen} run={run} />
                <YearsCard data={data} run={run} />
                <SubjectsCard data={data} run={run} />
              </div>
              <StudentOverview data={data} />
            </div>
            <HistoryCard history={data.history} />
          </>
        )}
      </main>
    </div>
  );
}

type Run = (action: () => Promise<void>) => Promise<void>;

function SignupSwitch({ open, run }: { open: boolean; run: Run }) {
  return (
    <section className="card">
      <h2>Sign-up</h2>
      <div className="switch-row">
        <span>{open ? 'Open: anyone with the link can create an account.' : 'Closed: nobody can create an account.'}</span>
        <button
          role="switch"
          aria-checked={open}
          className={`switch ${open ? 'on' : ''}`}
          onClick={() => run(() => setSignupOpen(!open))}
        >
          <span />
        </button>
      </div>
    </section>
  );
}

function YearsCard({ data, run }: { data: AdminData; run: Run }) {
  const [name, setName] = useState('');
  const archived = data.years.filter((y) => y.archived).reverse();

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const msg = data.activeYear
      ? `Create "${n}"? "${data.activeYear.name}" will move to the archive and become read-only.`
      : `Create "${n}"?`;
    if (!window.confirm(msg)) return;
    run(async () => {
      await createYear(n);
      setName('');
    });
  }

  return (
    <section className="card">
      <h2>Years</h2>
      <p>
        Active year: <strong>{data.activeYear?.name ?? 'none'}</strong>
      </p>
      {archived.length > 0 && <p className="muted">Archived: {archived.map((y) => y.name).join(', ')}</p>}
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="New year, e.g. 2026/27" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" disabled={!name.trim()}>
          Create year
        </button>
      </form>
    </section>
  );
}

function SubjectsCard({ data, run }: { data: AdminData; run: Run }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const year = data.activeYear;

  if (!year) {
    return (
      <section className="card">
        <h2>Subjects</h2>
        <p className="muted">Create a year first.</p>
      </section>
    );
  }

  function add(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !year) return;
    run(async () => {
      await addSubject(year.id, n);
      setName('');
    });
  }

  function saveRename(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const { id, name: n } = editing;
    run(async () => {
      await renameSubject(id, n.trim());
      setEditing(null);
    });
  }

  function remove(s: Subject) {
    const count = data.grades.filter((g) => g.subject_id === s.id).length;
    const msg = `Delete "${s.name}"? Its ${count} ${count === 1 ? 'grade' : 'grades'} will be deleted too. This cannot be undone.`;
    if (!window.confirm(msg)) return;
    run(() => deleteSubject(s.id));
  }

  return (
    <section className="card">
      <h2>Subjects · {year.name}</h2>
      <ul className="list">
        {data.subjects.map((s) =>
          editing?.id === s.id ? (
            <li key={s.id}>
              <form className="inline-form" onSubmit={saveRename}>
                <input autoFocus value={editing.name} onChange={(e) => setEditing({ id: s.id, name: e.target.value })} />
                <button type="button" className="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="primary">Save</button>
              </form>
            </li>
          ) : (
            <li key={s.id} className="row static">
              <span className="row-name">{s.name}</span>
              <span className="row-actions">
                <button className="ghost small" onClick={() => setEditing({ id: s.id, name: s.name })}>
                  Rename
                </button>
                <button className="ghost small danger" onClick={() => remove(s)}>
                  Delete
                </button>
              </span>
            </li>
          ),
        )}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <input placeholder="New subject" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" disabled={!name.trim()}>
          Add subject
        </button>
      </form>
    </section>
  );
}

function StudentOverview({ data }: { data: AdminData }) {
  const students = data.profiles.filter((p) => !isAdminEmail(p.email));
  return (
    <section className="card">
      <h2>Current averages{data.activeYear ? ` · ${data.activeYear.name}` : ''}</h2>
      {students.length === 0 && <p className="muted">No student has signed up yet.</p>}
      {students.map((p) => {
        const mine = data.grades.filter((g) => g.user_id === p.id);
        const averages = data.subjects.map((s) => subjectAverage(mine.filter((g) => g.subject_id === s.id)));
        return (
          <div key={p.id} className="student-block">
            <div className="student-head">
              <span className="muted">{p.email}</span>
              <span>
                Overall <OverallAvg value={overallAverage(averages)} />
              </span>
            </div>
            <ul className="list">
              {data.subjects.map((s, i) => (
                <li key={s.id} className="row static">
                  <span className="row-name">{s.name}</span>
                  <SubjectAvg value={averages[i]} quarterTitle="Rounded to the nearest quarter" />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

const actionLabels: Record<HistoryEntry['action'], string> = {
  grade_added: 'Grade added',
  grade_edited: 'Grade edited',
  grade_deleted: 'Grade deleted',
  subject_added: 'Subject added',
  subject_renamed: 'Subject renamed',
  subject_deleted: 'Subject deleted',
  year_created: 'Year created',
};

function gradeText(value: number | null, weight: number | null) {
  if (value === null) return '';
  return `${formatRaw(value)} (weight ${formatRaw(weight ?? 1)})`;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function HistoryCard({ history }: { history: HistoryEntry[] }) {
  return (
    <section className="card">
      <h2>Change history</h2>
      {history.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date and time</th>
                <th>Who</th>
                <th>What</th>
                <th>Year</th>
                <th>Subject</th>
                <th>Old</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="nowrap">{dateFormat.format(new Date(h.at))}</td>
                  <td>{isAdminEmail(h.actor_email) ? 'You' : (h.actor_email ?? '')}</td>
                  <td className="nowrap">{actionLabels[h.action]}</td>
                  <td>{h.year_name ?? ''}</td>
                  <td>{h.subject_name ?? ''}</td>
                  <td>{h.old_name ?? gradeText(h.old_value, h.old_weight)}</td>
                  <td>{h.new_name ?? (gradeText(h.new_value, h.new_weight) || h.detail || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
