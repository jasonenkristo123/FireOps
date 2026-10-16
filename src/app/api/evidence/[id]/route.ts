import { z } from "zod";
import { hasOperationalAccess } from "@/features/auth/access";
import { getAccess } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await getAccess();
  if (!a || a.unavailable || !hasOperationalAccess(a.profile, a.districts))
    return new Response("Akses ditolak", { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response("Tidak ditemukan", { status: 404 });
  const db = await createClient();
  const { data: e } = await db
    .from("evidence_files")
    .select("storage_path,mime_type")
    .eq("id", id)
    .single();
  if (!e)
    return new Response("Tidak ditemukan atau akses ditolak", { status: 404 });
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (
    preview &&
    !["image/jpeg", "image/png", "image/webp"].includes(e.mime_type)
  )
    return new Response("Pratinjau hanya untuk foto yang didukung.", {
      status: 415,
    });
  const { data, error } = await db.storage
    .from("incident-evidence")
    .createSignedUrl(e.storage_path, 60, { download: !preview });
  if (error) return new Response("Bukti tidak dapat diunduh", { status: 503 });
  return new Response(null, {
    status: 303,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
