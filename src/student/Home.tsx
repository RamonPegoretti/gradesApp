import { Link } from 'react-router-dom';
import { OverallAvg, SubjectAvg } from '../components/Average';
import { ChevronIcon } from '../components/Icons';
import { overallAverage, subjectAverage } from '../lib/grades';
import { useStudentData } from './StudentLayout';

export function Home() {
  const { loading, activeYear, subjects, grades } = useStudentData();
  if (loading) return <p className="muted">Caricamento…</p>;
  if (!activeYear) return <p className="muted">Nessun anno attivo.</p>;

  const averages = subjects.map((s) => subjectAverage(grades.filter((g) => g.subject_id === s.id)));

  return (
    <>
      <section className="hero">
        <div className="label">Media generale · {activeYear.name}</div>
        <div className="hero-value">
          <OverallAvg value={overallAverage(averages)} />
        </div>
      </section>

      {subjects.length === 0 ? (
        <p className="muted">Nessuna materia.</p>
      ) : (
        <ul className="list">
          {subjects.map((s, i) => (
            <li key={s.id}>
              <Link to={`/materia/${s.id}`} className="row">
                <span className="row-name">{s.name}</span>
                <SubjectAvg value={averages[i]} />
                <ChevronIcon />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
