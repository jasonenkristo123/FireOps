# FireOps — Start Here

**This folder contains planning and agent instructions, not an installed/running application.** Add these files to the root of a newly scaffolded FireOps Next.js repository (or ask your AI agent to place them there).

## Read in this order

1. `FIREOPS_MASTER_SPEC.md` — full product definition, data model, architecture, UI, security, dependencies, test plan and copy/paste agent prompt.
2. `AGENTS.md` — compact always-on coding instructions for AI assistants.
3. `IMPLEMENTATION_CHECKLIST.md` — phased tasks and acceptance gates.
4. `.env.example` — public configuration and private credential placeholders.

## Fast start (commands run on YOUR development machine)

```bash
pnpm create next-app@latest fireops --yes --src-dir
cd fireops

# Copy the four project blueprint files into this repository root.

pnpm add @supabase/supabase-js @supabase/ssr \
  zod react-hook-form @hookform/resolvers maplibre-gl \
  lucide-react date-fns csv-parse @tanstack/react-query

pnpm add -D supabase vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom @playwright/test \
  prettier prettier-plugin-tailwindcss

pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge input textarea form select dialog alert-dialog sheet tabs table dropdown-menu tooltip popover command skeleton separator scroll-area sonner

# AI coding skills (skills are not app runtime dependencies):
pnpm dlx skills add supabase/agent-skills
pnpm dlx skills add vercel-labs/agent-skills --skill vercel-react-best-practices
pnpm dlx skills add vercel-labs/agent-skills --skill web-design-guidelines
pnpm dlx ui-ux-pro-max-cli init --ai codex   # use cursor/claude/universal if more appropriate

# Requires Docker:
pnpm exec supabase init
pnpm exec supabase start

# Set .env.local from .env.example (private keys must stay private).
pnpm dev
```

These commands are a recipe, not a record of commands run. Only use the `--ai` target for the AI coding tool you actually use. UI UX Pro Max scripts expect Python 3; install/approve third-party tools consciously. Use secure and scoped test accounts; do not paste credentials into chat.

## Paste this into your coding agent

```text
You are the lead engineer for FireOps. Read all of
FIREOPS_MASTER_SPEC.md, AGENTS.md, IMPLEMENTATION_CHECKLIST.md and
START_HERE.md. Inspect this repo and report what exists. Do not pretend
any dependencies, skills or database objects are already installed.
Build only Phase 0 and Phase 1 first. Show a short plan, ask for approval
for installs and remote database actions, create migrations and RLS
policies with tests, and report actual commands and validation results.
No hotspot may be shown as confirmed fire unless a human explicitly
verified it with reason and timestamp. Keep LIVE and DEMO distinct.
The end-user UI should be in Bahasa Indonesia by default.
```

## Operational decisions before a live release

Agency-approved geographic boundary source, risk zoning and prioritization rules, who can verify/assign, NASA MAP_KEY and source configuration, private evidence policy, and ownership of operations/support are **not supplied by the original PDF** and require human confirmation.

**Sources for install commands:** [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Supabase Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs), [Supabase Skills](https://supabase.com/docs/guides/ai-tools/ai-skills), [shadcn/ui](https://ui.shadcn.com/docs/installation/next), [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills).
