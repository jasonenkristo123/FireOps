# FireOps

Wildfire hotspot monitoring and human incident coordination for West Kalimantan.
Phase 1 implements authentication and access control only. No live NASA data,
operational incidents, approved risk zones or deployment are included yet.

Read `AGENTS.md`, `START-HERE.md`, `FIREOPS_MASTER_SPEC.md` and
`IMPLEMENTATION_CHECKLIST.md` before making changes. The source PDF referenced by
the spec is not present. Operational decisions remain open in
[the foundation ADR](docs/decisions/0001-foundation-scope.md).

Use Node 22, pnpm and Docker. Follow the
[local setup and test runbook](docs/runbooks/local-foundation.md), including the
isolated test server on port 3100. Do not overwrite an existing `.env.local` or
apply migrations to a hosted project without reviewing the target and obtaining
authorization. `.env.example` contains variable names and placeholders only.

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

Satellite observations never constitute automatic fire confirmation. Future
ingestion must run server-side and preserve source provenance and separate
observation/incident records. Operational verification requires an authorized
human and immutable reason/actor/time history.
