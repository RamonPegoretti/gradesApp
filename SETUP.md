# Setup

The Supabase project (`gradesapp`, Zurich, free plan) and its database are already created, and the app's
public Supabase settings are in [`.env.production`](.env.production). Three things are left that only
Ramon can do, all doable from a phone browser.

## 1. Supabase login settings

Open https://supabase.com/dashboard/project/ftdvnutmwhzifrnszfgv

1. **Authentication → Sign In / Providers → Email**: turn **Confirm email** **off** and save
   (the spec says the only emails ever sent are password resets).
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://ramonpegoretti.github.io/gradesApp/`
   - **Redirect URLs → Add URL**: `https://ramonpegoretti.github.io/gradesApp/**`

## 2. Turn on GitHub Pages

Repo → **Settings → Pages** → **Source: GitHub Actions**. Then **Actions → Deploy to GitHub Pages → Run workflow**
(or merge any change into `main`). The app is then at https://ramonpegoretti.github.io/gradesApp/

## 3. First use

1. **Sign up yourself first**: https://ramonpegoretti.github.io/gradesApp/#/admin/signup with `ramopego@gmail.com`.
   (Sign-up starts closed for everyone except this email.)
2. In your dashboard: create the year, add her subjects.
3. Turn the **Sign-up** switch **on**, send her https://ramonpegoretti.github.io/gradesApp/ and let her tap *Registrati*.
4. Once she is in, turn the switch **off** again.

## Database changes

`supabase/schema.sql` is the full schema (already applied). To rebuild from scratch on a new project,
run it once in the Supabase SQL Editor and update `.env.production` with the new Project URL and
publishable key (Project Settings → API Keys). Never put the secret / `service_role` key in the repo.

## Keeping it awake

Supabase pauses free projects after a week without use. The **Keep Supabase awake** workflow makes one
tiny request every Monday; you can run it by hand from **Actions** to check it works.

## Local development (optional)

```sh
npm install
npm run dev    # http://localhost:5173/gradesApp/ (uses .env.production values unless .env.local overrides them)
```

For password-reset links to work locally, also add `http://localhost:5173/**` to the Supabase Redirect URLs.
