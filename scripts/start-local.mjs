import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  ["exec", "supabase", "start", "-x", "studio,vector,logflare,imgproxy"],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
// Supabase CLI success output includes local secret keys. Suppress it entirely.
if (result.status !== 0) {
  console.error(
    "Local Supabase startup failed. Inspect Docker health and image downloads; no credentials were printed.",
  );
  process.exit(result.status || 1);
}
console.log("Local FireOps Supabase started; credential output suppressed.");
