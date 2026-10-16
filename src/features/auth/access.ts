import { z } from "zod";

export const profileSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
  role: z.enum(["pending", "viewer", "field_officer", "coordinator", "admin"]),
  status: z.enum(["pending", "active", "suspended"]),
});
export type AccessProfile = z.infer<typeof profileSchema>;

export function hasAccountAccess(profile: AccessProfile | null) {
  return profile?.status === "active" && profile.role !== "pending";
}

export function hasOperationalAccess(
  profile: AccessProfile | null,
  districtCodes: string[],
) {
  return hasAccountAccess(profile) && districtCodes.length > 0;
}
