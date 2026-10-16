# Local completion and deployment package

This package targets a local runnable app first. The owner explicitly chose to
keep recommendations `unassessed` and risk zones unavailable until approval.
No hosted migration, deployment, NASA request or paid service is performed by
building or testing this package. Optional report summarization is implemented
with local excerpts and a configurable AI provider; external AI remains disabled
in the current environment. See [the map/workflow revision](../implementation/map-and-workflows.md).

## Local operation

Use Node 22, the pinned pnpm version and Docker:

```sh
pnpm install --frozen-lockfile
pnpm db:start
pnpm exec supabase migration up --local
pnpm db:types
# Supply FIREOPS_DEMO_PASSWORD securely in your shell, minimum 16 characters.
pnpm demo:setup
pnpm dev:local
```

Open http://localhost:3100 and use the synthetic accounts described in
[mvp-local.md](mvp-local.md). `dev:local` obtains only loopback Supabase
configuration; it does not replace `.env.local`. Registration returns a viewer
session; an administrator must explicitly grant a district before operational
data is available. Existing pending/suspended accounts remain restricted.

Coordinator walkthrough:

1. Open a DEMO observation and create an incident, or select **Buat insiden dari
   laporan lapangan** and enter coordinates inside the selected demo area.
2. Read provenance and evidence; record a human verification with a reason.
3. Inspect the unapproved recommendation; optionally record justified manual
   priority. No scoring formula is silently activated.
4. Select a team, then one of that team's available authorized officers. The
   database validates membership, authority, geography and concurrency again.
5. Add reports/evidence; sign in as the assigned officer to progress the case.
6. Inspect immutable history and mode-separated notifications. With an active
   tab, notification counts update every 30 seconds. Offline clients retain the
   durable list; failures retry with backoff up to two minutes.

Administrators can edit team name, mandate, active state and an optional base
location with source/time/reason. Distance uses PostGIS geography in kilometers
from that recorded base, not a live officer location or a road-route estimate.
Missing locations remain unavailable. Inactive teams cannot receive new work;
deactivation deliberately preserves existing assignments and history.

`/admin/settings` shows configuration presence, scoped boundary provenance and
recent ingestion metrics without key values or upstream error bodies.
`/admin/audit` provides paginated immutable account/team history.

## Database delivery

Apply all canonical migrations in order. Migration 008 adds nullable team bases,
version-safe audited team editing, paired assignment candidates, report-based
creation and RLS-preserving summary/geography functions. No existing records are
deleted and no real users, boundaries, live observations or approved rules are
seeded. Types must be regenerated after migrations.

For a new hosted database, `pnpm db:prepare-hosted` generates
`supabase/setup/initial-schema.sql` offline. For an existing installation use
reviewed incremental migrations, never the initial installer or a database reset.
Review the actual target and backup before any hosted write. Follow
[database-deployment.md](database-deployment.md) and
[direct-registration.md](direct-registration.md) for Auth and admin bootstrap.

An approved boundary import must supply real district identifiers, WGS84 valid
MultiPolygons, source, source URL, license, version, approver and approval time.
No download or implicit boundary import occurs. The map renders only the scoped
catalogue; synthetic DEMO rectangles have explicit provenance and a mode banner.
After import, reconcile historical grants before validating the pending FK.

## Node deployment

Build with public Supabase URL/publishable key and the approved map style URL in
the build environment. `NEXT_PUBLIC_*` values are embedded in browser assets;
they must match the runtime project. Never build with a secret/service-role key
in a public variable. Configure `APP_ORIGIN` and exact Auth callback/reset URLs
for the destination. Reverse proxies must preserve the public host for Server
Action origin checks. Terminate HTTPS at the hosting provider/reverse proxy.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start --hostname 0.0.0.0 --port 3000
```

For a minimal standalone deployment, build with `FIREOPS_STANDALONE=true pnpm build`, then copy `.next/standalone`, `.next/static` into
its `.next/static` directory and `public` alongside `server.js`, then run
`node server.js`. The supplied Dockerfile automates this layout and runs as the
unprivileged `node` user. `.dockerignore` excludes local environment/secrets,
credentials, source control metadata and local tool state. Inject runtime
secrets through the host's secret store, never image layers or build arguments.

```sh
docker build -t fireops:review \
  --build-arg NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --build-arg NEXT_PUBLIC_MAP_STYLE_URL .
# Supply the three PUBLIC variables above via your shell; review destination first.
# Start via your approved orchestrator, passing private runtime values as secrets.
```

No container build, registry upload or deployment is implied by these examples.
`GET /api/health` checks process liveness only; it intentionally reveals no
configuration and does not claim NASA/database readiness. Authenticated system
health and a staged walkthrough are needed to verify readiness.

## Trusted scheduler

Configure the app server with `SUPABASE_SECRET_KEY`, `NASA_FIRMS_MAP_KEY`,
`NASA_FIRMS_SOURCE`, approved `NASA_FIRMS_BBOX` and a random
`NASA_FIRMS_SYNC_TOKEN` of at least 32 characters. Choose one supported source
deliberately. The endpoint uses two UTC dates with a database cooldown; approve
cadence, upstream quotas and freshness wording before scheduling.

The scheduler needs only `FIREOPS_APP_URL` (a bare HTTPS origin) and the same
private `NASA_FIRMS_SYNC_TOKEN`. It never needs the NASA or database secret.

```sh
node scripts/sync-firms.mjs --check  # configuration shape only; no network
node scripts/sync-firms.mjs          # explicitly requests real ingestion
```

The runner refuses redirects, bounds request time, reports non-success without
printing the URL/token/body and treats overlap/cooldown as skipped work. Wire it
to the approved scheduler at the approved interval. GitHub's manual workflow is
provided with an `operations` environment, `FIREOPS_APP_URL` variable and a
protected `NASA_FIRMS_SYNC_TOKEN` secret; no periodic workflow is enabled.
Configure environment reviewers before using it against live operations.

## Monitoring and recovery

Capture structured `fireops_request_error` events from server stderr. The custom
hook omits request URLs, bodies, cookies, identities and exception text. The host
must separately redact default platform/access logs and restrict log access;
NASA keys are embedded in upstream URL paths and must never be logged.

Alert on failed/unfinished ingestion using the protected health screen/job exit
status and an operator-approved threshold. A successful process health check is
not a successful NASA sync. Preserve last known observations during outages;
review unmatched geography counts. A job left running is failed by the next
begin attempt after the existing ten-minute worker timeout.

Before hosted rollout: back up schema/data/private Storage, exercise restoration
on an isolated staging project, record recovery time, verify Auth configuration,
re-run RLS/Storage checks, and complete coordinator/officer acceptance. Deploy
schema before code needing it. On application failure roll back the application
image while retaining additive migrations and history; do not erase incidents
or audit data. Retention, on-call ownership and evidence scanning/EXIF policy
remain deployment-owner decisions.

## Release limits

This is a local application and reviewable deployment package. Operational
readiness still requires approved boundaries/identity authority, NASA settings,
real source/outage checks, tile license/quota review, backups/restore evidence,
load testing and human acceptance. An unapproved priority/risk policy is an
explicit unavailable capability, not an engineering default to invent.
GitHub workflows are supplied but not executed on a hosted runner in this session.
