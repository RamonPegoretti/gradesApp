# Setup (one time, about 15 minutes)

Everything here is free. These are the steps only Ramon can do, because they need his accounts.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign in (GitHub login works) and click **New project**.
2. Pick any name (e.g. `gradesapp`), set a strong database password (save it somewhere), choose a region close to you (e.g. *Central EU (Zurich)*), plan **Free**. Create it and wait until it is ready.

## 2. Create the database

1. In the project, open **SQL Editor → New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy all of it, paste it, and click **Run**. It should say "Success. No rows returned".

## 3. Configure logins

1. **Authentication → Sign In / Providers → Email**:
   - keep **Email** enabled;
   - turn **Confirm email** **off** (the spec says the only emails ever sent are password resets). Save.
2. **Authentication → Sign In / Providers** (top section): keep **Allow new users to sign up** **on**. The app's own open/close switch in your dashboard controls who can sign up.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://ramonpegoretti.github.io/gradesApp/`
   - **Redirect URLs** → Add URL: `https://ramonpegoretti.github.io/gradesApp/**`

## 4. Give GitHub the Supabase address and key

1. In Supabase, open **Project Settings → API Keys** (or **Data API**) and copy:
   - the **Project URL** (looks like `https://abcdefgh.supabase.co`);
   - the **anon public** key (or the **publishable** key, `sb_publishable_…`). Never use the `service_role` / secret key.
2. On GitHub, open the repo → **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon / publishable key

## 5. Turn on GitHub Pages

1. Repo → **Settings → Pages** → **Source: GitHub Actions**.
2. Merge the pull request into `main`. The **Deploy to GitHub Pages** workflow builds and publishes the app (repo → **Actions** shows progress). If you added the secrets after merging, open **Actions → Deploy to GitHub Pages → Run workflow**.
3. The app is then at https://ramonpegoretti.github.io/gradesApp/

## 6. First use

1. **Sign up yourself first, right away**: https://ramonpegoretti.github.io/gradesApp/#/admin/signup with `ramopego@gmail.com`. (Sign-up starts closed for everyone except this email.)
2. In your dashboard: create the year, add her subjects.
3. Turn the **Sign-up** switch **on**, send her https://ramonpegoretti.github.io/gradesApp/ and let her tap *Registrati*.
4. Once she is in, turn the switch **off** again.

## Keeping it awake

Supabase pauses free projects after a week without use. The **Keep Supabase awake** workflow makes one tiny request every Monday. You can run it by hand from **Actions** to check it works (it needs the secrets from step 4).

## Local development (optional)

```sh
cp .env.example .env.local   # fill in the URL and key
npm install
npm run dev                  # http://localhost:5173/gradesApp/
```

For password-reset links to work locally, also add `http://localhost:5173/**` to the Supabase Redirect URLs.
