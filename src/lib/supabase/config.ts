import { z } from "zod";

const publicConfigSchema = z.object({
  url: z.url(),
  key: z.string().min(1),
});

export function getSupabaseConfig() {
  const result = publicConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}
