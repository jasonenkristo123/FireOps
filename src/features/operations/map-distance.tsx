"use client";

import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useId, useRef, useState } from "react";
import { z } from "zod";
import type { MapPoint } from "./map";
import { distanceLabel, type ReferenceLocation } from "./map-geometry";

const coordinates = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export function MapDistance({
  points,
  location,
  onLocation,
  selectedPoint,
  onSelectPoint,
}: {
  points: MapPoint[];
  location: ReferenceLocation | null;
  onLocation: (location: ReferenceLocation | null) => void;
  selectedPoint: MapPoint | null;
  onSelectPoint: (point: MapPoint | null) => void;
}) {
  const id = useId();
  const request = useRef(0);
  const latitudeInput = useRef<HTMLInputElement>(null);
  const longitudeInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function locate() {
    const current = ++request.current;
    setError("");
    if (!navigator.geolocation || !window.isSecureContext) {
      setError(
        "Lokasi perangkat membutuhkan HTTPS atau localhost. Gunakan koordinat manual di bawah.",
      );
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request.current !== current) return;
        setLoading(false);
        const parsed = coordinates.safeParse(position.coords);
        if (!parsed.success) {
          setError(
            "Koordinat perangkat tidak valid. Gunakan koordinat manual.",
          );
          return;
        }
        onLocation({
          ...parsed.data,
          source: "browser",
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : undefined,
        });
      },
      (failure) => {
        if (request.current !== current) return;
        setLoading(false);
        setError(
          failure.code === 1
            ? "Akses lokasi ditolak. Izinkan lokasi di browser atau isi koordinat manual."
            : failure.code === 3
              ? "Pencarian lokasi melewati batas waktu. Coba lagi atau isi koordinat manual."
              : "Lokasi perangkat belum tersedia. Coba lagi atau isi koordinat manual.",
        );
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 },
    );
  }
  function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No input names: coordinates cannot be serialized into a native form URL
    // if JavaScript is unavailable before hydration.
    const latitude = latitudeInput.current?.value.trim() ?? "";
    const longitude = longitudeInput.current?.value.trim() ?? "";
    const parsed = coordinates.safeParse({
      latitude: latitude ? Number(latitude) : Number.NaN,
      longitude: longitude ? Number(longitude) : Number.NaN,
    });
    if (!parsed.success) {
      setError("Isi lintang −90 hingga 90 dan bujur −180 hingga 180.");
      return;
    }
    ++request.current;
    setLoading(false);
    setError("");
    onLocation({ ...parsed.data, source: "manual" });
  }
  return (
    <section
      aria-label="Jarak dari posisi Anda"
      className="space-y-3 border-t bg-card p-4 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Jarak dari posisi Anda</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Aktifkan lokasi, lalu klik titik pada peta untuk menarik garis dan
            melihat jaraknya, termasuk dari Jawa. Koordinat hanya digunakan di
            halaman ini dan tidak disimpan ke server.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Jika titik berkelompok dengan angka, klik kelompok untuk
            memperbesar, lalu pilih satu titik.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={locate}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 disabled:opacity-50"
        >
          <LocateFixed aria-hidden className="size-4" />
          {loading ? "Mencari lokasi…" : "Gunakan lokasi saya"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {selectedPoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">
          <output className="space-y-1">
            <strong className="block">Tujuan: {selectedPoint.title}</strong>
            <span>
              {location
                ? `Perkiraan jarak lurus: ${distanceLabel(location, selectedPoint)}`
                : "Aktifkan lokasi Anda untuk menampilkan garis dan jarak."}
            </span>
          </output>
          <button
            type="button"
            className="min-h-11 rounded-md border border-blue-300 px-3 py-2"
            onClick={() => onSelectPoint(null)}
          >
            Hapus pilihan / garis
          </button>
        </div>
      )}
      <details>
        <summary className="cursor-pointer py-2">
          Masukkan koordinat secara manual
        </summary>
        <form onSubmit={manual} className="mt-2 flex flex-wrap items-end gap-3">
          <label htmlFor={`${id}-latitude`}>
            Lintang
            <input
              id={`${id}-latitude`}
              ref={latitudeInput}
              type="number"
              inputMode="decimal"
              required
              min={-90}
              max={90}
              step="any"
            />
          </label>
          <label htmlFor={`${id}-longitude`}>
            Bujur
            <input
              id={`${id}-longitude`}
              ref={longitudeInput}
              type="number"
              inputMode="decimal"
              required
              min={-180}
              max={180}
              step="any"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-md border px-3 py-2"
          >
            Hitung jarak
          </button>
        </form>
      </details>
      {location && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <output>
              Acuan {location.source === "browser" ? "perangkat" : "manual"}:{" "}
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              {location.accuracy !== undefined &&
                ` · Akurasi perangkat ±${Math.round(location.accuracy)} m`}
            </output>
            <button
              type="button"
              className="min-h-8 underline"
              onClick={() => {
                ++request.current;
                setLoading(false);
                setError("");
                if (latitudeInput.current) latitudeInput.current.value = "";
                if (longitudeInput.current) longitudeInput.current.value = "";
                onLocation(null);
              }}
            >
              Hapus lokasi
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Perkiraan jarak lurus, bukan jarak perjalanan atau dasar penugasan.
            Penanda biru menunjukkan{" "}
            {location.source === "browser" ? "posisi Anda; " : "acuan manual; "}
            garis biru menghubungkannya dengan titik yang dipilih.
          </p>
          {points.length ? (
            <details>
              <summary className="cursor-pointer py-2">
                Jarak ke {points.length} titik pada halaman peta ini
              </summary>
              <div className="mt-2 max-h-72 overflow-auto">
                <table>
                  <caption className="sr-only">
                    Perkiraan jarak lurus dari posisi acuan ke titik yang dimuat
                  </caption>
                  <thead>
                    <tr>
                      <th>Titik</th>
                      <th>Koordinat</th>
                      <th>Jarak lurus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.id}>
                        <td>
                          <button
                            type="button"
                            className="min-h-8 text-left underline"
                            onClick={() => onSelectPoint(point)}
                            aria-pressed={selectedPoint?.id === point.id}
                          >
                            {point.title}
                          </button>
                          {point.href && (
                            <Link href={point.href} className="ml-3 text-xs">
                              Buka detail
                            </Link>
                          )}
                        </td>
                        <td>
                          {point.latitude.toFixed(4)},{" "}
                          {point.longitude.toFixed(4)}
                        </td>
                        <td>{distanceLabel(location, point)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : (
            <p>
              Jarak akan tersedia setelah ada titik pada mode, filter, dan izin
              wilayah ini.
            </p>
          )}
        </>
      )}
    </section>
  );
}
