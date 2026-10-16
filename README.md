# FireOps

Wildfire hotspot monitoring and human incident coordination for West Kalimantan.
The functional MVP now includes the map/list dashboard, incident creation and
human verification, manual priorities, authorized assignments/progress, reports,
private evidence, timelines, notifications, teams, profiles and administrator-managed roles.
NASA ingestion is implemented server-side and disabled until configured.
The dashboard now keeps a West Kalimantan basemap visible for active accounts
without district grants, with a priority queue beside the map and a 2D fallback.
The [latest map/workflow implementation](docs/implementation/map-and-workflows.md)
documents the current hosted data/configuration gaps and optional report summaries.
For a missing-worker error or a map with no markers, use the
[LIVE map setup guide](docs/runbooks/live-map-setup.md). Worker assets are prepared
automatically by `pnpm dev`/`pnpm build`; `pnpm boundaries:prepare` downloads a
review-only BIG candidate for the 14 West Kalimantan districts without importing
or approving it. The map supports optional user-location/manual-coordinate
straight-line distances, including from outside Kalimantan.
Verified administrators can open `/admin/observations` and explicitly request
real NASA markers before catalogue setup. This source preview labels its request
rectangle and retrieval time; it creates no operational incidents or priorities.
If pages show “data tidak dapat dimuat”, run `pnpm db:check` to check columns and
read RPCs as well as tables. The diagnosed missing hosted migration 008 has a
[specific incremental upgrade guide](docs/runbooks/hosted-upgrade-008.md);
never rerun the initial installer on an existing schema.
Registration uses name/email/password with immediate viewer access; district
data requires administrator-assigned areas. See the
[registration setup and tests](docs/runbooks/direct-registration.md) for migration
007 and the required hosted Auth setting.
See [local MVP setup](docs/runbooks/mvp-local.md) and the
[deployment review](docs/runbooks/database-deployment.md). Official geography,
operational policy approval and remote rollout remain pending.

The [local completion and deployment package](docs/runbooks/release-package.md)
adds report-based incident creation, documented team-base distances, background
notifications, paginated observations, scoped district rendering and admin
health/audit screens. Standalone Node/Docker packaging and CI/manual scheduler
workflows are included; no hosted rollout or operational schedule is enabled.

Read `AGENTS.md`, `START-HERE.md`, `FIREOPS_MASTER_SPEC.md` and
`IMPLEMENTATION_CHECKLIST.md` before making changes. The source PDF referenced by
the spec is not present. Operational decisions remain open in
[the foundation ADR](docs/decisions/0001-foundation-scope.md).

Use Node 22, pnpm and Docker. Follow the
[local setup and test runbook](docs/runbooks/local-foundation.md), including the
isolated test server on port 3100. Do not overwrite an existing `.env.local` or
apply migrations to a hosted project without reviewing the target and obtaining
authorization. The owner-configured `.env.local` is the configuration source;
required variable names are documented in the deployment runbook.

Use **pnpm** for project dependencies and scripts; `package.json` pins pnpm
11.28.5. Keep `pnpm-lock.yaml` as the only dependency lockfile. Use `pnpm exec`
for installed tools and `pnpm dlx` for one-off tools. Earlier `npx` use does not
require uninstalling npm from your machine; avoid running `npm install` here.

```bash
pnpm install --frozen-lockfile
pnpm db:start
pnpm exec supabase migration up --local
pnpm lint
pnpm typecheck
pnpm test
pnpm db:test
pnpm test:e2e
```

Installed Codex guidance, including UI UX Pro Max, is recorded in
[skills provenance](docs/architecture/skills.md).

Satellite observations never constitute automatic fire confirmation. Ingestion runs server-side and must preserve source provenance and separate
observation/incident records. Operational verification requires an authorized
human and immutable reason/actor/time history.
