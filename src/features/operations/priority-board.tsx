import Link from "next/link";
import { requireAccountAccess } from "@/features/auth/session";
import { FiltersForm, ModeBanner, StateBadge } from "./browse-view";
import { browse } from "./data";
import { date, type Filters, filterUrl, label, priorities } from "./domain";

export async function PriorityBoard({ f }: { f: Filters }) {
  const access = await requireAccountAccess();
  const data = access.districts.length ? await browse(f) : null;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Papan prioritas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tinjau prioritas akhir, dasar penilaian, dan penanggung jawab.
          </p>
        </div>
        <Link href={filterUrl("/dashboard", f, { view: "split" })}>
          Kembali ke peta
        </Link>
      </header>
      <ModeBanner mode={f.mode} compact />
      <p className="rounded-lg border bg-card p-4 text-sm">
        Aturan prioritas instansi belum disetujui: rekomendasi tetap{" "}
        <strong>Belum dinilai</strong>. Koordinator dapat menetapkan prioritas
        manual dengan alasan pada detail insiden. Rekomendasi bukan perintah
        penugasan.
      </p>
      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Filter prioritas, wilayah, periode & status
        </summary>
        <div className="mt-3">
          <FiltersForm
            f={f}
            districts={data?.districts ?? []}
            path="/priorities"
          />
        </div>
      </details>
      {!access.districts.length && (
        <p className="notice text-sm">
          Akun Anda belum memiliki wilayah tugas. Papan tetap tersedia; data
          insiden mengikuti izin wilayah yang diberikan administrator.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        {priorities.map((priority) => {
          const incidents =
            data?.incidents.filter((i) => i.final_priority === priority) ?? [];
          return (
            <section
              className="min-w-0 rounded-xl border bg-slate-50"
              key={priority}
            >
              <header className="flex items-center justify-between gap-3 border-b p-4">
                <h2>
                  <StateBadge value={priority} />
                </h2>
                <span className="text-xs text-muted-foreground">
                  {incidents.length} di halaman ini
                </span>
              </header>
              <div className="space-y-3 p-3">
                {incidents.length ? (
                  incidents.map((i) => {
                    const assignment = i.assignments.find((a) => !a.ended_at);
                    return (
                      <article
                        key={i.id}
                        className="space-y-3 rounded-lg border bg-card p-4 shadow-sm"
                      >
                        <div>
                          <Link
                            href={`/incidents/${i.id}#priority`}
                            className="text-xs font-semibold"
                          >
                            {i.reference}
                          </Link>
                          <h3 className="mt-1 text-sm font-semibold">
                            {i.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {i.districts.name} · {label(i.current_status)}
                        </p>
                        <StateBadge value={i.verification_status} />
                        <p className="text-xs">
                          <strong>Dasar prioritas:</strong>{" "}
                          {i.priority_reason ??
                            "Belum ada penilaian manual. Bukti dan faktor prioritas perlu ditelaah."}
                        </p>
                        <p className="text-xs">
                          Rekomendasi: {label(i.recommended_priority)} · PIC /
                          tim: {assignment?.teams?.name ?? "Belum ditugaskan"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date(i.updated_at)}
                        </p>
                        <Link
                          href={`/incidents/${i.id}#priority`}
                          className="inline-flex min-h-9 items-center text-xs"
                        >
                          Tinjau dasar & histori
                        </Link>
                      </article>
                    );
                  })
                ) : (
                  <p className="px-1 py-6 text-xs text-muted-foreground">
                    Tidak ada insiden {label(priority).toLowerCase()} yang
                    dimuat pada filter dan halaman ini.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <nav
        aria-label="Halaman papan prioritas"
        className="flex items-center gap-5 text-sm"
      >
        {f.page > 1 && (
          <Link href={filterUrl("/priorities", f, { page: f.page - 1 })}>
            Sebelumnya
          </Link>
        )}
        <span>
          Halaman {f.page} · {data?.count ?? "—"} insiden tersaring · maksimal
          25 per halaman
        </span>
        {data && f.page * 25 < data.count && (
          <Link href={filterUrl("/priorities", f, { page: f.page + 1 })}>
            Berikutnya
          </Link>
        )}
      </nav>
    </div>
  );
}
