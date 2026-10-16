import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata: Metadata = { title: "Pendaftaran" };
export default function RegisterPage() {
  return (
    <AuthScreen
      title="Daftar akun FireOps"
      description="Buat akun dan langsung masuk sebagai viewer. Administrator dapat mengatur peran dan wilayah akses Anda."
    >
      <AuthForm mode="register" />
    </AuthScreen>
  );
}
