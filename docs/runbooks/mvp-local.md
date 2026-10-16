# Run the FireOps MVP locally

Requires Node 22, pnpm and Docker. No hosted deployment or migration is authorized by these commands.

```bash
pnpm install --frozen-lockfile
pnpm db:start
pnpm exec supabase migration up --local
pnpm db:types
# Set FIREOPS_DEMO_PASSWORD securely in your shell (16+ characters), then:
pnpm demo:setup
pnpm dev:local
```

Open http://localhost:3100. Synthetic accounts are `demo-admin@example.test`,
`demo-coordinator@example.test`, `demo-field_officer@example.test`, and
`demo-viewer@example.test`, using your supplied password. The setup script refuses
non-loopback services, never reads `.env.local`, and only creates explicitly
synthetic DEMO observations, a training rectangle, staff and team. Run it again to
set a new local password. It never seeds a production administrator or LIVE data.

Login as coordinator, choose DEMO, open an observation, create an incident, record
a justified verification, set manual priority, assign the available demo officer,
and add reports/evidence. Login as field officer to update the assigned case.
The timeline retains all events with pagination; notification state persists.
Admin can approve accounts and manage team membership. Normal `pnpm dev` uses
owner-configured `.env.local`; `dev:local` uses loopback services in memory.

```bash
pnpm lint       # Existing Biome, intentionally preserved; no ESLint installation
pnpm typecheck
pnpm test
pnpm build
pnpm db:test
pnpm db:lint
pnpm db:test:migrations
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e
```

## Hosted configuration and pending approval

New migrations **004 through 008** must be reviewed alongside 001–003 against the
actual staging migration history. No remote database changes have been performed.
See [deployment review](database-deployment.md). Use the existing public Supabase
URL/publishable key, `APP_ORIGIN`, and the configured `NEXT_PUBLIC_MAP_STYLE_URL`.
Without a map style, the app uses attributed OpenStreetMap raster tiles; production
must review provider usage/quotas. Tables and RPCs enforce active verified identity,
role and district grants. Service ingestion cannot call human workflow RPCs.

Live ingestion needs server-only `NASA_FIRMS_MAP_KEY`, `NASA_FIRMS_SOURCE` (one of
VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT, MODIS_NRT), an explicitly
approved `NASA_FIRMS_BBOX` in west,south,east,north order,
`NASA_FIRMS_SYNC_TOKEN` (32+ characters), and `SUPABASE_SECRET_KEY`. Configure a
trusted scheduler to **POST /api/ingest** with `Authorization: Bearer <sync token>`.
No scheduler is deployed locally or remotely. GET is unsupported. The endpoint
queries two UTC dates, bounds payload size and time, retries upstream 429/5xx once,
uses database overlap/cooldown protection, validates source confidence semantics,
upserts observations and records sanitized failures. It never creates incidents.
Approved polygons resolve districts; ambiguous/unmatched observations stay hidden
from ordinary users. Review those records with an approved operator process.
Missing settings return 503 and leave DEMO working. Never put tokens in URLs/logs.
API conventions follow [NASA's Area API](https://firms.modaps.eosdis.nasa.gov/api/area/).

## Limits and release gates

- Official geography, red/yellow aggregation and priority/freshness policies still
  require agency approval. No official boundaries or risk zones are fabricated.
  Automatic recommendation always remains `unassessed`; structured manual factors,
  justification, actor and history are retained separately.
- Map and accessible list: 100 paginated observations and 25 paginated incidents. Counts distinguish raw observations from managed cases.
  Status/priority observation filters match only linked incidents.
- One active PIC per incident, restricted to an available, verified active field
  officer in an authorized same-district team. Optional documented team bases provide approximate straight-line distance;
  no personal/live officer locations are collected.
- Evidence: private JPEG/PNG/WebP/PDF, file-signature checks on server, 750 KB per
  form upload; random paths, immutable metadata, 60-second authorized download.
  EXIF stripping/malware scanning and retention require deployment policy.
- Notification counts poll every 30 seconds in active online tabs with bounded
  retry/backoff; the notification list refreshes when counts or latest IDs change. Demo
  notifications are explicitly isolated by mode. Profile and team/account lists
  are bounded; large-scale staff administration is a later enhancement.
- Evidence/decision/report sections show newest 50 rows; the immutable activity
  timeline is paginated by 100. Historic records remain in PostgreSQL.
- No AI, paid services, remote migration or deployment was executed. Operational
  release still requires authority review, backups, staging/live ingestion UAT,
  accessibility/load review and support ownership.

See [the completion and deployment package](release-package.md) for report-based
creation, admin health/audit, district rendering, standalone/Docker deployment and
the private scheduler runner. No operational scheduler is enabled automatically.
