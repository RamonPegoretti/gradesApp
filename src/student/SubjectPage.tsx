import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SubjectAvg } from '../components/Average';
import { BackIcon, EditIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { addGrade, deleteGrade, updateGrade, type StoredGrade } from '../lib/data';
import {
  format2,
  formatRaw,
  neededGrade,
  parseDecimal,
  parseGrade,
  parseWeight,
  subjectAverage,
  type ParseResult,
} from '../lib/grades';
import { useStudentData } from './StudentLayout';

const gradeErrors: Record<Exclude<ParseResult, { ok: true }>['error'], string> = {
  empty: 'Inserisci un voto.',
  comma: 'Usa il punto per i decimali (es. 4.5).',
  format: 'Voto non valido.',
  sign_decimal: 'Il segno + o - si può usare solo con numeri interi (es. 5+).',
  range: 'Il voto deve essere tra 0 e 6.',
};

function GradeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: StoredGrade;
  onSave: (value: number, weight: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [grade, setGrade] = useState(initial ? formatRaw(initial.value) : '');
  const [weight, setWeight] = useState(initial ? formatRaw(initial.weight) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const g = parseGrade(grade);
    if (!g.ok) return setError(gradeErrors[g.error]);
    const w = parseWeight(weight);
    if (!w.ok) return setError(w.error === 'comma' ? gradeErrors.comma : 'Il peso deve essere un numero uguale o maggiore di 0.');
    setBusy(true);
    setError(null);
    try {
      await onSave(g.value, w.value);
    } catch {
      setError('Salvataggio non riuscito. Riprova.');
      setBusy(false);
    }
  }

  return (
    <form className="grade-form" onSubmit={submit}>
      <div className="grade-form-fields">
        <label>
          Voto
          <input
            autoFocus
            inputMode="text"
            autoComplete="off"
            placeholder="es. 5+ o 4.5"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </label>
        <label>
          Peso
          <input inputMode="decimal" autoComplete="off" placeholder="1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="ghost" onClick={onCancel}>
          Annulla
        </button>
        <button className="primary" disabled={busy}>
          Salva
        </button>
      </div>
    </form>
  );
}

function TargetCalculator({ grades }: { grades: StoredGrade[] }) {
  const [target, setTarget] = useState('');
  const [remaining, setRemaining] = useState('1');

  let result: React.ReactNode = null;
  if (target.trim() !== '') {
    const t = parseDecimal(target);
    const n = remaining.trim() === '' ? 1 : /^\d+$/.test(remaining.trim()) ? Number(remaining) : NaN;
    if (!t.ok) {
      result = <p className="error">{t.error === 'comma' ? gradeErrors.comma : 'Media obiettivo non valida.'}</p>;
    } else if (!(n >= 1)) {
      result = <p className="error">Il numero di voti deve essere un intero maggiore di 0.</p>;
    } else {
      const r = neededGrade(grades, t.value, n);
      result =
        r.kind === 'needed' ? (
          <p className="target-result">
            Voto necessario: <strong>{format2(r.value)}</strong>
          </p>
        ) : r.kind === 'unreachable' ? (
          <p className="target-result">Non raggiungibile</p>
        ) : (
          <p className="target-result">Obiettivo già raggiunto: qualsiasi voto va bene.</p>
        );
    }
  }

  return (
    <section className="card">
      <h2>Obiettivo</h2>
      <div className="grade-form-fields">
        <label>
          Media obiettivo
          <input inputMode="decimal" autoComplete="off" placeholder="es. 5" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label>
          Voti rimanenti
          <input inputMode="numeric" autoComplete="off" value={remaining} onChange={(e) => setRemaining(e.target.value)} />
        </label>
      </div>
      {result}
    </section>
  );
}

export function SubjectPage() {
  const { id } = useParams();
  const { loading, subjects, grades, refresh } = useStudentData();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="muted">Caricamento…</p>;
  const subject = subjects.find((s) => String(s.id) === id);
  if (!subject) {
    return (
      <>
        <Link to="/" className="back">
          <BackIcon /> Home
        </Link>
        <p className="muted">Materia non trovata.</p>
      </>
    );
  }
  const list = grades.filter((g) => g.subject_id === subject.id);

  async function remove(g: StoredGrade) {
    if (!window.confirm(`Eliminare il voto ${formatRaw(g.value)}?`)) return;
    try {
      await deleteGrade(g.id);
      await refresh();
    } catch {
      setError('Eliminazione non riuscita. Riprova.');
    }
  }

  return (
    <>
      <Link to="/" className="back">
        <BackIcon /> Home
      </Link>
      <div className="subject-head">
        <h1>{subject.name}</h1>
        <button
          className="icon-btn accent"
          aria-label="Aggiungi voto"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
        >
          <PlusIcon />
        </button>
      </div>

      <section className="hero small">
        <div className="label">Media</div>
        <div className="hero-value">
          <SubjectAvg value={subjectAverage(list)} quarterTitle="Arrotondata al quarto" />
        </div>
      </section>

      {adding && (
        <GradeForm
          onCancel={() => setAdding(false)}
          onSave={async (v, w) => {
            await addGrade(subject.id, v, w);
            await refresh();
            setAdding(false);
          }}
        />
      )}
      {error && <p className="error">{error}</p>}

      {list.length === 0 && !adding ? (
        <p className="muted">Nessun voto. Usa il + per aggiungerne uno.</p>
      ) : (
        <ul className="list grades">
          <li className="list-head">
            <span>Voto</span>
            <span>Peso</span>
            <span />
          </li>
          {list.map((g) =>
            editingId === g.id ? (
              <li key={g.id}>
                <GradeForm
                  initial={g}
                  onCancel={() => setEditingId(null)}
                  onSave={async (v, w) => {
                    await updateGrade(g.id, v, w);
                    await refresh();
                    setEditingId(null);
                  }}
                />
              </li>
            ) : (
              <li key={g.id} className="grade-row">
                <span className="grade-value">{formatRaw(g.value)}</span>
                <span className="muted">{formatRaw(g.weight)}</span>
                <span className="row-actions">
                  <button
                    className="icon-btn"
                    aria-label="Modifica"
                    onClick={() => {
                      setEditingId(g.id);
                      setAdding(false);
                    }}
                  >
                    <EditIcon />
                  </button>
                  <button className="icon-btn" aria-label="Elimina" onClick={() => remove(g)}>
                    <TrashIcon />
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      <TargetCalculator grades={list} />
    </>
  );
}
