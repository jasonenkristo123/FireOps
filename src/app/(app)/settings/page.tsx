import Link from "next/link";
import { requireAccountAccess } from "@/features/auth/session";
import { ActionForm } from "@/features/operations/action-form";
import { saveProfile } from "@/features/operations/actions";
export default async function Page() {
  const { profile, districts } = await requireAccountAccess();
  return (
    <>
      <h1 className="text-2xl font-bold">Profil & pengaturan</h1>
      <section className="panel max-w-2xl space-y-4">
        <ActionForm action={saveProfile} submit="Simpan profil">
          <label>
            Nama tampilan
            <input
              name="display_name"
              defaultValue={profile.display_name}
              minLength={1}
              maxLength={100}
              required
            />
          </label>
        </ActionForm>
        <p>
          Peran: {profile.role} · Status akun: {profile.status}
        </p>
        <p>Wilayah tugas: {districts.join(", ")}</p>
        <p>Zona waktu: Asia/Pontianak (WIB).</p>
        <Link href="/forgot-password">
          Ubah kata sandi melalui email pemulihan
        </Link>
      </section>
      <section className="panel space-y-3">
        <h2 className="font-semibold">Kesiapan data</h2>
        <p>
          Demo dan live dipilih secara eksplisit pada filter. Zona risiko dan
          rekomendasi prioritas otomatis belum diaktifkan karena aturan instansi
          belum disetujui.
        </p>
        <p>
          Sinkronisasi live memerlukan NASA_FIRMS_MAP_KEY, NASA_FIRMS_SOURCE,
          NASA_FIRMS_BBOX yang disetujui, NASA_FIRMS_SYNC_TOKEN, dan
          SUPABASE_SECRET_KEY pada server. Pemicu privat: POST /api/ingest
          dengan Bearer token dari scheduler.
        </p>
      </section>
    </>
  );
}
