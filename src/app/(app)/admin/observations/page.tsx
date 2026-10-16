import Link from "next/link";
import { z } from "zod";
import { requireAccountAccess } from "@/features/auth/session";
import { date, type Search } from "@/features/operations/domain";
import {
  candidateKalbarBbox,
  readFirmsPreview,
} from "@/features/operations/firms-preview";
import { IncidentMap } from "@/features/operations/map-loader";

export const maxDuration = 120;

export default async function Page({ searchParams }: { searchParams: Search }) {
  const access = await requireAccountAccess();
  if (access.profile.role !== "admin")
    return (
      <p role="alert">
        Pratinjau sumber ini hanya tersedia untuk administrator.
      </p>
    );
  const search = await searchParams;
  const extent = z
    .enum(["candidate", "configured"])
    .catch("candidate")
    .parse(search.extent);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .catch(1)
    .parse(search.page);
  // Merely opening or prefetching this setup screen never calls NASA.
  const result = search.load === "1" ? await readFirmsPreview(extent) : null;
  const rows = result?.ok ? result.observations : [];
  const points = rows.map((row, index) => ({
    id: `nasa-preview-${index}`,
    latitude: row.latitude,
    longitude: row.longitude,
    title: `Observasi ${row.instrument} · Belum dinilai`,
    detail: `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)} · ${date(row.detected_at)} · Satelit ${row.satellite} · Keyakinan ${row.confidence_raw ?? "tidak tersedia"} (${row.confidence_kind}) · FRP ${row.frp === null ? "tidak tersedia" : `${row.frp} MW`} · Belum dikonfirmasi petugas; belum dicocokkan ke wilayah berizin`,
    kind: "observation",
    priority: "unassessed",
  }));
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Pratinjau observasi NASA</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lihat koordinat satelit nyata sebelum menyiapkan katalog wilayah
          operasional.
        </p>
      </header>
      <p className="notice">
        Data NASA nyata, belum menjadi insiden FireOps. Kotak pengambilan
        mencakup area sekitar Kalimantan Barat; titik belum diklaim berada di
        kabupaten tertentu. Prioritas operasional: Belum dinilai. Confidence dan
        FRP bukan keputusan prioritas atau konfirmasi kebakaran.
      </p>
      <form action="/admin/observations" className="panel space-y-3">
        <input type="hidden" name="load" value="1" />
        <label>
          Cakupan pengambilan
          <select name="extent" defaultValue={extent}>
            <option value="candidate">
              Kotak kandidat Kalimantan Barat dari BIG
            </option>
            <option value="configured">
              BBOX yang dikonfigurasi operator pada server
            </option>
          </select>
        </label>
        <p className="break-words text-xs text-muted-foreground">
          Kandidat barat, selatan, timur, utara: {candidateKalbarBbox}. Ini
          bukan batas kabupaten atau zona risiko.
        </p>
        <button
          type="submit"
          className="min-h-11 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Tampilkan titik NASA
        </button>
        <p className="text-xs text-muted-foreground">
          Pengambilan dilakukan server untuk dua tanggal UTC terakhir. Hasil
          dibagikan melalui cache lima menit; tidak ada polling NASA dari
          browser atau perubahan data operasional.
        </p>
      </form>
      {result && !result.ok && (
        <p role="alert" className="notice notice-error">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <>
          <section className="panel grid gap-3 text-sm sm:grid-cols-3">
            <p>
              <strong>{rows.length} observasi dalam kotak pengambilan</strong>
              <br />
              Sumber {result.source}
            </p>
            <p>
              Berhasil diambil dari NASA
              <br />
              <strong>{date(result.fetchedAt)}</strong>
              <br />
              <span className="text-xs text-muted-foreground">
                Bukan waktu sinkronisasi database FireOps
              </span>
            </p>
            <p>
              Pengamatan terbaru
              <br />
              <strong>
                {date(
                  rows.reduce<string | null>(
                    (latest, row) =>
                      !latest || row.detected_at > latest
                        ? row.detected_at
                        : latest,
                    null,
                  ),
                )}
              </strong>
            </p>
          </section>
          <section className="overflow-hidden rounded-xl border bg-card">
            <IncidentMap points={points} overview />
          </section>
          {!rows.length && (
            <p>
              Tidak ada observasi pada sumber dan dua tanggal UTC yang diminta.
              Hasil kosong tidak membuktikan tidak ada kebakaran.
            </p>
          )}
          <details className="panel">
            <summary className="cursor-pointer font-semibold">
              Daftar koordinat dan bukti satelit
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table>
                <caption className="sr-only">
                  Observasi NASA dalam cakupan pengambilan, halaman {page}
                </caption>
                <thead>
                  <tr>
                    <th>Koordinat</th>
                    <th>Waktu observasi</th>
                    <th>Confidence</th>
                    <th>FRP</th>
                    <th>Prioritas operasional</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice((page - 1) * 100, page * 100)
                    .map((row, index) => (
                      <tr
                        key={`${row.latitude}:${row.longitude}:${row.detected_at}:${index}`}
                      >
                        <td>
                          {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}
                        </td>
                        <td>{date(row.detected_at)}</td>
                        <td>
                          {row.confidence_raw ?? "Tidak tersedia"} (
                          {row.confidence_kind})
                        </td>
                        <td>
                          {row.frp === null
                            ? "Tidak tersedia"
                            : `${row.frp} MW`}
                        </td>
                        <td>Belum dinilai</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <nav
              aria-label="Halaman observasi pratinjau"
              className="mt-3 flex items-center gap-4 text-sm"
            >
              {page > 1 && (
                <Link
                  prefetch={false}
                  href={`?load=1&extent=${extent}&page=${page - 1}`}
                >
                  Sebelumnya
                </Link>
              )}
              <span>
                Halaman {page} · maksimal 100 baris; peta memuat seluruh hasil
              </span>
              {page * 100 < rows.length && (
                <Link
                  prefetch={false}
                  href={`?load=1&extent=${extent}&page=${page + 1}`}
                >
                  Berikutnya
                </Link>
              )}
            </nav>
          </details>
        </>
      )}
      <p className="text-sm">
        Untuk verifikasi, prioritas manual dan penugasan, observasi perlu
        disimpan melalui sinkronisasi serta dipetakan ke katalog dan izin
        wilayah.{" "}
        <Link href="/admin/settings?mode=live">Lihat kesiapan operasional</Link>{" "}
        · <Link href="/dashboard?mode=live">Kembali ke dashboard</Link>
      </p>
    </div>
  );
}
