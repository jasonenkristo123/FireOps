import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { hasOperationalAccess } from "@/features/auth/access";
import { logout } from "@/features/auth/actions";
import { AuthScreen } from "@/features/auth/auth-screen";
import { getAccess } from "@/features/auth/session";

async function AccountStatus({ searchParams }: PageProps<"/pending">) {
  const access = await getAccess();
  if (!access) redirect("/login");
  const params = await searchParams;
  if (
    !access.unavailable &&
    hasOperationalAccess(access.profile, access.districts) &&
    params.logout !== "failed"
  )
    redirect("/dashboard");
  return (
    <div className="space-y-6">
      <output>
        {access.unavailable
          ? "Profil akses belum tersedia. Hubungi pengelola atau coba lagi nanti."
          : access.profile.status === "suspended"
            ? "Akses akun dinonaktifkan. Hubungi pengelola."
            : "Akun belum memiliki persetujuan dan wilayah tugas yang diperlukan. Hubungi pengelola untuk peninjauan."}
      </output>
      {params.logout === "failed" && (
        <p role="alert" className="notice notice-error">
          Keluar belum berhasil. Coba lagi.
        </p>
      )}
      <form action={logout}>
        <Button type="submit" className="h-12 w-full">
          Keluar
        </Button>
      </form>
    </div>
  );
}
export default function PendingPage(props: PageProps<"/pending">) {
  return (
    <AuthScreen
      title="Akses operasional dibatasi"
      description="Konfirmasi email tidak otomatis memberikan akses ke data insiden."
    >
      <Suspense fallback={<p>Memeriksa akun…</p>}>
        <AccountStatus {...props} />
      </Suspense>
    </AuthScreen>
  );
}
