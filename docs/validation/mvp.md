# Connected MVP validation — 2026-10-16

Implemented the existing Next.js/Supabase architecture without replacing Auth,
package versions or Biome. Local migrations 004–006 add controlled incident
transactions, immutable decisions/events/reports/evidence/priority history,
version checks, teams/assignments, mode-isolated durable notifications, private
Storage and private server-only ingestion. Generated types reflect actual schema.
No original migration 001–003 was rewritten or applied remotely.

| Command | Result |
| --- | --- |
| `pnpm exec supabase migration up --local` | 004, 005, 006 applied locally |
| `pnpm db:types` | Types regenerated; atomic replacement now preserves existing file on CLI failure |
| `pnpm lint` | Pass, Biome 72 files, no warnings/fixes |
| `pnpm typecheck` | Pass |
| `pnpm test` | 31 tests, 4 files pass |
| `pnpm build` | Pass; subsequently rebuilt successfully by the final isolated browser suite |
| `pnpm db:test` | 312 pgTAP assertions, 3 files pass |
| `pnpm db:lint` | No warnings/schema errors |
| `pnpm db:test:migrations` | Six migrations replayed cleanly; then-current 301 assertions + DB lint pass; temporary project removed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` | 8 tests pass, 56.5 seconds, production server and loopback Supabase |
| Local demo setup with generated, undisclosed fixture password | Pass; @example.test identities and DEMO data only |
| Exact-value private credential scan: src + .next/static | Pass; zero files matched; no values printed |

Browser coverage preserves the six original Auth scenarios, then exercises:
coordinator login → dashboard → sourced observation → new incident → justified
human verification → justified manual priority → eligible team/officer assignment
→ report → private evidence upload and actual authorized signed download → officer
login → own assignment → progress → immutable timeline → recipient notification
read state → mobile 375px layout → viewer denial of write controls → source/status/
priority/search filters → priority/team/profile routes. Private ingestion missing
configuration returns 503; unauthenticated evidence returns 403.

SQL coverage includes all earlier role/geography/mode tests plus three decisions,
mandatory reasons, correction links, expected-version conflicts, unauthorized
creation/verification/priority/progress, eligible membership, atomic assignment,
recipient isolation, append-only history, Storage reads/uploads across roles and
areas, service-role inability to verify, private-job overlap/cooldown and source
correction/dedupe. All SQL test data rolls back. Browser/demo fixtures remain local
and are visibly synthetic. No live NASA request was executed.

Initial failures were resolved: obsolete Phase-2 lock assertions changed to test
controlled-RPC-only writes; browser selectors/read-state assertions corrected;
CLI telemetry sandbox failure required escalation; generated types are now written
atomically. Final results above come from corrected suites. Known limits and
pending service/policy approvals: [MVP runbook](../runbooks/mvp-local.md).

## Editor/hosted follow-up

The plain TypeScript build did not detect four Next.js editor-plugin TS71008
metadata annotations. Reproduced these using the installed Next.js language
service plugin, fixed all four Auth pages and added `typecheck:editor`. Final
plugin scan: 55 sources, zero diagnostics. Lint, typecheck, 31 unit tests and
production build pass after the change. No error suppression was introduced.

The actual `.env.local` hosted Auth endpoint returns HTTP 200; all 17 expected
FireOps relations return PGRST205 (missing from exposed API schema). CLI has no
management access token; no database URL/password is configured. Prepared a
transactional SQL Editor installation file. `pnpm db:test:hosted-setup` applied it
to a disposable local database, safely rejected a second run, verified migration
history compatibility, then passed all 312 assertions and schema lint. No remote
schema changes occurred. See [hosted setup](../runbooks/hosted-setup.md).
