import { requireAccountAccess } from "@/features/auth/session";
import { ActionForm } from "@/features/operations/action-form";
import { approveAccount } from "@/features/operations/actions";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const { profile } = await requireAccountAccess();
  if (profile.role !== "admin")
    return (
      <p role="alert" className="notice">
        Akses ditolak. Halaman ini hanya untuk administrator.
      </p>
    );
  const db = await createClient();
  const [users, districts, audits] = await Promise.all([
    db
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("districts").select("code,name,data_mode"),
    db
      .from("access_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if ([users, districts, audits].some((r) => r.error))
    throw new Error("Akun gagal dimuat");
  return (
    <>
      <h1 className="text-2xl font-bold">Peran & akses akun</h1>
      <p>
        100 akun terbaru. Akun baru mendapat peran viewer. Atur peran dan
        wilayah sesuai kewenangan petugas. Setiap perubahan dicatat; perubahan
        akses diri sendiri ditolak.
      </p>
      <section className="panel">
        <ActionForm action={approveAccount} submit="Simpan akses akun">
          <label>
            Akun
            <select name="target_user_id" required>
              {users.data
                ?.filter((u) => u.id !== profile.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.id} · {u.role} / {u.status}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Peran
            <select name="new_role" defaultValue="viewer">
              {[
                "pending",
                "viewer",
                "field_officer",
                "coordinator",
                "admin",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="new_status" defaultValue="active">
              {["pending", "active", "suspended"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend>
              Wilayah yang diberikan (menggantikan seluruh izin sebelumnya)
            </legend>
            {districts.data?.map((d) => (
              <label className="flex items-center gap-3" key={d.code}>
                <input
                  className="size-5"
                  type="checkbox"
                  name="district_codes"
                  value={d.code}
                />
                {d.name} · {d.data_mode}
              </label>
            ))}
          </fieldset>
          <label>
            Alasan perubahan akses
            <textarea name="reason" required minLength={10} maxLength={2000} />
          </label>
        </ActionForm>
      </section>
      <section className="panel">
        <h2 className="font-semibold">Audit akses terbaru</h2>
        {audits.data?.map((a) => (
          <p key={a.id} className="mt-3 break-words text-sm">
            {a.created_at} · Aktor {a.actor_id} · Subjek {a.subject_id} ·{" "}
            {a.reason}
          </p>
        ))}
      </section>
    </>
  );
}
