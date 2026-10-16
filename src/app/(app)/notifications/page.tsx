import Link from "next/link";
import { z } from "zod";
import { requireAccountAccess } from "@/features/auth/session";
import { ActionForm } from "@/features/operations/action-form";
import { markRead } from "@/features/operations/actions";
import { date, type Search } from "@/features/operations/domain";
import { createClient } from "@/lib/supabase/server";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const { profile } = await requireAccountAccess();
  const raw = await searchParams;
  const mode = raw.mode === "live" ? "live" : "demo";
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse(raw.page);
  const db = await createClient();
  const { data, error } = await db
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("recipient_id", profile.id)
    .eq("data_mode", mode)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Notifikasi gagal dimuat");
  return (
    <>
      <h1 className="text-2xl font-bold">Notifikasi</h1>
      <nav aria-label="Mode notifikasi" className="flex gap-4">
        <Link href="?mode=demo">DEMO / Simulasi</Link>
        <Link href="?mode=live">LIVE</Link>
      </nav>
      <p>
        Mode:{" "}
        <strong>{mode === "demo" ? "DEMO / DATA SIMULASI" : "LIVE"}</strong>.
        Daftar diperbarui otomatis saat tab aktif dan tersambung. Notifikasi
        tersimpan tetap tersedia setelah masuk kembali. Maksimal 50 notifikasi
        per halaman.
      </p>
      {data?.length ? (
        data.map((n) => (
          <article className="panel space-y-3" key={n.id}>
            <Link href={`/incidents/${n.incident_id}`}>{n.title}</Link>
            <p>
              {date(n.created_at)} ·{" "}
              {n.read_at ? "Sudah dibaca" : "Belum dibaca"}
            </p>
            {!n.read_at && (
              <ActionForm action={markRead} submit="Tandai dibaca">
                <input type="hidden" name="id" value={n.id} />
              </ActionForm>
            )}
          </article>
        ))
      ) : (
        <output className="notice">Belum ada notifikasi pada mode ini.</output>
      )}
      <nav aria-label="Halaman notifikasi" className="flex gap-5">
        {page > 1 && (
          <Link href={`?mode=${mode}&page=${page - 1}`}>Sebelumnya</Link>
        )}
        <span>Halaman {page}</span>
        {data?.length === 50 && (
          <Link href={`?mode=${mode}&page=${page + 1}`}>Berikutnya</Link>
        )}
      </nav>
    </>
  );
}
