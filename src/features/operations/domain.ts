import { z } from "zod";
export const priorities = [
  "critical",
  "high",
  "medium",
  "low",
  "unassessed",
] as const;
export const decisions = [
  "confirmed",
  "not_confirmed",
  "needs_more_information",
] as const;
export const statuses = [
  "new",
  "triaging",
  "assigned",
  "in_progress",
  "monitoring",
  "resolved",
  "cancelled",
] as const;
export const labels: Record<string, string> = {
  critical: "Kritis",
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
  unassessed: "Belum dinilai",
  confirmed: "Dikonfirmasi petugas",
  not_confirmed: "Tidak terkonfirmasi",
  needs_more_information: "Perlu informasi",
  new: "Baru",
  triaging: "Penelaahan",
  assigned: "Ditugaskan",
  in_progress: "Dalam penanganan",
  monitoring: "Pemantauan",
  resolved: "Selesai",
  cancelled: "Dibatalkan",
  available: "Tersedia",
  busy: "Sibuk",
  unavailable: "Tidak tersedia",
  unknown: "Belum diketahui",
  verify: "Verifikasi manusia",
  priority: "Prioritas manual",
  assign: "Penugasan",
  status: "Perubahan progres",
  report: "Laporan petugas",
  evidence: "Lampiran bukti",
  severity: "Keparahan",
  urgency: "Urgensi",
  evidence_strength: "Kekuatan bukti",
  data_freshness: "Kebaruan data",
  insufficient: "Bukti belum memadai",
  partial: "Bukti sebagian",
  strong: "Bukti kuat",
  fresh: "Baru menurut petugas",
  aging: "Mulai lama",
  stale: "Kedaluwarsa menurut petugas",
  link: "Observasi ditautkan",
  created: "Insiden dibuat",
};
export function label(value: string) {
  return labels[value] ?? value;
}
export function date(value: string | null | undefined) {
  return value
    ? `${new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Pontianak",
      }).format(new Date(value))} WIB`
    : "Belum tersedia";
}
export const reasonSchema = z
  .string()
  .trim()
  .min(10, "Alasan minimal 10 karakter.")
  .max(2000);
export const filtersSchema = z.object({
  mode: z.enum(["demo", "live"]).catch("demo"),
  district: z.string().max(32).catch(""),
  time: z.enum(["all", "day", "week", "month"]).catch("week"),
  source: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{0,100}$/)
    .catch(""),
  verification: z.enum(["", ...decisions]).catch(""),
  priority: z.enum(["", ...priorities]).catch(""),
  status: z.enum(["", ...statuses]).catch(""),
  view: z.enum(["split", "map", "list"]).catch("split"),
  observation_page: z.coerce.number().int().min(1).max(10000).catch(1),
  q: z.string().max(100).catch(""),
  sort: z
    .enum(["updated_at", "created_at", "final_priority", "reference"])
    .catch("updated_at"),
  direction: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});
export type Filters = z.infer<typeof filtersSchema>;
export const boundariesSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: z.object({
        type: z.literal("MultiPolygon"),
        coordinates: z.array(
          z.array(z.array(z.tuple([z.number(), z.number()]))),
        ),
      }),
      properties: z.object({
        code: z.string(),
        name: z.string(),
        source: z.string(),
        license: z.string(),
        version: z.string(),
        mode: z.enum(["demo", "live"]),
      }),
    }),
  ),
});
export type DistrictBoundaries = z.infer<typeof boundariesSchema>;
export type Search = Promise<Record<string, string | string[] | undefined>>;
export async function readFilters(params: Search) {
  const raw = await params;
  return filtersSchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );
}
export function filterUrl(
  path: string,
  f: Filters,
  patch: Partial<Filters> = {},
) {
  return (
    path +
    "?" +
    new URLSearchParams(
      Object.entries({ ...f, ...patch }).map(([k, v]) => [k, String(v)]),
    ).toString()
  );
}
export const transitions: Record<
  (typeof statuses)[number],
  readonly (typeof statuses)[number][]
> = {
  new: ["triaging", "cancelled"],
  triaging: ["cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["monitoring", "resolved", "cancelled"],
  monitoring: ["in_progress", "resolved", "cancelled"],
  resolved: ["triaging"],
  cancelled: ["triaging"],
};
export function recommendPriority(inputs: {
  severity?: string;
  urgency?: string;
  evidence_strength?: string;
  data_freshness?: string;
}) {
  return {
    recommendation: "unassessed" as const,
    rulesetVersion: "unapproved",
    reasons: [
      "Aturan prioritas belum mendapat persetujuan instansi.",
      "Keparahan, urgensi, kekuatan bukti, dan kebaruan memerlukan penilaian petugas.",
    ],
    missingInputs: Object.entries({
      severity: "unknown",
      urgency: "unknown",
      evidence_strength: "insufficient",
      data_freshness: "unknown",
      ...inputs,
    })
      .filter(([, v]) => ["unknown", "insufficient", "stale"].includes(v))
      .map(([k]) => k),
  };
}
