import { Suspense } from "react";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata = { title: "Masuk" };

async function CallbackNotice({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  return params.callback === "failed" ? (
    <p role="alert" className="notice notice-error mb-5">
      Tautan tidak valid atau kedaluwarsa. Silakan minta tautan baru.
    </p>
  ) : null;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <AuthScreen
      title="Masuk ke FireOps"
      description="Gunakan akun terverifikasi untuk mengakses ruang kerja."
    >
      <Suspense fallback={null}>
        <CallbackNotice {...props} />
      </Suspense>
      <AuthForm mode="login" />
    </AuthScreen>
  );
}
