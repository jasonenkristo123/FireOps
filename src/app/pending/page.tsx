import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { hasAccountAccess } from "@/features/auth/access";
import { logout } from "@/features/auth/actions";
import { AuthScreen } from "@/features/auth/auth-screen";
import { getAccess } from "@/features/auth/session";

async function AccountStatus({ searchParams }: PageProps<"/pending">) {
  const access = await getAccess();
  if (!access) redirect("/login");
  const params = await searchParams;
  if (
    !access.unavailable &&
    hasAccountAccess(access.profile) &&
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
            : "Akun ini masih menggunakan status akses sebelumnya. Hubungi administrator untuk mengatur peran dan wilayah akses."}
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
      title="Status akun FireOps"
      description="Administrator mengelola peran dan wilayah akses akun."
    >
      <Suspense fallback={<p>Memeriksa akun…</p>}>
        <AccountStatus {...props} />
      </Suspense>
    </AuthScreen>
  );
}
