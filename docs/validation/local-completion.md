# Local completion validation — 2026-10-16

Scope: local app and reviewable deployment package, as selected by the owner in
ADR 0004. This is not a production release or agency acceptance certificate.
Existing uncommitted work was preserved. Tests followed implementation.

## Implemented slice

- `20261016000800_operational_completion.sql`: additive team-base/provenance
  columns and revision counter, audited version-safe team editing, scoped paired
  assignment candidates, PostGIS straight-line distance, transactional
  report-origin incident creation, scoped district GeoJSON and dashboard totals,
  protected ingestion status, and notification/query indexes.
- Regenerated `src/types/database.types.ts`; regenerated the guarded initial
  installer from all eight canonical migrations. Earlier migrations preserved.
- `src/features/operations/assignment-picker.tsx`, `actions.ts` and incident/team
  pages: select only the chosen team's members; unavailable staff disabled;
  missing distance remains unavailable; base source/time and limitations shown.
  Server/database eligibility checks remain authoritative at save time.
- Incident creation from a human report preserves source and observation time
  without creating a satellite observation or a verification decision.
- `notification-indicator.tsx` and `api/notifications/route.ts`: recipient/RLS
  scoped, mode-separated snapshots; 30-second active-tab polling, offline pause,
  retry/backoff up to 120 seconds, authorization-revocation handling, no caching.
  Durable notifications remain available independently of a browser connection.
- Browse/map: status and view filters, 100-observation pagination, scoped district
  geometry, distinct incident/observation totals, region/period summary, data-mode
  banner above metrics, page-load timestamp separate from observation/sync time,
  sync age without inventing an approved stale threshold.
- Admin health/settings and paginated access/team audit pages; private config
  presence only, sanitized source-job metrics, no secret values in the UI.
- `Dockerfile`, `.dockerignore`, conditional standalone output, security headers,
  liveness endpoint, scrubbed error hook, CI and manual scheduler workflows,
  private scheduler runner, and deployment/recovery runbook.

## Commands and observed results

Runtime: Node v22.23.3, pnpm 11.28.5; Next.js 16.4.2, React 19.3.0,
`@supabase/ssr` 0.12.7 and Supabase JS 2.117.3 from the installed project.

| Command/check | Observed result |
| --- | --- |
| `pnpm exec supabase migration up --local` | Migration 008 applied to working local DB; no reset |
| `pnpm db:types` | Types regenerated and formatted from local schema |
| `pnpm db:prepare-hosted` | Eight-migration initial installer generated offline |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm typecheck:editor` | Passed, 66 source files and zero editor diagnostics |
| `pnpm test` | 40 tests passed in six files |
| `pnpm db:test` | 381 assertions passed in five transaction-scoped SQL files |
| `pnpm db:lint` | No schema errors/warnings |
| `pnpm db:test:migrations` | Clean eight-migration replay, 381 assertions and lint passed in isolated local project |
| `pnpm db:test:hosted-setup` | Initial installer, safe rerun rejection, migration history compatibility, 381 assertions and lint passed in isolated local project |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` | Final run: 10/10 Chromium tests passed; includes successful production `pnpm build` and local `pnpm start` |
| Standalone Node smoke on loopback port 3200 | Process health, login HTML and CSS asset passed; server stopped afterward |
| Scheduler runner with synthetic origin/token and `--check` | Configuration validated without a network request |
| Exact configured-private-value scan of source/public/browser assets | Passed; 106 files checked, no credential values printed |
| `git diff --check` | Passed |
| Migration SHA256 manifests | Prior seven migration hashes preserved; all eight completion hashes verified |

The first browser run exposed broad selectors matching both the new notification
status and form status, and a hidden route retained by Next.js. Selectors were
scoped to the active main/table. A repeat exposed an audit assertion matching a
previous synthetic run; its reason now includes the unique fixture identifier.
The final suite passed after these corrections and the final banner adjustment.

The Dockerfile and hosted CI/scheduler definitions are supplied and reviewed;
no Docker image build, registry push, hosted workflow execution or deployment
was performed. The standalone output itself was exercised locally.

Final local preview: `pnpm dev:local` correctly refused to start a second Next.js
development server in the same workspace (an existing server was using port
3000). That server was preserved. The validated production build was then started
with `localAppEnvironment()` and `pnpm start --hostname 127.0.0.1 --port 3100`;
`GET /api/health` and `GET /login` both returned HTTP 200. The local production
preview remains running at http://127.0.0.1:3100 using loopback Supabase.

## Security, scientific meaning and provenance

`completion.test.sql` adds 56 assertions to the previous 325. Coverage includes
anonymous, pending, viewer, field officer, coordinator, administrator,
out-of-area, suspended and unconfirmed accounts; attempted identity/decision
injection; cross-mode denial; required report source/time; invalid/out-of-area
coordinates; version-safe audited team editing; missing versus computed distance;
inactive team denial; summary/geography isolation; and automation RPC denial.
Existing tests continue to cover human verification, immutable history, private
Storage and signed evidence, stale versions, ingestion dedupe and source semantics.

All new SQL fixture identities, squares, report text and simulated observations
are synthetic and roll back. Browser fixtures use loopback services and
`@example.test` identities; they persist explicitly synthetic DEMO records so
the workflow can be inspected. No NASA requests or real boundary imports occurred.

Ingestion cannot invoke human verification or report-creation RPCs. No formula or
risk layer was approved; recommendations remain `unassessed`. Demo/live are
isolated in queries, storage paths, foreign keys, notifications and UI labels.
Private evidence uses scoped access and short-lived signed downloads. No external
AI provider receives reports. Environment files were not overwritten.

## Visual/manual review

Browser artifacts (ignored by git):

- `test-results/completion-dashboard-desktop.png`: reviewed for readable filters,
  distinct data counts, status text and accessible table/list structure. The final
  browser test also asserts the DEMO banner precedes the summary.
- `test-results/completion-audit-mobile.png`: reviewed at 375×812 with reduced
  motion; text and UUIDs wrap without document overflow. Mobile navigation scrolls
  horizontally; all primary routes remain available.

Browser checks include report creation, documented base editing and kilometer
display, coordinator → officer progress, private evidence download, mode filters,
role/area changes and revocation, registration, recovery, admin health/audit, mobile
overflow and denied private endpoints. This is a focused accessibility check,
not a complete WCAG audit or load/race test.

## Remaining operational gates

Approved official boundaries/license and historical grant reconciliation; agency
identity/authority policy; source/bbox/cadence/freshness approval and real NASA
staging/outage tests; operational alert policy; retention/scanning/EXIF decisions;
backup/restore exercise, realistic load and concurrency tests, full accessibility
audit, coordinator/officer UAT, hosting/domain/secrets and support ownership.
Priority scoring and risk zones remain deliberately unavailable until approval.

Reproduce setup/deployment using [release-package.md](../runbooks/release-package.md).
