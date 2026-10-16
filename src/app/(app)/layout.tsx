import { Suspense } from "react";
import { requireAccountAccess } from "@/features/auth/session";
import { Shell } from "@/features/operations/shell";

async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { profile, districts } = await requireAccountAccess();
  return (
    <Shell profile={profile} districts={districts}>
      {children}
    </Shell>
  );
}
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main id="main" className="p-8">
          Memeriksa akses…
        </main>
      }
    >
      <ProtectedLayout>{children}</ProtectedLayout>
    </Suspense>
  );
}
