# cafe-app

Public pages of every café on **Serbi**: `<slug>.serbi.me` (café page, later the QR menu and
ordering) and the platform root `serbi.me` (QR short links). **One deployment serves all
cafés**: the café is picked from the host name and loaded from the database, so a new café is
live as soon as it exists — no DNS record, certificate, branch or deploy per café.

Registration, onboarding, the owner dashboard and the super-admin console live in
[`super-admin-app`](https://github.com/serbyni/super-admin-app). Both apps use the same
Supabase project; **database migrations live in super-admin-app** (`supabase/migrations`) —
this repo only keeps a copy of the generated types (`npm run db:types`).

## Stack & rules (same as super-admin-app)

- Next.js 16 (Cache Components), React 19, Tailwind 4 with design tokens — **no arbitrary
  values** (`npm run lint:tokens`), zod 4, Vitest.
- Data access only through `src/lib/data` (ESLint blocks Supabase clients and `.rpc()`
  elsewhere).
- Secrets are never committed: `.env.local` locally, GitHub/Vercel settings in CI.

## Branches & environments

| Branch      | Role                              | Deploys to                     |
| ----------- | --------------------------------- | ------------------------------ |
| `main`      | stable                            | production — `*.serbi.me`      |
| `develop`   | integration                       | development — `*.dev.serbi.me` |
| `feature/*` | work, merged into `develop` by PR | — (CI only)                    |

CI (`.github/workflows/ci.yml`): lint, Prettier, typecheck, tests and build on every PR and on
pushes to `develop`/`main`. Rolling a feature out to some cafés first is done with data
(release channel / feature flags in the database), not with branches.

## Local development

```bash
cp .env.example .env.local   # fill in the Supabase URL + publishable key
npm install
npm run dev                  # http://localhost:3000 — cafés at http://<slug>.localhost:3000
```

Browsers resolve `*.localhost` to your machine, so café subdomains work locally without DNS.

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run lint`      | ESLint + design-token check                     |
| `npm run format`    | Prettier                                        |
| `npm run typecheck` | Route types + TypeScript                        |
| `npm test`          | Unit tests (Vitest)                             |
| `npm run db:types`  | Regenerate `src/lib/supabase/database.types.ts` |
