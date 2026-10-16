# FireOps — Implementation Checklist

> The AI agent must implement phases sequentially and never mark work complete without evidence.  
> Legend: `[ ]` pending; `[x]` completed and verified with test evidence.  
> Initial state: planning document only. No code, dependencies, hosted infrastructure or skills have been installed by this deliverable.

## Phase 0 — Inspect and agree on domain (human + engineer)

- [ ] Inspect current repository / confirm greenfield setup, agent type, Node and pnpm versions.
- [ ] Read source PDF and master spec; capture deviations as ADRs.
- [ ] Confirm user roles and registration/approval workflow.
- [ ] Confirm official boundary and district data source/license for West Kalimantan.
- [ ] Agree data scope (FIRMS sources, date window, cadence, freshness thresholds) and request private MAP_KEY.
- [ ] Define who can verify, override priority, assign and access evidence.
- [ ] Confirm red/yellow aggregation scientific rules or explicitly defer zone layer.
- [ ] Agree priority ruleset inputs/thresholds or explicitly keep `unassessed`.
- [ ] Confirm deployment provider, domain, secrets ownership, retention and operational support.

**Gate:** Unresolved safety-critical decisions remain marked OPEN and cannot be replaced by invented defaults.

## Phase 1 — Foundation, authentication and access control

- [ ] Scaffold Next.js App Router + TypeScript + Tailwind + ESLint + `src/`; commit lockfile.
- [ ] Install dependency groups from §6 of master spec and verify package imports.
- [ ] Install project-local Supabase/React/web design skills and UI UX Pro Max for selected AI agent; inspect installed files.
- [ ] Initialize shadcn/ui, icons and design tokens; validate responsive layout.
- [ ] Supabase CLI local project; `.env.example` and gitignore secrets.
- [ ] Add cookie-aware Supabase browser/server helpers and Next.js session proxy.
- [ ] Add schema migration for `profiles` and strict role assignment/approval.
- [ ] Add RLS grant/policy integration tests with separate roles.
- [ ] Build `/login`, `/register`, recovery and guarded layout.
- [ ] Verify `pnpm lint`, `pnpm typecheck`, `pnpm build` and initial auth e2e tests.

**Gate:** No unapproved user can see incident data or grant themselves privileged roles.

## Phase 2 — Database, geodata and demo browsing

- [ ] Install PostGIS in `extensions` schema; add district polygons with documented source/version.
- [ ] Migrate `hotspot_observations`, `incidents`, join table and `ingest_runs` with constraints and indexes.
- [ ] Generate typed Supabase definitions from migrations.
- [ ] Add clearly labeled `demo` fixtures; isolate from live query counts.
- [ ] Build map with MapLibre client-only and licensed/attributed basemap.
- [ ] District polygon click, hotspot clusters, marker details and legend.
- [ ] URL-persistent filters for region/district/time/source/mode/status/priority.
- [ ] Build accessible paginated list alternative and incident list.
- [ ] Test geospatial point-in-district queries and invalid coordinate behavior.

**Gate:** Dashboard correctly differentiates hotspots, incidents, demo, live and stale states. No fabricated risk polygons.

## Phase 3 — Trusted NASA FIRMS ingestion

- [ ] Select/validate source and approved bbox; obtain NASA MAP_KEY as server-only secret.
- [ ] Implement source-specific CSV parser, schema/field/coordinates validation and date normalization.
- [ ] Implement sensor-aware deterministic dedupe and idempotent upsert.
- [ ] Add scheduled job with authentication, timeout, retry/backoff, rate limits and overlap protection.
- [ ] Add `ingest_runs`, health/status UI and `last_observation_at` vs `last_successful_sync_at`.
- [ ] Test empty response, schema drift, quota failures, upstream outage, rerun dedupe and source correction.
- [ ] Restrict ingestion inserts to private trusted identity; test against regular user.
- [ ] Run controlled staging ingest, audit source attribution and district boundaries.

**Gate:** Every live point has real provenance and observation time; a failed sync never becomes fake success.

## Phase 4 — Incident detail, reports and verification

- [ ] Add reports, evidence metadata, private bucket and signed scoped URLs.
- [ ] Build creation/linking incident from observations, preserving raw source records.
- [ ] Add detail Overview/Verification/Reports/Timeline sections.
- [ ] Add append-only verification decisions and actor/reason/timestamp audit event.
- [ ] Enforce decision role + area grants in database and server operation.
- [ ] Add row-version conflict check and verification correction/supersession pathway.
- [ ] Test all three decisions, missing reason, unauthorized writes, and evidence access.

**Gate:** No automation/LLM can confirm fire; every decision is traceable and reversible only by an authorized, audited process.

## Phase 5 — Priority engine and board

- [ ] Approve deterministic prioritization thresholds; publish versioned ruleset.
- [ ] Implement unit-tested recommendation function with uncertainty/unknown handling.
- [ ] Persist component inputs, missing evidence and readable reasons.
- [ ] Implement priority board and detail breakdown.
- [ ] Add authorized human override with reason/actor/time.
- [ ] Add tests for stale data, missing evidence, disagreement, rules version and concurrency.
- [ ] If risk zones approved, add geospatial rollup calculation + scientific/operational review; otherwise show unavailable message.

**Gate:** Formula and inputs explain recommendation. Missing critical data does not silently become low priority.

## Phase 6 — Teams, assignment and tracking

- [ ] Migrate teams, team_members, assignments and incident event log.
- [ ] Enforce team authority, assigned coverage, area scope and active staff membership.
- [ ] Calculate approximate/provenance-labeled distance via PostGIS; never use distance as sole eligibility.
- [ ] Build assignment picker, reassignment reason, current owner and assigned queue.
- [ ] Add controlled status state machine and field progress notes.
- [ ] Display immutable chronological timeline.
- [ ] Test invalid team, out-of-area owner, stale assignment, duplicate assignment and concurrent mutations.

**Gate:** Field officer updates only authorized assignments; coordinator sees current status and full ownership history.

## Phase 7 — Notifications and optional AI summary

- [ ] Implement durable notifications and RLS recipient-only read/read_at.
- [ ] Deduplicate high-priority alerts and assignment changes.
- [ ] Add Realtime subscriptions scoped by permissions or polling fallback.
- [ ] Test recipients, delivery delays, idempotence and disabled/offline clients.
- [ ] Optional: secure summarizer with Zod output, model/source attribution and AI-off fallback.
- [ ] Prove AI cannot mutate verification, override priority, assign or read unauthorized reports.

**Gate:** Notifications are meaningful, scoped and durable; AI is advisory and optional.

## Phase 8 — Hardening, performance and deployment

- [ ] Accessibility audit: keyboard map alternative, contrast, status non-color, dialogs, responsive zoom and Indonesian UX.
- [ ] Automated RLS matrix + Storage security tests across roles/areas/modes.
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
