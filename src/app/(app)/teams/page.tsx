import { requireAccountAccess } from "@/features/auth/session";
import { ActionForm } from "@/features/operations/action-form";
import { saveTeam, updateTeamDetails } from "@/features/operations/actions";
import { DataWarnings } from "@/features/operations/data-warning";
import { date, label } from "@/features/operations/domain";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const { profile } = await requireAccountAccess();
  const db = await createClient();
  const [teams, members, staff, districts] = await Promise.all([
    db.from("teams").select("*,districts(name,data_mode)").order("name"),
    db.from("team_members").select("*"),
    db.rpc("staff_roster"),
    db.from("districts").select("id,name,data_mode"),
  ]);
  if ([teams, members, staff, districts].some((r) => r.error))
    throw new Error("Tim gagal dimuat");
  return (
    <>
      <h1 className="text-2xl font-bold">Tim & petugas</h1>
      <DataWarnings
        warnings={
          teams.data?.some((t) => typeof t.row_version !== "number")
            ? [{ feature: "team_settings", reason: "schema" }]
            : []
        }
      />
      <p>
        Tim hanya tampil pada wilayah berizin. Ketersediaan dikelola
        administrator dan divalidasi ulang saat penugasan.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {teams.data?.map((t) => (
          <section className="panel" key={t.id}>
            <h2 className="font-semibold">{t.name}</h2>
            <p>
              {t.districts?.name} ·{" "}
              {t.districts?.data_mode === "demo" ? "DEMO / SIMULASI" : "LIVE"}
            </p>
            <p>
              {t.authority_type} · {t.active ? "Aktif" : "Tidak aktif"}
            </p>
            <p className="break-all text-xs">ID tim: {t.id}</p>
            <p className="mt-3 text-sm">
              Basis tim:{" "}
              {t.base_latitude == null
                ? "Belum dicatat"
                : `${t.base_latitude}, ${t.base_longitude}`}{" "}
              {t.base_source ? `· ${t.base_source}` : ""}
            </p>
            {t.base_recorded_at && (
              <p className="text-sm">
                Lokasi basis dicatat {date(t.base_recorded_at)}
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {members.data
                ?.filter((m) => m.team_id === t.id)
                .map((m) => (
                  <li key={m.user_id}>
                    {staff.data?.find((s) => s.user_id === m.user_id)
                      ?.display_name || m.user_id}{" "}
                    · {label(m.availability)}
                    <p className="text-xs">Diperbarui {date(m.updated_at)}</p>
                  </li>
                ))}
            </ul>
            {profile.role === "admin" && typeof t.row_version === "number" && (
              <details className="mt-4">
                <summary className="cursor-pointer py-3">
                  Edit pengaturan & lokasi basis
                </summary>
                <ActionForm
                  action={updateTeamDetails}
                  submit="Simpan pengaturan tim"
                >
                  <input type="hidden" name="target" value={t.id} />
                  <input
                    type="hidden"
                    name="expected_version"
                    value={t.row_version}
                  />
                  <label>
                    Nama tim
                    <input
                      name="name"
                      defaultValue={t.name}
                      minLength={3}
                      maxLength={150}
                      required
                    />
                  </label>
                  <label>
                    Mandat / kewenangan
                    <input
                      name="authority_type"
                      defaultValue={t.authority_type}
                      minLength={3}
                      maxLength={300}
                      required
                    />
                  </label>
                  <label>
                    Status tim
                    <select name="active" defaultValue={String(t.active)}>
                      <option value="true">Aktif</option>
                      <option value="false">
                        Tidak aktif (hentikan penugasan baru)
                      </option>
                    </select>
                  </label>
                  <p className="text-sm">
                    Lokasi basis bersifat opsional, bukan lokasi pribadi
                    petugas. Isi seluruh bidang basis atau kosongkan semuanya
                    untuk menghapusnya.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      Lintang basis
                      <input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        name="base_latitude"
                        defaultValue={t.base_latitude ?? ""}
                      />
                    </label>
                    <label>
                      Bujur basis
                      <input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        name="base_longitude"
                        defaultValue={t.base_longitude ?? ""}
                      />
                    </label>
                  </div>
                  <label>
                    Sumber lokasi basis
                    <input
                      name="base_source"
                      defaultValue={t.base_source ?? ""}
                      maxLength={500}
                    />
                  </label>
                  <label>
                    Waktu pencatatan basis (WIB)
                    <input
                      type="datetime-local"
                      name="base_recorded_at"
                      defaultValue={
                        t.base_recorded_at
                          ? new Date(
                              new Date(t.base_recorded_at).getTime() +
                                7 * 3600000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                    />
                  </label>
                  <label>
                    Alasan perubahan tim
                    <textarea
                      name="reason"
                      minLength={10}
                      maxLength={2000}
                      required
                    />
                  </label>
                </ActionForm>
              </details>
            )}
          </section>
        ))}
      </div>
      {!teams.data?.length && (
        <p className="notice">Belum ada tim dalam wilayah akses Anda.</p>
      )}
      {profile.role === "admin" && (
        <section className="panel">
          <h2 className="mb-4 font-semibold">Buat tim / kelola keanggotaan</h2>
          <ActionForm action={saveTeam}>
            <label>
              Tim
              <select name="target_team" defaultValue="">
                <option value="">Buat tim baru</option>
                {teams.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nama tim
              <input name="team_name" required minLength={3} maxLength={150} />
            </label>
            <label>
              Kewenangan / mandat tim
              <input name="authority" required minLength={3} maxLength={300} />
            </label>
            <label>
              Wilayah tim
              <select name="district" required>
                {districts.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.data_mode}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Anggota petugas lapangan
              <select name="member" required>
                {staff.data
                  ?.filter((s) => s.role === "field_officer")
                  .map((s) => (
                    <option
                      key={`${s.user_id}-${s.district_code}`}
                      value={s.user_id}
                    >
                      {s.display_name || s.user_id} · {s.district_code}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Ketersediaan
              <select name="availability_value" defaultValue="unknown">
                {["unknown", "available", "busy", "unavailable"].map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm">
              Untuk tim yang sudah ada, formulir menambah/memperbarui anggota.
              Nama dan mandat ditetapkan saat tim dibuat.
            </p>
          </ActionForm>
        </section>
      )}
    </>
  );
}
