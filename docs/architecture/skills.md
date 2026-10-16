# Project-local coding skills

Installed 2026-10-16 for Codex under `.agents/skills/`. These are source guidance,
not application imports. Reviewed the SKILL.md files before applying guidance;
project security requirements take precedence. Newly installed skills become
available to automatic discovery on the next assistant turn.

| Directory | Upstream | Installation |
| --- | --- | --- |
| `supabase-postgres-best-practices` | [Supabase](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices) | Codex skill-installer helper, project-local destination |
| `react-best-practices` | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | Codex skill-installer helper |
| `web-design-guidelines` | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Codex skill-installer helper |
| `ui-ux-pro-max` | [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `pnpm dlx ui-ux-pro-max-cli init --ai codex` |

Upstream files are retained locally for review and reproducibility. Lint excludes
vendored skills. Review future changes as third-party source dependencies.

Applied database guidance: explicit grants, RLS, indexed foreign keys, private
authorization helper, fixed security-definer search paths and audited atomic writes.
Applied React guidance: Server Components, narrow Client Components, per-request
identity deduplication and parallel independent profile/grant reads.

Design searches:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py 'emergency operations dashboard accessible neutral' --design-system -p FireOps -f markdown
python3 .agents/skills/ui-ux-pro-max/scripts/search.py 'government operations tool' --design-system -p FireOps -f markdown
```

The first search mixed in sales-conversion patterns and alert-red surfaces;
those did not fit this application. The narrower second result's accessible
government palette and focus/form guidance informed the auth screens. No
generated recommendation establishes operational policy or scientific risk rules.

Framework references: bundled Next.js 16.4.2 docs for `proxy`, async `cookies`,
Server Functions and authentication with Cache Components; current
[Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
