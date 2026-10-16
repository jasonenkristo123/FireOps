import Link from "next/link";
import { z } from "zod";
import { requireOperationalAccess } from "@/features/auth/session";
import { ActionForm } from "@/features/operations/action-form";
import { mutate, uploadEvidence } from "@/features/operations/actions";
import { AssignmentPicker } from "@/features/operations/assignment-picker";
import { ModeBanner, StateBadge } from "@/features/operations/browse-view";
import {
  date,
  decisions,
  label,
  priorities,
  recommendPriority,
  type Search,
  transitions,
} from "@/features/operations/domain";
import { IncidentMap } from "@/features/operations/map-loader";
import { ReportSummaryPanel } from "@/features/operations/report-summary-panel";
import { summaryConfiguration } from "@/features/operations/report-summary-service";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const access = await requireOperationalAccess();
  const { id } = await params;
  const eventPage = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse((await searchParams).event_page);
  if (!z.uuid().safeParse(id).success)
    return <p role="alert">Referensi insiden tidak valid.</p>;
  const db = await createClient();
  const { data: i, error } = await db
    .from("incidents")
    .select("*,districts(name,code,source,boundary_version)")
    .eq("id", id)
    .single();
  if (error || !i)
    return (
      <section className="panel">
        <h1>Insiden tidak ditemukan / akses ditolak</h1>
        <p>Periksa referensi dan izin wilayah.</p>
        <Link href="/incidents">Kembali ke daftar</Link>
      </section>
    );
  const [
    observations,
    events,
    verification,
    assessments,
    assignments,
    reports,
    evidence,
    candidates,
    staff,
  ] = await Promise.all([
    db
      .from("incident_observations")
      .select(
        "hotspot_observations(id,source,satellite,instrument,latitude,longitude,detected_at,received_at,confidence_raw,confidence_kind,frp)",
      )
      .eq("incident_id", id),
    db
      .from("incident_events")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((eventPage - 1) * 100, eventPage * 100 - 1),
    db
      .from("verification_decisions")
      .select("*")
      .eq("incident_id", id)
      .order("incident_version", { ascending: false })
      .limit(50),
    db
      .from("priority_assessments")
      .select("*")
      .eq("incident_id", id)
      .order("assessed_at", { ascending: false })
      .limit(50),
    db
      .from("assignments")
      .select("*,teams(name)")
      .eq("incident_id", id)
      .order("assigned_at", { ascending: false })
      .limit(50),
    db
      .from("reports")
      .select("*")
      .eq("incident_id", id)
      .order("submitted_at", { ascending: false })
      .limit(50),
    db
      .from("evidence_files")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.rpc("eligible_assignees", { target: id }),
    db.rpc("staff_roster"),
  ]);
  if (
    [
      observations,
      events,
      verification,
      assessments,
      assignments,
      reports,
      evidence,
      candidates,
      staff,
    ].some((r) => r.error)
  )
    throw new Error("Detail insiden gagal dimuat");
  const manager = ["coordinator", "admin"].includes(access.profile.role);
  const active = assignments.data?.find((a) => !a.ended_at);
  const writer =
    manager ||
    (access.profile.role === "field_officer" &&
      active?.owner_id === access.profile.id);
  const hidden = (operation: string) => (
    <>
      <input type="hidden" name="target" value={i.id} />
      <input type="hidden" name="expected_version" value={i.row_version} />
      <input type="hidden" name="operation" value={operation} />
    </>
  );
  const reason = (title = "Alasan / justifikasi") => (
    <label>
      {title}
      <textarea name="reason" minLength={10} maxLength={2000} required />
    </label>
  );
  const now = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16);
  const recommendation = recommendPriority(assessments.data?.[0] ?? {});
  const ai = summaryConfiguration();
  return (
    <>
      <Link href={`/incidents?mode=${i.data_mode}&time=all`}>
        ← Daftar insiden
      </Link>
      <header>
        <p className="text-sm text-muted-foreground">
          {i.reference} · Versi {i.row_version}
        </p>
        <h1 className="text-2xl font-bold">{i.title}</h1>
        <p>{i.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StateBadge value={i.verification_status} />
          <StateBadge value={i.final_priority} />
          <StateBadge value={i.current_status} />
        </div>
      </header>
      <ModeBanner mode={i.data_mode} />
      <nav aria-label="Bagian detail" className="flex flex-wrap gap-5">
        {[
          ["overview", "Ringkasan"],
          ["verification", "Verifikasi"],
          ["priority", "Prioritas"],
          ["assignment", "Penugasan"],
          ["reports", "Laporan & bukti"],
          ["timeline", "Linimasa"],
        ].map(([a, b]) => (
          <Link key={a} href={`#${a}`}>
            {b}
          </Link>
        ))}
      </nav>
      <section id="overview" className="panel space-y-3">
        <h2 className="text-xl font-semibold">Lokasi & asal data</h2>
        <p>
          {i.districts?.name} · {i.latitude}, {i.longitude}
        </p>
        <p>
          Batas wilayah: {i.districts?.source} · {i.districts?.boundary_version}
        </p>
        <p>
          Dibuat: {date(i.created_at)} · Diperbarui: {date(i.updated_at)}
        </p>
        <IncidentMap
          points={[
            {
              id: i.id,
              latitude: i.latitude,
              longitude: i.longitude,
              title: i.reference,
              detail: label(i.verification_status),
              href: `/incidents/${i.id}`,
              kind: "incident",
              priority: i.final_priority,
            },
          ]}
        />
        <h3 className="font-semibold">Observasi terkait</h3>
        {observations.data?.map(
          ({ hotspot_observations: o }) =>
            o && (
              <div key={o.id} className="rounded-lg border p-3">
                <Link href={`/incidents/new?observation=${o.id}`}>
                  {o.source} · {o.instrument} / {o.satellite}
                </Link>
                <p>
                  Diamati {date(o.detected_at)} · Diterima {date(o.received_at)}
                </p>
                <p>
                  Keyakinan: {o.confidence_raw ?? "Tidak tersedia"} (
                  {o.confidence_kind ?? "Tidak tersedia"}) · FRP:{" "}
                  {o.frp ?? "Tidak tersedia"}
                </p>
              </div>
            ),
        )}
        {manager && (
          <details>
            <summary className="cursor-pointer py-3">
              Tautkan observasi tambahan
            </summary>
            <ActionForm action={mutate}>
              {hidden("link")}
              <label>
                ID observasi (mode dan wilayah harus sama)
                <input name="observation_id" required />
              </label>
              {reason()}
            </ActionForm>
          </details>
        )}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section id="verification" className="panel space-y-4">
          <h2 className="text-xl font-semibold">Verifikasi manusia</h2>
          <p>
            “Tidak terkonfirmasi” tidak membuktikan tidak ada kebakaran.
            Keputusan baru menggantikan keputusan sebelumnya dengan histori
            tetap tersimpan.
          </p>
          {manager ? (
            <ActionForm action={mutate} submit="Catat keputusan verifikasi">
              {hidden("verify")}
              <label>
                Keputusan
                <select name="decision" defaultValue={i.verification_status}>
                  {decisions.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
              {reason()}
              <label className="flex gap-3">
                <input type="checkbox" required className="size-5" />
                Saya telah menelaah bukti dan bertanggung jawab atas keputusan
                ini.
              </label>
            </ActionForm>
          ) : (
            <p className="notice">
              Verifikasi hanya untuk koordinator/admin berizin wilayah.
            </p>
          )}
          <h3 className="font-semibold">Histori keputusan</h3>
          {verification.data?.map((v) => (
            <div key={v.id} className="border-t pt-3">
              <StateBadge value={v.decision} />
              <p>{v.reason}</p>
              <p className="text-xs">
                Petugas {v.actor_id} · {date(v.decided_at)}
                {v.supersedes_id ? " · Menggantikan keputusan sebelumnya" : ""}
              </p>
            </div>
          ))}
        </section>
        <section id="priority" className="panel space-y-4">
          <h2 className="text-xl font-semibold">Prioritas & dasar penilaian</h2>
          <p>
            Rekomendasi: <StateBadge value={recommendation.recommendation} /> ·
            Versi aturan: {recommendation.rulesetVersion}
          </p>
          {recommendation.reasons.map((r) => (
            <p key={r}>{r}</p>
          ))}
          <p>
            Faktor belum lengkap:{" "}
            {recommendation.missingInputs.map(label).join(", ") ||
              "Tidak ada faktor kosong; aturan belum disetujui"}
            .
          </p>
          {manager && (
            <ActionForm action={mutate} submit="Tetapkan prioritas manual">
              {hidden("priority")}
              <label>
                Prioritas akhir
                <select name="priority" defaultValue={i.final_priority}>
                  {priorities.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
              {[
                ["severity", "Keparahan", ["unknown", "low", "medium", "high"]],
                ["urgency", "Urgensi", ["unknown", "low", "medium", "high"]],
                [
                  "evidence_strength",
                  "Kekuatan bukti",
                  ["insufficient", "partial", "strong"],
                ],
                [
                  "data_freshness",
                  "Kebaruan data",
                  ["unknown", "fresh", "aging", "stale"],
                ],
              ].map(([name, title, values]) => (
                <label key={String(name)}>
                  {String(title)}
                  <select name={String(name)}>
                    {(values as string[]).map((v) => (
                      <option key={v} value={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {reason("Justifikasi prioritas manual")}
              <label>
                Kondisi lapangan yang dilaporkan
                <textarea
                  name="field_conditions"
                  maxLength={2000}
                  placeholder="Contoh: akses lokasi, aset yang dilaporkan terpapar, cuaca menurut petugas. Jelaskan sumber dan ketidakpastian."
                />
              </label>
            </ActionForm>
          )}
          {assessments.data?.map((a) => (
            <div className="border-t pt-3" key={a.id}>
              <StateBadge value={a.final_priority} />
              <p>{a.override_reason}</p>
              <p>
                Faktor manual: {label(a.severity)} / {label(a.urgency)} /{" "}
                {label(a.evidence_strength)} / {label(a.data_freshness)}
              </p>
              <p className="text-xs">
                {a.actor_id} · {date(a.assessed_at)} · Rekomendasi:{" "}
                {label(a.recommendation)}
              </p>
            </div>
          ))}
        </section>
      </div>
      <section id="assignment" className="panel space-y-4">
        <h2 className="text-xl font-semibold">Penugasan & progres</h2>
        <p>
          Penanggung jawab:{" "}
          {active
            ? staff.data?.find((s) => s.user_id === active.owner_id)
                ?.display_name || active.owner_id
            : "Belum ditugaskan"}{" "}
          · Tim: {active?.teams?.name ?? "Belum ditentukan"}
        </p>
        {manager && (
          <ActionForm action={mutate} submit="Tugaskan / alihkan petugas">
            {hidden("assign")}
            <AssignmentPicker candidates={candidates.data ?? []} />
            {reason("Alasan penugasan / pengalihan")}
            <p className="text-sm">
              Server memvalidasi keanggotaan tim, ketersediaan, akun aktif, dan
              wilayah pada saat penyimpanan.
            </p>
          </ActionForm>
        )}
        {writer && (
          <ActionForm action={mutate} submit="Perbarui progres">
            {hidden("status")}
            <label>
              Status berikutnya
              <select name="status" required defaultValue="">
                <option value="" disabled>
                  Pilih status
                </option>
                {transitions[i.current_status]
                  .filter(
                    (s) => manager || !["triaging", "cancelled"].includes(s),
                  )
                  .map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
              </select>
            </label>
            {reason("Catatan progres")}
          </ActionForm>
        )}
        <details>
          <summary>Histori penugasan</summary>
          {assignments.data?.map((a) => (
            <p key={a.id} className="mt-3">
              {a.teams?.name} · {a.owner_id} · {date(a.assigned_at)} —{" "}
              {a.ended_at ? date(a.ended_at) : "Aktif"} · {a.reason}
            </p>
          ))}
        </details>
      </section>
      <section id="reports" className="panel space-y-5">
        <h2 className="text-xl font-semibold">
          Laporan, komentar & bukti privat
        </h2>
        <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
          <h3 className="font-semibold">Ringkasan lokal · tanpa AI</h3>
          <p className="text-sm">
            {reports.data?.length ?? 0} laporan terbaru ·{" "}
            {evidence.data?.length ?? 0} berkas bukti dimuat. Cuplikan berikut
            berasal dari teks laporan, bukan hasil verifikasi.
          </p>
          <ul className="space-y-3 text-sm">
            {reports.data?.slice(0, 3).map((r) => (
              <li key={r.id}>
                <a href={`#report-${r.id}`} className="font-medium">
                  {r.source_label} · {date(r.observed_at)}
                </a>
                <p>
                  {r.body.length > 320 ? `${r.body.slice(0, 320)}…` : r.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-sm">
            Bukti yang perlu ditinjau:{" "}
            {!reports.data?.length ? "belum ada laporan lapangan; " : ""}
            {!evidence.data?.length ? "belum ada lampiran pendukung; " : ""}
            {i.verification_status === "needs_more_information"
              ? "keputusan saat ini masih membutuhkan informasi tambahan."
              : "pastikan bukti sesuai alasan keputusan manusia yang tercatat."}
          </p>
        </div>
        <ReportSummaryPanel
          incidentId={i.id}
          available={manager && ai.ready && Boolean(reports.data?.length)}
          reason={
            !manager
              ? "Ringkasan AI hanya dapat diminta koordinator/admin berwenang."
              : !reports.data?.length
                ? "Tambahkan laporan sebelum meminta ringkasan."
                : ai.ready
                  ? ""
                  : ai.reason
          }
        />
        {writer && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ActionForm action={mutate} submit="Kirim laporan / catatan">
              {hidden("report")}
              <label>
                Waktu pengamatan (WIB)
                <input
                  type="datetime-local"
                  name="observed_at"
                  defaultValue={now}
                  required
                />
              </label>
              {reason("Isi laporan / catatan")}
            </ActionForm>
            <ActionForm action={uploadEvidence} submit="Unggah bukti privat">
              <input type="hidden" name="target" value={id} />
              <input
                type="hidden"
                name="expected_version"
                value={i.row_version}
              />
              <label>
                Foto / dokumen (maksimal 750 KB)
                <input
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                />
              </label>
              <label>
                Waktu pengambilan (WIB)
                <input
                  type="datetime-local"
                  name="captured_at"
                  defaultValue={now}
                  required
                />
              </label>
              {reason("Deskripsi bukti")}
              <p className="text-xs">
                Berkas dapat memuat metadata sensitif. Akses dibatasi sesuai
                wilayah; pengunduhan memakai tautan sementara.
              </p>
            </ActionForm>
          </div>
        )}
        {reports.data?.map((r) => (
          <article
            key={r.id}
            id={`report-${r.id}`}
            className="scroll-mt-6 rounded-lg border p-4"
          >
            <p className="whitespace-pre-wrap">{r.body}</p>
            <p className="text-xs">
              {r.source_label} · {r.author_id} · Diamati {date(r.observed_at)} ·
              Dikirim {date(r.submitted_at)}
            </p>
          </article>
        ))}
        {evidence.data?.map((e) => (
          <article key={e.id} className="rounded-lg border p-4">
            {["image/jpeg", "image/png", "image/webp"].includes(
              e.mime_type,
            ) && (
              // biome-ignore lint/performance/noImgElement: Private evidence must be fetched with the current user's cookies, without shared image optimization caching.
              <img
                src={`/api/evidence/${e.id}?preview=1`}
                alt={e.description}
                width={640}
                height={400}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="mb-3 max-h-80 w-full rounded-lg bg-muted object-contain"
              />
            )}
            <Link href={`/api/evidence/${e.id}`}>Unduh: {e.description}</Link>
            <p className="text-sm">
              {e.mime_type} · {e.size_bytes} byte · {date(e.captured_at)} ·{" "}
              {e.uploaded_by}
            </p>
          </article>
        ))}
        {!reports.data?.length && !evidence.data?.length && (
          <p>Belum ada laporan atau lampiran.</p>
        )}
      </section>
      <section id="timeline" className="panel">
        <h2 className="mb-4 text-xl font-semibold">Linimasa aktivitas</h2>
        <p className="mb-4 text-sm">
          100 aktivitas terbaru. Keputusan dan aktivitas terdahulu tetap
          disimpan di database.
        </p>
        <ol className="space-y-4 border-l pl-5">
          {events.data?.map((e) => (
            <li key={e.id}>
              <strong>{label(e.event_type)}</strong>
              <p className="whitespace-pre-wrap">{e.note}</p>
              {e.new_value &&
                typeof e.new_value === "object" &&
                !Array.isArray(e.new_value) &&
                typeof e.new_value.field_conditions === "string" &&
                e.new_value.field_conditions && (
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    Kondisi lapangan yang dilaporkan:{" "}
                    {e.new_value.field_conditions}
                  </p>
                )}
              <p className="text-xs text-muted-foreground">
                {date(e.created_at)} · Petugas {e.actor_id}
              </p>
            </li>
          ))}
        </ol>
        <nav aria-label="Halaman linimasa" className="mt-5 flex gap-5">
          {eventPage > 1 && (
            <Link href={`?event_page=${eventPage - 1}#timeline`}>
              Lebih baru
            </Link>
          )}
          {events.data?.length === 100 && (
            <Link href={`?event_page=${eventPage + 1}#timeline`}>
              Lebih lama
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
