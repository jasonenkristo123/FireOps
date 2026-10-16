# Direct registration: deployment and testing

Account policy: [ADR 0003](../decisions/0003-direct-registration.md).

## Pending hosted change

Review `supabase/migrations/20261016000700_direct_registration.sql`.
It changes new profile defaults to viewer/active and copies the signup name
through the existing restricted trigger. It does not alter RLS, assign districts,
promote existing accounts, change suspensions, or create administrators.

Use the incremental CLI path for an existing FireOps database. Never rerun
`supabase/setup/initial-schema.sql` on an existing project.

```bash
# Inspect the intended project and applied history before any write:
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run
# After owner review/approval, apply only the displayed pending migrations:
pnpm exec supabase db push --linked
```

If CLI linking is not configured, first run `pnpm exec supabase login`, then
`pnpm exec supabase link --project-ref YOUR_PROJECT_REF`. Do not put a database
password on a command line or paste CLI status/keys into chat. Review **every**
pending migration; the preview may include earlier migrations if remote history
has not recorded them. Do not repair history without verifying the actual schema.

In the correct hosted project's Supabase Dashboard, open Authentication →
Sign In / Providers → Email and turn **Confirm Email** off, then save. Supabase
labels/navigation may vary; the setting is described in the
[official Auth configuration documentation](https://supabase.com/docs/guides/auth/general-configuration).
No hosted configuration is changed by editing `supabase/config.toml`; that file
controls the local stack. The app reports configuration mismatch if signup
returns no session instead of claiming that signup completed successfully.

Previously pending FireOps profiles retain their role/status. Use an existing
administrator's `/admin/users` screen to set the selected account's role,
active status and allowed districts, with a reason. A newly registered account
starts active automatically. Accounts registered under the earlier confirmation
policy may still need explicit Auth confirmation by the owner in Authentication
→ Users; do not bulk-confirm users or overwrite existing roles. First-admin
bootstrap is covered in `database-deployment.md`.

## Acceptance walkthrough

1. Open `/register`; enter name, email and a password of at least 12 characters.
2. Submit **Daftar akun**. The app signs in immediately and opens `/dashboard`.
3. Before district assignment, verify the welcome message includes the name,
   viewer role and explanation that no area has been assigned. Profile editing
   and logout work; incident/observation data are unavailable.
4. Log out, then log back in with the same email/password. No confirmation link
   is needed. An expired old email link does not prevent password login.
5. As an existing admin, open `/admin/users`, select the account, choose role
   and active status, assign approved catalogue districts, and provide a reason.
6. Refresh the user's dashboard: only granted districts are visible. A viewer
   still cannot verify incidents, change priority, assign staff, or change roles.
7. Exercise password recovery separately: it still requires a recovery email.
8. Suspend the account and refresh; access is denied on the existing session.

## Local validation

Local credentials are obtained from the loopback-only CLI helper, not `.env.local`.
Restart the local Supabase stack after changing local Auth configuration; do not
reset the database. `pnpm db:start` suppresses CLI credential output.

```bash
pnpm exec supabase migration up --local
pnpm db:test
pnpm db:lint
pnpm db:test:migrations
pnpm lint
pnpm typecheck
pnpm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e
```

The browser suite builds production output against local Supabase before testing.
It tests immediate registration, saved name, default viewer, absent area grants,
failed privilege escalation, profile editing, login, recovery and suspension,
as well as the existing incident workflows.
