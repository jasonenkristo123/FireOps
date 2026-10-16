# Map-first dashboard and workflow UI — 2026-10-16

Owner instruction: prioritize feature implementation; do not run test cases or
Playwright during this step. Existing migrations, environment values and access
policies are preserved.

## Changes

- `/dashboard` now renders the West Kalimantan basemap for active accounts even
  when they have no district grants. No operational records are supplied to an
  unscoped account. An access notice appears alongside the application instead
  of replacing the map. The normal dashboard defaults to LIVE; DEMO is explicit.
- Main content contains a map with an adjacent incident priority queue, visible
  district/time/status/priority controls, advanced source/verification/search
  filters, map/list views, actual observation and sync timestamps, and separate
  incident/detection counts. Metrics follow the map instead of pushing it down.
- MapLibre loads the configured map style. A 2D XYZ tile map supports zoom, pan,
  keyboard alternatives, markers, details and sourced district outlines when
  WebGL is unavailable or initial loading times out. Map tiles retain attribution;
  no risk polygons or substitute incident points are generated.
- `/priorities` has five priority columns, rationale, verification state,
  team/PIC information and links to assessment history. Counts explicitly refer
  to the loaded page rather than pretending the first 25 records are all cases.
- Active users can navigate read views without their account being silently
  redirected out of the app for missing districts. Database RLS still governs
  every operational query. Mutations retain the stronger operational guards.
- Incident detail provides local report excerpts, evidence gaps, private photo
  previews, and optional structured AI summaries with source report links.
  Field-condition notes accompany manual priority history.

## AI configuration

Local excerpts require no provider. External AI is disabled unless
`AI_SUMMARIZATION_ENABLED=true`, `AI_PROVIDER_API_KEY`, `AI_PROVIDER_MODEL`, and
`AI_PROVIDER_BASE_URL` are configured by the operator. The base URL is the approved
HTTPS API base, such as the provider's `/v1` path, not its full chat endpoint.
No endpoint/model is guessed from an API key, and no environment file was changed.

The server implements the [OpenAI-compatible chat completion structured-output
contract](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
The selected provider/model must support that contract. A coordinator/admin with
operational access must explicitly request and consent to sending authorized
report text. The request includes at most 20 reports and 30,000 text characters,
no evidence files or account identities. Input text is treated as untrusted data;
output is schema-validated, source IDs are checked, and source/time/model are
displayed. The summarizer has no mutation tools, uses a normal authenticated
database client, and never calls verification/priority/assignment RPCs.

The provider call has a 25-second timeout, bounded response size, and a per-process
request cooldown. Distributed hosting still needs an operator-approved provider
quota/rate limit. Results are advisory and transient; they are not saved as
verification evidence or final incident decisions.

## Actual environment state inspected read-only

- Supabase Auth reachable; all 17 expected tables present in the exposed schema.
- Configured OpenFreeMap style returns HTTP 200 and a valid v8 style document.
- Configured hosted database has **0 live districts / 0 demo districts** and
  **0 live observations / 0 demo observations**.
- `NASA_FIRMS_BBOX` and `NASA_FIRMS_SYNC_TOKEN` are empty.
- `AI_SUMMARIZATION_ENABLED=false`.

API keys alone do not import boundaries, grant district access, or run ingestion.
The basemap is independent of those conditions. Actual operational markers
require approved geography, explicit account grants and a completed NASA sync.
The private scheduler requires its token. Approved rules are still needed before
automatic priority scoring or red/yellow risk aggregation can be activated.

## Checks performed

- `pnpm db:check`: read-only connectivity/schema inspection; passed.
- `pnpm exec biome check --write ...`: formatting and lint for edited source.
- `pnpm typecheck`: passed after the feature edits.
- `git diff --check`: passed.
- Existing development server at port 3000 responds to dashboard/login requests.
- No unit tests, database test suite, Playwright run, browser automation,
  production build, NASA request, AI provider call, hosted write, role bootstrap,
  data import or migration was executed in this step.

Current feature changes have not undergone browser acceptance or regression
tests. Earlier validation documents describe their earlier revisions only.
