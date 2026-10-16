# FireOps — Implementation Checklist

> The AI agent must implement phases sequentially and never mark work complete without evidence.  
> Legend: `[ ]` pending; `[x]` completed and verified with test evidence.  
> Current state (2026-10-16): Connected MVP workflow verified locally: dashboard/map, incidents, human verification, manual priorities, assignments/progress, evidence, timeline, notifications, profiles and admin access. Migrations 001–008 applied locally only; current completion evidence: `docs/validation/local-completion.md`. Official geography, operational rules, NASA configuration and staging/remote rollout remain open. Evidence: `docs/validation/mvp.md`.

## Phase 0 — Inspect and agree on domain (human + engineer)

- [x] Inspect current repository / confirm greenfield setup, agent type, Node and pnpm versions.
- [ ] Read source PDF and master spec; capture deviations as ADRs.
- [x] Confirm owner registration policy: name/email/password, direct sign-in, viewer by default; admin manages role and districts (ADR 0003).
- [ ] Confirm official boundary and district data source/license for West Kalimantan.
- [ ] Agree data scope (FIRMS sources, date window, cadence, freshness thresholds) and request private MAP_KEY.
- [ ] Define who can verify, override priority, assign and access evidence.
- [x] Explicitly defer red/yellow zone layer until agency-approved aggregation rules exist (ADR 0001).
- [x] Explicitly keep priority `unassessed` until approved inputs/thresholds exist (ADR 0001).
- [ ] Confirm deployment provider, domain, secrets ownership, retention and operational support.

**Gate:** Unresolved safety-critical decisions remain marked OPEN and cannot be replaced by invented defaults.

## Phase 1 — Foundation, authentication and access control

- [x] Preserve Next.js App Router + TypeScript + Tailwind + `src/`; include pnpm lockfile. Existing Biome retained instead of ESLint (ADR 0001); changes are uncommitted for review.
- [x] Install dependency groups from §6 of master spec and verify runtime package imports.
- [x] Install project-local Supabase/React/web design skills and UI UX Pro Max for Codex; inspect installed files.
- [x] Initialize scoped shadcn/ui components, icons and design tokens; validate responsive layout.
- [x] Supabase CLI local project and gitignore secrets. Existing `.env.local` is the configuration source; owner chose to omit `.env.example`.
- [x] Add cookie-aware Supabase browser/server helpers and Next.js session proxy.
- [x] Add schema migrations for `profiles` and strict role assignment/approval (no real admin bootstrap).
- [x] Add RLS grant/policy integration tests with separate roles (92 pgTAP assertions).
- [x] Build `/login`, `/register`, recovery and guarded layout.
- [x] Verify `pnpm lint`, `pnpm typecheck`, `pnpm build`, unit tests and six initial auth e2e tests.

**Gate:** No unapproved user can see incident data or grant themselves privileged roles.

## Phase 2 — Database, geodata and demo browsing

- [x] Install PostGIS in `extensions` schema (3.3.7 locally); add scoped geospatial lookup and indexes.
- [ ] Import approved official district polygons with documented source, license and version.
- [x] Migrate `districts`, `hotspot_observations`, `incidents`, join table and `ingest_runs` with constraints, indexes and RLS.
- [x] Generate typed Supabase definitions from local migrations.
- [ ] Reconcile historical district-grant strings with approved catalogue and validate `profile_district_grants_district_fkey`; new grants already enforce the FK and unmatched legacy grants fail closed.
- [x] Add clearly labeled `demo` fixtures; isolate from live query counts.
- [x] Build map with MapLibre client-only and licensed/attributed basemap.
- [x] Hotspot clusters, marker details and legend; browser-accessible map/list alternatives.
- [ ] Validate district polygon rendering/click against approved live geometry. Scoped catalogue rendering and source labels are implemented locally; the live boundary import remains open.
- [x] URL-persistent district/time/source/mode/verification/priority/search/sort/page filters; region fixed to West Kalimantan.
- [x] Build accessible paginated list alternative and incident list.
- [x] Test geospatial lookup, shared-border ambiguity, invalid coordinates and real-table RLS with synthetic transaction-scoped fixtures (263 total SQL assertions).

**Gate:** Dashboard correctly differentiates hotspots, incidents, demo, live and stale states. No fabricated risk polygons.

## Phase 3 — Trusted NASA FIRMS ingestion

- [ ] Select/validate source and approved bbox; obtain NASA MAP_KEY as server-only secret.
- [x] Implement source-specific CSV parser, schema/field/coordinates validation and date normalization.
- [x] Implement sensor-aware deterministic dedupe and idempotent upsert.
- [x] Implement private POST job endpoint with token authentication, bounded timeout/payload, upstream retry/backoff, database cooldown and overlap protection.
- [ ] Deploy/configure an approved scheduler; no remote scheduler was created.
- [x] Add `ingest_runs`, health/status UI and `last_observation_at` vs `last_successful_sync_at`.
- [x] Test empty response, schema drift, invalid acquisition dates/times, confidence semantics, bbox, private-job denial, overlap, rerun dedupe and source correction with synthetic fixtures.
- [ ] Exercise real NASA quotas/outage/recovery on approved staging; upstream network behavior not yet integration-tested.
- [x] Restrict ingestion inserts to private trusted identity; test against regular user.
- [ ] Run controlled staging ingest, audit source attribution and district boundaries.

**Gate:** Every live point has real provenance and observation time; a failed sync never becomes fake success.

## Phase 4 — Incident detail, reports and verification

- [x] Add reports, evidence metadata, private bucket and signed scoped URLs.
- [x] Build creation/linking incident from observations, preserving raw source records.
- [x] Add detail Overview/Verification/Reports/Timeline sections.
- [x] Add append-only verification decisions and actor/reason/timestamp audit event.
- [x] Enforce decision role + area grants in database and server operation.
- [x] Add row-version conflict check and verification correction/supersession pathway.
- [x] Test all three decisions, missing reason, unauthorized writes, and evidence access.

**Gate:** No automation/LLM can confirm fire; every decision is traceable and reversible only by an authorized, audited process.

## Phase 5 — Priority engine and board

- [ ] Approve deterministic prioritization thresholds; publish versioned ruleset.
- [x] Implement unit-tested conservative recommendation function: always unassessed until rules are approved; report missing factors and uncertainty.
- [ ] Implement active scoring after approved versioned rules are supplied.
- [x] Persist manually reported severity, urgency, evidence strength, freshness and override justification; show missing-factor explanation. No fabricated numeric scores.
- [x] Implement priority board and detail breakdown.
- [x] Add authorized human override with reason/actor/time.
- [x] Test missing/stale/strong inputs remain unassessed, unapproved rules version, justified overrides and stale-version rejection.
- [ ] Approved scoring/sensor disagreement scenarios await policy.
- [x] If risk zones approved, add geospatial rollup calculation + scientific/operational review; otherwise show unavailable message.

**Gate:** Formula and inputs explain recommendation. Missing critical data does not silently become low priority.

## Phase 6 — Teams, assignment and tracking

- [x] Migrate teams, team_members, assignments and incident event log.
- [x] Enforce team authority, assigned coverage, area scope and active staff membership.
- [x] Calculate approximate/provenance-labeled straight-line distance via PostGIS from a documented team base; missing bases remain unknown. Eligibility still requires authority, coverage, membership and availability (migration 008; SQL/component/browser evidence).
- [x] Build assignment picker, reassignment reason, current owner and assigned queue.
- [x] Add controlled status state machine and field progress notes.
- [x] Display immutable chronological timeline.
- [x] Test non-member assignment denial, area/role restrictions, single active assignment, stale incident version and unauthorized progress.
- [ ] Dedicated concurrent race/reassignment load tests remain pending.

**Gate:** Field officer updates only authorized assignments; coordinator sees current status and full ownership history.

## Phase 7 — Notifications and optional AI summary

- [x] Implement durable notifications and RLS recipient-only read/read_at.
- [x] Deduplicate assignment/update notifications per recipient/event; notify new/previous owner and scoped coordinators.
- [ ] High-priority alert policy and dedupe across repeated assessments await approval.
- [x] Background recipient-scoped polling every 30 seconds in active online tabs, with offline pause, bounded retry/backoff, revocation handling and mode-separated counts. Durable notifications remain the source of truth.
- [ ] Complete operational delivery-latency/load tests; recipient isolation and dedupe are covered by SQL, and snapshot changes, offline recovery, backoff and revocation by component tests.
- [ ] Optional: secure summarizer with Zod output, model/source attribution and AI-off fallback.
- [ ] Prove AI cannot mutate verification, override priority, assign or read unauthorized reports.

**Gate:** Notifications are meaningful, scoped and durable; AI is advisory and optional.

## Phase 8 — Hardening, performance and deployment

- [ ] Accessibility audit: keyboard map alternative, contrast, status non-color, dialogs, responsive zoom and Indonesian UX.
- [x] Automated local RLS matrix + private Storage tests across roles/areas/modes (381 SQL assertions and signed-evidence browser workflow); hosted staging remains a separate gate.
- [ ] Abuse/security review: SSR auth, CSRF/origin, secrets, server-only functions, upload MIME/size, input validation, prompt injection isolation.
- [ ] Load and performance: paginated observations, spatial indexes, EXPLAIN, map clustering, stale feed behavior.
- [ ] Error monitoring, ingestion health alerts, log scrubbing, audit retention, backup/restore exercise.
- [ ] Stage deployment with hosted Supabase secrets, tile provider license/quotas, cron configuration and provenance.
- [ ] Conduct user acceptance walkthrough with coordinator/field officer.
- [ ] Review operational risk caveats; release only when signed-off by project owner.

**Gate:** Realistic demo + staging live-data check + documented runbook and human signoff.

## Definition of done — for EVERY item

- Evidence recorded: source files changed; exact commands executed; test outcomes and failing/blocking issues; screenshots/manual verification if UI; migration/RLS notes if database.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass, plus relevant e2e/integration tests where configured.
- No new secret leaks, no demo/live mixing, no hidden change to safety semantics, no unapproved production action.
- Checklist only updated to `[x]` after proof.

## MVP completion evidence — 2026-10-16

- [x] All primary app routes connected; role-aware navigation, profile editing, admin account approvals and team/member management implemented.
- [x] Local-only `demo:setup` and `dev:local` scripts; synthetic training rectangle/observations and explicitly scoped @example.test accounts.
- [x] Final `pnpm lint`, `pnpm typecheck`, `pnpm test` (31), production build (including browser suite), `pnpm db:test` (312) and `pnpm db:lint` pass. Existing Biome preserved; ESLint intentionally not installed.
- [x] Clean six-migration replay plus then-current 301 SQL assertions and schema lint pass in an isolated local database. Additional Storage/correction tests bring the main local suite to 312.
- [x] Eight Chromium e2e tests pass: authentication/recovery/revocation, coordinator→officer workflow, signed evidence download, filters, notifications, mobile overflow and denied external endpoints.
- [x] Exact private-key scan of source and generated browser JavaScript passes without printing values. No hosted writes, NASA calls, paid services or deployments.

Remaining release gates: approved boundaries/authority/priority/risk/freshness policy, staging credentials/migration approval, NASA live test and scheduler activation, operational notification latency, full accessibility/load/UAT and operations readiness. Setup/limits: `docs/runbooks/mvp-local.md`.

## Editor and hosted integration follow-up

- [x] Reproduce Next.js editor-only TS71008 on four Auth metadata exports; explicitly type them as `Metadata`.
- [x] Add workspace TypeScript SDK settings and `pnpm typecheck:editor`; all 55 source files report zero editor diagnostics.
- [x] Check the actual `.env.local` project read-only: Auth reachable, all 17 expected FireOps tables missing from its exposed API schema. No hosted schema write performed.
- [x] Prepare transactional `supabase/setup/initial-schema.sql` from the six canonical migrations; no demo/admin seed, abort on existing schema, CLI-compatible history.
- [x] Validate initial setup, refused rerun, migration history, all 312 SQL assertions and schema lint on a fresh disposable local database.
- [ ] Apply the reviewed setup to hosted Supabase after owner approval and database-admin access; app API keys cannot execute DDL.

## Direct registration follow-up — 2026-10-16

- [x] Owner approved viewer-by-default registration without an email confirmation step; documented ADR 0003.
- [x] Added bounded name input and server validation, metadata allowlist and database name persistence in migration 007; previous migrations preserved.
- [x] Active viewers without districts enter a welcome dashboard and can edit their profile; RLS and operational guards still require explicit area grants.
- [x] Clean seven-migration local replay, all 325 SQL assertions and database lint pass.
- [x] Lint, TypeScript and 35 unit tests pass for registration, validation and trust boundaries.
- [ ] Hosted rollout: review/apply incremental migration 007 and disable Confirm Email in the correct Supabase Auth project. No remote change executed.

Deployment and acceptance steps: `docs/runbooks/direct-registration.md`. Existing pending/suspended accounts are preserved and require deliberate administrator action.


## Local completion and deployment package — 2026-10-16

Owner-selected scope: complete the local app and deployment package; keep
recommendations `unassessed` and risk zones unavailable until approval (ADR 0004).

- [x] Add coordinator/admin incident creation from a sourced field report without fabricating NASA observations or human verification.
- [x] Pair assignment options by selected team; show documented approximate team-base distance and availability timestamps; recheck eligibility atomically in the database.
- [x] Add audited, version-safe team name/mandate/active/base editing; preserve existing assignments/history when deactivating a team.
- [x] Add protected mode-separated notification snapshots, background refresh and 50-row notification pagination.
- [x] Add status/view filters, 100-row observation pagination, scoped district GeoJSON support, separate regional totals and precise page/observation/sync timestamps.
- [x] Add admin health/configuration-presence and paginated immutable access/team audit screens.
- [x] Add security headers, public liveness-only endpoint and request-error logging that omits sensitive request/error content.
- [x] Prepare Node/standalone/Docker delivery, CI and manual private scheduler definitions; smoke-test the standalone output locally. No hosted workflow or Docker image build claimed.
- [x] Preserve prior migrations; apply additive migration 008 locally, regenerate types and initial installer, and verify clean migration/installer replays with all 381 SQL assertions.
- [x] Final lint and TypeScript pass; 40 unit/component tests and 10 Chromium end-to-end tests pass, including a production build and mobile/reduced-motion checks.
- [x] Review desktop/mobile artifacts and exact configured-secret scan without printing private values.

Evidence: `docs/validation/local-completion.md`. Run/deploy instructions:
`docs/runbooks/release-package.md`. Source PDF is still absent. Agency geography,
policy, live NASA validation, external deployment, restore/load/accessibility
audits and human operational signoff remain explicitly open.


## Map and workflow follow-up — feature implementation first

Owner requested feature work without running test cases or Playwright at this
step. The changes below are implemented and typechecked, but remain unchecked
pending the deferred acceptance/regression pass. Previous test evidence describes
previous revisions, not this UI revision.

- [ ] Accept the new map-first dashboard: basemap for unscoped active accounts, side priority queue, primary filters and separate freshness timestamps. Implementation present.
- [ ] Accept the non-WebGL 2D map fallback, sourced district clicks, marker details and pan/zoom controls. Implementation present.
- [ ] Accept the five-column priority board with rationale and history links. Implementation present; approved automatic scoring remains unavailable.
- [ ] Accept local report recaps, source-linked optional AI summaries and private image previews. Implementation present; external AI remains disabled by current configuration.
- [ ] Validate reported field conditions in immutable priority event history. Implementation present.

Current hosted inspection: Auth reachable and 17 tables present, but no district
geometry or observations in either mode. NASA bbox and scheduler token are empty.
The current AI-enabled flag is false. No environment edits, hosted writes,
imports, NASA requests, AI requests or privilege changes were made.

Details: `docs/implementation/map-and-workflows.md`. Format/TypeScript checks
passed; test suites and Playwright were intentionally not run.


## Hosted schema mismatch diagnosis — 2026-10-16

- [x] Read-only reproduction: hosted tables and migration-006 revision column exist, but five read-capability checks for 008 fail (`42703` / `PGRST202`). Table existence alone was insufficient.
- [x] Extend `pnpm db:check` to inspect required columns and read-only RPCs; it correctly exited nonzero for the incomplete hosted schema at diagnosis, and passes after the owner-applied upgrade. No mutation RPC is probed.
- [x] Prepare guarded transactional `supabase/setup/upgrade-008.sql` offline from canonical migration 008, with prerequisite/rerun/history guards and CLI migration history. No hosted execution claimed.
- [x] Owner reports applying upgrade 008; subsequent `pnpm db:check` passes all 17 tables and required read RPC/column probes. No hosted migration was executed by the agent.
- [ ] Accept the new partial-availability handling for lists/statistics/maps, legacy assignment reads, team settings and admin health. Implementation preserves RLS and transactional mutation checks; browser regression remains deferred as requested.

Exact diagnosis and owner steps: `docs/runbooks/hosted-upgrade-008.md`. No reset,
hosted write, data import, role change, NASA/AI call, test suite or Playwright run
was performed in this fix.

## Worker and LIVE map setup follow-up — 2026-10-16

- [x] Diagnose MapLibre 6 worker URL resolution from installed source; serve the exact installed worker from a versioned same-origin public path. `pnpm map:prepare` and HTTP verification pass: 200, JavaScript MIME, matching SHA-256.
- [x] Find and download an official BIG candidate for 14 Kalbar districts with structural validation, source metadata, timestamp and hash. `pnpm boundaries:prepare` succeeds. License, topology and agency review remain open; no import or LIVE approval implied.
- [ ] Accept worker rendering and immediate worker-error 2D fallback in supported browsers. Implementation compiles; browser checks deferred by owner.
- [ ] Accept optional browser/manual user-location distances in map popups and the loaded-point table, including an origin outside Kalbar. Implementation uses client-only straight-line calculation; browser checks deferred by owner.
- [ ] Complete LIVE activation: review/import real geography, grant account districts, approve bbox, configure missing scheduler token, and authorize/validate a first real NASA sync. Current database has no districts, observations or ingest runs; no NASA API failure has been demonstrated.

Evidence and owner instructions: `docs/runbooks/live-map-setup.md`. The existing
environment and hosted data were preserved. Priority recommendations and risk
zones retain their previously approved deferred behavior.

## NASA source diagnosis and marker priorities — 2026-10-16

- [x] Execute one bounded read-only NASA request for the BIG-derived candidate extent: HTTP 200, 1,238 parsed observations in the two-date window. Rectangle includes surrounding areas; no confirmed-fire or district count is claimed.
- [x] Prepare offline approval-gated `review.sql`/`import.sql` packages and a fill-empty-only local NASA env helper. Default `pnpm live:configure` is read-only; no hosted import, approval or env edit was performed.
- [x] Run actual-source geometry preflight on local temporary PostGIS tables with rollback: 14 valid nonempty MultiPolygons, no interior overlaps. Source license/agency approval remain open.
- [ ] Accept verified-admin `/admin/observations`: manual cached server retrieval, actual NASA markers/metadata, no operational database writes, no implied district authority. Implementation compiles; browser acceptance remains deferred.
- [ ] Accept linked-observation manual-priority projection and consistent five-priority marker colors in both renderers. No automatic scoring is introduced; browser acceptance remains deferred.

Scope: `docs/decisions/0005-nasa-source-preview.md`. Current API requests work,
but hosted operational catalogue/observations/jobs remain empty. Owner reports
admin access works and has configured the private sync token; server BBOX remains
empty. Setup remains documented in `docs/runbooks/live-map-setup.md`.

## User-location marker and selected-point connection — 2026-10-16

- [ ] Accept blue browser/manual origin marker, selected-point connecting line, kilometre distance in popup/panel and automatic viewport fitting on MapLibre and 2D fallback. Implementation present; browser acceptance deferred by owner.
- [ ] Accept keyboard target selection, changing/clearing target, clearing origin, stale-selection rejection, denied geolocation and reduced-motion behavior. Implementation present; browser checks deferred.

This slice changes map components/client geometry and documentation, plus a
Suspense wrapper around the existing landing-page session read to satisfy Next.js
Cache Components prerendering. No new package, schema migration, remote data
write, environment edit, location storage, automatic priority policy or
route-planning service is introduced. Setup guide now includes the exact
candidate NASA BBOX env line. Browser acceptance remains deferred.

## Landing-page visual simplification — 2026-10-16

- [ ] Accept the simplified white/slate/red landing page, short hero, coastline illustration, three-step workflow, plain region list and minimal footer. Implementation present; browser acceptance deferred.
- [ ] Accept responsive navigation and example-marker keyboard/pointer behavior. Implementation present; browser checks deferred.

Source/provenance and compilation evidence: `docs/implementation/landing-refresh.md`.
No operational-data setup or release gate is marked complete by this visual change.
