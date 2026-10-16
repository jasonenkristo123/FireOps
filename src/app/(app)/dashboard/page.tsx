import { DashboardView } from "@/features/operations/dashboard-view";
import { readFilters, type Search } from "@/features/operations/domain";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams;
  const filters = await readFilters(searchParams);
  if (!raw.mode) filters.mode = "live";
  if (!raw.sort) {
    filters.sort = "final_priority";
    filters.direction = "asc";
  }
  return <DashboardView f={filters} />;
}
