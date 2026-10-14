import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appUrl, isAdminEmail, setRemember, startLinkError, supabase } from '../lib/supabase';
import { fetchSignupOpen } from '../lib/data';
import { useAuth } from './AuthProvider';

export type Lang = 'it' | 'en';

// The student side is Italian, the admin side English (spec §2).
const T = {
  it: {
    appName: 'Voti',
    login: 'Accedi',
    email: 'Email',
    password: 'Password',
    remember: 'Ricordami',
    forgot: 'Password dimenticata?',
    noAccount: 'Non hai un account?',
    signup: 'Registrati',
    haveAccount: 'Hai già un account?',
    signupClosed: 'Le registrazioni sono chiuse.',
    signupNeedsConfirm: 'Account creato. Controlla la tua email per confermarlo, poi accedi.',
    passwordShort: 'La password deve avere almeno 6 caratteri.',
    badLogin: 'Email o password non corretti.',
    sendReset: 'Invia link',
    resetIntro: 'Ti mandiamo un link per scegliere una nuova password.',
    resetSent: 'Se esiste un account con questa email, riceverai un link a breve.',
    back: 'Torna all’accesso',
    newPassword: 'Nuova password',
    savePassword: 'Salva password',
    linkExpired: 'Il link non è valido o è scaduto. Richiedine uno nuovo.',
    genericError: 'Qualcosa è andato storto. Riprova.',
  },
  en: {
    appName: 'Grades · Admin',
    login: 'Log in',
    email: 'Email',
    password: 'Password',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    noAccount: 'No account yet?',
    signup: 'Sign up',
    haveAccount: 'Already have an account?',
    signupClosed: 'Sign-up is closed.',
    signupNeedsConfirm: 'Account created. Check your email to confirm it, then log in.',
    passwordShort: 'The password needs at least 6 characters.',
    badLogin: 'Wrong email or password.',
    sendReset: 'Send link',
    resetIntro: 'We will email you a link to choose a new password.',
    resetSent: 'If an account exists for this email, a link is on its way.',
    back: 'Back to log in',
    newPassword: 'New password',
    savePassword: 'Save password',
    linkExpired: 'The link is invalid or has expired. Request a new one.',
    genericError: 'Something went wrong. Please try again.',
  },
};

const paths = {
  it: { login: '/login', signup: '/registrati', forgot: '/password-dimenticata' },
  en: { login: '/admin/login', signup: '/admin/signup', forgot: '/admin/forgot' },
};

function Shell({ lang, title, children }: { lang: Lang; title: string; children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">{T[lang].appName}</div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginPage({ lang }: { lang: Lang }) {
  const t = T[lang];
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberBox] = useState(true);
  const [error, setError] = useState<string | null>(startLinkError ? t.linkExpired : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRemember(remember);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message.toLowerCase().includes('invalid') ? t.badLogin : err.message);
    else nav(isAdminEmail(email.trim()) ? '/admin' : '/', { replace: true });
  }

  return (
    <Shell lang={lang} title={t.login}>
      <form onSubmit={submit} className="stack">
        <label>
          {t.email}
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t.password}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRememberBox(e.target.checked)} />
          {t.remember}
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {t.login}
        </button>
      </form>
      <div className="auth-links">
        <Link to={paths[lang].forgot}>{t.forgot}</Link>
        <span>
          {t.noAccount} <Link to={paths[lang].signup}>{t.signup}</Link>
        </span>
      </div>
    </Shell>
  );
}

export function SignupPage({ lang }: { lang: Lang }) {
  const t = T[lang];
  const nav = useNavigate();
  const [open, setOpen] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberBox] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSignupOpen().then(setOpen, () => setOpen(true));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (password.length < 6) return setError(t.passwordShort);
    // The admin can always sign up; everyone else only while the switch is open.
    if (!isAdminEmail(mail) && open === false) return setError(t.signupClosed);
    setBusy(true);
    setError(null);
    setRemember(remember);
    const { data, error: err } = await supabase.auth.signUp({ email: mail, password });
    setBusy(false);
    if (err) {
      setError(err.message.toLowerCase().includes('database error') ? t.signupClosed : err.message);
    } else if (!data.session) {
      setInfo(t.signupNeedsConfirm);
    } else {
      nav(isAdminEmail(mail) ? '/admin' : '/', { replace: true });
    }
  }

  return (
    <Shell lang={lang} title={t.signup}>
      {open === false && <p className="muted">{t.signupClosed}</p>}
      <form onSubmit={submit} className="stack">
        <label>
          {t.email}
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t.password}
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRememberBox(e.target.checked)} />
          {t.remember}
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="muted">{info}</p>}
        <button className="primary" disabled={busy}>
          {t.signup}
        </button>
      </form>
      <div className="auth-links">
        <span>
          {t.haveAccount} <Link to={paths[lang].login}>{t.login}</Link>
        </span>
      </div>
    </Shell>
  );
}

export function ForgotPasswordPage({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl(lang) });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <Shell lang={lang} title={t.forgot}>
      {sent ? (
        <p className="muted">{t.resetSent}</p>
      ) : (
        <form onSubmit={submit} className="stack">
          <p className="muted">{t.resetIntro}</p>
          <label>
            {t.email}
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy}>
            {t.sendReset}
          </button>
        </form>
      )}
      <div className="auth-links">
        <Link to={paths[lang].login}>{t.back}</Link>
      </div>
    </Shell>
  );
}

export function NewPasswordPage({ lang }: { lang: Lang }) {
  const t = T[lang];
  const nav = useNavigate();
  const { finishRecovery, isAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError(t.passwordShort);
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    finishRecovery();
    nav(isAdmin ? '/admin' : '/', { replace: true });
  }

  return (
    <Shell lang={lang} title={t.newPassword}>
      <form onSubmit={submit} className="stack">
        <label>
          {t.newPassword}
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {t.savePassword}
        </button>
      </form>
    </Shell>
  );
}
