import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { requireOperationalAccess } from "@/features/auth/session";

export default async function DashboardPage() {
  // Check at the data/page boundary as well as in the layout.
  const { profile, districts } = await requireOperationalAccess();
  return (
    <main id="main" className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <span className="text-2xl font-semibold">FireOps</span>
        <form action={logout}>
          <Button type="submit" variant="outline" className="min-h-11 px-5">
            Keluar
          </Button>
        </form>
      </header>
      <div className="space-y-3">
        <ShieldCheck aria-hidden="true" className="size-8 text-primary" />
        <h1 className="text-3xl font-semibold">Ruang kerja petugas</h1>
        <p className="text-muted-foreground">
          Peran: <strong>{profile.role}</strong> · Wilayah tugas:{" "}
          {districts.join(", ")}
        </p>
      </div>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Fondasi akses siap</h2>
        <p className="mt-3 text-muted-foreground">
          Peta dan data operasional belum tersedia pada tahap ini. Belum ada
          sinkronisasi NASA FIRMS yang dijalankan.
        </p>
        <p className="mt-3 text-muted-foreground">
          Model zona risiko belum disetujui. Prioritas tetap belum dinilai.
          Deteksi satelit tidak mengonfirmasi kebakaran.
        </p>
      </section>
    </main>
  );
}
