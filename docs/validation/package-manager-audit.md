# Package manager audit — 2026-10-16

The project uses pnpm 11.28.5, pinned by `package.json`. All 37 declared packages
already resolved to pnpm's virtual store, but the original npm installation left
`node_modules/.package-lock.json`, physical transitive-package directories, and
old scaffold packages under `node_modules/.ignored`.

Replaced the mixed `node_modules` with a clean `pnpm install --frozen-lockfile`.
The install linked 482 packages from the existing store with no version changes.
Verified the pnpm lockfile's SHA-256 remained identical. Removed the old dependency
backup after verifying installation. The new tree has no npm hidden lockfile,
`.ignored` directory or physical unscoped npm package directories; declared
dependencies resolve through `.pnpm`.

The first backup attempt across filesystems was rejected without moving files;
the successful backup and cleanup used the project filesystem. An inventory
command required package-store access outside the sandbox and passed there.

Updated README, local runbook, starter guide and master-spec CLI examples to use
pnpm consistently. Existing npm/npx installations can remain for other projects.
`pnpm exec` runs installed tools; `pnpm dlx` runs one-off tools. Use pnpm for this
project's dependency changes and retain only `pnpm-lock.yaml`.

Validation after the clean install:

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed; lockfile checksum unchanged |
| `pnpm peers check` | No peer dependency issues |
| `pnpm lint` | Passed; 43 files |
| `pnpm typecheck` | Passed |
| `pnpm test` | 21 tests passed |
| `pnpm db:test` | 92 local pgTAP assertions passed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome-stable pnpm test:e2e` | Production build passed; 6 browser tests passed in 35.7 seconds |
| `git diff --check` | Passed |

No application-code, dependency-version, environment-file or migration changes
were needed for this cleanup. No hosted services or production data were changed.
Further implementation phases have not started.
