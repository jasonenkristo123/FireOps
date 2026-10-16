import { hasOperationalAccess } from "@/features/auth/access";
import { getAccess } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const access = await getAccess();
  if (!access)
    return Response.json(
      { error: "UNAUTHENTICATED" },
      { status: 401, headers },
    );
  if (
    access.unavailable ||
    !hasOperationalAccess(access.profile, access.districts)
  )
    return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  const db = await createClient();
  const results = await Promise.all(
    (["demo", "live"] as const).map(async (mode) => {
      const [unread, latest] = await Promise.all([
        db
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", access.profile.id)
          .eq("data_mode", mode)
          .is("read_at", null),
        db
          .from("notifications")
          .select("id")
          .eq("recipient_id", access.profile.id)
          .eq("data_mode", mode)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1),
      ]);
      if (unread.error || latest.error) return null;
      return {
        mode,
        unread: unread.count ?? 0,
        latest: latest.data?.[0]?.id ?? null,
      };
    }),
  );
  if (results.some((r) => !r))
    return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  return Response.json({ modes: results }, { headers });
}
