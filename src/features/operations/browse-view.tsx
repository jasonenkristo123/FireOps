import Link from "next/link";
import { Button } from "@/components/ui/button";
import { browse } from "./data";
import { DataWarnings } from "./data-warning";
import {
  date,
  decisions,
  type Filters,
  filterUrl,
  label,
  priorities,
  statuses,
} from "./domain";
import { IncidentMap } from "./map-loader";
import { observationMapPoint } from "./observation-map-point";
export function ModeBanner({
  mode,
  compact = false,
}: {
  mode: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-sm" : "notice"} ${mode === "demo" ? "bg-amber-50 text-amber-950" : "bg-sky-50 text-sky-950"}`}
    >
      <strong>
        {mode === "demo" ? "DEMO / DATA SIMULASI" : "LIVE / DATA OPERASIONAL"}
      </strong>
      <p className="text-sm">
        Deteksi satelit merupakan observasi anomali termal, bukan konfirmasi
        kebakaran. Waktu ditampilkan dalam WIB.
      </p>
    </div>
  );
}
export function StateBadge({ value }: { value: string }) {
  return <span className={`status-badge status-${value}`}>{label(value)}</span>;
}
export function FiltersForm({
  f,
  districts,
  path,
}: {
  f: Filters;
  districts: { code: string; name: string }[];
  path: string;
}) {
  return (
    <form
      action={path}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <label>
        Mode data
        <select name="mode" defaultValue={f.mode}>
          <option value="demo">DEMO / Simulasi</option>
          <option value="live">LIVE / NASA FIRMS</option>
        </select>
      </label>
      <label>
        Kabupaten / wilayah
        <select name="district" defaultValue={f.district}>
          <option value="">Seluruh wilayah berizin</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Rentang waktu
        <select name="time" defaultValue={f.time}>
          <option value="day">24 jam</option>
          <option value="week">7 hari</option>
          <option value="month">30 hari</option>
          <option value="all">Semua waktu</option>
        </select>
      </label>
      <label>
        Sumber
        <select name="source" defaultValue={f.source}>
          <option value="">Semua sumber</option>
          {[
            "VIIRS_SNPP_NRT",
            "VIIRS_NOAA20_NRT",
            "VIIRS_NOAA21_NRT",
            "MODIS_NRT",
            "DEMO_SIMULATION",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Verifikasi
        <select name="verification" defaultValue={f.verification}>
          <option value="">Semua keputusan</option>
          {decisions.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prioritas akhir
        <select name="priority" defaultValue={f.priority}>
          <option value="">Semua prioritas</option>
          {priorities.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Status operasional
        <select name="status" defaultValue={f.status}>
          <option value="">Semua status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cari referensi / judul
        <input name="q" defaultValue={f.q} maxLength={100} />
      </label>
      <label>
        Urutkan
        <select name="sort" defaultValue={f.sort}>
          <option value="updated_at">Terakhir diperbarui</option>
          <option value="created_at">Waktu pembuatan</option>
          <option value="final_priority">Prioritas</option>
          <option value="reference">Referensi</option>
        </select>
      </label>
      <label>
        Arah urutan
        <select name="direction" defaultValue={f.direction}>
          <option value="desc">Menurun</option>
          <option value="asc">Menaik (kritis dahulu)</option>
        </select>
      </label>
      <div className="flex items-end gap-3">
        <input type="hidden" name="view" value={f.view} />
        <Button type="submit">Terapkan filter</Button>
        <Link href={path}>Reset</Link>
      </div>
    </form>
  );
}
export async function BrowseView({
  f,
  path = "/dashboard",
  mine = false,
}: {
  f: Filters;
  path?: string;
  mine?: boolean;
}) {
  const d = await browse(f, mine);
  const points = d.observations.map(observationMapPoint);
  const cases = d.incidents.map((i) => ({
    id: i.id,
    latitude: i.latitude,
    longitude: i.longitude,
    title: i.reference,
    detail: `${label(i.verification_status)} · ${label(i.final_priority)}`,
    href: `/incidents/${i.id}`,
    kind: "incident",
    priority: i.final_priority,
  }));
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">
          {path === "/dashboard"
            ? "Dashboard pemantauan"
            : path === "/priorities"
              ? "Papan prioritas"
              : path === "/assignments"
                ? "Penugasan & progres"
                : "Daftar insiden"}
        </h1>
        <p className="text-muted-foreground">
          Observasi, keputusan manusia, dan tindak lanjut dalam wilayah akses
          Anda.
        </p>
        {["coordinator", "admin"].includes(d.access.profile.role) && (
          <Link
            href={`/incidents/new?mode=${f.mode}`}
            className="mt-3 inline-block"
          >
            Buat insiden dari laporan lapangan
          </Link>
        )}
      </div>
      <ModeBanner mode={f.mode} />
      <DataWarnings warnings={d.warnings} />
      <p className="text-sm text-muted-foreground">
        Halaman dimuat: {date(new Date().toISOString())}. Waktu ini berbeda dari
        waktu observasi dan sinkronisasi.
      </p>
      {path === "/dashboard" && d.summary && (
        <section className="panel space-y-4">
          <h2 className="font-semibold">Ringkasan wilayah & periode</h2>
          <p className="text-sm text-muted-foreground">
            Mengikuti mode, wilayah, periode pembuatan insiden, dan sumber.
            Filter keputusan, status, prioritas, dan pencarian berlaku pada
            daftar di bawah.
          </p>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Insiden terbuka", d.summary.open_incidents],
              ["Dikonfirmasi manusia", d.summary.confirmed_incidents],
              ["Perlu informasi", d.summary.information_needed],
              ["Tidak terkonfirmasi", d.summary.not_confirmed_incidents],
              ["Prioritas tinggi/kritis aktif", d.summary.high_priority_active],
              ["Penugasan aktif", d.summary.active_assignments],
              ["Aktif tanpa penugasan", d.summary.unassigned_active],
            ].map(([title, value]) => (
              <div key={title}>
                <dt className="text-sm">{title}</dt>
                <dd className="text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <FiltersForm f={f} districts={d.districts} path={path} />
      {d.districts.length === 0 && (
        <output className="notice">
          Belum ada wilayah berizin untuk mode ini. Pilih mode lain atau minta
          administrator meninjau izin wilayah.
        </output>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="panel">
          <p>Observasi satelit tersaring</p>
          <strong className="text-3xl">{d.observationCount}</strong>
        </section>
        <section className="panel">
          <p>Insiden tersaring{mine ? " · tugas saya" : ""}</p>
          <strong className="text-3xl">{d.count}</strong>
        </section>
        <section className="panel">
          <p>Observasi terbaru pada halaman ini</p>
          <strong>{date(d.observations[0]?.detected_at)}</strong>
        </section>
      </div>
      {f.mode === "live" && (
        <section className="panel">
          <h2 className="font-semibold">Kesehatan sinkronisasi NASA</h2>
          <p className="text-sm">
            Data dapat tertunda. Usia sinkronisasi ditampilkan tanpa
            mengasumsikan ambang kedaluwarsa yang belum disetujui instansi.
          </p>
          {d.health.length ? (
            d.health
              .filter(
                (h, index, rows) =>
                  rows.findIndex((row) => row.source === h.source) === index,
              )
              .map((h, i) => (
                <p key={`${h.source}-${i}`}>
                  {h.source} · {h.status} · Sinkronisasi berhasil terakhir:{" "}
                  {date(h.last_successful_sync_at)}
                  {h.last_successful_sync_at
                    ? ` · ${Math.max(0, Math.floor((Date.now() - new Date(h.last_successful_sync_at).getTime()) / 60000))} menit sejak keberhasilan terakhir`
                    : ""}
                  {h.status !== "success"
                    ? " · Perhatian: sinkronisasi belum berhasil"
                    : ""}
                </p>
              ))
          ) : (
            <p>
              Belum ada sinkronisasi. Data dapat tertunda; ambang kedaluwarsa
              operasional belum disetujui.
            </p>
          )}
        </section>
      )}
      {path === "/dashboard" && (
        <nav aria-label="Tampilan pemantauan" className="flex gap-5">
          {(
            [
              ["split", "Peta & daftar"],
              ["map", "Peta"],
              ["list", "Daftar"],
            ] as const
          ).map(([view, title]) => (
            <Link
              key={view}
              aria-current={view === f.view ? "page" : undefined}
              href={filterUrl(path, f, { view })}
            >
              {title}
            </Link>
          ))}
        </nav>
      )}
      {path === "/dashboard" && f.view !== "list" && (
        <section className="panel">
          <h2 className="mb-3 text-lg font-semibold">
            Peta observasi & insiden
          </h2>
          <IncidentMap
            points={[...points, ...cases]}
            boundaries={d.boundaries}
            districtUrl={filterUrl(path, f)}
          />
          <p className="mt-2 text-sm">
            Titik oranye: observasi · Titik prioritas: insiden · Kritis merah,
            tinggi jingga, sedang kuning, rendah biru, belum dinilai abu-abu.
            Maksimal 100 observasi dan 25 insiden pada halaman ini. Gunakan
            halaman observasi/insiden untuk menampilkan titik lainnya.
          </p>
          <p className="text-sm text-muted-foreground">
            Zona risiko belum tersedia sampai aturan agregasi disetujui. Garis
            putus-putus menunjukkan batas wilayah dengan sumber di bawah; batas
            DEMO sepenuhnya sintetis.
          </p>
          <details className="mt-3">
            <summary>Sumber batas wilayah</summary>
            {d.districts.map((district) => (
              <p className="mt-2 text-sm" key={district.id}>
                {district.name} · {district.source} ·{" "}
                {district.boundary_version}
              </p>
            ))}
          </details>
          <p className="mt-2 text-sm">
            <Link href={filterUrl(path, f, { view: "list" })}>
              Gunakan daftar sebagai alternatif peta
            </Link>
          </p>
        </section>
      )}
      {(path !== "/dashboard" || f.view !== "map") && (
        <section className="panel">
          <h2 className="mb-4 text-lg font-semibold">
            {mine
              ? "Insiden yang ditugaskan kepada saya"
              : "Insiden dalam filter"}
          </h2>
          {d.incidents.length ? (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {[
                      "Referensi / judul",
                      "Wilayah",
                      "Verifikasi",
                      "Prioritas akhir",
                      "Progres",
                      "Penanggung jawab",
                      "Diperbarui",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.incidents.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link href={`/incidents/${i.id}`}>{i.reference}</Link>
                        <p>{i.title}</p>
                      </td>
                      <td>{i.districts.name}</td>
                      <td>
                        <StateBadge value={i.verification_status} />
                      </td>
                      <td>
                        <StateBadge value={i.final_priority} />
                      </td>
                      <td>{label(i.current_status)}</td>
                      <td>
                        {i.assignments.find((a) => !a.ended_at)?.teams?.name ??
                          "Belum ditugaskan"}
                        <p className="max-w-40 break-all text-xs">
                          {i.assignments.find((a) => !a.ended_at)?.owner_id}
                        </p>
                      </td>
                      <td>{date(i.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <output>
              Tidak ada insiden pada filter ini. Observasi dapat ditelaah
              sebelum membuat insiden.
            </output>
          )}
          <nav
            aria-label="Halaman insiden"
            className="mt-4 flex items-center gap-5"
          >
            {f.page > 1 && (
              <Link href={filterUrl(path, f, { page: f.page - 1 })}>
                Sebelumnya
              </Link>
            )}
            <span>
              Halaman {f.page} · {d.count} insiden
            </span>
            {f.page * 25 < d.count && (
              <Link href={filterUrl(path, f, { page: f.page + 1 })}>
                Berikutnya
              </Link>
            )}
          </nav>
        </section>
      )}
      {path === "/priorities" && (
        <section className="panel">
          <h2 className="font-semibold">Dasar rekomendasi</h2>
          <p>
            Aturan instansi belum disetujui. Rekomendasi tetap Belum dinilai;
            faktor keparahan, urgensi, kekuatan bukti, dan kebaruan tidak
            diganti dengan angka nol. Prioritas akhir dapat ditetapkan
            koordinator secara manual dengan alasan dan histori.
          </p>
        </section>
      )}
      {path === "/dashboard" && (
        <section className="panel">
          <h2 className="mb-4 font-semibold">
            Observasi satelit · alternatif peta
          </h2>
          {f.view !== "map" && d.observations.length ? (
            <ul className="divide-y">
              {d.observations.map((o) => (
                <li key={o.id} className="py-3">
                  <Link href={`/incidents/new?observation=${o.id}`}>
                    {o.instrument} · {o.latitude.toFixed(4)},{" "}
                    {o.longitude.toFixed(4)}
                  </Link>
                  <p className="text-sm">
                    {date(o.detected_at)} · {o.source} · Keyakinan:{" "}
                    {o.confidence_raw ?? "Tidak tersedia"} (
                    {o.confidence_kind ?? "Tidak tersedia"})
                  </p>
                </li>
              ))}
            </ul>
          ) : f.view !== "map" ? (
            <output>
              Belum ada observasi. Demo harus dimuat secara eksplisit; live
              memerlukan konfigurasi NASA dan batas resmi.
            </output>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Maksimal 100 observasi per halaman; waktu dan keyakinan tetap
            mengikuti sumber sensor.
          </p>
          <nav aria-label="Halaman observasi" className="mt-3 flex gap-5">
            {f.observation_page > 1 && (
              <Link
                href={filterUrl(path, f, {
                  observation_page: f.observation_page - 1,
                })}
              >
                Observasi sebelumnya
              </Link>
            )}
            <span>
              Halaman observasi {f.observation_page} · {d.observationCount}{" "}
              observasi
            </span>
            {f.observation_page * 100 < d.observationCount && (
              <Link
                href={filterUrl(path, f, {
                  observation_page: f.observation_page + 1,
                })}
              >
                Observasi berikutnya
              </Link>
            )}
          </nav>
        </section>
      )}
    </>
  );
}
