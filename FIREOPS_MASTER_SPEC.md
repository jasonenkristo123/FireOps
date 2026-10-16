# FireOps — AI-Ready Master Project Specification

> **Status:** Architecture and implementation blueprint, not an implemented application.  
> **Version:** 1.0 · Prepared 2026-10-16  
> **Product:** FireOps — wildfire hotspot monitoring, verification, prioritization, assignment, and follow-up  
> **Primary geography:** Kalimantan Barat (West Kalimantan), Indonesia  
> **Recommended stack:** Next.js App Router + TypeScript + Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) + PostGIS + MapLibre GL JS  
> **Implementation language:** English for code, architecture, and agent instructions; Bahasa Indonesia for user-facing interface by default.  
> **Companion files:** `AGENTS.md`, `IMPLEMENTATION_CHECKLIST.md`, `.env.example`.

---

## 0. Instructions to the AI coding agent

You are the senior full-stack engineer and technical lead for FireOps. Treat this file as the canonical product specification. Before coding:

1. Read this entire document, plus `AGENTS.md` and `IMPLEMENTATION_CHECKLIST.md`.
2. Distinguish **SOURCE REQUIREMENT** (explicitly in `FLOW FIREOPS v1(1).pdf`) from **PROPOSED DESIGN** (engineering choices in this blueprint) and **OPEN DECISION** (requires stakeholder approval).
3. Inspect the existing repository before generating anything. Never destroy existing code, configuration, or migrations.
4. Prefer current official documentation and installed version-matched framework docs over memorized patterns.
5. Build in small, verifiable vertical slices. Do not claim a feature is complete without typechecking, tests, and a manual acceptance check.
6. Never substitute mock data for live data without a visible **DEMO / SIMULASI** label. Never represent NASA hotspot detection as verified fire.
7. Never place service-role/secret keys, FIRMS MAP_KEY, database URLs with passwords, or AI-provider keys in the browser bundle or git history.
8. Preserve a human-in-the-loop model: the software recommends and summarizes; authorized humans verify incidents, approve priority overrides, and assign operations.
9. After every slice, summarize changed files, migrations, commands executed, test outcomes, and remaining risks. Ask for approval for consequential data operations, external spending, or significant scope changes.

**Definition of success:** An authorized coordinator can view sourced hotspot observations on a West Kalimantan map, open or link an incident, inspect evidence and freshness, record a justified verification decision, see an explainable priority recommendation, assign a responsible person/team, and track immutable history and meaningful internal notifications.

---

## 1. Source interpretation and scope

### 1.1 Requirements from the uploaded PDF — SOURCE REQUIREMENTS

The three-page source, titled **FireOps**, states the objective: help coordinators monitor hotspots, verify incidents, prioritize them, and coordinate follow-up.

| PDF section | Required capability |
|---|---|
| Login / Register | Authentication, user signs in and reaches dashboard |
| Dashboard — Incident Monitor | West Kalimantan map, hotspot markers, risk zones, adjacent priority panel, district/time/status/priority filters, click-to-explore geography and incident |
| Incident Detail & Verification | Coordinates, detection time, NASA FIRMS origin, confidence when available, supporting reports/photos, decision with reason |
| Priority Board | Explainable recommendation using urgency, severity indicators, evidence, data freshness, and field information; user override with reason |
| Assignment & Tracking | Select responsible team/PIC by jurisdiction, proximity, availability, authority; progress updates, status, timeline |
| AI | Summarize resident/officer reports and identify missing evidence; transparent *rules* recommend priority; no automated verification |
| Outputs | Verification, justified priority, responsible PIC, follow-up history, optional internal notifications |
| Critical caveat | Risk zone aggregation must be agreed and tested. FIRMS detection is not automatic fire confirmation. Actual observation/sync timestamps must accompany LIVE data. |

The source's field vocabulary MUST remain represented in code/data contracts: `region`, `district`, `time_range`, `source`, `data_mode`, `latitude`, `longitude`, `detected_at`, `last_sync`, `confidence`, `verification_status`, `evidence`, `reason`, `actor_id`, `decided_at`, `severity`, `urgency`, `evidence_strength`, `data_freshness`, `priority_reason`, `owner_id`, `team_area`, `availability`, `distance_to_team`, `current_status`, `note`, `updated_at`, `timeline`.

### 1.2 Engineering extensions — PROPOSED DESIGN (not directly specified)

Add distinct raw observation and incident records, private Supabase Storage, role-based authorization, invitation/review of registrations, immutable audit history, health/freshness monitoring, unit/e2e tests, repeatable database migrations, explicit demo/live modes, mobile layouts, and scheduled NASA ingestion. These are proposed to make the PDF's flows implementable and reliable.

### 1.3 Not in MVP

No autonomous wildfire confirmation, dispatch, emergency broadcast, aircraft/drone control, predictive fire-spread model, citizen-facing emergency alerting, public incident data portal, satellite imagery inference, on-device offline-first dispatch, or multi-province operations. These require separate operational/legal validation.

### 1.4 Explicitly unresolved decisions — do not guess

- Who can self-register and how are accounts vetted? **Recommendation:** registration request or invite; new users get viewer/pending access only until approved.
- Who can classify a hotspot as an incident, and which exact verification statuses are final?
- Which official West Kalimantan boundary/district geometries and licenses should be used?
- Which agency-approved definition produces red/yellow risk zones? Until approved, show raw points and **Risk model unavailable**, not fake polygons.
- Which weighting/threshold matrix decides priority, and who signs off on it? Formula in §8 is illustrative only.
- What update interval/SLAs distinguish current vs stale information?
- Which teams, regions, skills, locations, availability conventions, and scopes of authority are authoritative?
- Who can see sensitive evidence/photos and private personnel details?
- What is the record retention/deletion policy and operational escalation process?
- Whether a paid AI provider is approved; MVP must work with AI disabled.

Log decisions in `docs/decisions/` as short ADRs (architecture decision records), with stakeholder/date and approved version.

---

## 2. Personas, privileges and domain rules

### 2.1 Personas — PROPOSED DESIGN

| Role | Primary responsibilities | Permissions summary |
|---|---|---|
| `admin` | System setup, accounts, teams, access | Manage verified staff and configuration; audited changes |
| `coordinator` | Monitor, verify, prioritize, assign | Read allowed areas; verify/override/assign with reasons; track |
| `field_officer` | Own and update assigned incidents | Read assigned/shared-area records; submit reports/evidence; update own assignment progress |
| `viewer` | Situational awareness | Read approved operational data within permitted area; no writes to decisions |
| `pending` | Await approval | No access to operational data |

Keep roles in a database-controlled `profiles.role` or role membership table, not user-editable JWT metadata. Optionally add team/area grants to scope access independently of role. Users must not choose privileged roles during registration. The access matrix must be enforced both in server actions and in database RLS/grants; hiding buttons is not authorization.

### 2.2 Invariants (non-negotiable)

- **Hotspot observation ≠ confirmed incident.** An observation is raw, instrument-derived evidence. An incident is a human-managed case possibly linked to many observations.
- Verification `confirmed` requires an authenticated, authorized human, a reason, and timestamp; no LLM or scheduled job may set it.
- Verification `not_confirmed` means examination did not support confirmation — it does **not** prove no fire exists.
- Verification `needs_more_information` means insufficient evidence. It is not a low priority by default.
- `verification_status` and operational `current_status` are orthogonal: a verified incident can still be active, dispatched, monitoring, or resolved.
- Priority recommendation and human final priority are separate fields and both retain rationale and version/source.
- Assigned PIC must be an authorized member of an eligible team/area; staff proximity is informative only, not definitive suitability.
- Observation time, ingestion time, last successful sync, and UI-refresh time are distinct values.
- Every sensitive mutation carries actor/time/reason and an append-only event or audit record. Never silently overwrite history.
- Default-deny access and fail closed for operational writes. Read-only degraded mode is preferable to fabricated live data.

---

## 3. User journeys and functional requirements

### 3.1 Authentication: `/login`, `/register`, `/auth/callback`

- Login with Supabase email/password (or approved organization SSO in a future iteration).
- Register requests create a restricted `pending`/`viewer` profile; confirm email where configured.
- Password reset route, clear validation, neutral authentication error messages, logout and session expiry.
- Redirect authorized staff to `/dashboard`; restrict unauthorized and pending users.
- Protect server operations using Supabase Auth validated claims/user, not trusting client-supplied user IDs.
- Access checks must also apply to REST/RPC, Storage, Realtime subscriptions, and server functions.

**Acceptance:** unauthenticated users cannot access dashboard data; registering cannot grant coordinator/admin powers; password recovery works.

### 3.2 Dashboard: `/dashboard`

**Structure:** persistent left app navigation, top data health/filter bar, primary map canvas, optional collapsible right priority queue. Responsive fallback stacks map and queue rather than hiding essential details.

**Map capabilities:**

- West Kalimantan initial viewport and actual district borders from approved GeoJSON/PostGIS boundary data.
- Marker/layer for raw NASA FIRMS observations; visually distinguish from linked incidents; clustering at low zoom.
- Filters: `region`, `district`, time range, instrument/source, `data_mode` (`demo` or `live`), verification status and final priority.
- Clicking a district filters the current view, with accessible non-map list alternative.
- Clicking an observation reveals sensor/time/coordinates/confidence **if provided**, plus "Not yet verified" message; offers permitted "Create / link incident" action.
- Clicking an incident marker or priority row opens `/incidents/[id]`.
- Priority panel sorted by deterministic priority then age, with status, district, owner, last update, and transparent missing-data indicator.
- View buttons for map-only / list-only / split view; loading, empty, error and stale-feed states.

**Dashboard metrics (MVP):** current raw detections in selected period, open managed incidents, incident verification distribution, high-priority active cases, assignment counts, last FIRMS observation, last successful sync.

**Important:** Counts must distinguish raw satellite *detections* from human-verified *incidents*, and never silently merge these datasets.

### 3.3 Incident list: `/incidents`

- Paginated/filterable table (not all data fetched to browser).
- Columns: incident reference, district, representative coordinates, observed/detected time, verification state, operational state, recommended/final priority, PIC, most recent update.
- Search reference or description; supports column sort and saved filter in URL search params.
- Authorized coordinator can create incident from one or multiple raw observations or from an officer report. Creating does **not** automatically verify.

### 3.4 Incident detail: `/incidents/[id]`

Tabs or sections:

1. **Overview:** reference, map, chronology, linked observations, coordinates, district, feed identity, sensor, confidence/provenance when present, time-zone-aware dates and data freshness.
2. **Verification:** current decision; all prior decisions; supporting evidence; decision `confirmed`, `not_confirmed`, or `needs_more_information` with required reason and actor/time.
3. **Priority:** component scores and evidence limitations, ruleset version, recommendation, final priority, override dialog requiring reason.
4. **Assignment:** suggested eligible teams based on coverage + availability + authority; optional distance; assign owner/team; track reassignment history and rationale.
5. **Reports & evidence:** text reports, uploaded photos/documents with author and capture time; private signed links; optional AI summaries explicitly labeled.
6. **Timeline:** immutable, chronological events from creation, ingestion linking, decisions, assignment, notes, status changes and notifications.

**Workflow guardrails:** double-submit prevention, optimistic version/concurrency checks, confirmation for consequential decisions, confirmation/reason to reverse verification, and safe stale-tab behavior.

### 3.5 Priority board: `/priorities`

Kanban or grouped sortable table (`critical`, `high`, `medium`, `low`, `unassessed`) with district/time/status filters. A recommendation is **not** an order to dispatch. Coordinators must be able to inspect breakdown, record override reason, and view prior versions. Cases lacking reliable inputs remain `unassessed`/`needs_review` rather than inheriting fake numeric zeroes.

### 3.6 Assignment and tracking: `/assignments`

- Authorized user selects team and/or `owner_id` after reviewing team jurisdiction, availability, distance (derived, not manually asserted) and authority.
- Track state transitions such as `new → triaging → assigned → in_progress → monitoring → resolved` with `cancelled` and permitted reopen. Define transitions in an explicit state machine; document exceptional paths.
- Field officer can add timestamped note/photo/progress to permitted assignments; cannot silently change final verification or priority.
- Coordinator has queue of unassigned/stalled tasks; operations audit and assignment history preserved.

### 3.7 Notifications: `/notifications`

Authenticated in-app alerts for new approved high-priority incidents, new assignment, reassignment, significant status change, or an update requiring action. `read_at` is per recipient. Deduplicate alert generation; avoid high-volume notifications for every raw observation. Real-time delivery is convenience on top of durable database records.

### 3.8 Admin: `/admin/users`, `/admin/teams`, `/admin/settings`

Role approval, team roster and area coverage, manual sync health/status, priority ruleset publication (only after approved version), audit log viewer. All admin actions audited. Admin route does **not** imply the browser possesses elevated Supabase secrets.

---

## 4. Recommended technical architecture — PROPOSED DESIGN

```text
                         Browser / field officer
                       Next.js App Router (TS)
                 ┌───────────────────────────────┐
                 │ Server Components + Actions   │
                 │ shadcn/ui + Tailwind          │
                 │ MapLibre client-only map      │
                 └──────────────┬────────────────┘
                                │ authenticated SSR / APIs
               ┌────────────────┴────────────────┐
               │ Next.js server route handlers   │
               │ input validation + RBAC checks  │
               └─────────────┬───────────────────┘
                             │ least-privilege queries
                 ┌───────────┴──────────────┐
                 │ Supabase                 │
                 │ Auth / PostgreSQL        │
                 │ PostGIS / RLS / Storage  │
                 │ Realtime / Edge Funcs    │
                 └───────────┬──────────────┘
                             │ private scheduled job
                ┌────────────┴───────────────┐
                │ NASA FIRMS ingestion job   │
                │ validate → dedupe → upsert │
                │ ingest_runs + timestamps   │
                └────────────┬───────────────┘
                             │ server-side MAP_KEY only
                         NASA FIRMS Area API
```

### 4.1 Responsibilities

- **Next.js 16+ (current stable when scaffolding):** routes, SSR, Server Components, auth/session proxy (`src/proxy.ts` when `src/` directory is selected), Server Actions for safe form mutations, Route Handlers for integration/health if needed.
- **Supabase:** identity, PostgreSQL truth, RLS, private evidence Storage, change notifications, and optionally Edge Function for scheduled ingestion.
- **PostGIS:** district point-in-polygon, spatial index, geographic team proximity, eventual approved region aggregations; create extension in `extensions` schema.
- **MapLibre GL JS:** interactive points, clusters, polygon layers and GeoJSON sources; isolate browser-only code behind `dynamic(..., { ssr: false })` in a Client Component boundary as required by Next.js.
- **NASA FIRMS:** raw satellite thermal anomaly detections; no API requests directly from client. Retain source provenance.
- **Optional AI summarizer:** constrained structured summary of human reports; no privileges to update incident verification, status, priority final or assignments. Disable gracefully without key.

### 4.2 Maintain a single source of truth

Do not introduce a separate ORM initially. Use type-safe generated Supabase types + explicit SQL migrations, RLS and RPC for atomic multi-table operations. If ORM is later added, justify its value and ensure it does not weaken RLS.

Keep business rules server-side in `src/lib/domain/` and mirrored by database constraints, grants and controlled stored procedures where atomicity/authorization is needed. UI must not implement official prioritization formula independently.

### 4.3 Live data and realtime are different

- `live` = actual scheduled NASA-derived data synchronized from an upstream API, **near-real-time** if NASA says so; may be delayed.
- `realtime` = Supabase pushes database changes to clients; says nothing about satellite observation freshness.
- Display `last_observation_at`, `last_successful_sync_at`, `current_time`, timezone and stale/failed-sync warnings.
- In `demo` mode, display permanent **DEMO / DATA SIMULASI** banner; seed clearly synthetic records under a separate dataset/source marker. Demo data must never appear in LIVE counts or trigger operational notification.

---

## 5. Technology and library inventory

Use one package manager: **pnpm**. Use maintained stable package releases at install time and commit `pnpm-lock.yaml`; do not paste speculative exact version numbers. Dependencies already generated by Next.js should not be duplicated.

### 5.1 Required app/runtime dependencies

| Package/tool | Reason | Timing |
|---|---|---|
| `next`, `react`, `react-dom` | Router/rendering (installed by scaffold) | Scaffold |
| `typescript`, `tailwindcss`, `eslint` and Next config | Types/styles/lint (scaffold) | Scaffold |
| `@supabase/supabase-js` | Typed Supabase data/auth client | Foundation |
| `@supabase/ssr` | Cookie-based browser/server clients | Foundation |
| `zod` | Runtime validation and domain parsing | Foundation |
| `react-hook-form`, `@hookform/resolvers` | Form UX with Zod | Foundation |
| `maplibre-gl` | GIS dashboard maps | Map slice |
| `lucide-react` | Accessible iconography | UI foundation |
| `date-fns` | Date formatting and relative time (UTC persisted) | Foundation |
| `csv-parse` | Server-only NASA FIRMS CSV parsing | Ingestion slice |
| `@tanstack/react-query` | Efficient client-side query/refetch for map/table state | Dashboard slice |
| `recharts` | Simple non-operational charts; install only if needed | Optional |

**Included through shadcn/ui CLI when needed:** Radix UI primitives, Tailwind utility helpers (`clsx`, `tailwind-merge`, possibly `class-variance-authority`), generated components, and `sonner` for toasts. Let the CLI manage compatible dependencies instead of manually installing conflicting versions.

**Supabase platform capability, not an npm package:** PostGIS, Supabase Storage, RLS, pg_cron, pg_net, Supabase Realtime, Postgres migrations. `supabase` CLI is a dev tool.

### 5.2 Developer/test dependencies

`supabase` (CLI), `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, `prettier` and optionally `prettier-plugin-tailwindcss`. For SQL policy validation use Supabase CLI tests and/or pgTAP; no need for a JS dependency for pgTAP. Next scaffold already installs TypeScript and ESLint dependencies.

### 5.3 Optional packages (only when an actual use case exists)

- `@turf/distance` for a non-authoritative browser distance hint; authoritative eligibility/proximity remains server/database side.
- `sentry` SDK for monitored production errors, after a privacy/PII review.
- `ai` or an approved provider SDK **only if** optional summarization is accepted and governed.
- A vetted raster/vector basemap provider account: review license, tile quota, attribution and costs before using commercial tiles. MapLibre is not itself a tile hosting service.

**Avoid:** unnecessary Prisma/Drizzle + SQL duplication, two competing global stores, AI-based auto-verification, charts that misrepresent scientific certainty, unrestricted anon reads, and polling NASA from every browser.

---

## 6. Setup: exact command sequence for a new repository

> These are **instructions** for your local development environment. They have been researched but **not executed here**. Commands assume Node.js meeting the current Next.js minimum (>=20.9 per the consulted docs), pnpm, Git, Docker for local Supabase, and Python 3 for UI UX Pro Max scripts. Confirm current tool prerequisites before installation.

### 6.1 Scaffold

```bash
# From the folder in which the project should be created:
pnpm create next-app@latest fireops --yes --src-dir
cd fireops

# Check the scaffold (expected: TypeScript, Tailwind, ESLint, App Router).
pnpm dev
```

If `create-next-app` prompts because of previously saved preferences, select **TypeScript**, **Tailwind CSS**, **ESLint**, **App Router**, `src/`, alias `@/*`. Stop the dev server before proceeding.

### 6.2 Core application dependencies

```bash
pnpm add @supabase/supabase-js @supabase/ssr \
  zod react-hook-form @hookform/resolvers \
  maplibre-gl lucide-react date-fns csv-parse @tanstack/react-query

pnpm add -D supabase vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom @playwright/test \
  prettier prettier-plugin-tailwindcss

# Optional when implementing charts, not needed for the first screen:
# pnpm add recharts
```

### 6.3 shadcn/ui and components

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add \
  button card badge input textarea form select \
  dialog alert-dialog sheet tabs table dropdown-menu \
  tooltip popover command skeleton separator scroll-area sonner
```

Follow the shadcn installer prompts. Do not replace the whole generated theme without designing accessible semantic colors. Use components as owned source in `src/components/ui/` and create business components separately.

### 6.4 AI agent skills (project-local recommended)

Skills teach the *coding agent*, not the running website. They are **not** imported into React and generally are not npm runtime dependencies.

```bash
# Official Supabase skills — authentication, migrations, and platform conventions:
pnpm dlx skills add supabase/agent-skills

# Vercel engineering guidance — performance and UI review:
pnpm dlx skills add vercel-labs/agent-skills --skill vercel-react-best-practices
pnpm dlx skills add vercel-labs/agent-skills --skill web-design-guidelines

# UI UX Pro Max — choose your actual AI agent, NOT all of them:
pnpm dlx ui-ux-pro-max-cli init --ai codex
# or: pnpm dlx ui-ux-pro-max-cli init --ai cursor
# or: pnpm dlx ui-ux-pro-max-cli init --ai claude
# or: pnpm dlx ui-ux-pro-max-cli init --ai universal

# Optional: discover Next.js workflow skills; only install those relevant
# to features you adopt (many Next.js conventions are in bundled docs):
# pnpm dlx skills add vercel/next.js
```

Choose one agent target for UI UX Pro Max; the published CLI package is `ui-ux-pro-max-cli`, **not** the older `uipro-cli`. Inspect the selected skills and repository permissions before running third-party scripts. Commit project-local skills if your team wants reproducibility; review skill updates like source dependencies. Run UI/UX skill to propose FireOps tokens and dashboard layout, but this blueprint's safety requirements and approved design system take precedence.

### 6.5 Initialize Supabase and auth

```bash
pnpm exec supabase init
# Requires Docker; may take time the first time.
pnpm exec supabase start
pnpm exec supabase status
```

1. Create a local `.env.local` from `.env.example` using local Supabase values; **never commit real secrets**.
2. Create browser/server helpers in `src/lib/supabase/client.ts` and `server.ts` using `@supabase/ssr`.
3. Create session refresh utility in `src/lib/supabase/proxy.ts`, exported by `src/proxy.ts` (Next's modern proxy convention for a `src/` project).
4. For data-bearing server requests, verify with `auth.getClaims()` or `auth.getUser()` as appropriate. Do not authorize based on `getSession().user` alone.
5. Run first migrations for enums/tables/functions/RLS. Never create permissive `using (true)` write policies for operational data.
6. Generate database TS types **after** migrations and regenerate when schema changes.

```bash
# Example project script; add the script after confirming CLI options.
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > src/types/database.types.ts
pnpm exec playwright install
```

For a hosted project, use the project's approved workflow (`supabase login`, `supabase link`, `supabase db push`) **only with an explicit target and review of migration diffs**. Prefer local migrations and staging before production. Never run destructive resets on hosted environments.

### 6.6 Core scripts to add to `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > src/types/database.types.ts"
  }
}
```

Preserve any framework-generated script overrides instead of overwriting the entire `package.json`. Add `vitest.config.ts`, testing setup and Playwright config as their implementations are introduced.

### 6.7 Environment variables

```dotenv
# Public configuration, safe to embed in browser but protected by RLS:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_MAP_STYLE_URL=
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Pontianak

# SERVER ONLY; never use NEXT_PUBLIC_ prefixes:
SUPABASE_SECRET_KEY=
NASA_FIRMS_MAP_KEY=
NASA_FIRMS_SOURCE=VIIRS_SNPP_NRT
NASA_FIRMS_BBOX=
NASA_FIRMS_SYNC_TOKEN=
AI_PROVIDER_API_KEY=
AI_SUMMARIZATION_ENABLED=false
```

`SUPABASE_SECRET_KEY` is only needed for **strictly server-only privileged tasks** (e.g., trusted scheduled ingestion); some platforms still expose a legacy service-role key. Follow the current Supabase key documentation and do not instantiate a privileged client by default. Keep sync authorization tokens in the trusted scheduler/Edge Function environment. Treat `NEXT_PUBLIC_MAP_STYLE_URL` as a provider URL with allowed usage/licensing.

`NASA_FIRMS_BBOX` should be derived/approved from the West Kalimantan official boundary, in `west,south,east,north` order; do not invent or silently use a global bounding box.

---

## 7. Database model and data contracts — PROPOSED DESIGN

### 7.1 Modeling principles

1. Raw observations are appendable/updated by trusted ingestion but not manually verified in place.
2. Human-managed incidents can reference zero or many observations; an observation may be linked to an incident through a controlled association.
3. All location coordinates persist as WGS84 latitude/longitude; PostGIS `geography(Point, 4326)` uses longitude, latitude in geometry construction (`ST_MakePoint(lon, lat)`). Add GiST index.
4. Store all timestamps as `timestamptz` UTC; show local `Asia/Pontianak` in UI with timezone label.
5. Use stable UUID primary keys, foreign keys, unique constraints and check constraints. Index filtering columns and large time-series paths.
6. Enforce strict roles/permissions with RLS/grants; default to no access.

### 7.2 Tables

| Table | Core fields | Notes |
|---|---|---|
| `profiles` | `id` references `auth.users`, `display_name`, `role`, `district_scope`, `status`, `created_at` | Profile role editable only by admin-controlled path; preferably separate area grants |
| `districts` | `id`, `province_code`, `name`, `geometry`, `source`, `boundary_version` | Approved official polygons; indexed GIS |
| `teams` | `id`, `name`, `district_id`, `coverage_geometry?`, `active`, `authority_type` | Assignment eligibility |
| `team_members` | `team_id`, `user_id`, `membership_role`, `availability`, `last_availability_at` | Unique team/user; do not expose private locations indiscriminately |
| `hotspot_observations` | `id`, `observation_key`, `source`, `satellite`, `instrument`, `latitude`, `longitude`, `geom`, `detected_at`, `received_at`, `confidence_raw`, `confidence_kind`, `frp`, `brightness`, `raw_payload`, `district_id`, `data_mode`, `created_at`, `last_seen_at` | Distinct observation from FIRMS; key must be sensor-aware; raw fields nullable |
| `ingest_runs` | `id`, `source`, `mode`, `started_at`, `finished_at`, `status`, `rows_seen`, `rows_inserted`, `rows_updated`, `error_summary`, `source_window_start`, `source_window_end` | Durable sync/error history; never fabricate `last_sync` |
| `incidents` | `id`, `reference`, `title`, `description`, `representative_location`, `district_id`, `created_by`, `verification_status`, `current_status`, `recommended_priority`, `final_priority`, `priority_reason`, `priority_ruleset_version`, `owner_id`, `team_id`, `created_at`, `updated_at`, `row_version`, `data_mode` | Human case; initial verification `needs_more_information` |
| `incident_observations` | `incident_id`, `observation_id`, `linked_by`, `linked_at` | Many-to-many explicit links, no destructive merge |
| `reports` | `id`, `incident_id`, `author_id`, `reporter_type`, `body`, `observed_at`, `submitted_at`, `source_label` | Untrusted free text; sanitize/escape and permission check |
| `evidence_files` | `id`, `incident_id`, `report_id?`, `uploaded_by`, `storage_path`, `mime_type`, `size_bytes`, `captured_at`, `created_at`, `description` | Storage private bucket, no public URLs |
| `verification_decisions` | `id`, `incident_id`, `decision`, `reason`, `actor_id`, `decided_at`, `supersedes_id?` | Immutable decision history; audited override process |
| `priority_assessments` | `id`, `incident_id`, `ruleset_version`, `severity`, `urgency`, `evidence_strength`, `data_freshness`, `recommendation`, `explanation_json`, `assessed_at`, `is_manual_override`, `override_reason`, `actor_id?` | Explainability and auditability |
| `assignments` | `id`, `incident_id`, `team_id`, `owner_id`, `assigned_by`, `assigned_at`, `ended_at`, `reason`, `status` | Assignment history rather than destructive reassignment |
| `incident_events` | `id`, `incident_id`, `event_type`, `actor_id?`, `created_at`, `note`, `previous_value`, `new_value`, `metadata_json` | Append-only timeline |
| `notifications` | `id`, `recipient_id`, `incident_id?`, `event_id?`, `type`, `title`, `body`, `read_at`, `created_at`, `dedupe_key` | Authenticated scoped notifications |
| `audit_logs` | `id`, `actor_id?`, `action`, `resource_type`, `resource_id`, `before_json`, `after_json`, `request_id?`, `created_at` | Privileged append-only access; redact secrets |
| `priority_rulesets` | `version`, `status`, `rules_json`, `approved_by`, `approved_at`, `effective_at` | Publish by explicit approval only |

**Fields expected in APIs/view models:** `time_range` is a *query filter*, not necessarily a database column; `last_sync` is derived from `ingest_runs` successful completion. `distance_to_team` is a computed read-only value. `timeline` is the ordered incident-event collection. `evidence` is files/reports with authorization metadata. `team_area` is derived from approved team coverage and district grants.

### 7.3 Enumerations

```text
verification_status = confirmed | not_confirmed | needs_more_information
priority_level      = critical | high | medium | low | unassessed
incident_status     = new | triaging | assigned | in_progress | monitoring | resolved | cancelled
user_role           = pending | viewer | field_officer | coordinator | admin
data_mode           = demo | live
feed_status         = running | success | partial | failed
```

Create constraints against invalid values. Do not treat `not_confirmed` and `resolved` as synonyms.

### 7.4 Indexes and constraints

- `hotspot_observations(observation_key)` unique and `(detected_at desc, source, data_mode)` indexes; GiST on `geom`.
- `incidents(district_id, current_status, final_priority, updated_at)` chosen via EXPLAIN; GiST on location.
- `incident_observations` unique `(incident_id, observation_id)`.
- `incident_events(incident_id, created_at, id)` for stable ordering.
- `assignments(incident_id)` partial unique where `ended_at is null` **if only one active assignment is allowed** (OPEN DECISION).
- `notifications(recipient_id, read_at, created_at)` and unique `dedupe_key` when available.
- `check(latitude between -90 and 90)` and `check(longitude between -180 and 180)`; no sentinel fake coordinates.
- `reports`/`verification_decisions` reasons non-empty with appropriate lower bound/validation.
- Guard cross-mode joins: `demo` observations must not link to live incidents.

### 7.5 Row-level security rules (minimum)

**All operational tables default deny and have RLS enabled.** Carefully add grants before RLS policies; RLS alone is insufficient if grants are overbroad. Test *both* logged-out and authenticated clients with multiple roles and district scopes.

| Resource | Read | Write |
|---|---|---|
| `profiles` | Own; admin can manage, team-visible minimal fields as approved | Own non-security profile fields; admin-approved role changes only |
| `hotspot_observations`, `districts` | Authorized operational users within scope | Trusted ingestion/admin task only, never client direct writes |
| `incidents` | Users with explicit area/team access | Created and modified through authorized server/RPC paths; role/field constraints |
| `verification_decisions` | Authorized incident viewers | `coordinator` or explicitly authorized verifier via controlled function; no update/delete |
| `priority_assessments` | Authorized incident viewers | Rule-engine service for recommendations; coordinator for overrides; append-only |
| `assignments` | Coordinator, assigned staff, authorized area viewers | Coordinator; field officer may update progress through controlled procedure only |
| `reports`, `evidence_files` | Authorized incident/team scoped viewers | Assigned field officer/coordinator and originator under defined policy; no public buckets |
| `notifications` | Recipient only | Trusted server pipeline; recipient may mark own read state |
| `audit_logs`, `ingest_runs` | Admin/coordinator as appropriate | Trusted internal job only; no end-user mutation |
| `priority_rulesets` | Read approved active version; admin can inspect history | Strict administrative publish workflow |

Create security-definer RPCs sparingly for **transactional** operations such as verify, assign, override priority, append event and notify, with controlled `search_path`, explicit permissions and role checks. Do not use unrestricted service-role client for normal user-facing mutations. Audit admin secret operations.

### 7.6 Private file uploads

Bucket `incident-evidence` is **private**. Accepted types: JPEG/PNG/WebP/PDF after MIME sniffing and validation; restrict file count and size per approved limits; use random immutable object paths, never user-provided filenames as storage keys. Signed URLs must be short-lived and created only after incident access verification. Strip or handle sensitive EXIF/GPS thoughtfully; malware scanning is a deployment decision. Display file metadata, attribution, and error handling.

---

## 8. NASA FIRMS ingestion and priority science

### 8.1 NASA FIRMS integration — verified API conventions

Official API docs: <https://firms.modaps.eosdis.nasa.gov/api/area/>. The Area API uses CSV URLs:

```text
https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{WEST},{SOUTH},{EAST},{NORTH}/{DAY_RANGE}
```

Optional date suffix: `/{YYYY-MM-DD}`. NASA documents `DAY_RANGE` 1–5, key quota rules, and sources including `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, and `MODIS_NRT`. Choose a source intentionally and preserve its identity; different instruments have **different confidence semantics**. Do not assume `confidence` is a comparable 0–100 percentage across sensors or that unavailable fields are zero.

### 8.2 Recommended ingestion pipeline

1. Scheduler (Supabase cron + Edge Function, or secure server cron) triggers at a configurable interval; **proposed starting point: 30 minutes**, subject to NASA availability and team SLA.
2. Server-side job authenticates scheduler and reads server-only `NASA_FIRMS_MAP_KEY` and bbox configuration.
3. Request a small date window with timeout and backoff; respect NASA usage limits. Avoid calling API from browsers.
4. Validate Content-Type/payload, headers, schema, coordinates, acquisition date/time, NaN/null, and source-specific confidence fields.
5. Normalize timestamps to UTC and preserve original raw acquisition fields and raw row JSON.
6. Compute deterministic sensor-aware `observation_key`; deduplicate retries without erasing distinct overpasses. Upsert raw observations idempotently.
7. Use PostGIS to assign district by official polygon; leave unresolved matches null and report them for review, not arbitrary districts.
8. Write `ingest_runs` outcome and metrics transactionally where practical. Sync "success" means actual completed ingest, not the job's scheduled time.
9. Update cache/revalidation or Supabase Realtime after persistence; UI renders last successful sync and latest observation time.
10. On error, preserve last known observations, indicate `stale` and log source error; never inject synthetic "live" points.

**Sensor key strategy:** a normalized tuple containing FIRMS source/instrument/satellite, observation date/time, coordinates at original supplied precision, and additional provided swath identifiers as needed. Test collision and repeat-pass scenarios with source fixtures. NASA can revise/replace near-real-time rows; keep ingestion source window/history and avoid silent case deletion.

### 8.3 Region risk zones

The PDF requires red/yellow zones but explicitly says aggregation rules must be agreed and tested. **Do not generate real-looking risk zones before signoff.** Suggested review dimensions: count of unique recent observations, time decay, verified field evidence, affected assets, and sensor uncertainty; avoid using counts alone as fire severity. Record polygon source/version, ruleset version, data window and calculated_at. Legend must distinguish "Hotspot density", "Review priority", and "Confirmed fire"; they are not interchangeable.

### 8.4 Rule-based incident priority — ILLUSTRATIVE, NOT APPROVED

Separate scoring from final assignment. Candidate structured inputs:

```ts
type PriorityInputs = {
  severity: 'unknown' | 'low' | 'medium' | 'high';
  urgency: 'unknown' | 'low' | 'medium' | 'high';
  evidenceStrength: 'insufficient' | 'partial' | 'strong';
  dataFreshness: 'fresh' | 'aging' | 'stale' | 'unknown';
  fieldConditions?: string;
};

type PriorityAssessment = {
  recommendation: 'unassessed' | 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  missingInputs: string[];
  rulesetVersion: string;
  calculatedAt: string;
};
```

**Policy:** no default "low" for missing critical evidence. Start with an explainable stub returning `unassessed` pending approved rules. After signoff, implement deterministic functions with unit tests that cover high uncertainty, fresh severe field report, sensor disagreements, override, and historical rule versions. Do not use an LLM to decide the final level.

### 8.5 AI report summarization — strictly optional

Input: only access-authorized `reports` text/evidence metadata; apply minimization. Output as validated structured data:

```ts
type ReportSummary = {
  summary: string;
  importantObservations: string[];
  missingEvidence: string[];
  sourceReportIds: string[];
  generatedAt: string;
  modelIdentifier: string;
  disclaimer: 'AI-assisted summary — verify against original reports';
};
```

Protect against prompt injection in report text; enforce length and data access controls. Show traceable report references and allow humans to read originals. Do not send sensitive evidence to an external AI provider without approved legal/privacy policy. Disable by default. AI outputs cannot call privileged verification, priority override or assignment routines.

---

## 9. API, service and mutation contracts

Use typed Supabase queries from Server Components for read paths, with database RLS. For user mutations use Server Actions with form schema validation and authenticated authorization, optionally calling transactional Postgres RPCs. Route Handlers are reserved for external ingestion/webhooks and explicit client fetch endpoints. Do not make an insecure generic CRUD API.

### 9.1 Suggested read contracts

| Action | Inputs | Response |
|---|---|---|
| `getDashboardSummary` | `from`, `to`, `districtId`, `source`, `mode` | Sourced counts and freshness metadata |
| `listObservations` | Bbox, source, time range, mode, cursor | Paged GeoJSON points + provenance |
| `listIncidents` | District, statuses, priority, text, cursor | Typed page with total/next cursor |
| `getIncidentById` | UUID | Incident summary, observations, reports, relevant rights |
| `getIncidentTimeline` | Incident ID + pagination cursor | Immutable events |
| `listEligibleTeams` | Incident ID | Teams with coverage/availability/authority and safe distance hint |

### 9.2 Suggested writes

| Action | Inputs | Security / atomic side effects |
|---|---|---|
| `createIncident` | Title, location, linked observation IDs, mode | Role, area, source link validation; insert incident/event |
| `recordVerification` | Incident, decision, reason, expected version | Coordinator/authorized verifier only; write decision, update current projection, append audit+event |
| `recordPriorityOverride` | Incident, level, reason, expected version | Coordinator, approved priority rules; append assessment + event |
| `assignIncident` | Incident, owner/team, reason, expected version | Validate area/authority/team membership; close prior assignment/open next, append event+notification |
| `addProgressNote` | Assignment/incident, status, note, evidence IDs | Assignee or coordinator; state machine; append event |
| `uploadEvidence` | Authorized upload request | Validate MIME/size; private path; metadata entry with scoped access |
| `markNotificationRead` | Notification ID | Recipient owns record |

Return actionable errors with stable codes: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `STALE_VERSION`, `UPSTREAM_UNAVAILABLE`, `RATE_LIMITED`. Do not leak PII, service secrets or SQL internals in errors.

### 9.3 Concurrency policy

Use `row_version` integer, `updated_at`, or SQL compare-and-swap on sensitive incident projection writes. If another coordinator changed the case since it was loaded, reject with `STALE_VERSION` and ask user to refresh/review; don't overwrite silently.

---

## 10. UI/UX design system and information architecture

### 10.1 Design brief for UI UX Pro Max

> Create an accessible, high-clarity emergency-operations dashboard for FireOps, a West Kalimantan hotspot monitoring and human-verification application. Emphasize map legibility, precise state labels, data provenance/freshness, and action accountability over visual drama. Use an understated neutral surface, semantic severity/priority badges, clear contrast, compact density at desktop, legible Indonesian text, and strong keyboard usability. Avoid red/yellow areas unless scientific aggregation rules are approved; color is not the sole indicator. Ensure every hotspot is labeled as a detection, not confirmed wildfire.

### 10.2 Proposed design tokens — requires visual review

- Base: neutral dark-slate/charcoal text with light operational surface; optional dark mode after first usability pass.
- Status colors: **verification** (neutral/green/amber) are not the same as **priority** (critical/high/medium/low). Pair all colors with text/icons and accessible patterns.
- Display Indonesian dates as e.g. `16 Okt 2026, 13.44 WIB`, with precise observation/sync labels and tooltip for full UTC value.
- 8px spacing rhythm, 4px subspacing; typography preferably locally served `Geist` or another reliable font with Indonesian glyph support. Minimum comfortable readable text; avoid 10px dense operational controls.
- Accessibility baseline: WCAG 2.2 AA targets for keyboard, focus, contrast, dialog behavior, input errors, reduced motion and responsive zoom. Essential content must not be map-only.

### 10.3 Core components

```text
AppShell, SidebarNav, Topbar, GlobalFilters, DataModeBadge,
DataFreshnessBanner, ObservationProvenance, HotspotMap,
DistrictLayer, HotspotClusterLayer, IncidentMarkerLayer,
MapLegend, IncidentQueuePanel, IncidentTable, MetricCard,
VerificationDecisionForm, EvidenceGallery, PriorityBreakdown,
PriorityOverrideDialog, AssignmentPicker, IncidentTimeline,
ReportComposer, SyncHealthPanel, EmptyState, ErrorState.
```

Map interaction is keyboard-supported via an accompanying table/list. Ensure marker click opens accessible detail, district selection can be cleared, filters persist in URL, and viewport query is paged/aggregated rather than transferring all raw observations.

### 10.4 Routes and proposed folder structure

```text
fireops/
├── AGENTS.md
├── FIREOPS_MASTER_SPEC.md
├── IMPLEMENTATION_CHECKLIST.md
├── .env.example
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (auth)/forgot-password/page.tsx
│   │   ├── auth/callback/route.ts
│   │   ├── (app)/layout.tsx
│   │   ├── (app)/dashboard/page.tsx
│   │   ├── (app)/incidents/page.tsx
│   │   ├── (app)/incidents/[id]/page.tsx
│   │   ├── (app)/priorities/page.tsx
│   │   ├── (app)/assignments/page.tsx
│   │   ├── (app)/notifications/page.tsx
│   │   ├── (app)/admin/{users,teams,settings}/page.tsx
│   │   ├── api/health/route.ts
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── proxy.ts
│   ├── components/
│   │   ├── ui/                   # shadcn-generated components
│   │   ├── layout/
│   │   ├── maps/
│   │   ├── incidents/
│   │   ├── assignments/
│   │   └── common/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── incidents/
│   │   ├── verification/
│   │   ├── priority/
│   │   ├── assignments/
│   │   ├── reports/
│   │   └── notifications/
│   ├── lib/
│   │   ├── supabase/{client,server,proxy}.ts
│   │   ├── firms/               # NASA FIRMS ingestion / adapters
│   │   ├── domain/
│   │   ├── auth/
│   │   ├── validations/
│   │   └── utils/
│   ├── types/{database.types,domain}.ts
│   └── test/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   ├── tests/
│   └── functions/sync-firms/
├── public/
└── docs/{decisions,runbooks,architecture}/
```

*Implementation note:* Co-locate each feature's actions, validators, data access and tests; do not scatter all business logic among page components.

---

## 11. Testing, observability, privacy, and security

### 11.1 Test pyramid

**Unit:** priority engine unknowns/versioning, source-specific FIRMS parsers, sensor-aware deduplication, date conversion, status-machine transitions, Zod forms and incident formatting.

**Integration:** Supabase RLS read/write matrix by role and district, trusted ingest idempotency, multi-table verify/assign/override transactions, private bucket access, stale-version conflict, notification dedupe, failed API recovery, partial/empty feed behavior.

**E2E:** login/register restrictions, dashboard filter + marker/detail, verify with reason, priority override with reason, assign eligible PIC, field note and timeline, denied operations, demo/live separation, permission changes, responsive keyboard navigation.

**Acceptance test scenario:** seed a synthetic observation as DEMO, create incident, attach report/photo, choose `needs_more_information`, run a proposed priority recommendation, override with authorized reason, assign PIC, update progress, inspect chronological audit history. Separately run a live ingestion with a valid MAP_KEY against approved coverage and verify that timestamps/provenance appear.

### 11.2 Operational dashboards

Capture `ingest_runs` success/error, source response health, consecutive failures, stale feed threshold, jobs overlap, source schema drift, duplicate rate, unmatched district fraction, queue age, unassigned high-priority incidents, action latency, authorization denies (with privacy protections), and database performance/index health. Surface last successful upstream sync and current degraded state in UI.

### 11.3 Security checklist

- Every exposed public-schema table has purposeful GRANTs and tested RLS policies; no accidental anonymous operational access.
- Service/secret keys never reach Client Components, public env vars, logs, or error pages.
- Do not authorize via `getSession().user`; use validated claims/user and database checks.
- Cron endpoint verifies private credentials, blocks GET if unintended, prevents replays/overlapping jobs, applies timeouts/rate limits.
- Input Zod validation at trust boundaries; server-side MIME/size limits; XSS-safe React rendering; CSP and secure headers assessed.
- Storage access is per incident scope; signed URLs short-lived; no public evidence directory.
- Account management, role changes, verification, override and assignment are audited and have anti-CSRF/Origin considerations where relevant.
- Sanitized logs and retention policy; PII access limited. No automatic sharing of citizen/officer reports with an external LLM.
- Backup/restore drill before operational deployment; stage migrations, have rollback plan. Never claim operational reliability without on-call/support ownership.

---

## 12. Delivery plan and gates

Use `IMPLEMENTATION_CHECKLIST.md` as the execution source of truth. Recommended releases:

| Phase | Outcome | Acceptance gate |
|---|---|---|
| 0 — decisions & inventory | Confirm roles, admin boundaries, ingestion source, staging | ADRs and risk caveats documented |
| 1 — foundation | Next.js boot, shadcn theme, Auth, protected layout, RLS migration | Unauthenticated and pending-user denial tested |
| 2 — geodata/data model | West Kalimantan polygons, PostGIS, basic incidents/observations, demo fixtures | Deterministic query & map/list browse work |
| 3 — ingestion | Private FIRMS job, CSV validation, idempotency, sync health | Dedupe/errors/provenance verified; no false live data |
| 4 — verification | Detail page, reports/evidence, decisions, audit | All three decisions with human reason and history |
| 5 — priority | Explainable rule-versioned engine, board, override | Unknowns remain unassessed; rules approved before active use |
| 6 — assignment | Team eligibility, PIC assignment, notes/timeline | Unauthorized assignment prohibited; history intact |
| 7 — notifications & AI | Internal notifications; optional AI-only report summary | Privilege isolation and AI-off fallback |
| 8 — hardening | RBAC matrix, load, accessibility, deploy, ops docs | Passing automated suite and human UAT |

**Release criterion:** No production designation without agency confirmation of boundary data, priority/risk logic, data freshness wording, credential management, roles, RLS, backups and incident-response ownership.

---

## 13. Required deliverables per implementation phase

For each slice, coding agents should provide:

1. A brief implementation plan and any open decisions.
2. New/modified code, focused migrations and generated DB types if applicable.
3. Tests covering success, denied permission, invalid input and degraded modes.
4. Exact local run/test commands and command outputs; no fabricated pass claims.
5. Screenshot or manual UX checklist for user-facing changes.
6. Database/security explanation and provenance of fixtures vs live data.
7. Updated checklist status, ADR where appropriate and unresolved follow-ups.

Use feature branches and code review. Avoid building all phases at once without validated foundations.

---

## 14. Agent starter prompt (copy into coding AI after adding these files)

```text
Act as my staff-level Next.js/Supabase engineer for FireOps.
Read AGENTS.md, FIREOPS_MASTER_SPEC.md and IMPLEMENTATION_CHECKLIST.md
fully before editing code. First inspect the repo and identify existing
framework/package versions, installed skills, and Supabase setup.

Goal for this iteration: implement ONLY Phase 1 (foundation) from the
implementation checklist. Show a plan and commands before performing
any external install, DB reset or schema migration. Follow modern Next.js
App Router and official Supabase SSR auth patterns. Use strict TypeScript,
shadcn/ui and accessible Indonesian UI. Keep all business operations
behind server-side validation and RLS. No mock values called LIVE and
no AI automated fire verification. Add tests for unauthorized access and
report exact commands and outcomes. Stop after Phase 1 and give me the
next-step checklist. Ask me when a real project credential or scope
approval is required; never invent one.
```

---

## 15. Sources and version-verification links

**Project source** (supplied by user): `FLOW FIREOPS v1(1).pdf`, 3 pages. All items labeled SOURCE REQUIREMENTS above derive from it. Technology decisions, data schema, roles, UI patterns, example intervals, and workflows beyond that PDF are recommendations requiring review.

**Official technical references consulted 2026-10-16:**

- Next.js installation / App Router: <https://nextjs.org/docs/app/getting-started/installation>
- Next.js Proxy file convention: <https://nextjs.org/docs/app/api-reference/file-conventions/proxy>
- Supabase + Next.js quickstart: <https://supabase.com/docs/guides/getting-started/quickstarts/nextjs>
- Supabase SSR auth: <https://supabase.com/docs/guides/auth/server-side>
- Supabase Server Auth tutorial: <https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs>
- Supabase Agent Skills: <https://supabase.com/docs/guides/ai-tools/ai-skills>
- Supabase RLS: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase PostGIS: <https://supabase.com/docs/guides/database/extensions/postgis>
- Supabase scheduled Edge Functions: <https://supabase.com/docs/guides/functions/schedule-functions>
- NASA FIRMS Area API: <https://firms.modaps.eosdis.nasa.gov/api/area/>
- NASA FIRMS Data Availability: <https://firms.modaps.eosdis.nasa.gov/api/data_availability/>
- MapLibre GL JS examples: <https://www.maplibre.org/maplibre-gl-js/docs/examples/>
- shadcn/ui Next.js installation: <https://ui.shadcn.com/docs/installation/next>
- UI UX Pro Max official repository: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>
- Vercel agent skills: <https://github.com/vercel-labs/agent-skills>
- Next.js agent skills current home: <https://github.com/vercel/next.js/tree/canary/skills>

**Maintenance rule:** The version landscape changes. Before future installs, read official docs and inspect your lockfile; do not assume this 2026-10-16 snapshot remains current.
