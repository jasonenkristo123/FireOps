import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database.types";
import { getSupabaseConfig } from "./config";

export async function createClient() {
  // Supabase initializes session timers eagerly. Never run them during prerendering.
  await connection();
  const config = getSupabaseConfig();
  if (!config) throw new Error("AUTH_UNAVAILABLE");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Rendering cannot set cookies. The proxy refreshes them before rendering.
        }
      },
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
