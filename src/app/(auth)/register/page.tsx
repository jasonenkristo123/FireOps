import { AuthForm } from "@/features/auth/auth-form";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata = { title: "Pendaftaran" };
export default function RegisterPage() {
  return (
    <AuthScreen
      title="Ajukan akun petugas"
      description="Konfirmasi email Anda. Akun baru menunggu peninjauan pengelola dan belum memiliki akses data operasional."
    >
      <AuthForm mode="register" />
    </AuthScreen>
  );
}
