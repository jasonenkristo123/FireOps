import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { z } from "zod";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const config = z.object({ url: z.url(), key: z.string().min(1) }).safeParse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
if (!config.success) {
  console.error(
    "Missing/invalid public Supabase settings in .env.local. No values printed.",
  );
  process.exit(1);
}
const tables = [
  "profiles",
  "profile_district_grants",
  "access_audit_logs",
  "districts",
  "hotspot_observations",
  "incidents",
  "incident_observations",
  "ingest_runs",
  "teams",
  "team_members",
  "assignments",
  "incident_events",
  "verification_decisions",
  "priority_assessments",
  "reports",
  "evidence_files",
  "notifications",
];
async function probe(path) {
  try {
    const response = await fetch(new URL(path, config.data.url), {
      headers: { apikey: config.data.key },
      signal: AbortSignal.timeout(10000),
    });
    let code = "";
    if (!response.ok) {
      try {
        code =
          z.object({ code: z.string().optional() }).parse(await response.json())
            .code ?? "";
      } catch {}
    }
    return { status: response.status, code };
  } catch {
    return { status: 0, code: "NETWORK_UNAVAILABLE" };
  }
}
const auth = await probe("/auth/v1/settings");
console.log(
  `Configured Supabase Auth: ${auth.status === 200 ? "reachable" : `unavailable (${auth.status})`}`,
);
const results = await Promise.all(
  tables.map(async (table) => ({
    table,
    ...(await probe(`/rest/v1/${table}?select=*&limit=0`)),
  })),
);
let missing = 0;
let unavailable = 0;
for (const row of results) {
  if (row.code === "PGRST205" || row.code === "42P01") {
    missing++;
    console.log(`${row.table}: MISSING from exposed schema`);
  } else if (row.status === 200 || row.code === "42501")
    console.log(
      `${row.table}: present${row.code === "42501" ? " (anonymous access denied as intended)" : ""}`,
    );
  else {
    unavailable++;
    console.log(`${row.table}: unable to verify (${row.code || row.status})`);
  }
}
if (missing)
  console.log(
    "Apply reviewed migrations to the hosted project; .env.local API keys do not create tables. See supabase/setup/initial-schema.sql (initial install only).",
  );
console.log("Read-only check; no credentials or table rows printed.");
process.exitCode = missing || unavailable || auth.status !== 200 ? 1 : 0;
