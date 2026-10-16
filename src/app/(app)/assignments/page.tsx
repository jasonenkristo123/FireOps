import { requireAccountAccess } from "@/features/auth/session";
import { BrowseView } from "@/features/operations/browse-view";
import { readFilters, type Search } from "@/features/operations/domain";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const { profile } = await requireAccountAccess();
  return (
    <BrowseView
      f={await readFilters(searchParams)}
      path="/assignments"
      mine={profile.role === "field_officer"}
    />
  );
}
