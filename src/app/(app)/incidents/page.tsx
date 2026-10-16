import { BrowseView } from "@/features/operations/browse-view";
import { readFilters, type Search } from "@/features/operations/domain";
export default async function Page({ searchParams }: { searchParams: Search }) {
  return <BrowseView f={await readFilters(searchParams)} path="/incidents" />;
}
