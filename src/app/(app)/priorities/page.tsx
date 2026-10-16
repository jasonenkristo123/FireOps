import { readFilters, type Search } from "@/features/operations/domain";
import { PriorityBoard } from "@/features/operations/priority-board";
export default async function Page({ searchParams }: { searchParams: Search }) {
  const filters = await readFilters(searchParams);
  if (!(await searchParams).sort) {
    filters.sort = "final_priority";
    filters.direction = "asc";
  }
  if (!(await searchParams).mode) filters.mode = "live";
  return <PriorityBoard f={filters} />;
}
