import Link from "next/link";
import { requireAccountAccess } from "@/features/auth/session";
import { ModeBanner } from "@/features/operations/browse-view";
import { dataWarning, logDataFailure } from "@/features/operations/data-errors";
import { DataWarnings } from "@/features/operations/data-warning";
import { date, type Search } from "@/features/operations/domain";
import { bboxSchema, sourceSchema } from "@/features/operations/firms";
import { summaryConfiguration } from "@/features/operations/report-summary-service";
import { createClient } from "@/lib/supabase/server";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const access = await requireAccountAccess();
  if (access.profile.role !== "admin")
    return <p role="alert">Halaman ini hanya untuk administrator.</p>;
  const mode = (await searchParams).mode === "live" ? "live" : "demo";
  const db = await createClient();
  const ai = summaryConfiguration();
  const [runs, districts] = await Promise.all([
    db.rpc("ingestion_status", { requested_mode: mode }),
    db
      .from("districts")
      .select("id,name,source,license,boundary_version,approved_at")
      .eq("data_mode", mode),
  ]);
  if (districts.error) throw new Error("Kesehatan sistem gagal dimuat.");
  if (runs.error) logDataFailure("ingestion_status", runs.error);
  const checks = [
    ["Identitas ingestion server", Boolean(process.env.SUPABASE_SECRET_KEY)],
    ["Kunci NASA server", Boolean(process.env.NASA_FIRMS_MAP_KEY)],
    [
      "Token privat scheduler (minimal 32 karakter)",
      (process.env.NASA_FIRMS_SYNC_TOKEN?.length ?? 0) >= 32,
    ],
    [
      "Sumber NASA valid",
      sourceSchema.safeParse(process.env.NASA_FIRMS_SOURCE).success,
    ],
    [
      "Konfigurasi bbox valid",
      bboxSchema.safeParse(process.env.NASA_FIRMS_BBOX).success,
    ],
  ] as const;
  return (
    <>
      <h1 className="text-2xl font-bold">Kesehatan sistem & konfigurasi</h1>
      <ModeBanner mode={mode} />
      <DataWarnings
        warnings={runs.error ? [dataWarning("health", runs.error)] : []}
      />
      <nav aria-label="Mode kesehatan sistem" className="flex gap-5">
        <Link href="?mode=demo">DEMO / Simulasi</Link>
        <Link href="?mode=live">LIVE</Link>
      </nav>
      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Kesiapan integrasi NASA</h2>
        <p>
          Konfigurasi dikelola operator pada server. Pemeriksaan ini tidak
          menguji kredensial NASA, persetujuan bbox, atau pemasangan scheduler.
        </p>
        <ul className="space-y-2">
          {checks.map(([name, ready]) => (
            <li key={name}>
              {name}: <strong>{ready ? "Tersedia" : "Belum tersedia"}</strong>
            </li>
          ))}
        </ul>
        <p>
          Aturan prioritas: belum disetujui, rekomendasi tetap Belum dinilai.
          Zona risiko: tidak tersedia. Ringkasan AI:{" "}
          {ai.ready
            ? "siap diminta oleh koordinator/admin berwenang pada detail insiden."
            : ai.reason}
        </p>
        <p>
          Jadwal dan ambang kedaluwarsa harus ditetapkan operator sesuai
          persetujuan instansi. Data observasi dan keberhasilan sinkronisasi
          memiliki waktu berbeda.
        </p>
      </section>
      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">
          Katalog wilayah dalam akses Anda
        </h2>
        {districts.data.length ? (
          districts.data.map((d) => (
            <article key={d.id} className="border-b py-3">
              <strong>{d.name}</strong>
              <p>
                {d.source} · Versi {d.boundary_version} · Lisensi {d.license}
              </p>
              <p>
                {mode === "demo"
                  ? "Geometri DEMO / sintetis"
                  : `Persetujuan tercatat ${date(d.approved_at)}`}
              </p>
            </article>
          ))
        ) : (
          <p>
            Belum ada wilayah untuk mode ini. Impor batas resmi memerlukan
            sumber, lisensi, versi dan persetujuan.
          </p>
        )}
      </section>
      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">30 sinkronisasi terbaru</h2>
        <p className="text-sm">
          Metrik job mencakup seluruh cakupan sumber pada mode ini. Observasi
          tanpa kecocokan wilayah tunggal tetap disimpan tanpa penetapan
          wilayah.
        </p>
        {runs.data?.length ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {[
                    "Sumber",
                    "Status",
                    "Mulai",
                    "Selesai",
                    "Dibaca / baru / diperbarui",
                    "Tanpa wilayah tunggal",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.source}</td>
                    <td>{r.status}</td>
                    <td>{date(r.started_at)}</td>
                    <td>{date(r.finished_at)}</td>
                    <td>
                      {r.rows_seen} / {r.rows_inserted} / {r.rows_updated}
                    </td>
                    <td>{r.unmatched_observations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : runs.error ? (
          <p>
            Rincian sinkronisasi belum dapat dimuat. Selesaikan pembaruan
            database sebelum menilai kesehatan sumber dari halaman ini.
          </p>
        ) : (
          <p>
            Belum ada sinkronisasi. Tidak ada waktu keberhasilan yang
            diasumsikan.
          </p>
        )}
      </section>
    </>
  );
}
