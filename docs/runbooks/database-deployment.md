# Database deployment review and commands

Status: **not deployed remotely; awaiting explicit owner approval**.
Commands verified against installed Supabase CLI 2.121.0. Official references:
[CLI](https://supabase.com/docs/reference/cli/supabase-db-push),
[migrations](https://supabase.com/docs/guides/deployment/database-migrations),
[PostGIS](https://supabase.com/docs/guides/database/extensions/postgis).

## MVP follow-up (local only)

Migrations 004–006 now add authorized incident workflow RPCs, immutable decisions,
manual priority factors, teams/assignments/reports/evidence/notifications, private
Storage policies and private ingestion transactions. They have been applied and
validated locally. The original 001–003 review below is historical; **review all
six migrations** against staging history before approval. No remote push occurred.
See [MVP setup and limitations](mvp-local.md).

## Observed connection and migration state

- Local project: `fireops`, Postgres 17, local services working.
- CLI 2.121.0 installed through pnpm.
- App environment points to hosted Supabase; values were not printed or changed.
- Read-only hosted Auth settings request returned HTTP 200 using `.env.local`.
- Read-only Data API OpenAPI metadata was reachable using the configured server
  key. None of the eight expected FireOps tables was listed in the exposed schema.
  API visibility alone cannot prove table absence, applied history or RLS state.
- CLI login check returned missing access token. No project-ref link exists.
- Remote migration history **cannot be verified yet**. Do not assume it is empty.
- Both Phase 1 migrations existed and were applied locally before this audit.
- This iteration added and applied migration 003 **locally only**.
- Local migration list now shows all three applied; local dry run reports no pending migrations.
- The CLI labels a history column `remote` even with `migration list --local`.
  In that command it refers to the local database history, not hosted Supabase.

## Complete candidate migration set for remote review

Actual pending versions depend on the selected remote's migration history.

| SQL file | Changes | Local | Remote |
| --- | --- | --- | --- |
| `supabase/migrations/20261016000100_access_foundation.sql` | Roles/status enums; profiles; district-grant strings; access audit; pending-profile trigger; scoped authorization helper; audited account approval RPC; column grants and RLS | Applied | Unverified |
| `supabase/migrations/20261016000200_existing_accounts.sql` | Backfill existing Auth identities as pending; reject audit truncation | Applied | Unverified |
| `supabase/migrations/20261016000300_geospatial_core.sql` | PostGIS; districts; raw observations; incidents; links; ingest runs; mode/status enums; FKs/checks/spatial and query indexes; point-in-district RPC; geographic guards; revision trigger; RLS/grants; catalogue grant relationship | Applied | Unverified |

Read the complete SQL files before approval. Migration 003 adds no real data and
leaves incident writes/verification/priority/status transitions locked. It grants
the service role only catalogue reads and observation/ingestion persistence.
There are no Storage buckets, team/assignment, verification-history, priority,
notification or AI tables in this candidate set. No seed/roles upload is included.

The reviewed file checksums are in `docs/validation/database-migrations.sha256`.
Before approving/pushing, verify that those exact SQL files are still present:

```bash
sha256sum --check docs/validation/database-migrations.sha256
```

Legacy-grant FK `profile_district_grants_district_fkey` is intentionally `NOT VALID`.
It protects all new grants; existing unmatched grants are preserved and denied
operational access. Validation remains a separate catalogue/reconciliation gate.
If an existing PostGIS extension is outside `extensions`, stop for schema review.
Do not relocate an extension or repair migration history just to make deployment pass.

## Local verification — safe to run before approval

```bash
pnpm install --frozen-lockfile
pnpm db:start
pnpm exec supabase migration list --local
pnpm exec supabase migration up --local
pnpm db:types
pnpm exec biome check --write src/types/database.types.ts
pnpm db:test
pnpm db:lint
pnpm db:test:migrations
pnpm lint
pnpm typecheck
pnpm test
pnpm build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e
pnpm exec supabase db push --local --dry-run --skip-vault
```

For another browser installation, configure `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
or install Playwright Chromium locally. `db:test:migrations` uses a separate local
project and port 55322; it does not reset the development database. Its fixture
copy excludes `.env.local`, secrets and remote link metadata. Startup credential
output is suppressed. SQL tests roll back all their synthetic demo and simulated
live-mode records. Browser tests retain only clearly synthetic local fixtures.

## Manual target setup and read-only remote review — not executed here

Choose the **approved staging project**, then replace the placeholder below with
its project reference. Authenticate locally; never paste access tokens or database
passwords into chat, source code or shell command arguments. Supply credentials
through the CLI's interactive prompts or a securely managed environment.

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_APPROVED_STAGING_PROJECT_REF
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run --skip-vault
```

Compare the linked ref with the intended staging project and the app's public
Supabase URL. Review remote existing schema/history and backups as well as the
dry-run file list. If tables already exist without matching migration history,
stop and review drift; do not run automatic `migration repair` or `db reset`.
Login/link establish local tooling state; they do not approve a schema push.

## Remote schema write — ONLY after owner approval

Do not run the following block until the owner has approved the specific target
and pending SQL set produced by the preceding read-only review:

```bash
pnpm exec supabase db push --linked --skip-vault
pnpm exec supabase migration list --linked
```

`--skip-vault` avoids implicit Vault-secret synchronization. No `--include-seed`,
`--include-roles`, destructive reset, application deployment or boundary import
is authorized by this plan. Record post-push history and smoke-test scoped access
on staging. Restore planning and rollback review must precede any production use.

## Boundary and legacy-grant reconciliation — separate approved data operation

Load the chosen licensed/versioned district catalogue with human approval records.
Review existing grants against the catalogue; do not invent geometry, insert
placeholder live districts or silently delete unmatched grants. A read-only count:

```sql
select count(*) as unmatched_grants
from public.profile_district_grants g
left join public.districts d on d.code = g.district_code
where d.id is null;
```

After approved reconciliation yields zero, add a follow-up migration containing:

```sql
alter table public.profile_district_grants
  validate constraint profile_district_grants_district_fkey;
```

Test and review that follow-up before requesting approval for its remote push.
No such data reconciliation or remote constraint-validation command has run here.

## Remaining manual configuration

- Supabase CLI login, staging target/link and database credentials.
- `.env.local` is already owner-configured, including server-only `APP_ORIGIN`.
  Verify its canonical origin against Supabase Auth Site URL/redirect allowlist,
  confirmation policy, SMTP and email templates. The public URL/key must match
  that same project. The owner intentionally omitted `.env.example`.
- Reviewed first-admin bootstrap with audit record, verified staff and area grants.
- Official West Kalimantan catalogue source/license/version and boundary approvals.
- Role/verification/evidence authority, NASA source/bbox/cadence/freshness policy,
  retention, backups and operational ownership. NASA/AI keys remain server-only;
  no ingestion or AI is enabled by these migrations.

Environment names used by the app/setup: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAP_STYLE_URL`,
`NEXT_PUBLIC_DEFAULT_TIMEZONE`, `APP_ORIGIN`, `SUPABASE_SECRET_KEY`,
`NASA_FIRMS_MAP_KEY`, `NASA_FIRMS_SOURCE`, `NASA_FIRMS_BBOX`,
`NASA_FIRMS_SYNC_TOKEN`, `AI_PROVIDER_API_KEY`, `AI_SUMMARIZATION_ENABLED`.
The NASA bbox and sync-token fields are currently empty and need approved values
before Phase 3. Existing app API keys do not establish a CLI management login.
