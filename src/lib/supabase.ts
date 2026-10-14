import { createClient, type SupportedStorage } from '@supabase/supabase-js';

export const ADMIN_EMAIL = 'ramopego@gmail.com';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

// What the address bar held when the page opened, before Supabase reads and clears it.
// A password-reset link lands here with "type=recovery" in the hash.
const startHash = window.location.hash;
export const openedFromRecoveryLink = startHash.includes('type=recovery');
export const startLinkError: string | null = (() => {
  if (!startHash.includes('error')) return null;
  const params = new URLSearchParams(startHash.replace(/^#\/?/, ''));
  return params.get('error_code') ?? params.get('error');
})();

// "Ricordami" / "Remember me": when checked the session lives in localStorage
// (stays after closing the browser), otherwise in sessionStorage (ends with the tab).
const REMEMBER_KEY = 'gradesapp.remember';

export function setRemember(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

const rememberStorage: SupportedStorage = {
  getItem: (k) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k, v) => {
    if (localStorage.getItem(REMEMBER_KEY) === '0') {
      sessionStorage.setItem(k, v);
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(k, v);
      sessionStorage.removeItem(k);
    }
  },
  removeItem: (k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  },
};

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: {
    storage: rememberStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isConfigured,
    // Implicit flow: reset links work even when opened in a different browser (e.g. the mail app).
    flowType: 'implicit',
  },
});

/** Where password-reset emails send the user back to. */
export function appUrl(lang: 'it' | 'en') {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return lang === 'en' ? `${base}?lang=en` : base;
}

export function isAdminEmail(email: string | undefined | null) {
  return (email ?? '').toLowerCase() === ADMIN_EMAIL;
}
