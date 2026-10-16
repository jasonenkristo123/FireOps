import {
  Activity,
  ArrowUpRight,
  Clock3,
  Layers,
  MapPinned,
  Radio,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { requireAccountAccess } from "@/features/auth/session";
import { FiltersForm, ModeBanner, StateBadge } from "./browse-view";
import { browse } from "./data";
import { DataWarnings } from "./data-warning";
import {
  date,
  type Filters,
  filterUrl,
  label,
  priorities,
  statuses,
} from "./domain";
import { IncidentMap } from "./map-loader";
import { observationMapPoint } from "./observation-map-point";
import { ingestionReadiness } from "./readiness";

export async function DashboardView({ f }: { f: Filters }) {
  const access = await requireAccountAccess();
  let data: Awaited<ReturnType<typeof browse>> | null = null;
  let unavailable = false;
  if (access.districts.length) {
    try {
      data = await browse(f);
    } catch {
      unavailable = true;
    }
  }
  const canManage =
    access.districts.length > 0 &&
    ["admin", "coordinator"].includes(access.profile.role);
  const setup = ingestionReadiness();
  const observations = data?.observations ?? [];
  const incidents = data?.incidents ?? [];
  const points = [
    ...observations.map(observationMapPoint),
    ...incidents.map((i) => ({
      id: i.id,
      latitude: i.latitude,
      longitude: i.longitude,
      title: i.reference,
      detail: `${i.title} · ${label(i.verification_status)} · ${label(i.final_priority)}`,
      href: `/incidents/${i.id}`,
      kind: "incident",
      priority: i.final_priority,
    })),
  ];
  const latestSync = data?.health.reduce<string | null>(
    (latest, h) =>
      h.last_successful_sync_at &&
      (!latest || h.last_successful_sync_at > latest)
        ? h.last_successful_sync_at
        : latest,
    null,
  );
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <MapPinned aria-hidden className="size-4" />
            Kalimantan Barat · Indonesia
          </p>
          <h1 className="text-2xl font-bold md:text-3xl">
            Dashboard pemantauan
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pantau observasi, telaah bukti, dan koordinasikan tindak lanjut.
          </p>
        </div>
        {canManage && (
          <Link
            href={`/incidents/new?mode=${f.mode}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground no-underline"
          >
            Buat insiden dari laporan
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        )}
      </header>
      <ModeBanner mode={f.mode} compact />
      <DataWarnings warnings={data?.warnings ?? []} />
      <form
        action="/dashboard"
        className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.25fr_1fr_1fr_1fr_auto]"
      >
        <input type="hidden" name="view" value={f.view} />
        <input type="hidden" name="source" value={f.source} />
        <label>
          Mode data
          <select name="mode" defaultValue={f.mode}>
            <option value="live">LIVE</option>
            <option value="demo">DEMO / Simulasi</option>
          </select>
        </label>
        <label>
          Kabupaten / kota
          <select name="district" defaultValue={f.district}>
            <option value="">Semua wilayah berizin</option>
            {data?.districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Waktu
          <select name="time" defaultValue={f.time}>
            <option value="day">24 jam</option>
            <option value="week">7 hari</option>
            <option value="month">30 hari</option>
            <option value="all">Semua waktu</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={f.status}>
            <option value="">Semua status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioritas
          <select name="priority" defaultValue={f.priority}>
            <option value="">Semua prioritas</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {label(priority)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-auto min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Terapkan
        </button>
      </form>
      {unavailable && (
        <p role="alert" className="notice notice-error">
          Data operasional belum dapat dimuat. Peta dasar tetap tersedia.
          Administrator perlu memeriksa koneksi dan migrasi database; angka
          kosong tidak berarti tidak ada kejadian.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Tampilan pemantauan"
          className="inline-flex rounded-lg border bg-card p-1"
        >
          {(
            [
              ["split", "Peta & prioritas"],
              ["map", "Peta penuh"],
              ["list", "Daftar"],
            ] as const
          ).map(([view, title]) => (
            <Link
              key={view}
              href={filterUrl("/dashboard", f, { view })}
              aria-current={view === f.view ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm no-underline ${view === f.view ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {title}
            </Link>
          ))}
        </nav>
        <details className="group w-full lg:w-auto">
          <summary className="cursor-pointer rounded-lg border bg-card px-4 py-2 text-sm font-medium">
            Filter lanjutan: sumber, verifikasi & pencarian
          </summary>
          <div className="mt-3 lg:absolute lg:right-7 lg:z-30 lg:w-[min(900px,calc(100vw-300px))] lg:shadow-xl">
            <FiltersForm
              f={f}
              districts={data?.districts ?? []}
              path="/dashboard"
            />
          </div>
        </details>
      </div>
      <div
        className={`grid items-stretch gap-4 ${f.view === "split" ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}
      >
        {f.view !== "list" && (
          <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <MapPinned aria-hidden className="size-4" />
                Peta Kalimantan Barat
              </h2>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {f.mode === "demo" ? "SIMULASI" : "LIVE"} · {points.length}{" "}
                titik dimuat
              </span>
            </div>
            {!points.length && !unavailable && (
              <div className="space-y-2 border-b bg-muted/40 px-4 py-3 text-sm">
                <p className="font-semibold">
                  {!access.districts.length
                    ? "Titik belum ditampilkan: akun belum memiliki izin wilayah"
                    : f.mode === "live" && !latestSync
                      ? "Belum ada hasil sinkronisasi LIVE untuk ditampilkan"
                      : "Tidak ada titik yang cocok dengan filter dan izin wilayah ini"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {!access.districts.length
                    ? "Operator perlu menyiapkan katalog batas wilayah, lalu administrator memberikan akses kabupaten/kota ke akun Anda. Migrasi saja belum mengisi observasi NASA."
                    : f.mode === "live" && !latestSync
                      ? "Operator perlu melengkapi konfigurasi NASA, menjalankan sinkronisasi, dan memeriksa kecocokan wilayah. Peta kosong bukan bukti bahwa tidak ada titik panas."
                      : "Periksa mode LIVE/DEMO, rentang waktu, sumber, dan filter insiden. Peta hanya menampilkan halaman data yang sedang dimuat."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Posisi Anda tidak membatasi titik ke lokasi Anda. Peta tetap
                  berfokus pada Kalimantan Barat.
                </p>
                {access.profile.role === "admin" && (
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href={`/admin/settings?mode=${f.mode}`}
                      className="inline-block py-1 text-xs"
                    >
                      Lihat kesiapan data dan sinkronisasi
                    </Link>
                    {f.mode === "live" && (
                      <Link
                        href="/admin/observations"
                        prefetch={false}
                        className="inline-block py-1 text-xs font-semibold"
                      >
                        Lihat titik NASA nyata · pratinjau sumber
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
            <IncidentMap
              points={points}
              boundaries={data?.boundaries}
              districtUrl={filterUrl("/dashboard", f)}
              overview
            />
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t px-4 py-3 text-xs">
              <span>
                <span className="mr-1 inline-block size-2.5 rounded-full bg-orange-700" />
                Observasi satelit · belum dinilai
              </span>
              <span>
                <span className="mr-1 inline-block size-2.5 rounded-full bg-slate-600" />
                Insiden / observasi terkait · klik untuk detail
              </span>
              <span className="text-muted-foreground">
                Batas wilayah: hanya sumber yang tercatat · zona risiko belum
                disetujui
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3 text-xs">
              <span>Prioritas manual insiden:</span>
              {priorities.map((priority) => (
                <StateBadge key={priority} value={priority} />
              ))}
            </div>
          </section>
        )}
        {f.view !== "map" && (
          <aside
            className="min-w-0 rounded-xl border bg-card"
            aria-label="Panel prioritas insiden"
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Prioritas insiden</h2>
              <Link
                href={filterUrl("/priorities", f, { page: 1 })}
                className="text-xs"
              >
                Lihat papan
              </Link>
            </div>
            <p className="border-b px-4 py-3 text-xs text-muted-foreground">
              Prioritas akhir dari penilaian manusia. Rekomendasi tetap Belum
              dinilai sampai aturan instansi disetujui. Urutan mengikuti filter;
              bawaan kritis dahulu, lalu kasus tertua.
            </p>
            <div className="max-h-[560px] overflow-y-auto divide-y">
              {incidents.length ? (
                incidents.map((i) => {
                  const assignment = i.assignments.find((a) => !a.ended_at);
                  return (
                    <article className="space-y-2 p-4" key={i.id}>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/incidents/${i.id}`}
                          className="text-sm font-semibold"
                        >
                          {i.reference}
                        </Link>
                        <StateBadge value={i.final_priority} />
                      </div>
                      <p className="text-sm">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.districts.name} · {label(i.current_status)}
                      </p>
                      <StateBadge value={i.verification_status} />
                      <p className="text-xs">
                        PIC / tim:{" "}
                        {assignment?.teams?.name ?? "Belum ditugaskan"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Diperbarui {date(i.updated_at)}
                      </p>
                    </article>
                  );
                })
              ) : (
                <div className="space-y-3 p-6 text-sm">
                  <Layers
                    aria-hidden
                    className="size-8 text-muted-foreground"
                  />
                  <h3 className="font-semibold">
                    {data
                      ? "Belum ada insiden pada filter ini"
                      : "Data insiden belum tersedia"}
                  </h3>
                  <p className="text-muted-foreground">
                    {access.districts.length
                      ? "Insiden dibuat oleh koordinator dari observasi atau laporan lapangan. Deteksi satelit tidak otomatis menjadi kasus terkonfirmasi."
                      : "Minta administrator menetapkan wilayah tugas Anda. Peta dasar tetap dapat dijelajahi."}
                  </p>
                </div>
              )}
            </div>
            {data && (
              <nav
                aria-label="Halaman antrean"
                className="flex items-center justify-between gap-3 border-t p-4 text-xs"
              >
                {f.page > 1 ? (
                  <Link href={filterUrl("/dashboard", f, { page: f.page - 1 })}>
                    Sebelumnya
                  </Link>
                ) : (
                  <span />
                )}
                <span>Halaman {f.page}</span>
                {f.page * 25 < data.count ? (
                  <Link href={filterUrl("/dashboard", f, { page: f.page + 1 })}>
                    Berikutnya
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </aside>
        )}
      </div>
      {!access.districts.length && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          <strong>
            Selamat datang
            {access.profile.display_name
              ? `, ${access.profile.display_name}`
              : ""}
            .
          </strong>{" "}
          Peta dasar dapat digunakan. Belum ada wilayah akses untuk akun Anda;
          observasi, insiden, dan keputusan tampil setelah administrator
          memberikan izin wilayah. <Link href="/settings">Lihat profil</Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            title: "Observasi satelit",
            value: data?.observationCount,
            icon: Radio,
            detail: "Deteksi tersaring · bukan konfirmasi",
          },
          {
            title: "Insiden dalam filter",
            value: data?.count,
            icon: Activity,
            detail: "Kasus yang ditelaah manusia",
          },
          {
            title: "Prioritas tinggi / kritis",
            value: data?.summary?.high_priority_active,
            icon: ShieldCheck,
            detail: "Aktif · ringkasan wilayah dan periode",
          },
          {
            title: "Belum ditugaskan",
            value: data?.summary?.unassigned_active,
            icon: Clock3,
            detail: "Aktif · ringkasan wilayah dan periode",
          },
        ].map(({ title, value, icon: Icon, detail }) => (
          <section key={title} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              <Icon
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            </div>
            <p className="mt-2 text-3xl font-bold">{value ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </section>
        ))}
      </div>
      <section className="grid gap-3 rounded-xl border bg-card p-4 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Observasi terbaru di wilayah/periode
          </p>
          <p className="mt-1 font-medium">
            {date(data?.summary?.last_observation_at)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            Sinkronisasi NASA berhasil terakhir
          </p>
          <p className="mt-1 font-medium">{date(latestSync)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            Halaman dimuat · bukan waktu pengamatan
          </p>
          <p className="mt-1 font-medium">{date(new Date().toISOString())}</p>
        </div>
      </section>
      {f.mode === "live" && !latestSync && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Belum ada keberhasilan sinkronisasi yang dapat ditampilkan untuk
          wilayah akun ini.{" "}
          {setup.missing.length
            ? access.profile.role === "admin"
              ? `Konfigurasi server belum lengkap: ${setup.missing.join(", ")}.`
              : "Sinkronisasi NASA menunggu pengaturan operator."
            : "Operator perlu memastikan batas resmi, sumber, dan jadwal sinkronisasi telah disetujui."}
        </p>
      )}
      {data?.health.some(
        (h) => h.status === "failed" || h.status === "partial",
      ) && (
        <p role="alert" className="notice notice-error">
          Ada sinkronisasi gagal atau sebagian. Data terakhir dipertahankan;
          tinjau waktu pengamatan sebelum mengambil keputusan.
        </p>
      )}
      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Observasi satelit · alternatif peta ({data?.observationCount ?? "—"})
        </summary>
        <div className="mt-4 space-y-3">
          {observations.length ? (
            observations.map((o) => (
              <article key={o.id} className="border-b pb-3 text-sm">
                <Link href={`/incidents/new?observation=${o.id}`}>
                  {o.instrument} · {o.latitude.toFixed(4)},{" "}
                  {o.longitude.toFixed(4)}
                </Link>
                <p>
                  {o.source} · {date(o.detected_at)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Keyakinan: {o.confidence_raw ?? "Tidak tersedia"} (
                  {o.confidence_kind ?? "Tidak tersedia"})
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada observasi dalam mode, filter, dan izin wilayah ini.
            </p>
          )}
          <nav aria-label="Halaman observasi" className="flex gap-4 text-sm">
            {f.observation_page > 1 && (
              <Link
                href={filterUrl("/dashboard", f, {
                  observation_page: f.observation_page - 1,
                })}
              >
                Sebelumnya
              </Link>
            )}
            {data && f.observation_page * 100 < data.observationCount && (
              <Link
                href={filterUrl("/dashboard", f, {
                  observation_page: f.observation_page + 1,
                })}
              >
                Berikutnya
              </Link>
            )}
          </nav>
        </div>
      </details>
    </div>
  );
}
