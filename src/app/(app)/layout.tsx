import { Suspense } from "react";
import { requireOperationalAccess } from "@/features/auth/session";

async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireOperationalAccess();
  return children;
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
