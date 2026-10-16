"use server";
import { z } from "zod";
import { requireOperationalAccess } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { SummaryState } from "./report-summary-contract";
import {
  generateReportSummary,
  summaryConfiguration,
} from "./report-summary-service";

// Per-process abuse guard only; no report text or result is retained in memory.
const recentRequests = new Map<string, number>();
export async function summarizeReports(
  _previous: SummaryState,
  form: FormData,
): Promise<SummaryState> {
  const access = await requireOperationalAccess();
  if (!["coordinator", "admin"].includes(access.profile.role))
    return {
      error: "Ringkasan AI memerlukan koordinator/admin yang berwenang.",
    };
  const config = summaryConfiguration();
  if (!config.ready) return { error: config.reason };
  const parsed = z
    .object({ incident_id: z.uuid(), consent: z.literal("on") })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Periksa referensi insiden dan konfirmasi izin pengiriman laporan.",
    };
  const now = Date.now();
  for (const [id, until] of recentRequests)
    if (until < now) recentRequests.delete(id);
  if (
    recentRequests.size >= 1000 ||
    (recentRequests.get(access.profile.id) ?? 0) > now
  )
    return { error: "Tunggu sebentar sebelum meminta ringkasan berikutnya." };
  const db = await createClient();
  const [incident, reports] = await Promise.all([
    db
      .from("incidents")
      .select("id")
      .eq("id", parsed.data.incident_id)
      .single(),
    db
      .from("reports")
      .select("id,body,observed_at,source_label")
      .eq("incident_id", parsed.data.incident_id)
      .order("submitted_at", { ascending: false })
      .limit(20),
  ]);
  if (incident.error || reports.error || !incident.data)
    return {
      error: "Insiden tidak ditemukan atau izin wilayah tidak memadai.",
    };
  if (!reports.data.length)
    return { error: "Belum ada laporan untuk diringkas." };
  if (reports.data.reduce((size, r) => size + r.body.length, 0) > 30000)
    return {
      error:
        "Teks laporan terlalu panjang untuk satu permintaan ringkasan. Tinjau laporan asli.",
    };
  recentRequests.set(access.profile.id, now + 60000);
  try {
    return { summary: await generateReportSummary(reports.data) };
  } catch {
    return {
      error:
        "Ringkasan AI belum dapat dibuat. Gunakan laporan asli; status insiden tidak berubah.",
    };
  }
}
