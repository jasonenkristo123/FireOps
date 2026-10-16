# NASA source preview and operational priority markers

Date: 2026-10-16. Engineering response to the owner's request to see real NASA
coordinates and diagnose why the dashboard has no points. This extends the
earlier local-package scope to a bounded read-only NASA diagnostic and a
verified-administrator source preview. It does not approve operational geography,
priority thresholds, remote imports, staffing changes or a recurring job.

The owner confirmed that the administrator screen is accessible. A subsequent
read-only inspection found no LIVE districts, observations or ingestion runs;
BBOX was still empty, while the scheduler token had been configured by the
owner. A bounded two-UTC-date request using the candidate BIG-derived rectangle
returned HTTP 200 and 1,238 observations accepted by the existing sensor-aware
CSV parser. The count covers the request rectangle, including surrounding areas;
it is not a count of confirmed fires or of points exclusively within Kalbar.

Provide `/admin/observations` as an explicit upstream-source preview. It requires
the existing confirmed, non-anonymous, active administrator guard before any
data retrieval. Opening/prefetching its initial screen does not contact NASA.
The operator chooses the candidate rectangle or configured BBOX and submits a
form. A shared server cache bounds requests to roughly one refresh per five
minutes per selected extent and server deployment/cache instance; it is not a
distributed scheduler or a guarantee across multiple deployments. No browser
polls NASA, and no MAP_KEY is serialized to the client.

The preview uses public upstream satellite observations only. It does not query
private operational rows with a service identity, bypass district RLS, create
database observations/incidents, grant account scope or represent an ingestion
success. Observation times and actual upstream retrieval time are shown
separately from the operational database's last successful sync. Raw points
have `unassessed` priority and no create/verification/assignment action.

Factor the existing bounded upstream reader into a server-only module shared
by preview and trusted ingestion. Preserve two attempts, timeout, redirect
rejection, bounded streaming, sensor-specific validation and sanitized errors.

Fix a separate operational rendering issue: observations previously always
used `unassessed`, even when linked to a manually prioritized incident. Fetch
linked incident projections with the caller's normal RLS and display the highest
existing manual priority if several authorized incidents are linked. Label that
choice, preserve the original observation time/confidence, and open the actual
incident. This is a display projection of human decisions, not automatic scoring.
Both renderers now use all five manual-priority colors consistently.

No agency rules, risk layers, permission policies, database schema or environment
values are changed by this slice. The owner continues to defer test suites and
Playwright; compiler/build checks do not imply browser acceptance.
