"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  type AuthState,
  loginSchema,
  recoverySchema,
  registerSchema,
  resetSchema,
} from "./validation";

const unavailable = { error: "Layanan akun belum tersedia. Coba lagi nanti." };
const authError = {
  error: "Permintaan tidak dapat diproses. Periksa isian atau coba lagi nanti.",
};

function authOrigin() {
  const result = z.url().safeParse(process.env.APP_ORIGIN);
  if (!result.success) throw new Error("AUTH_ORIGIN_UNAVAILABLE");
  return new URL(result.data).origin;
}

export async function login(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return authError;
  } catch {
    return unavailable;
  }
  redirect("/dashboard");
}

export async function register(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      // Only the display name is user supplied; database defaults control access.
      options: { data: { display_name: parsed.data.display_name } },
    });
    if (error) return authError;
    if (!data.session)
      return {
        error:
          "Pendaftaran langsung belum tersedia. Hubungi pengelola untuk menonaktifkan konfirmasi email pada pengaturan akun. Jika sudah memiliki akun, silakan masuk.",
      };
  } catch {
    return unavailable;
  }
  redirect("/dashboard");
}

export async function requestRecovery(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = recoverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${authOrigin()}/auth/callback?next=/reset-password`,
      },
    );
    if (error) return authError;
    return {
      success:
        "Jika akun dapat dipulihkan, tautan pemulihan dikirim ke email Anda.",
    };
  } catch {
    return unavailable;
  }
}

export async function resetPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };
  try {
    const supabase = await createClient();
    const { data, error: identityError } = await supabase.auth.getUser();
    if (identityError || !data.user || data.user.is_anonymous)
      return {
        error:
          "Tautan pemulihan tidak valid atau kedaluwarsa. Minta tautan baru.",
      };
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return authError;
    await supabase.auth.signOut();
  } catch {
    return unavailable;
  }
  redirect("/login");
}

export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("SIGNOUT_FAILED");
  } catch {
    // Retain a visible failure; do not claim that an existing session was cleared.
    redirect("/pending?logout=failed");
  }
  redirect("/login");
}
