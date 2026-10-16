import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasOperationalAccess, profileSchema } from "./access";

export const getIdentity = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (
      error ||
      !data.user ||
      data.user.is_anonymous ||
      !data.user.email_confirmed_at
    )
      return null;
    return { supabase, userId: data.user.id };
  } catch {
    return null;
  }
});

export const getAccess = cache(async () => {
  const identity = await getIdentity();
  if (!identity) return null;
  const [profileResult, grantsResult] = await Promise.all([
    identity.supabase
      .from("profiles")
      .select("id, display_name, role, status")
      .eq("id", identity.userId)
      .single(),
    identity.supabase
      .from("profile_district_grants")
      .select("district_code")
      .eq("user_id", identity.userId),
  ]);
  const profile = profileSchema.safeParse(profileResult.data);
  if (profileResult.error || grantsResult.error || !profile.success)
    return { unavailable: true as const };
  return {
    unavailable: false as const,
    profile: profile.data,
    districts: (grantsResult.data ?? []).map((g) => g.district_code),
  };
});

export async function requireOperationalAccess() {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (
    access.unavailable ||
    !hasOperationalAccess(access.profile, access.districts)
  )
    redirect("/pending");
  return access;
}
