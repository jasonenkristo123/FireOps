import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata: Metadata = { title: "Pemulihan akun" };
export default function RecoveryPage() {
  return (
    <AuthScreen
      title="Pulihkan akses akun"
      description="Masukkan email akun Anda untuk meminta tautan pemulihan."
    >
      <AuthForm mode="forgot-password" />
    </AuthScreen>
  );
}
