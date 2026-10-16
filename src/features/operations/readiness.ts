import "server-only";
import { bboxSchema, sourceSchema } from "./firms";
export function ingestionReadiness() {
  const checks = [
    ["SUPABASE_SECRET_KEY", Boolean(process.env.SUPABASE_SECRET_KEY)],
    ["NASA_FIRMS_MAP_KEY", Boolean(process.env.NASA_FIRMS_MAP_KEY)],
    [
      "NASA_FIRMS_SOURCE",
      sourceSchema.safeParse(process.env.NASA_FIRMS_SOURCE).success,
    ],
    [
      "NASA_FIRMS_BBOX",
      bboxSchema.safeParse(process.env.NASA_FIRMS_BBOX).success,
    ],
    [
      "NASA_FIRMS_SYNC_TOKEN",
      (process.env.NASA_FIRMS_SYNC_TOKEN?.length ?? 0) >= 32,
    ],
  ] as const;
  return {
    ready: checks.every(([, ready]) => ready),
    missing: checks.filter(([, ready]) => !ready).map(([name]) => name),
  };
}
