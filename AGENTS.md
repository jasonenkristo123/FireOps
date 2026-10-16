# AGENTS.md — Binding guidance for FireOps coding agents

You are working on **FireOps**, an operations-focused wildfire hotspot monitoring and incident coordination tool for West Kalimantan, Indonesia.

## Must read before work

1. `FIREOPS_MASTER_SPEC.md` — canonical product + architecture specification.
2. `IMPLEMENTATION_CHECKLIST.md` — gated execution order and acceptance criteria.
3. `docs/decisions/` — approved ADRs (when available).
4. Installed Next.js/Supabase framework documentation; inspect package versions first.

In any conflict, apply security/safety requirements first, then approved stakeholder decisions, then canonical spec, then general development preferences. Never overwrite an approved business policy with an invented AI default.

## Mission and safety constraints

- NASA FIRMS hotspots are **satellite observations**, not confirmed wildfires.
- **Only a verified, authorized human** may mark an incident `confirmed`, `not_confirmed` or `needs_more_information`; record rationale, identity and timestamp.
- Priority is a documented ruleset recommendation with visible uncertainty, not an AI dispatch order. If rules are unapproved, use `unassessed`.
- Red/yellow district zones require agency-approved aggregation logic and source/geographic boundaries. Do not fabricate risk layers.
- Separate `demo` and `live` at database/query/UI levels. Never label simulation as live.
- Show actual observation timestamps and last successful NASA sync; show staleness/errors.
- Never ship secret keys to client; default-deny database access; enable/test RLS and Storage policies.
- Maintain append-only verification, priority override, assignment and event history.
- Respect role AND permitted jurisdiction; frontend UI gating does not replace server/db authorization.
- Indonesian UI wording should be precise and accessible; code identifiers remain in English.

## Development rules

1. Before starting a task: inspect repository, relevant files, migrations, lockfile and existing tests. Summarize expected changed files, dependencies and risks.
2. Implement one phase or thin vertical slice; avoid speculative all-at-once scaffolding.
3. TypeScript strict; no unreviewed `any`; Zod parse external/request payloads; typed Supabase responses.
4. Prefer React Server Components. Keep Client Components focused on interaction; MapLibre browser-only. Don't fetch NASA from browser.
5. Use `@supabase/ssr` cookie-aware server/client helpers and Next.js `proxy.ts` convention consistent with installed version.
6. Use database migrations rather than dashboard-only schema edits; regenerate TS types after schema changes.
7. Test RLS with anon, pending, viewer, field officer, coordinator and admin users — with out-of-area cases.
8. Complex state transitions and multi-table operations must be atomic, version-safe and audited.
9. Check labels for scientific uncertainty. Different NASA sensors have different confidence fields. Do not normalize missing confidence to zero.
10. Design via shadcn/ui + Tailwind + UI UX Pro Max guidance, but operational clarity overrides decoration. WCAG 2.2 AA target.
11. Add fixture provenance and scenario tests: source data versus simulation.
12. Never execute destructive remote DB operations, run costly services or overwrite config without explicit user permission.
13. Report lint/typecheck/tests/build outcomes honestly; if blocked, state why and provide a reproducible path.
14. Update the implementation checklist only for demonstrated completed work.

## Tech defaults

- Next.js App Router, TypeScript, `src/` layout, pnpm, Tailwind, shadcn/ui, Lucide.
- Supabase Auth, Postgres, PostGIS, Storage, Realtime; RLS and signed private evidence access.
- MapLibre GL JS; scheduled server-side FIRMS API ingestion; no per-browser NASA polling.
- `zod` + `react-hook-form`; `csv-parse` on server; Vitest + React Testing Library + Playwright.
- No ORM initially. Optional AI summarize-only feature off by default.

## Standard response structure after each coding step

**Implemented:** files and behavior.  
**Migrations / permissions:** database and RLS changes.  
**Validation:** exact commands run and results.  
**Security/data checks:** secrets, demo/live, human-only actions, provenance.  
**Next gate:** next checklist items and decisions needed.

## First coding task

Begin with **Phase 0 discovery + Phase 1 foundation**, not a full application build. Ask for an actual Supabase project and NASA credentials only when the relevant phase needs them. Do not invent keys or authorization outcomes.
