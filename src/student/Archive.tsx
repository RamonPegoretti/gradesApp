import { useEffect, useState } from 'react';
import { OverallAvg, SubjectAvg } from '../components/Average';
import { fetchGrades, fetchSubjects, type StoredGrade, type Subject } from '../lib/data';
import { overallAverage, subjectAverage } from '../lib/grades';
import { useStudentData } from './StudentLayout';

/** Past years, read-only: final average and, in a dropdown, every subject's average (spec §7.4). */
export function Archive() {
  const { loading, years } = useStudentData();
  const archived = years.filter((y) => y.archived).reverse();
  const [yearId, setYearId] = useState<number | null>(null);
  const [data, setData] = useState<{ subjects: Subject[]; grades: StoredGrade[] } | null>(null);
  const [error, setError] = useState(false);

  const selected = archived.find((y) => y.id === yearId) ?? archived[0];

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setData(null);
    setError(false);
    (async () => {
      const subjects = await fetchSubjects([selected.id]);
      const grades = await fetchGrades(subjects.map((s) => s.id));
      if (alive) setData({ subjects, grades });
    })().catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [selected?.id]);

  if (loading) return <p className="muted">Caricamento…</p>;

  return (
    <>
      <h1>Archivio</h1>
      {archived.length === 0 ? (
        <p className="muted">Nessun anno archiviato.</p>
      ) : (
        <>
          <label className="field-inline">
            Anno
            <select value={selected.id} onChange={(e) => setYearId(Number(e.target.value))}>
              {archived.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="error">Errore nel caricamento dei dati.</p>}
          {data && <ArchivedYear subjects={data.subjects} grades={data.grades} />}
        </>
      )}
    </>
  );
}

function ArchivedYear({ subjects, grades }: { subjects: Subject[]; grades: StoredGrade[] }) {
  const averages = subjects.map((s) => subjectAverage(grades.filter((g) => g.subject_id === s.id)));
  return (
    <>
      <section className="hero">
        <div className="label">Media finale</div>
        <div className="hero-value">
          <OverallAvg value={overallAverage(averages)} />
        </div>
      </section>
      <details className="card dropdown">
        <summary>Medie per materia</summary>
        <ul className="list">
          {subjects.map((s, i) => (
            <li key={s.id} className="row static">
              <span className="row-name">{s.name}</span>
              <SubjectAvg value={averages[i]} />
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
