import { execFileSync } from "node:child_process";
import { z } from "zod";

// Deliberately ignores .env.local and any linked/hosted Supabase project.
// Never print this object: CLI status contains disposable local credentials.
export function localConfig() {
  const raw = execFileSync(
    "pnpm",
    ["exec", "supabase", "status", "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const status = z
    .object({
      API_URL: z.url(),
      DB_URL: z.url(),
      PUBLISHABLE_KEY: z.string().optional(),
      ANON_KEY: z.string(),
      SECRET_KEY: z.string().optional(),
      SERVICE_ROLE_KEY: z.string(),
    })
    .parse(JSON.parse(raw));
  for (const name of ["API_URL", "DB_URL"]) {
    if (
      !["127.0.0.1", "localhost", "[::1]"].includes(
        new URL(status[name]).hostname,
      )
    )
      throw new Error("Local tests require loopback Supabase.");
  }
  return status;
}

export function localAppEnvironment() {
  const status = localConfig();
  return {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      status.PUBLISHABLE_KEY || status.ANON_KEY,
    APP_ORIGIN: "http://localhost:3100",
    SUPABASE_SECRET_KEY: "",
    NASA_FIRMS_MAP_KEY: "",
    NASA_FIRMS_SYNC_TOKEN: "",
    AI_PROVIDER_API_KEY: "",
    AI_SUMMARIZATION_ENABLED: "false",
  };
}
