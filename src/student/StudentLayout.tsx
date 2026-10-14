import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { fetchGrades, fetchSubjects, fetchYears, type StoredGrade, type Subject, type Year } from '../lib/data';
import { supabase } from '../lib/supabase';

interface StudentData {
  loading: boolean;
  error: string | null;
  years: Year[];
  activeYear: Year | null;
  subjects: Subject[];
  grades: StoredGrade[];
  refresh: () => Promise<void>;
}

const Ctx = createContext<StudentData | null>(null);

export function useStudentData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudentData outside StudentLayout');
  return ctx;
}

export function StudentLayout() {
  const [state, setState] = useState<Omit<StudentData, 'refresh'>>({
    loading: true,
    error: null,
    years: [],
    activeYear: null,
    subjects: [],
    grades: [],
  });

  const refresh = useCallback(async () => {
    try {
      const years = await fetchYears();
      const activeYear = years.find((y) => !y.archived) ?? null;
      const subjects = activeYear ? await fetchSubjects([activeYear.id]) : [];
      const grades = await fetchGrades(subjects.map((s) => s.id));
      setState({ loading: false, error: null, years, activeYear, subjects, grades });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider value={{ ...state, refresh }}>
      <div className="student">
        <header className="topbar">
          <span className="brand">Voti</span>
          <button className="link" onClick={() => supabase.auth.signOut()}>
            Esci
          </button>
        </header>
        <main className="page">
          {state.error && <p className="error">Errore nel caricamento dei dati. Riprova più tardi.</p>}
          <Suspense fallback={<p className="muted">Caricamento…</p>}>
            <Outlet />
          </Suspense>
        </main>
        <nav className="tabbar">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/grafici">Grafici</NavLink>
          <NavLink to="/archivio">Archivio</NavLink>
        </nav>
      </div>
    </Ctx.Provider>
  );
}
