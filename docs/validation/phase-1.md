# Phase 1 local validation — 2026-10-16

Scope: authentication, profiles, explicit district grants and access administration.
Branch: `feat/auth-foundation`. Changes are uncommitted for review. This evidence
does not certify any operational incident, geographic, ingestion or Storage feature.

## Inventory and installation

Read `AGENTS.md`, `START-HERE.md`, the entire master spec and implementation checklist.
The referenced source PDF is absent. Started from Next.js 16.4.2 / React 19.3.0,
Tailwind 4, strict TypeScript and Biome 2.4.2. Environment: Node 22.23.3,
pnpm 11.28.5, Python 3 and Docker 29.9.0.

Inspected only `.env.local` variable names, never printed its values or changed it:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_DEFAULT_TIMEZONE`, `SUPABASE_SECRET_KEY`,
`NASA_FIRMS_MAP_KEY`, `NASA_FIRMS_SOURCE`, `NASA_FIRMS_BBOX`, `NASA_FIRMS_SYNC_TOKEN`,
`AI_PROVIDER_API_KEY`, `AI_SUMMARIZATION_ENABLED`. Added `APP_ORIGIN` to the example
for canonical auth links. Existing secret material was not used for hosted calls.

Executed installation commands:

```bash
pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers maplibre-gl lucide-react date-fns csv-parse @tanstack/react-query server-only
pnpm add -D supabase vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test prettier prettier-plugin-tailwindcss
pnpm add -D @types/node@^22
pnpm dlx shadcn@latest init -d -y --no-reinstall
pnpm dlx shadcn@latest add input card badge -y
pnpm dlx ui-ux-pro-max-cli init --ai codex
```

Official Supabase and Vercel skills were installed using the Codex skill-installer
helper with `.agents/skills` as destination. See `docs/architecture/skills.md`.
`pnpm import` encountered a pnpm resolution-policy bug; `pnpm add` successfully
resolved the existing exact framework versions and generated the pnpm lockfile.
Removed the superseded npm lockfile. A Node type peer mismatch was resolved by
aligning types with Node 22. `pnpm peers check`: no peer dependency issues.

All ten documented runtime library groups imported successfully with Node ESM:
Supabase JS/SSR, Zod, React Hook Form, resolvers/Zod, MapLibre, Lucide, date-fns,
csv-parse and TanStack Query. No map/CSV code is imported by auth screens.

## Database and permissions

```bash
pnpm exec supabase init
node scripts/start-local.mjs
pnpm exec supabase migration up --local
pnpm exec supabase gen types typescript --local > src/types/database.types.ts
pnpm exec biome check --write src/types/database.types.ts
pnpm db:test
```

Both migrations applied locally on Postgres 17. pgTAP: **92 assertions passed**,
one test file, `Result: PASS`. Synthetic fixtures and scope-probe table roll back.

Covered anon, pending, viewer, field officer, coordinator, admin, suspended,
unconfirmed, anonymous Auth and no-area users. Assertions cover profile visibility,
column grants, ignored signup metadata, in-area and out-of-area reads (including
admin), denied self-promotion, denied direct grants/audit mutation, rejected
automated approval, justified atomic approval, duplicate grants, audit contents,
revocation with the same JWT, and immutable audit update/delete/truncate.

An initial SQL test expression was corrected after PostgreSQL rejected a nested
data-modifying CTE. A test attempt overlapped a local restart and was rerun after
services were ready. Image download throttling and a transient restart failure
were resolved locally. Final database results above are from the corrected suite.

## Application checks

| Command | Final result |
| --- | --- |
| `pnpm lint` | Passed, Biome checked 43 files, no fixes required |
| `pnpm typecheck` | Passed, `next typegen && tsc --noEmit` |
| `pnpm test` | Passed, 2 files / 21 tests |
| `pnpm build` | Passed, Next.js production build; also executed before the final browser suite |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` | Passed, 6 Chromium tests in 36.4 seconds, includes local production build |
| `git diff --check` | Passed |

Browser coverage:

1. Unauthenticated dashboard denial and reset-form session guard.
2. Real signup, intercepted local confirmation email, confirmed pending identity,
   Data API self-promotion denial, dashboard denial and logout.
3. Real local recovery email, PKCE callback, new password and re-login.
4. Approved synthetic viewer, scoped dashboard access and suspension with the same session.
5. Invalid callback rejection and fixed redirect destination.
6. Indonesian document language, skip link, keyboard order, 375px portrait,
   812px landscape, reduced motion, 200% text sizing and no horizontal overflow.

The occupied development server on 3000 was left alone. Browser testing uses
loopback Supabase and a fresh production server on 3100; hosted keys are overridden
in memory. Test fixtures use local Auth administration only. Auth traces are off.
Desktop/mobile blank-login screenshots were inspected manually at
`test-results/login-desktop.png` and `test-results/login-mobile.png` (ignored).
Labels, input boundaries, focus rings and the satellite uncertainty caveat were
visible and readable. This is a focused UX check, not a complete WCAG audit.

Browser testing found eager Supabase initialization calling `Date.now()` during
prerendering. The server helper now waits on `connection()` before creating the
client, consistent with installed Next.js docs. The corrected complete suite
ran without those runtime errors. A callback assertion was also narrowed to
exclude Next.js's own route-announcer alert.

## Security/data review and remaining gates

An exact-value scan of private credential variables against repository candidates
and generated browser JavaScript passed without printing values. Application
source references only the public Supabase URL/key; it creates no privileged
client. Local CLI startup credential output is suppressed by the wrapper.

No NASA calls, mock live points, confirmed-fire records, hosted data writes,
deployment, external AI calls or operational users were introduced. SQL test
codes `TEST-A` and `TEST-B` have no geographic meaning. There is no production
administrator or district catalogue. Roles, boundaries, evidence policy, priority
rules, freshness definitions, retention and operational ownership still require
human decisions. Phase 2 adds PostGIS and separate observation/incident models;
Phase 3 adds server-only ingestion; Phase 4 adds human verification and evidence.
