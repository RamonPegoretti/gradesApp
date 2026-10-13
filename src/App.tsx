import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ForgotPasswordPage, LoginPage, NewPasswordPage, SignupPage } from './auth/AuthPages';
import { isConfigured } from './lib/supabase';
import { Archive } from './student/Archive';
import { Home } from './student/Home';
import { StudentLayout } from './student/StudentLayout';
import { SubjectPage } from './student/SubjectPage';

// Charts and the admin dashboard load on demand to keep the phone's first load light.
const Charts = lazy(() => import('./student/Charts').then((m) => ({ default: m.Charts })));
const AdminPage = lazy(() => import('./admin/AdminPage').then((m) => ({ default: m.AdminPage })));

// Hash routes keep deep links working on GitHub Pages, which has no server-side routing.
function AppRoutes() {
  const { ready, session, isAdmin, recovering } = useAuth();
  if (!ready) return null;

  if (recovering) {
    const lang = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'it';
    return <NewPasswordPage lang={lang} />;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage lang="it" />} />
        <Route path="/registrati" element={<SignupPage lang="it" />} />
        <Route path="/password-dimenticata" element={<ForgotPasswordPage lang="it" />} />
        <Route path="/admin/login" element={<LoginPage lang="en" />} />
        <Route path="/admin/signup" element={<SignupPage lang="en" />} />
        <Route path="/admin/forgot" element={<ForgotPasswordPage lang="en" />} />
        <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/materia/:id" element={<SubjectPage />} />
        <Route path="/grafici" element={<Charts />} />
        <Route path="/archivio" element={<Archive />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  if (!isConfigured) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>Not configured</h1>
          <p className="muted">
            The Supabase address and key are missing from this build. See SETUP.md in the repository.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </HashRouter>
    </AuthProvider>
  );
}
