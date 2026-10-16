# Phase 2 database slice

Date: 2026-10-16. Status: local engineering implementation; remote deployment awaits owner approval.

Add migration `20261016000300_geospatial_core.sql` after the two existing access
migrations. Keep Phase 4–7 workflow schemas for their own approved, tested slices;
do not scaffold unapproved operational authority through permissive write policies.

## Geography and grants

PostGIS lives in `extensions`. A pre-existing installation in another schema
requires review; the migration does not relocate it automatically. Districts
store valid WGS84 MultiPolygons, source, license, version and explicit mode.
Live catalogue entries require a recorded approver and approval timestamp.
Only reviewed operator SQL may load boundaries; no public import RPC exists.
No real boundaries or live data are seeded. Test squares are explicitly synthetic.

Add the `profile_district_grants.district_code` foreign key as `NOT VALID` to
preserve pre-existing grants without fabricating a matching catalogue or silently
deleting access history. New grants must reference a district immediately. Both
the database authorization helper and the server access query require a catalogue
match, so unmatched historical strings grant no operational access. The remaining
validation gate requires reviewed boundary import and legacy-grant reconciliation,
then `VALIDATE CONSTRAINT` in a reviewed follow-up. The constraint is intentionally
reported as unvalidated, not presented as complete historical referential integrity.

`districts_for_point` uses invoker security and district RLS. It returns every
covering district, including multiple matches on a shared edge. It does not pick
an arbitrary winner or leak out-of-scope geography. Unmatched observations may
keep a null district and remain invisible to ordinary operational users; trusted
ingestion can inspect them. No team-only exception is granted before its policy
and team schema exist.

## Observations, incidents and ingest identity

Separate tables represent raw observations and human-managed incidents. Coordinates
generate their geographic points in longitude/latitude order. District/mode
composite foreign keys and point-covering triggers reject inconsistent geography.
Links reference both parents with the same explicit mode. Dedupe is unique per
`(data_mode, observation_key)`; Phase 3 must supply the sensor-aware observation key.
Unknown confidence remains nullable, retaining source-specific kind/raw values.

The service role can read the catalogue and select/insert/update observations
and ingest runs. It has no incident or incident-link grant, no human account
approval grant, and no delete grant. The application still creates no privileged
client. The future scheduler must authenticate before using its private identity.
Sync history has no end-user read policy yet; a scoped health projection is a
Phase 3 task. This avoids exposing source-wide internal errors by default.

Authenticated staff have area-scoped reads only. Pending, suspended, unconfirmed,
anonymous and out-of-area accounts are denied. All new tables enable RLS and
explicitly revoke default access before granting narrowly scoped capabilities.

Incident verification is constrained to `needs_more_information`, priority to
`unassessed`, and workflow state to `new`. Future migrations may unlock them only
alongside authorized, audited transaction functions and history tables. No actor,
including ingestion, is given a confirmation operation by this slice. Incidents
have revision counters, but version-safe workflow mutations remain future work.

## Validation approach

Upgrade the existing local database without resetting its data. Separately replay
all migrations in a disposable local Postgres project, run transactional pgTAP
tests and database lint, then remove only that temporary project's containers.
The browser suite explicitly loads synthetic demo catalogue fixtures and verifies
authentication against loopback services. Preserve the repository's staged work;
do not commit, push, link a remote project or modify hosted data in this iteration.
