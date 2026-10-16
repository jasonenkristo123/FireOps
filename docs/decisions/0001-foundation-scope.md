# Foundation scope and unresolved operational policy

Date: 2026-10-16. Status: engineering implementation; agency policy approval remains OPEN.

The repository began with Next.js 16.4.2, React 19.3.0, strict TypeScript,
Tailwind 4 and Biome 2.4.2. `START-HERE.md` is the supplied starter document;
there is no `START_HERE.md`. The source PDF referenced by the master spec is
absent, so source interpretation cannot be independently verified.

This iteration implements Phase 0 discovery and Phase 1 only. Preserve the
existing framework versions, Cache Components and Biome linting rather than
re-scaffolding or adding a second linter. Replace the npm lockfile with pnpm.
Install the documented runtime/test dependencies, but generate only the
shadcn components needed for this slice. MapLibre, CSV parsing and query tools
are installed for later phases and are not loaded by authentication screens.

Use the spec's conservative pending-registration model as an engineering
restriction, not an approved staffing policy. New and existing Auth identities
receive pending profiles. No user metadata is trusted for roles or area grants.
Operational access requires a confirmed, non-anonymous Auth identity, active
database role and explicit district grant. Admin does not bypass geography.
The audited `set_account_access` RPC requires a verified active admin, a
different target, and a reason. No account is automatically made admin.
The first administrator requires a separately reviewed operator bootstrap.

District grants currently hold codes only; no real district codes, polygons or
operational data are seeded. Phase 2 must introduce an approved district
catalogue and foreign-key validation before real grants or data are loaded.
The SQL tests use a transaction-scoped probe table to verify district RLS;
this does not claim to test future incident or Storage policies.

Authentication pages use neutral surfaces, navy text, visible focus, 48px
form controls and Indonesian copy. UI UX Pro Max's government/accessibility
guidance informed the tokens. Use system fonts to keep local builds independent
of a font provider. Maps and risk-color semantics are outside this slice.

## Decisions still open

- Agency owner and workflow for identity vetting, role approval and first-admin bootstrap.
- Authoritative district boundaries/codes, provenance, version and license.
- Who may verify, assign, override and view sensitive evidence; role alone will not suffice.
- FIRMS sources, approved bbox, cadence and freshness thresholds.
- Priority rules and risk aggregation: keep `unassessed` and zone layer unavailable.
- Retention, deployment target, credential ownership, backups and operational support.

No hosted migration, hosted Auth request, ingestion, deployment, paid AI call,
fire verification or operational role assignment is authorized by this slice.
