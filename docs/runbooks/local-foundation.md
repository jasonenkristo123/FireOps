# Local foundation development

Use Node 22 and pnpm 11.28.5. Docker is required for database/browser tests.
Never copy CLI credential output into tickets or chat. `.env.local` is ignored;
the provided file was inspected for variable names only and was not changed.

Use `pnpm install` / `pnpm add` for dependency changes and `pnpm <script>` for
project scripts. `pnpm exec <tool>` uses the installed tool; `pnpm dlx <tool>`
runs a one-off CLI. Keep only `pnpm-lock.yaml`. Global npm/npx installations can
remain available for other projects.

```bash
pnpm install --frozen-lockfile
node scripts/start-local.mjs
pnpm exec supabase migration up --local
pnpm db:types
pnpm exec biome check --write src/types/database.types.ts
pnpm db:test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

With an existing Chrome installation, omit the browser download and use:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e
```

`start-local.mjs` wraps `supabase start` and suppresses its credential output.
`db:start` uses the same wrapper. The test server builds and serves this app on
**3100**, taking local keys directly from `supabase status --output json` in
memory and requiring loopback API/database URLs. It overrides the existing
environment and clears NASA, privileged app and AI secrets for the child process.
It does not overwrite `.env.local`. Never set `reuseExistingServer: true` for
these tests: an unrelated server might point to a hosted project.

The local Supabase config enables email confirmation and disables anonymous
sign-ins. Local email is caught by Mailpit at `http://127.0.0.1:54324`, without
delivery to real recipients. Port 3000 remains the usual development origin;
3100 is also allowlisted for isolated tests. The app needs `APP_ORIGIN` to build
auth email links. For ordinary manual development, set only public local
Supabase settings plus `APP_ORIGIN` in your own local environment, or use
`node scripts/serve-local.mjs` to inspect the local production build on 3100.

Tests create synthetic `@example.test` users only in local Auth. SQL fixtures
and the RLS probe roll back. Browser fixtures remain local until the disposable
stack is reset; do not run these fixture operations against hosted services.
Auth traces are disabled because they can contain passwords and recovery links.
Only blank login screenshots are captured under ignored `test-results/`.

## Migration review

`20261016000100_access_foundation.sql` introduces profiles, area grants, append-only
access audit records, pending-profile provisioning and a controlled approval RPC.
Only authenticated users can read their own profile/grants or edit their display
name. Verified active admins may read access administration records. No browser
identity can directly modify role, status, grants or audit records.

`20261016000200_existing_accounts.sql` provisions any pre-existing Auth accounts
as pending and blocks audit truncation. Neither migration creates observations,
incidents, public evidence buckets or PostGIS geometry. Phase 2 adds those models
and must test their own policies. Phase 4 adds private evidence and human-only
verification transactions; the ingestion identity must never receive that RPC.

An initial admin has deliberately not been provisioned. Before a hosted rollout,
review a named confirmed staff identity, target environment, reason, district
catalogue and bootstrap audit record with the owner. Do not put an unconditional
admin seed or a public bootstrap endpoint into the application. Future approvals
must use `set_account_access` in the verified admin's user session, never a
service-role client. No admin approval UI is included in this phase.

## Hosted setup is a separate gate

Review migrations and RLS on staging before any hosted `db push`. Configure the
canonical `APP_ORIGIN`, exact Supabase redirect allowlist, confirmed-email policy,
SMTP delivery/rate limits and email templates. Standard Supabase PKCE email links
work in the browser that requested them. Cross-device confirmation can use the
supported `/auth/callback?token_hash=...&type=signup` template; recovery uses
`type=recovery`. Callback destinations are fixed to dashboard or password reset.
Review and test those templates explicitly before release.

The checked-in `.env.example` documents names only. Foundation code creates no
privileged client and never references `SUPABASE_SECRET_KEY` or NASA credentials.
Do not deploy until unresolved operational policies and release checks are met.
