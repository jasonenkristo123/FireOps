"use client";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { version as maplibreVersion } from "maplibre-gl/package.json";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DistrictBoundaries } from "./domain";
import {
  connectionCoordinates,
  connectionGeoJson,
  distanceLabel,
  type ReferenceLocation,
} from "./map-geometry";
import RasterMap from "./raster-map";
export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  detail: string;
  href?: string;
  kind: string;
  priority: string;
};
export type MapInteractionProps = {
  location: ReferenceLocation | null;
  selectedPoint: MapPoint | null;
  onSelectPoint: (point: MapPoint | null) => void;
};

function updatePointPopup(
  map: maplibregl.Map,
  popup: maplibregl.Popup | null,
  point: MapPoint | null,
  location: ReferenceLocation | null,
) {
  if (!point) {
    popup?.remove();
    return null;
  }
  const box = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = point.title;
  const text = document.createElement("p");
  text.textContent = point.detail;
  box.append(title, text);
  if (location) {
    const distance = document.createElement("p");
    distance.className = "mt-2 font-semibold text-blue-800";
    distance.textContent = `Perkiraan jarak lurus dari posisi Anda: ${distanceLabel(location, point)}`;
    box.append(distance);
  }
  if (point.href) {
    const link = document.createElement("a");
    link.textContent = "Buka detail";
    link.href = point.href;
    box.append(link);
  }
  const next =
    popup ??
    new maplibregl.Popup({ focusAfterOpen: false, closeOnClick: false });
  next
    .setLngLat([point.longitude, point.latitude])
    .setDOMContent(box)
    .addTo(map);
  return next;
}

function updateConnection(
  map: maplibregl.Map,
  marker: maplibregl.Marker | null,
  location: ReferenceLocation | null,
  target: MapPoint | null,
  anchor: { longitude: number; latitude: number },
) {
  const source = map.getSource("location-connection") as
    | maplibregl.GeoJSONSource
    | undefined;
  if (source)
    void source.setData(connectionGeoJson(location, target)).catch(() => {
      // A style/worker may have been disposed while changing filters or renderer.
    });
  if (!location) {
    marker?.remove();
    return null;
  }
  if (!marker) {
    const element = document.createElement("button");
    element.type = "button";
    element.className =
      "relative flex size-6 items-center justify-center rounded-full border-[3px] border-white bg-blue-700 shadow-lg";
    const caption = document.createElement("span");
    caption.className =
      "pointer-events-none absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded border border-blue-200 bg-white px-2 py-1 text-xs font-semibold text-blue-950 shadow-sm";
    element.append(caption);
    marker = new maplibregl.Marker({ element });
    marker.setLngLat([location.longitude, location.latitude]);
    marker.setPopup(
      new maplibregl.Popup().setText(
        "Lokasi acuan untuk perkiraan jarak lurus. Tidak digunakan untuk menentukan izin wilayah.",
      ),
    );
    marker.addTo(map);
  }
  const caption =
    location.source === "browser" ? "Posisi Anda" : "Acuan manual";
  marker.getElement().setAttribute("aria-label", caption);
  const text = marker.getElement().querySelector("span");
  if (text) text.textContent = caption;
  marker.setLngLat([location.longitude, location.latitude]);
  const endpoints = connectionCoordinates(location, target ?? anchor);
  map.fitBounds(
    new maplibregl.LngLatBounds().extend(endpoints[0]).extend(endpoints[1]),
    {
      padding: { top: 70, bottom: 90, left: 55, right: 55 },
      maxZoom: 11,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 450,
    },
  );
  return marker;
}
export default function OperationsMap({
  points,
  boundaries,
  districtUrl,
  overview = false,
  location,
  selectedPoint,
  onSelectPoint,
}: {
  points: MapPoint[];
  boundaries?: DistrictBoundaries;
  districtUrl?: string;
  overview?: boolean;
} & MapInteractionProps) {
  const router = useRouter();
  const container = useRef<HTMLElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const pointPopup = useRef<maplibregl.Popup | null>(null);
  const interaction = useRef({ location, selectedPoint, onSelectPoint });
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    interaction.current = { location, selectedPoint, onSelectPoint };
    const map = mapRef.current;
    if (!map?.getSource("location-connection")) return;
    const anchor =
      !overview && points.length === 1
        ? points[0]
        : { longitude: 110.3, latitude: -0.1 };
    userMarker.current = updateConnection(
      map,
      userMarker.current,
      location,
      selectedPoint,
      anchor,
    );
    pointPopup.current = updatePointPopup(
      map,
      pointPopup.current,
      selectedPoint,
      location,
    );
  }, [location, selectedPoint, onSelectPoint, overview, points]);
  useEffect(() => {
    if (!container.current || fallback) return;
    let map: maplibregl.Map;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      maplibregl.setWorkerUrl(
        `/maplibre/${maplibreVersion}/maplibre-gl-worker.mjs`,
      );
      const configured = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
      map = new maplibregl.Map({
        container: container.current,
        center:
          !overview && points.length === 1
            ? [points[0].longitude, points[0].latitude]
            : [110.3, -0.1],
        zoom: !overview && points.length === 1 ? 10 : 6.1,
        cooperativeGestures: true,
        style: configured || {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            },
          },
          layers: [{ id: "basemap", type: "raster", source: "osm" }],
        },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl());
      loadTimeout = setTimeout(() => setFallback(true), 12000);
      map.on("error", (event) => {
        if (/worker/i.test(event.error.message)) {
          clearTimeout(loadTimeout);
          setFallback(true);
          return;
        }
        setError(
          "Sebagian peta gagal dimuat. Gunakan daftar insiden/observasi di bawah.",
        );
      });
      map.on("load", () => {
        clearTimeout(loadTimeout);
        setLoaded(true);
        map.addSource("location-connection", {
          type: "geojson",
          data: connectionGeoJson(null, null),
        });
        map.addLayer({
          id: "connection-halo",
          type: "line",
          source: "location-connection",
          filter: ["==", "$type", "LineString"],
          paint: {
            "line-color": "#ffffff",
            "line-width": 7,
            "line-opacity": 0.9,
          },
        });
        map.addLayer({
          id: "connection-line",
          type: "line",
          source: "location-connection",
          filter: ["==", "$type", "LineString"],
          paint: {
            "line-color": "#1d4ed8",
            "line-width": 3,
            "line-dasharray": [3, 2],
          },
        });
        if (boundaries?.features.length) {
          map.addSource("districts", { type: "geojson", data: boundaries });
          map.addLayer({
            id: "district-fill",
            type: "fill",
            source: "districts",
            paint: { "fill-color": "#475569", "fill-opacity": 0.035 },
          });
          map.addLayer({
            id: "district-line",
            type: "line",
            source: "districts",
            paint: {
              "line-color": "#334155",
              "line-width": 1.5,
              "line-dasharray": [3, 2],
            },
          });
          map.on("click", "district-fill", (e) => {
            if (
              !districtUrl ||
              map.queryRenderedFeatures(e.point, {
                layers: ["individual", "clusters"],
              }).length
            )
              return;
            const code = e.features?.[0]?.properties.code;
            if (typeof code !== "string") return;
            const url = new URL(districtUrl, window.location.origin);
            url.searchParams.set("district", code);
            url.searchParams.set("page", "1");
            url.searchParams.set("observation_page", "1");
            router.push(url.pathname + url.search);
          });
        }
        map.addSource("points", {
          type: "geojson",
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: 11,
          data: {
            type: "FeatureCollection",
            features: points.map((p) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [p.longitude, p.latitude],
              },
              properties: p,
            })),
          },
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "points",
          filter: ["has", "point_count"],
          paint: { "circle-color": "#0f172a", "circle-radius": 20 },
        });
        if (map.getStyle().glyphs)
          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "points",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: { "text-color": "#ffffff" },
          });
        map.addLayer({
          id: "individual",
          type: "circle",
          source: "points",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": [
              "case",
              ["==", ["get", "kind"], "incident"],
              9,
              6,
            ],
            "circle-color": [
              "case",
              ["==", ["get", "kind"], "observation"],
              "#c2410c",
              [
                "match",
                ["get", "priority"],
                "critical",
                "#b91c1c",
                "high",
                "#c2410c",
                "medium",
                "#a16207",
                "low",
                "#0369a1",
                "#475569",
              ],
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "connection-target",
          type: "circle",
          source: "location-connection",
          filter: ["==", "$type", "Point"],
          paint: {
            "circle-radius": 13,
            "circle-color": "#1d4ed8",
            "circle-opacity": 0.15,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#1d4ed8",
          },
        });
        const current = interaction.current;
        const anchor =
          !overview && points.length === 1
            ? points[0]
            : { longitude: 110.3, latitude: -0.1 };
        userMarker.current = updateConnection(
          map,
          userMarker.current,
          current.location,
          current.selectedPoint,
          anchor,
        );
        pointPopup.current = updatePointPopup(
          map,
          pointPopup.current,
          current.selectedPoint,
          current.location,
        );
        map.on("click", "clusters", async (e) => {
          const feature = e.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const source = map.getSource("points") as maplibregl.GeoJSONSource;
          try {
            const zoom = await source.getClusterExpansionZoom(
              Number(feature.properties.cluster_id),
            );
            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom,
              animate: !window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches,
            });
          } catch {
            /* The source may have changed while expanding a cluster. */
          }
        });
        map.on("click", "individual", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          const point = points.find((point) => point.id === p.id);
          if (!point) return;
          interaction.current.onSelectPoint(point);
          pointPopup.current = updatePointPopup(
            map,
            pointPopup.current,
            point,
            interaction.current.location,
          );
        });
      });
      const resize = new ResizeObserver(() => map.resize());
      resize.observe(container.current);
      return () => {
        clearTimeout(loadTimeout);
        resize.disconnect();
        userMarker.current?.remove();
        userMarker.current = null;
        pointPopup.current?.remove();
        pointPopup.current = null;
        mapRef.current = null;
        map.remove();
      };
    } catch {
      clearTimeout(loadTimeout);
      userMarker.current?.remove();
      userMarker.current = null;
      pointPopup.current?.remove();
      pointPopup.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setFallback(true);
      return;
    }
  }, [points, boundaries, districtUrl, router, overview, fallback]);
  if (fallback)
    return (
      <RasterMap
        points={points}
        boundaries={boundaries}
        districtUrl={districtUrl}
        overview={overview}
        location={location}
        selectedPoint={selectedPoint}
        onSelectPoint={onSelectPoint}
      />
    );
  return (
    <div className="relative">
      {error && (
        <output className="absolute left-3 top-3 z-10 max-w-sm rounded-lg border bg-white/95 p-3 text-xs">
          {error}
          <button
            type="button"
            onClick={() => setFallback(true)}
            className="ml-2 underline"
          >
            Gunakan peta 2D
          </button>
        </output>
      )}
      <section
        ref={container}
        aria-label="Peta Kalimantan Barat. Daftar data tersedia di bawah peta."
        className="h-[560px] w-full bg-slate-100"
      />
      {!loaded && !error && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border bg-white/95 px-3 py-2 text-sm">
          Memuat peta Kalimantan Barat…
        </div>
      )}
      <button
        type="button"
        onClick={() => setFallback(true)}
        className="absolute bottom-7 left-3 z-10 rounded-md border bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-sm"
      >
        Peta 2D tanpa WebGL
      </button>
    </div>
  );
}
