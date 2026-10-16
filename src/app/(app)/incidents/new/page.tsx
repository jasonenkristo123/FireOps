import Link from "next/link";
import { z } from "zod";
import { requireOperationalAccess } from "@/features/auth/session";
import { ActionForm } from "@/features/operations/action-form";
import { createCase, createReportCase } from "@/features/operations/actions";
import { ModeBanner } from "@/features/operations/browse-view";
import { date, type Search } from "@/features/operations/domain";
import { createClient } from "@/lib/supabase/server";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const access = await requireOperationalAccess();
  const params = await searchParams;
  const mode = params.mode === "live" ? "live" : "demo";
  const db = await createClient();
  if (!params.observation) {
    const { data: districts, error } = await db
      .from("districts")
      .select("id,name,data_mode")
      .eq("data_mode", mode)
      .order("name");
    if (error) throw new Error("Wilayah laporan gagal dimuat.");
    return (
      <>
        <h1 className="text-2xl font-bold">
          Buat insiden dari laporan lapangan
        </h1>
        <ModeBanner mode={mode} />
        <nav aria-label="Mode insiden baru" className="flex gap-5">
          <Link href="?mode=demo">DEMO / Simulasi</Link>
          <Link href="?mode=live">LIVE</Link>
        </nav>
        <p>
          Laporan manusia dicatat beserta sumber dan waktu pengamatan. Laporan
          ini tidak menjadi observasi NASA atau konfirmasi kebakaran.
        </p>
        {["admin", "coordinator"].includes(access.profile.role) &&
        districts?.length ? (
          <section className="panel">
            <ActionForm
              action={createReportCase}
              submit="Buka insiden dari laporan"
            >
              <input type="hidden" name="data_mode" value={mode} />
              <label>
                Judul insiden
                <input name="title" required minLength={3} maxLength={200} />
              </label>
              <label>
                Wilayah laporan
                <select name="district_id" required>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  Lintang (WGS84)
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    required
                  />
                </label>
                <label>
                  Bujur (WGS84)
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    required
                  />
                </label>
              </div>
              <label>
                Waktu pengamatan (WIB)
                <input name="observed_at" type="datetime-local" required />
              </label>
              <label>
                Sumber laporan
                <input
                  name="source_label"
                  minLength={3}
                  maxLength={300}
                  placeholder="Contoh: laporan petugas melalui radio"
                  required
                />
              </label>
              <label>
                Isi laporan / alasan pembukaan
                <textarea
                  name="body"
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </label>
              <p>
                Insiden dibuka dengan status Perlu informasi dan prioritas Belum
                dinilai. Koordinat harus berada dalam wilayah yang dipilih.
              </p>
            </ActionForm>
          </section>
        ) : (
          <p className="notice">
            Pembuatan memerlukan koordinator/admin dan wilayah berizin pada mode
            ini.
          </p>
        )}
        <Link href={`/dashboard?mode=${mode}`}>
          Pilih observasi satelit dari dashboard
        </Link>
      </>
    );
  }
  const id = z.uuid().safeParse(params.observation);
  if (!id.success)
    return (
      <p className="notice">
        Pilih observasi dari <Link href="/dashboard">dashboard</Link>.
      </p>
    );
  const { data: o, error } = await db
    .from("hotspot_observations")
    .select("*,districts(name,source,boundary_version)")
    .eq("id", id.data)
    .single();
  if (error || !o)
    return (
      <p role="alert">
        Observasi tidak ditemukan atau wilayah tidak diizinkan.
      </p>
    );
  const { data: links } = await db
    .from("incident_observations")
    .select("incident_id")
    .eq("observation_id", o.id);
  return (
    <>
      <h1 className="text-2xl font-bold">Telaah observasi satelit</h1>
      <ModeBanner mode={o.data_mode} />
      <section className="panel space-y-3">
        <h2 className="font-semibold">
          {o.source} · {o.instrument}
        </h2>
        <p>
          {o.latitude}, {o.longitude} ·{" "}
          {o.districts?.name ?? "Wilayah belum ditentukan"}
        </p>
        <p>
          Diamati: {date(o.detected_at)} · Diterima: {date(o.received_at)}
        </p>
        <p>
          Keyakinan sumber: {o.confidence_raw ?? "Tidak tersedia"} ·{" "}
          {o.confidence_kind ?? "Semantik tidak tersedia"}
        </p>
        <p>
          FRP: {o.frp ?? "Tidak tersedia"} · Satelit: {o.satellite}
        </p>
        <p className="text-muted-foreground">
          Keyakinan antar sensor tidak dapat disamakan. Observasi ini belum
          merupakan konfirmasi kebakaran.
        </p>
        {links?.map((l) => (
          <p key={l.incident_id}>
            <Link href={`/incidents/${l.incident_id}`}>
              Buka insiden terkait
            </Link>
          </p>
        ))}
      </section>
      {["admin", "coordinator"].includes(access.profile.role) ? (
        <section className="panel">
          <h2 className="mb-4 font-semibold">
            Buat insiden untuk penelaahan manusia
          </h2>
          <ActionForm action={createCase} submit="Buat insiden">
            <input type="hidden" name="observation" value={o.id} />
            <label>
              Judul insiden
              <input
                name="incident_title"
                minLength={3}
                maxLength={200}
                required
              />
            </label>
            <label>
              Alasan pembukaan insiden
              <textarea
                name="reason"
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <p className="text-sm">
              Insiden baru berstatus Perlu informasi dengan prioritas Belum
              dinilai. Pembuatan tidak mengonfirmasi kebakaran.
            </p>
          </ActionForm>
        </section>
      ) : (
        <p className="notice">
          Akses observasi hanya baca. Koordinator/admin dapat membuat insiden.
        </p>
      )}
    </>
  );
}
