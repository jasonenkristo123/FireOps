"use client";

import { ArrowUpRight, MapPin } from "lucide-react";
import { useState } from "react";

// Schematic presentation only: no geographic lookup, live detection, measured
// telemetry, agency risk zones or simulated human confirmation.
const examples = [
  { id: "01", x: 32.04, y: 63.19, title: "Observasi 01" },
  { id: "02", x: 34.81, y: 70.1, title: "Observasi 02" },
  { id: "03", x: 40.33, y: 55.59, title: "Observasi 03" },
] as const;

export function IndonesiaHeroMap() {
  const [selected, setSelected] = useState<(typeof examples)[number]>(
    examples[0],
  );

  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_70px_-45px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <MapPin aria-hidden className="size-4 text-slate-400" />
          Monitor wilayah
        </span>
        <span className="text-[11px] font-medium tracking-wide text-slate-500">
          CONTOH TAMPILAN
        </span>
      </div>
      <div className="relative isolate aspect-[1.25] overflow-hidden bg-slate-50">
        <svg
          viewBox="0 0 600 480"
          aria-hidden="true"
          className="absolute inset-0 size-full"
        >
          <defs>
            <pattern
              id="landing-map-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M40 0H0V40"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="600" height="480" fill="url(#landing-map-grid)" />
          <image href="/maps/borneo-coastline.svg" width="600" height="480" />
          <path
            d="M36 290H564"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="0.75"
            strokeDasharray="4 6"
          />
        </svg>
        <span className="absolute left-5 top-5 text-[10px] tracking-[0.12em] text-slate-500">
          KALIMANTAN
        </span>
        <span
          aria-hidden
          className="absolute right-5 top-5 flex flex-col items-center gap-1 text-[10px] text-slate-500"
        >
          <ArrowUpRight className="-rotate-45 size-4" />U
        </span>
        <span className="pointer-events-none absolute left-[26%] top-[45%] max-w-24 text-[10px] font-medium leading-4 tracking-wide text-slate-500">
          KALIMANTAN
          <br />
          BARAT
        </span>
        {examples.map((example) => (
          <button
            key={example.id}
            type="button"
            aria-label={`Pilih ${example.title.toLowerCase()} — data contoh`}
            aria-pressed={example.id === selected.id}
            onClick={() => setSelected(example)}
            style={{ left: `${example.x}%`, top: `${example.y}%` }}
            className="group absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full focus-visible:outline-red-600"
          >
            <span
              className={
                example.id === selected.id
                  ? "flex size-9 items-center justify-center rounded-full border border-red-200 bg-red-50"
                  : "flex size-9 items-center justify-center rounded-full border border-transparent transition-colors group-hover:border-red-200 group-hover:bg-red-50"
              }
            >
              <span className="size-3 rounded-full border-2 border-white bg-red-600 shadow-sm" />
            </span>
          </button>
        ))}
        <span className="absolute bottom-5 left-5 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500">
          Ilustrasi wilayah
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-slate-900">{selected.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Menunggu pemeriksaan petugas
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
          <span aria-hidden className="size-1.5 rounded-full bg-slate-400" />
          Belum dinilai
        </span>
      </div>
      <figcaption className="border-t border-slate-100 bg-white px-5 py-3 text-[11px] leading-5 text-slate-500">
        Simulasi visual. Titik dan bentuk peta bukan data operasional LIVE.
      </figcaption>
    </figure>
  );
}
