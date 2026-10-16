import Link from "next/link";
import { z } from "zod";
import { requireAccountAccess } from "@/features/auth/session";
import { date, type Search } from "@/features/operations/domain";
import { createClient } from "@/lib/supabase/server";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const { profile } = await requireAccountAccess();
  if (profile.role !== "admin")
    return <p role="alert">Halaman ini hanya untuk administrator.</p>;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse((await searchParams).page);
  const db = await createClient();
  const { data, error, count } = await db
    .from("access_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Audit gagal dimuat.");
  return (
    <>
      <h1 className="text-2xl font-bold">Audit perubahan akses & tim</h1>
      <p>
        Catatan hanya dapat ditambahkan. Keputusan dan aktivitas insiden
        tersedia pada linimasa masing-masing insiden sesuai izin wilayah.
      </p>
      <section className="panel space-y-4">
        {data.length ? (
          data.map((a) => (
            <article key={a.id} className="space-y-2 border-b pb-4">
              <h2 className="font-semibold">{a.reason}</h2>
              <p className="break-all text-sm">
                {date(a.created_at)} · Aktor {a.actor_id} · Subjek{" "}
                {a.subject_id}
              </p>
              <details>
                <summary>Rincian perubahan</summary>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3>Sebelum</h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">
                      {JSON.stringify(a.before_state, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3>Sesudah</h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">
                      {JSON.stringify(a.after_state, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            </article>
          ))
        ) : (
          <p>Belum ada catatan audit.</p>
        )}
      </section>
      <nav aria-label="Halaman audit" className="flex gap-5">
        {page > 1 && <Link href={`?page=${page - 1}`}>Sebelumnya</Link>}
        <span>
          Halaman {page} · {count ?? 0} catatan
        </span>
        {page * 50 < (count ?? 0) && (
          <Link href={`?page=${page + 1}`}>Berikutnya</Link>
        )}
      </nav>
    </>
  );
}
