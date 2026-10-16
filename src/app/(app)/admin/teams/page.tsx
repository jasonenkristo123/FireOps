import { redirect } from "next/navigation";
import { requireAccountAccess } from "@/features/auth/session";
export default async function Page() {
  const { profile } = await requireAccountAccess();
  if (profile.role !== "admin")
    return <p role="alert">Halaman ini hanya untuk administrator.</p>;
  redirect("/teams");
}
