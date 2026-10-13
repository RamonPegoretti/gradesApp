# gradesApp

A small web app where one student stores her grades (Swiss scale, 6 best, 4 pass) and sees averages, a target calculator and graphs. Ramon manages years and subjects from an admin dashboard and sees a change history.

- Student side (Italian, phone first): home with overall and subject averages, subject page with grades and target calculator, graphs, archive of past years.
- Admin side (English, `#/admin`): years, subjects, sign-up switch, current averages, change history.
- Spec: agreed requirements in the project (`spec/requirements.md`).

**Setting it up:** see [SETUP.md](SETUP.md).

## Tech

React + TypeScript (Vite), Recharts, Supabase (auth, Postgres, row level security, history triggers), GitHub Pages.

| Path | What |
| --- | --- |
| `src/lib/grades.ts` | grade parsing and every calculation (unit tested) |
| `src/student/`, `src/admin/` | the two sides of the app |
| `supabase/schema.sql` | tables, access rules, history triggers |
| `supabase/tests/` | database tests run in CI against Postgres |

```sh
npm install
npm test          # calculation tests
npm run build
```
