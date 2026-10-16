import { spawnSync } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";

const result = spawnSync(
  "pnpm",
  ["exec", "supabase", "gen", "types", "typescript", "--local"],
  { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
);
if (result.status !== 0) {
  process.stderr.write(
    "Local type generation failed; existing types preserved. Check local Supabase and CLI permissions.\n",
  );
  process.exit(1);
}
if (!result.stdout.includes("export type Database"))
  throw new Error("Unexpected generated types; existing file preserved");
writeFileSync("src/types/database.types.tmp", result.stdout);
renameSync("src/types/database.types.tmp", "src/types/database.types.ts");
const format = spawnSync(
  "pnpm",
  ["exec", "biome", "check", "--write", "src/types/database.types.ts"],
  { stdio: "inherit" },
);
process.exit(format.status ?? 1);
