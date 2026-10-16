import { z } from "zod";

const email = z.email("Masukkan alamat email yang valid.").max(254);
const password = z
  .string()
  .min(12, "Gunakan minimal 12 karakter.")
  .max(128, "Maksimal 128 karakter.");
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Masukkan kata sandi.").max(128),
});
export const registerSchema = z.object({ email, password });
export const recoverySchema = z.object({ email });
export const resetSchema = z.object({ password });
export type AuthMode =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password";
export type AuthState = {
  error?: string;
  success?: string;
  fields?: Partial<Record<"email" | "password", string[]>>;
};

export function callbackDestination(next: string | null) {
  return next === "/reset-password" ? "/reset-password" : "/dashboard";
}

export const callbackSchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  token_hash: z.string().min(1).max(2048).optional(),
  type: z.enum(["signup", "email", "recovery"]).optional(),
  next: z.string().max(2048).optional(),
});
