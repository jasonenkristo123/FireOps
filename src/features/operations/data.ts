import "server-only";
import { requireAccountAccess } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { boundariesSchema, type Filters } from "./domain";
export async function browse(f: Filters, onlyMine = false) {
  const access = await requireAccountAccess();
  const db = await createClient();
  const since =
    f.time === "all"
      ? null
      : new Date(
          Date.now() - { day: 1, week: 7, month: 30 }[f.time] * 86400000,
        ).toISOString();
  // Inner relationship filters observations by sensor without transferring entire datasets.
  let cases = db
    .from("incidents")
    .select(
      "*, districts!inner(name,code), assignments(owner_id,ended_at,teams(name)), incident_observations!inner(hotspot_observations!inner(source))",
      { count: "exact" },
    )
    .eq("data_mode", f.mode);
  let plainCases = db
    .from("incidents")
    .select(
      "*, districts!inner(name,code), assignments(owner_id,ended_at,teams(name))",
      { count: "exact" },
    )
    .eq("data_mode", f.mode);
  let points =
    f.verification || f.priority || f.status
      ? db
          .from("hotspot_observations")
          .select(
            "id,latitude,longitude,detected_at,source,instrument,confidence_raw,confidence_kind,district_id,data_mode, districts!inner(name,code), incident_observations!inner(incidents!inner(verification_status,final_priority,current_status))",
            { count: "exact" },
          )
          .eq("data_mode", f.mode)
      : db
          .from("hotspot_observations")
          .select(
            "id,latitude,longitude,detected_at,source,instrument,confidence_raw,confidence_kind,district_id,data_mode, districts!inner(name,code)",
            { count: "exact" },
          )
          .eq("data_mode", f.mode);
  if (f.district) {
    cases = cases.eq("districts.code", f.district);
    plainCases = plainCases.eq("districts.code", f.district);
    points = points.eq("districts.code", f.district);
  }
  if (since) {
    cases = cases.gte("created_at", since);
    plainCases = plainCases.gte("created_at", since);
    points = points.gte("detected_at", since);
  }
  if (f.source) {
    cases = cases.eq(
      "incident_observations.hotspot_observations.source",
      f.source,
    );
    points = points.eq("source", f.source);
  }
  if (f.verification)
    points = points.eq(
      "incident_observations.incidents.verification_status",
      f.verification,
    );
  if (f.priority)
    points = points.eq(
      "incident_observations.incidents.final_priority",
      f.priority,
    );
  if (f.status) {
    points = points.eq(
      "incident_observations.incidents.current_status",
      f.status,
    );
    cases = cases.eq("current_status", f.status);
    plainCases = plainCases.eq("current_status", f.status);
  }
  if (f.verification) {
    cases = cases.eq("verification_status", f.verification);
    plainCases = plainCases.eq("verification_status", f.verification);
  }
  if (f.priority) {
    cases = cases.eq("final_priority", f.priority);
    plainCases = plainCases.eq("final_priority", f.priority);
  }
  if (f.q) {
    const safe = f.q.replace(/[^\p{L}\p{N} _-]/gu, "");
    if (safe) {
      cases = cases.or(`reference.ilike.%${safe}%,title.ilike.%${safe}%`);
      plainCases = plainCases.or(
        `reference.ilike.%${safe}%,title.ilike.%${safe}%`,
      );
    }
  }
  if (onlyMine) {
    const mine = await db
      .from("assignments")
      .select("incident_id")
      .eq("owner_id", access.profile.id)
      .is("ended_at", null);
    if (mine.error) throw new Error("Penugasan tidak dapat dimuat.");
    const ids = mine.data.map((x) => x.incident_id);
    cases = cases.in("id", ids);
    plainCases = plainCases.in("id", ids);
  }
  const selected = f.source ? cases : plainCases;
  const [incidents, observations, districts, health, summary, boundaries] =
    await Promise.all([
      selected
        .order(f.sort, { ascending: f.direction === "asc" })
        .order("created_at", { ascending: true })
        .order("id")
        .range((f.page - 1) * 25, f.page * 25 - 1),
      points
        .order("detected_at", { ascending: false })
        .order("id")
        .range((f.observation_page - 1) * 100, f.observation_page * 100 - 1),
      db
        .from("districts")
        .select("id,code,name,data_mode,source,boundary_version")
        .eq("data_mode", f.mode)
        .order("name"),
      db.rpc("feed_health", { requested_mode: f.mode }),
      db.rpc("operations_summary", {
        requested_mode: f.mode,
        since_at: since ?? undefined,
        district_code: f.district,
        feed_source: f.source,
      }),
      db.rpc("district_features", { requested_mode: f.mode }),
    ]);
  if (
    incidents.error ||
    observations.error ||
    districts.error ||
    health.error ||
    summary.error ||
    boundaries.error
  )
    throw new Error(
      "Data operasional tidak dapat dimuat. Hubungi administrator untuk memeriksa koneksi dan pembaruan aplikasi.",
    );
  return {
    access,
    incidents: incidents.data ?? [],
    observations: observations.data ?? [],
    districts: districts.data ?? [],
    health: health.data ?? [],
    summary: summary.data?.[0],
    boundaries: boundariesSchema.parse(boundaries.data),
    count: incidents.count ?? 0,
    observationCount: observations.count ?? 0,
  };
}
