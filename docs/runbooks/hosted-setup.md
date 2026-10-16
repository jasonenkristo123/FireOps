# Connect the configured hosted Supabase project

`pnpm dev` uses the existing `.env.local`. `pnpm dev:local` deliberately uses the
separate Docker database. App API keys authenticate requests; they do not create
Postgres tables. Never copy keys, access tokens, or database passwords into chat.

Read-only diagnosis:

```bash
pnpm db:check
```

The check loads `.env.local`, queries zero rows, reports missing/protected tables,
and never prints credentials. Missing tables produce a nonzero exit status.

## Initial schema through Supabase SQL Editor

After reviewing and approving the target and migrations, open that project's
**SQL Editor** and execute [initial-schema.sql](../../supabase/setup/initial-schema.sql).
It is generated from migrations 001–007, creates 17 public FireOps tables with
RLS/functions and a private evidence bucket, records CLI-compatible migration
history, and reloads the API schema cache. It runs in one transaction and refuses
an existing FireOps schema; use incremental CLI migrations for an existing setup.
It creates no demo fixtures, production administrator or real boundaries.

Regenerate the file after changing migrations with `pnpm db:prepare-hosted`.
Its initial install and refusal to rerun were validated on an isolated local
Supabase database; all 325 database assertions and schema lint passed.

## CLI alternative

Authenticate on your own machine with `pnpm exec supabase login`. Link the project
matching `.env.local`, review remote history and run a dry-run first, following
[database-deployment.md](database-deployment.md). Apply only the approved pending
migration set. The existing `SUPABASE_SECRET_KEY` is an application server key,
not a Supabase CLI access token or database password.

After installation run `pnpm db:check` and restart `pnpm dev`. Follow
[direct registration setup](direct-registration.md) to disable Confirm Email in
hosted Supabase. New accounts start as active viewers; existing account roles
and status are preserved. First-admin provisioning and district grants remain
separate operations. Users cannot assign their own roles or districts.

## Editor errors

Use the workspace TypeScript version (5.9.3), then restart the editor's TypeScript
server. VS Code/Cursor: **TypeScript: Select TypeScript Version → Use Workspace
Version**, then **TypeScript: Restart TS Server**. Workspace settings select the
installed SDK. `pnpm typecheck:editor` runs Next.js plugin diagnostics that plain
`tsc` misses. Four metadata-export diagnostics (71008) were fixed by explicitly
typing the auth pages' exports as Next.js `Metadata`.
