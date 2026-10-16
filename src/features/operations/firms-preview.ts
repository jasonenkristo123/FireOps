import "server-only";
import { cacheLife } from "next/cache";
import { bboxSchema, sourceSchema } from "./firms";
import { fetchFirms } from "./firms-source";

// Extent of the 14 BIG September-2023 candidates; this is a request rectangle,
// never an approved district polygon or an authorization boundary.
export const candidateKalbarBbox =
  "108.59844426100005,-3.0679185239999356,114.20552258300006,2.0814594440000747";

// Only public satellite observations enter this shared cache, never private DB
// records, cookies, report text or credentials. The caller MUST authorize admin.
export async function readFirmsPreview(extent: "candidate" | "configured") {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 600 });
  const source = sourceSchema.safeParse(process.env.NASA_FIRMS_SOURCE);
  const bbox = bboxSchema.safeParse(
    extent === "candidate" ? candidateKalbarBbox : process.env.NASA_FIRMS_BBOX,
  );
  const key = process.env.NASA_FIRMS_MAP_KEY;
  if (!source.success || !bbox.success || !key)
    return {
      ok: false as const,
      error:
        "Konfigurasi sumber NASA, MAP_KEY, atau cakupan belum valid. Periksa kesehatan sistem.",
    };
  try {
    const { rows, fetchedAt } = await fetchFirms(source.data, bbox.data, key);
    return {
      ok: true as const,
      source: source.data,
      bbox: bbox.data,
      fetchedAt,
      observations: rows.map((row) => ({
        latitude: row.latitude,
        longitude: row.longitude,
        detected_at: row.detected_at,
        satellite: row.satellite,
        instrument: row.instrument,
        confidence_raw: row.confidence_raw,
        confidence_kind: row.confidence_kind,
        frp: row.frp,
      })),
    };
  } catch {
    return {
      ok: false as const,
      error:
        "Pratinjau NASA gagal diambil atau respons tidak lolos validasi. Coba kembali setelah lima menit; tidak ada hasil sukses yang diasumsikan.",
    };
  }
}
