import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Public source download only. No database credentials, imports, grants or
// agency approval are inferred from a successful download.
const source =
  "https://geoservices.big.go.id/rbi/rest/services/Hosted/Wilayah_Administrasi_Kabupaten__Kota/FeatureServer/0";
const where = "kdppum = '61' AND kdpkab LIKE '61.%'";
const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const ring = z
  .array(position)
  .min(4)
  .refine((points) => {
    const first = points[0];
    const last = points[points.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  }, "Polygon ring must be closed");
const polygon = z.array(ring).min(1);
const collection = z.object({
  type: z.literal("FeatureCollection"),
  exceededTransferLimit: z.literal(false).optional(),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        properties: z.object({
          objectid: z.number().int(),
          namobj: z.string().trim().min(1),
          kdpkab: z.string().regex(/^61\.\d{2}$/),
          kdppum: z.literal("61"),
          wadmpr: z.literal("Kalimantan Barat"),
        }),
        geometry: z.discriminatedUnion("type", [
          z.object({ type: z.literal("Polygon"), coordinates: polygon }),
          z.object({
            type: z.literal("MultiPolygon"),
            coordinates: z.array(polygon).min(1),
          }),
        ]),
      }),
    )
    .length(14),
});

async function download(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    redirect: "error",
  });
  if (!response.ok || !response.body)
    throw new Error(`Official source unavailable (HTTP ${response.status}).`);
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 30 * 1024 * 1024)
        throw new Error("Boundary download exceeded the 30 MB limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

try {
  const metadataBytes = await download(`${source}?f=json`);
  const metadata = z
    .object({
      name: z.string(),
      description: z.string(),
      copyrightText: z.string().optional(),
      serviceItemId: z.string(),
    })
    .parse(JSON.parse(metadataBytes.toString("utf8")));
  const query = new URL(`${source}/query`);
  query.search = new URLSearchParams({
    where,
    outFields: "objectid,namobj,kdpkab,kdppum,wadmpr",
    returnGeometry: "true",
    returnZ: "false",
    returnM: "false",
    outSR: "4326",
    f: "geojson",
  }).toString();
  const bytes = await download(query);
  const geojson = collection.parse(JSON.parse(bytes.toString("utf8")));
  const codes = geojson.features.map((feature) => feature.properties.kdpkab);
  if (new Set(codes).size !== 14)
    throw new Error("Expected 14 distinct district codes; review the source.");
  const extent = [180, 90, -180, -90];
  for (const feature of geojson.features) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const rings of polygons)
      for (const points of rings)
        for (const [longitude, latitude] of points) {
          extent[0] = Math.min(extent[0], longitude);
          extent[1] = Math.min(extent[1], latitude);
          extent[2] = Math.max(extent[2], longitude);
          extent[3] = Math.max(extent[3], latitude);
        }
  }
  const target = join(process.cwd(), "data/reference/kalbar-big");
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "source-metadata.json"), metadataBytes);
  writeFileSync(join(target, "districts.geojson"), bytes);
  writeFileSync(
    join(target, "review.json"),
    `${JSON.stringify(
      {
        status: "candidate_not_approved_for_live",
        source,
        query: query.href,
        downloaded_at: new Date().toISOString(),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        source_title: metadata.name,
        service_item_id: metadata.serviceItemId,
        source_edition:
          "September 2023 (as described by source metadata; review currency)",
        license: null,
        license_review:
          "Source copyright field is not a license grant. Confirm terms before operational import or redistribution.",
        topology_review:
          "Pending PostGIS validity/overlap review; source documents topology limitations. Geometry has not been repaired or simplified.",
        agency_approval: null,
        district_count: codes.length,
        districts: geojson.features
          .map(({ properties }) => ({
            code: properties.kdpkab,
            name: properties.namobj,
          }))
          .sort((a, b) => a.code.localeCompare(b.code)),
        candidate_bbox: extent,
        bbox_review:
          "Computed extent only; includes surrounding areas and does not assign jurisdiction. Not applied to NASA configuration.",
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "Prepared 14 official-source district candidates in data/reference/kalbar-big/.",
  );
  console.log(`Computed extent (west,south,east,north): ${extent.join(",")}`);
  console.log(
    "No database import, approval, access grant, NASA request or .env.local change was performed. Review docs/runbooks/live-map-setup.md.",
  );
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Official boundary response failed validation; no import was performed."
      : error instanceof Error
        ? error.message
        : "Boundary preparation failed.",
  );
  process.exitCode = 1;
}
