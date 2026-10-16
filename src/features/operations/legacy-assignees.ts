import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { AssignmentCandidate } from "./assignment-picker";
import { logDataFailure } from "./data-errors";

// Read compatibility for pre-008 schema only. The mutation RPC still rechecks
// verified active identity, role, district, team membership and availability.
export async function legacyAssignees(
  districtId: string,
  districtCode: string,
  roster: Database["public"]["Functions"]["staff_roster"]["Returns"],
): Promise<AssignmentCandidate[]> {
  const db = await createClient();
  const teams = await db
    .from("teams")
    .select(
      "id,name,authority_type,team_members(user_id,availability,updated_at)",
    )
    .eq("district_id", districtId)
    .eq("active", true)
    .order("name");
  if (teams.error) {
    logDataFailure("legacy_assignment_teams", teams.error);
    return [];
  }
  return teams.data.flatMap((team) =>
    team.team_members.flatMap((member) => {
      const person = roster.find(
        (p) =>
          p.user_id === member.user_id &&
          p.role === "field_officer" &&
          p.district_code === districtCode,
      );
      return person
        ? [
            {
              team_id: team.id,
              team_name: team.name,
              authority_type: team.authority_type,
              owner_id: person.user_id,
              display_name: person.display_name,
              availability: member.availability,
              availability_at: member.updated_at,
              distance_to_team_km: null,
              base_source: null,
              base_recorded_at: null,
            },
          ]
        : [];
    }),
  );
}
