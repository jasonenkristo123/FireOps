# Direct registration validation — 2026-10-16

Owner decision: name/email/password signup, viewer by default, no email
confirmation step; administrator manages subsequent role/area changes.
See ADR 0003 and `docs/runbooks/direct-registration.md`.

Changes: required accessible name field with server validation, allowlisted
signup metadata, immediate session/dashboard redirect, a welcome state for
viewers without districts, profile editing before area assignment, clear old-link
wording, active default in admin access form, local Auth configuration and
additive migration 007. Existing roles/status are preserved. District RLS and
human-only incident verification are retained.

| Command | Result |
| --- | --- |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | 35 unit tests pass |
| `pnpm build` | Pass |
| `pnpm exec supabase migration up --local` | Migration 007 applied locally |
| `pnpm db:types` | Types regenerated locally |
| `pnpm db:test` | All 325 SQL assertions pass, including registration/metadata/role/jurisdiction tests |
| `pnpm db:lint` | No schema errors/warnings |
| `pnpm db:test:migrations` | Clean seven-migration replay, 325 assertions and schema lint pass |
| `pnpm db:prepare-hosted` | Initial-install SQL regenerated offline from seven migrations |
| `pnpm db:test:hosted-setup` | Fresh local install, refused rerun, CLI history compatibility, 325 assertions and schema lint pass |
| `sha256sum -c docs/validation/database-migrations.sha256` | All seven checksums match; migrations 001–006 unchanged |
| Private credential exact-value scan of source and generated browser files | 86 files scanned; zero matches; values suppressed |

The original access test assumed the local database had no prior admin audit
records. Its audit assertions now target its synthetic actor, so demo fixtures
and earlier local tests do not affect the result. Pending-role fixtures are now
created explicitly so the historical denied-role matrix still exercises pending
accounts after the registration default changed.

Local Supabase was restarted with its existing data preserved to load the new
Auth configuration. A startup retry was needed after local containers could not
resolve their database service; subsequent local SQL tests passed. No local
reset, remote configuration change, hosted data write, NASA request or deployment
was performed. Hosted rollout still requires owner approval and disabling
Confirm Email in the intended hosted project.
