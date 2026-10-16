import { Suspense } from "react";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthScreen } from "@/features/auth/auth-screen";
import { getIdentity } from "@/features/auth/session";

export const metadata = { title: "Kata sandi baru" };
async function RecoverySession() {
  const identity = await getIdentity();
  return identity ? (
    <AuthForm mode="reset-password" />
  ) : (
    <output>
      Tautan pemulihan diperlukan.{" "}
      <a href="/forgot-password">Minta tautan baru</a>.
    </output>
  );
}
export default function ResetPage() {
  return (
    <AuthScreen
      title="Atur kata sandi baru"
      description="Setelah kata sandi diperbarui, masuk kembali dengan kata sandi baru."
    >
      <Suspense fallback={<p>Memeriksa tautan…</p>}>
        <RecoverySession />
      </Suspense>
    </AuthScreen>
  );
}
