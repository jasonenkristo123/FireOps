import type { browse } from "./data";
import { date, label, priorities } from "./domain";
import type { MapPoint } from "./map";

type Observation = Awaited<ReturnType<typeof browse>>["observations"][number];

export function observationMapPoint(observation: Observation): MapPoint {
  // Relationships are read with the caller's RLS, including mode and district
  // restrictions. A linked incident may be outside the loaded 25-case page.
  const linked = observation.incident_observations
    .flatMap((link) => (link.incidents ? [link.incidents] : []))
    .toSorted(
      (a, b) =>
        priorities.indexOf(a.final_priority) -
          priorities.indexOf(b.final_priority) ||
        a.reference.localeCompare(b.reference),
    );
  const incident = linked[0];
  return {
    id: observation.id,
    latitude: observation.latitude,
    longitude: observation.longitude,
    title: incident
      ? `${incident.reference} · ${label(incident.final_priority)}`
      : `Observasi ${observation.instrument} · Belum dinilai`,
    detail: `${date(observation.detected_at)} · ${observation.source} · Keyakinan ${observation.confidence_raw ?? "tidak tersedia"} (${observation.confidence_kind ?? "tidak tersedia"}) · ${incident ? `${label(incident.verification_status)} · Prioritas manual ${label(incident.final_priority)}${linked.length > 1 ? ` · ${linked.length} insiden terkait; ditampilkan prioritas manual tertinggi` : ""}` : "Belum menjadi konfirmasi kebakaran · Prioritas belum dinilai"}`,
    href: incident
      ? `/incidents/${incident.id}`
      : `/incidents/new?observation=${observation.id}`,
    kind: incident ? "linked_observation" : "observation",
    priority: incident?.final_priority ?? "unassessed",
  };
}
