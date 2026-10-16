# Database audit and Phase 2 schema validation — 2026-10-16

No remote database changes were made. Local development data was preserved.
All migrations were also replayed in a separate disposable local database.
The owner-configured `.env.local` was used privately for read-only connection
checks; the owner's deletion of `.env.example` and unrelated workspace edits
were preserved.

## Inventory and connection

Reviewed AGENTS, starter guide, master spec, checklist, ADRs, prior validation,
the complete existing migration SQL, Auth helpers/actions/callback/proxy, tests,
generated types, CLI scripts, package versions and local Supabase config.
The UI currently implements authentication and a guarded placeholder dashboard;
there are no observation/incident queries, map, NASA job or verification workflow.

Supabase CLI **2.121.0** is installed and the local project is `fireops` on
Postgres 17. Initial catalog inspection showed only profiles, district grants
and access audit tables, all with RLS. Neither PostGIS nor the operational models
existed. Initial applied versions were **20261016000100** and **20261016000200**.

CLI account check returned missing access token; `migration list --linked`
returned `ProjectRefNotLinkedError`. No hosted link was created. The app's public
and server API keys are a different credential class from CLI management access.
Read-only hosted Auth settings returned **HTTP 200**. Read-only OpenAPI metadata
was available but listed none of the eight expected FireOps tables. No table
rows were requested. This does **not** establish the hosted migration history,
table absence or RLS state; those remain unverified until authenticated CLI/SQL review.

The owner configured `APP_ORIGIN` during the audit. NASA bbox/sync-token fields
remain empty. No environment values, passwords, keys or connection URLs were printed.

## Changes prepared in code and applied locally

- `20261016000300_geospatial_core.sql`: PostGIS in `extensions`, mode/status
  enums, districts, ingest runs, hotspot observations, incidents and join table.
- Indexed FKs and spatial/query indexes; generated geographic points; bounds,
  valid polygons, provenance, confidence unknowns and completion-time checks.
- Composite mode/parent/source relationships reject cross-mode links and
  mismatched ingest provenance. A trigger requires claimed district coverage.
- Invoker-secured point lookup returns all matches; shared-border ambiguity is
  explicit. Unmatched observations stay unassigned and hidden from ordinary staff.
- All five tables enable RLS with explicit least-privilege grants. Authenticated
  users have scoped reads only; service ingestion cannot access incidents or links.
- Verification remains `needs_more_information`, priority `unassessed`, and
  workflow `new` until later audited mutation/history migrations exist.
- Historical grant catalogue FK is intentionally `NOT VALID`. New grants enforce
  it immediately. Unmatched old grants fail closed, including the server access
  query's new inner join to the catalogue. Existing grant strings were not deleted.
- Regenerated `src/types/database.types.ts`; adapted existing access/browser
  fixtures to include explicitly synthetic catalogue geometry.
- Added `db:lint` and isolated `db:test:migrations` scripts, the Phase 2 ADR,
  deployment review/runbook, and updated progress documentation.

No original migration was rewritten. No official boundaries, operational live
rows or production administrators were created. Local PostGIS reports **3.3.7**.
The existing local DB now records **all three migration versions**. Local-only
dry-run push reports `upToDate: true` with an empty migration list.

## Verification

| Command | Result |
| --- | --- |
| `pnpm exec supabase migration list --local` | All three applied locally; this is not hosted history |
| `pnpm exec supabase migration up --local` | New migration 003 applied |
| `pnpm exec supabase gen types typescript --local > src/types/database.types.ts` | Generated from actual migrated schema; formatted with Biome |
| `pnpm db:test` | **263 assertions passed**, 2 SQL test files |
| `pnpm db:lint` | No schema errors in public/private; warning-level failure threshold |
| `pnpm db:test:migrations` | Clean replay of all migrations, all 263 assertions and DB lint passed; own containers/volumes removed |
| `pnpm lint` | Passed, 44 files |
| `pnpm typecheck` | Passed |
| `pnpm test` | **21 tests passed**, 2 files |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` | Production build and **6 browser tests passed** (final run: 29.3 seconds) |
| `pnpm exec supabase db push --local --dry-run --skip-vault` | Local database up to date; no migrations applied by the dry run |
| `git diff --check` | Passed |

SQL coverage includes anon/pending/viewer/field-officer/coordinator/admin users,
suspended/unconfirmed/anonymous/no-scope identities, actual-table RLS and FK
checks, area/mode separation, hidden cross-area links, ignored signup roles,
account approval/audit immutability, denied automation, null confidence, coordinate
order/bounds/NaN/null cases, duplicate observation keys/links, shared borders,
missing districts, wrong-source provenance, incomplete syncs, default locked
verification/priority/status, version increments and unmatched legacy grants.
All synthetic SQL fixtures (including simulated live-mode rows) roll back.
Browser fixtures are synthetic demo catalogue squares, never real boundary data.

Initial test attempts exposed a CLI fixture mount restriction and Playwright's
CommonJS transform of `import.meta`; fixture paths were corrected. Final results
above come from the corrected complete suites. A later workspace edit removed
the keyboard skip link; the owner requested restoring it, and it was restored
before final validation. No application UI style changed.
CLI telemetry writes needed sandbox escalation; command output was constrained
to prevent startup/status credentials being printed.

## What is still missing

The database slice is not a complete FireOps implementation. The official
catalogue import/license/approval and validation of legacy grants remain open.
No end-user mutation RPC, scoped feed-health query, map/list browsing, demo browse
dataset or scheduled ingest is present yet. Phase 3 must implement sensor-aware
dedupe, server-only authenticated sync, retries and freshness reporting.

Future required schemas are deliberately not fabricated ahead of their gates:
Phase 4 `reports`, `evidence_files`, private Storage, `verification_decisions`,
`incident_events` and broader operational audit; Phase 5 `priority_rulesets` and
`priority_assessments`; Phase 6 `teams`, `team_members`, `assignments` and incident
owner/team relationships; Phase 7 `notifications`. Their RLS and transactions
must be authored and tested alongside approved authority/workflow policies.

Complete **Phase 2** next: approved geography, catalogue reconciliation and
accessible map/list browsing with explicit modes. Prepare staging CLI access and
review the exact pending remote SQL set separately. See
[database deployment commands](../runbooks/database-deployment.md). Remote push
requires explicit approval of the target and reviewed pending migrations.
