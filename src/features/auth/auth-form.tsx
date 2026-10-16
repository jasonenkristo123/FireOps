"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { login, register, requestRecovery, resetPassword } from "./actions";
import type { AuthMode, AuthState } from "./validation";

const actions = {
  login,
  register,
  "forgot-password": requestRecovery,
  "reset-password": resetPassword,
};
const labels = {
  login: "Masuk",
  register: "Daftar akun",
  "forgot-password": "Kirim tautan pemulihan",
  "reset-password": "Simpan kata sandi",
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    actions[mode],
    {},
  );
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error || state.fields) summary.current?.focus();
  }, [state]);
  const configured = Boolean(getSupabaseConfig());
  return (
    <form action={action} className="space-y-5" aria-busy={pending}>
      {!configured && (
        <output className="notice">
          Layanan akun belum dikonfigurasi. Hubungi pengelola.
        </output>
      )}
      {(state.error || state.fields) && (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          className="notice notice-error"
        >
          <p>{state.error ?? "Periksa isian berikut."}</p>
          {state.fields?.display_name && (
            <a href="#display_name">Periksa nama</a>
          )}
          {state.fields?.email && <a href="#email">Periksa alamat email</a>}
          {state.fields?.password && <a href="#password">Periksa kata sandi</a>}
        </div>
      )}
      {state.success && <output className="notice">{state.success}</output>}
      {mode === "register" && (
        <div className="space-y-2">
          <label htmlFor="display_name" className="font-medium">
            Nama
          </label>
          <Input
            id="display_name"
            name="display_name"
            autoComplete="name"
            required
            maxLength={100}
            className="h-12 text-base"
            aria-invalid={Boolean(state.fields?.display_name)}
            aria-describedby={
              state.fields?.display_name ? "name-error" : undefined
            }
          />
          {state.fields?.display_name && (
            <p id="name-error" className="text-sm text-destructive">
              {state.fields.display_name[0]}
            </p>
          )}
        </div>
      )}
      {mode !== "reset-password" && (
        <div className="space-y-2">
          <label htmlFor="email" className="font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            required
            maxLength={254}
            className="h-12 text-base"
            aria-invalid={Boolean(state.fields?.email)}
            aria-describedby={state.fields?.email ? "email-error" : undefined}
          />
          {state.fields?.email && (
            <p id="email-error" className="text-sm text-destructive">
              {state.fields.email[0]}
            </p>
          )}
        </div>
      )}
      {mode !== "forgot-password" && (
        <div className="space-y-2">
          <label htmlFor="password" className="font-medium">
            {mode === "reset-password" ? "Kata sandi baru" : "Kata sandi"}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            className="h-12 text-base"
            aria-invalid={Boolean(state.fields?.password)}
            aria-describedby="password-hint password-error"
          />
          <p id="password-hint" className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Gunakan akun yang terdaftar di FireOps."
              : "Minimal 12 karakter. Pengelola kata sandi dan tempel didukung."}
          </p>
          <p id="password-error" className="text-sm text-destructive">
            {state.fields?.password?.[0]}
          </p>
        </div>
      )}
      <Button
        type="submit"
        disabled={pending || !configured}
        className="h-12 w-full cursor-pointer whitespace-normal text-base"
      >
        {pending ? "Memproses…" : labels[mode]}
      </Button>
      <nav
        aria-label="Bantuan akun"
        className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
      >
        {mode === "login" ? (
          <>
            <Link href="/register">Daftar akun</Link>
            <Link href="/forgot-password">Lupa kata sandi?</Link>
          </>
        ) : (
          <Link href="/login">Kembali ke halaman masuk</Link>
        )}
      </nav>
    </form>
  );
}
