"use client";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DistrictBoundaries } from "./domain";
import RasterMap from "./raster-map";
export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  detail: string;
  href: string;
  kind: string;
  priority: string;
};
export default function OperationsMap({
  points,
  boundaries,
  districtUrl,
  overview = false,
}: {
  points: MapPoint[];
  boundaries?: DistrictBoundaries;
  districtUrl?: string;
  overview?: boolean;
}) {
  const router = useRouter();
  const container = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!container.current || fallback) return;
    let map: maplibregl.Map;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
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
      map.addControl(new maplibregl.NavigationControl());
      loadTimeout = setTimeout(() => setFallback(true), 12000);
      map.on("error", () =>
        setError(
          "Sebagian peta gagal dimuat. Gunakan daftar insiden/observasi di bawah.",
        ),
      );
      map.on("load", () => {
        clearTimeout(loadTimeout);
        setLoaded(true);
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
          const box = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = p.title;
          const text = document.createElement("p");
          text.textContent = p.detail;
          const link = document.createElement("a");
          link.textContent = "Buka detail";
          link.href = p.href;
          box.append(title, text, link);
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setDOMContent(box)
            .addTo(map);
        });
      });
      const resize = new ResizeObserver(() => map.resize());
      resize.observe(container.current);
      return () => {
        clearTimeout(loadTimeout);
        resize.disconnect();
        map.remove();
      };
    } catch {
      clearTimeout(loadTimeout);
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
