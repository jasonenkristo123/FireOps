import { NextResponse } from "next/server";
import {
  callbackDestination,
  callbackSchema,
} from "@/features/auth/validation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = callbackSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success)
    return NextResponse.redirect(new URL("/login?callback=failed", url.origin));
  const { code, token_hash: tokenHash, type } = parsed.data;
  try {
    const supabase = await createClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash &&
          (type === "signup" || type === "email" || type === "recovery")
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : null;
    if (result && !result.error) {
      const target =
        type === "recovery"
          ? "/reset-password"
          : callbackDestination(url.searchParams.get("next"));
      const response = NextResponse.redirect(new URL(target, url.origin));
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  } catch {
    /* Provider errors and tokens never reach the URL or logs. */
  }
  return NextResponse.redirect(new URL("/login?callback=failed", url.origin));
}
