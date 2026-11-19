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

## How a request finds its café

`src/proxy.ts` reads the Host header (`src/lib/routing`, unit-tested) with
`NEXT_PUBLIC_ROOT_DOMAIN` as the root:

| Host                                          | Result                                                        |
| --------------------------------------------- | ------------------------------------------------------------- |
| `serbi.me`, `www.serbi.me`                    | root site (`src/app/*`)                                       |
| `<slug>.serbi.me/<path>`                      | rewritten to `/tenant/<slug>/<path>` — the URL stays the same |
| `a.b.serbi.me`, malformed slug                | 404                                                           |
| direct `/tenant/*` on any host                | 404 (internal paths)                                          |
| other hosts (Vercel previews): `?cafe=<slug>` | shows that café and remembers it (cookie); `?cafe=` resets    |

Links inside café pages are host-relative (`/menu`), never `/tenant/<slug>/menu`.

## Café data

Café pages read `get_public_cafe(slug)` (`src/lib/data/services/public-cafes.ts`): only what
the café shows its customers — name, colours, language, location, phone, email, Facebook,
Instagram. It works for signed-out visitors; the `cafes` table itself stays members-only.
Results are cached per café (`cacheLife("minutes")`, tag `cafe:<slug>`), so changes saved in
the owner's Settings appear within about a minute.

| Café         | Page                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| active       | café home in its own colours (menu card, contact & social links)                          |
| suspended    | "Temporarily unavailable" (name + colours only)                                           |
| unknown slug | "This café doesn't exist" (`noindex`; streamed, so HTTP 200 — see Next.js "Status codes") |

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
