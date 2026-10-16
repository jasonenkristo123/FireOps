import { parse } from "csv-parse/sync";
import { z } from "zod";
export const sourceSchema = z.enum([
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA21_NRT",
  "MODIS_NRT",
]);
export const bboxSchema = z
  .string()
  .transform((v) => v.split(",").map(Number))
  .pipe(
    z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  )
  .refine(([w, s, e, n]) => w < e && s < n, "Invalid bbox");
const rowSchema = z.object({
  latitude: z.string().min(1),
  longitude: z.string().min(1),
  acq_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acq_time: z.string().regex(/^\d{1,4}$/),
  satellite: z.string().min(1),
  instrument: z.string().optional(),
  confidence: z.string().optional(),
  frp: z.string().optional(),
  brightness: z.string().optional(),
  bright_ti4: z.string().optional(),
});
function optionalNumber(raw: string | undefined) {
  if (raw === undefined || raw === "") return null;
  return z.coerce.number().finite().nonnegative().parse(raw);
}
export function parseFirms(
  csv: string,
  source: z.infer<typeof sourceSchema>,
  bbox: z.infer<typeof bboxSchema>,
  now = new Date(),
) {
  if (csv.length > 5_000_000) throw new Error("PAYLOAD_TOO_LARGE");
  let headers: string[] = [];
  const raw: unknown = parse(csv, {
    bom: true,
    skip_empty_lines: true,
    columns: (fields: string[]) => {
      headers = fields;
      return fields;
    },
    max_record_size: 20000,
  });
  for (const required of [
    "latitude",
    "longitude",
    "acq_date",
    "acq_time",
    "satellite",
    "confidence",
  ])
    if (!headers.includes(required)) throw new Error("SCHEMA_DRIFT");
  const rows = z.array(z.record(z.string(), z.string())).max(10000).parse(raw);
  return rows.map((payload) => {
    const row = rowSchema.parse(payload);
    const latitude = z.coerce
      .number()
      .finite()
      .min(bbox[1])
      .max(bbox[3])
      .parse(row.latitude);
    const longitude = z.coerce
      .number()
      .finite()
      .min(bbox[0])
      .max(bbox[2])
      .parse(row.longitude);
    const time = row.acq_time.padStart(4, "0");
    if (Number(time.slice(0, 2)) > 23 || Number(time.slice(2)) > 59)
      throw new Error("INVALID_TIME");
    const detected_at = `${row.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00.000Z`;
    const stamp = new Date(detected_at);
    if (
      !Number.isFinite(stamp.getTime()) ||
      stamp.toISOString() !== detected_at ||
      stamp.getTime() > now.getTime() + 300000 ||
      stamp.getTime() < now.getTime() - 6 * 86400000
    )
      throw new Error("INVALID_DATE_WINDOW");
    const instrument = source.startsWith("VIIRS") ? "VIIRS" : "MODIS";
    if (row.instrument && row.instrument.toUpperCase() !== instrument)
      throw new Error("INSTRUMENT_MISMATCH");
    const confidence_raw = row.confidence || null;
    if (confidence_raw !== null) {
      if (instrument === "VIIRS") z.enum(["l", "n", "h"]).parse(confidence_raw);
      else z.coerce.number().finite().min(0).max(100).parse(confidence_raw);
    }
    return {
      observation_key: [
        source,
        instrument,
        row.satellite,
        detected_at,
        latitude,
        longitude,
        payload.scan ?? "",
        payload.track ?? "",
      ].join("|"),
      source,
      satellite: row.satellite,
      instrument,
      latitude,
      longitude,
      detected_at,
      confidence_raw,
      confidence_kind:
        instrument === "VIIRS"
          ? "VIIRS categorical l/n/h"
          : "MODIS numeric 0–100",
      frp: optionalNumber(row.frp),
      brightness: optionalNumber(row.brightness ?? row.bright_ti4),
      raw_payload: payload,
    };
  });
}
