import type { GeoJSONSource } from "maplibre-gl";

type ConnectionData = Exclude<Parameters<GeoJSONSource["setData"]>[0], string>;

export type Coordinates = { latitude: number; longitude: number };
export type ReferenceLocation = Coordinates & {
  source: "browser" | "manual";
  accuracy?: number;
};

export function distanceLabel(origin: Coordinates, target: Coordinates) {
  const radians = Math.PI / 180;
  const a =
    Math.sin(((target.latitude - origin.latitude) * radians) / 2) ** 2 +
    Math.cos(origin.latitude * radians) *
      Math.cos(target.latitude * radians) *
      Math.sin(((target.longitude - origin.longitude) * radians) / 2) ** 2;
  const km = 6371.0088 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(km)} km`;
}

// Use the closest world copy instead of drawing a line across the whole map
// when an origin and a target straddle the antimeridian.
export function connectionCoordinates(
  origin: Coordinates,
  target: Coordinates,
): [number, number][] {
  const delta =
    ((((target.longitude - origin.longitude + 180) % 360) + 360) % 360) - 180;
  return [
    [origin.longitude, origin.latitude],
    [origin.longitude + delta, target.latitude],
  ];
}

export function connectionGeoJson(
  origin: ReferenceLocation | null,
  target: Coordinates | null,
): ConnectionData {
  if (!origin || !target) return { type: "FeatureCollection", features: [] };
  const coordinates = connectionCoordinates(origin, target);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      },
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: coordinates[1] },
      },
    ],
  };
}
