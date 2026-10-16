"use client";
import { LocateFixed, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DistrictBoundaries } from "./domain";
import type { MapPoint } from "./map";

function project(longitude: number, latitude: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  const sin = Math.sin(
    (Math.max(-85.0511, Math.min(85.0511, latitude)) * Math.PI) / 180,
  );
  return {
    x: ((longitude + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}
function unproject(x: number, y: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  return {
    longitude: (((((x / size) * 360 + 180) % 360) + 360) % 360) - 180,
    latitude:
      (Math.atan(
        Math.sinh(Math.PI * (1 - (2 * Math.max(0, Math.min(size, y))) / size)),
      ) *
        180) /
      Math.PI,
  };
}
export default function RasterMap({
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
  const root = useRef<HTMLDivElement>(null);
  const initial =
    !overview && points.length === 1
      ? {
          longitude: points[0].longitude,
          latitude: points[0].latitude,
          zoom: 10,
        }
      : { longitude: 110.3, latitude: -0.15, zoom: 7 };
  const [position, setPosition] = useState(initial);
  const [size, setSize] = useState({ width: 800, height: 560 });
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const [tileError, setTileError] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const center = project(position.longitude, position.latitude, position.zoom);
  const left = center.x - size.width / 2;
  const top = center.y - size.height / 2;
  const tiles = [];
  const count = 2 ** position.zoom;
  for (
    let x = Math.floor(left / 256);
    x <= Math.floor((left + size.width) / 256);
    x++
  )
    for (
      let y = Math.floor(top / 256);
      y <= Math.floor((top + size.height) / 256);
      y++
    ) {
      if (y < 0 || y >= count) continue;
      tiles.push({ x, y, wrappedX: ((x % count) + count) % count });
    }
  const zoomBy = (delta: number) =>
    setPosition((p) => ({
      ...p,
      zoom: Math.max(3, Math.min(16, p.zoom + delta)),
    }));
  const moveBy = (x: number, y: number) => {
    setPosition((p) => {
      const c = project(p.longitude, p.latitude, p.zoom);
      return { ...p, ...unproject(c.x + x, c.y + y, p.zoom) };
    });
  };
  return (
    <div
      ref={root}
      className="relative h-[560px] w-full overflow-hidden bg-slate-100"
      data-map-engine="raster"
    >
      <div
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        aria-hidden="true"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            centerX: center.x,
            centerY: center.y,
          };
          setSelected(null);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) return;
          setPosition((p) => ({
            ...p,
            ...unproject(
              start.centerX - e.clientX + start.x,
              start.centerY - e.clientY + start.y,
              p.zoom,
            ),
          }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {tiles.map((t) => (
          // biome-ignore lint/performance/noImgElement: Exact-size XYZ map tiles must bypass image resizing and proxying.
          <img
            key={`${position.zoom}/${t.x}/${t.y}`}
            src={`https://tile.openstreetmap.org/${position.zoom}/${t.wrappedX}/${t.y}.png`}
            alt=""
            draggable={false}
            referrerPolicy="strict-origin-when-cross-origin"
            width={256}
            height={256}
            style={{
              position: "absolute",
              left: t.x * 256 - left,
              top: t.y * 256 - top,
              maxWidth: "none",
            }}
            onError={() => setTileError(true)}
          />
        ))}
      </div>
      {boundaries?.features.length ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-label="Batas wilayah sesuai katalog"
          role="img"
        >
          <title>Batas wilayah sesuai sumber tercatat</title>
          {boundaries.features.map((feature) => {
            const path = feature.geometry.coordinates
              .map((polygon) =>
                polygon
                  .map((ring) =>
                    ring
                      .map(([lng, lat], index) => {
                        const p = project(lng, lat, position.zoom);
                        return `${index === 0 ? "M" : "L"}${p.x - left} ${p.y - top}`;
                      })
                      .join(" ")
                      .concat(" Z"),
                  )
                  .join(" "),
              )
              .join(" ");
            let districtHref: string | undefined;
            if (districtUrl) {
              const target = new URL(districtUrl, "https://fireops.invalid");
              target.searchParams.set("district", feature.properties.code);
              target.searchParams.set("page", "1");
              target.searchParams.set("observation_page", "1");
              districtHref = target.pathname + target.search;
            }
            return (
              <a
                key={feature.properties.code}
                href={districtHref}
                className={
                  districtUrl ? "pointer-events-auto cursor-pointer" : ""
                }
              >
                <path
                  d={path}
                  fill="rgba(71,85,105,0.04)"
                  fillRule="evenodd"
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                >
                  <title>
                    {feature.properties.name} · {feature.properties.source}
                  </title>
                </path>
              </a>
            );
          })}
        </svg>
      ) : null}
      {points.map((p) => {
        const pixel = project(p.longitude, p.latitude, position.zoom);
        const x = pixel.x - left,
          y = pixel.y - top;
        if (x < 0 || y < 0 || x > size.width || y > size.height) return null;
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => setSelected(p)}
            aria-label={`${p.title}: ${p.detail}`}
            className={`absolute z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ${p.kind === "observation" ? "bg-orange-700" : p.priority === "critical" ? "bg-red-700" : p.priority === "high" ? "bg-orange-700" : "bg-slate-600"}`}
            style={{ left: x, top: y }}
          />
        );
      })}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1 rounded-lg border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => zoomBy(1)}
          disabled={position.zoom === 16}
          aria-label="Perbesar peta"
          className="flex size-10 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
        >
          <Plus aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(-1)}
          disabled={position.zoom === 3}
          aria-label="Perkecil peta"
          className="flex size-10 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setPosition(initial)}
          aria-label="Kembali ke wilayah awal"
          className="flex size-10 items-center justify-center rounded hover:bg-muted"
        >
          <LocateFixed aria-hidden className="size-5" />
        </button>
      </div>
      <nav
        aria-label="Geser peta tanpa menyeret"
        className="absolute bottom-8 left-3 z-20 flex rounded-md border bg-card p-1 text-xs shadow-sm"
      >
        {[
          ["Barat", -150, 0],
          ["Utara", 0, -150],
          ["Selatan", 0, 150],
          ["Timur", 150, 0],
        ].map(([title, x, y]) => (
          <button
            type="button"
            key={title}
            className="min-h-8 px-2 hover:bg-muted"
            onClick={() => moveBy(Number(x), Number(y))}
          >
            {title}
          </button>
        ))}
      </nav>
      {selected && (
        <div className="absolute bottom-20 left-3 right-3 z-20 max-w-sm space-y-2 rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <strong className="text-sm">{selected.title}</strong>
            <button
              type="button"
              aria-label="Tutup detail marker"
              onClick={() => setSelected(null)}
              className="min-h-6 min-w-6"
            >
              ×
            </button>
          </div>
          <p className="text-xs">{selected.detail}</p>
          <Link href={selected.href} className="text-sm">
            Buka detail
          </Link>
        </div>
      )}
      {tileError && (
        <output className="absolute left-3 right-16 top-3 z-20 rounded-md border bg-card/95 p-2 text-xs">
          Sebagian tile belum termuat. Periksa koneksi; daftar observasi tetap
          tersedia.
        </output>
      )}
      <p className="absolute bottom-0 right-0 z-20 bg-white/95 px-2 py-1 text-[11px] text-slate-800">
        Peta dasar 2D · ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
      </p>
    </div>
  );
}
