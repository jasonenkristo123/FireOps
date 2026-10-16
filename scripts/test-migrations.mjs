import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Replay in a separate local Docker project; never reset the developer's database.
const projectId = `fireops-replay-${randomUUID().slice(0, 8)}`;
const workdir = mkdtempSync(join(tmpdir(), "fireops-migration-replay-"));
const schemaDir = join(workdir, "supabase");
const initialSchema = process.argv.includes("--initial-schema");
if (initialSchema)
  mkdirSync(join(schemaDir, "migrations"), { recursive: true });
else
  cpSync("supabase/migrations", join(schemaDir, "migrations"), {
    recursive: true,
  });
cpSync("supabase/tests", join(schemaDir, "tests"), { recursive: true });
cpSync("supabase/seed.sql", join(schemaDir, "seed.sql"));
const config = readFileSync("supabase/config.toml", "utf8")
  .replace('project_id = "fireops"', `project_id = "${projectId}"`)
  .replaceAll("5432", "5532");
writeFileSync(join(schemaDir, "config.toml"), config);

function run(args, showOutput = false) {
  const result = spawnSync(
    "pnpm",
    ["exec", "supabase", ...args, "--workdir", workdir],
    {
      encoding: "utf8",
      timeout: 240_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  // Only SQL test output is printed. CLI startup/status can contain credentials.
  if (showOutput) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (showOutput) process.stderr.write(result.stderr);
    throw new Error(
      `Isolated migration check failed: ${args.slice(0, 2).join(" ")}`,
    );
  }
}

try {
  console.log("Starting isolated local Postgres replay on port 55322…");
  run(["db", "start"]);
  if (initialSchema) {
    const input = readFileSync("supabase/setup/initial-schema.sql", "utf8");
    const args = [
      "exec",
      "-i",
      `supabase_db_${projectId}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ];
    const setup = spawnSync("docker", args, {
      input,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (setup.status !== 0) {
      process.stderr.write(setup.stderr);
      throw new Error("Initial hosted setup SQL failed locally");
    }
    const repeat = spawnSync("docker", args, {
      input,
      encoding: "utf8",
      timeout: 60000,
    });
    if (
      repeat.status === 0 ||
      !repeat.stderr.includes("FIREOPS_ALREADY_PRESENT")
    )
      throw new Error("Expected initial-setup rerun to fail closed");
    cpSync("supabase/migrations", join(schemaDir, "migrations"), {
      recursive: true,
    });
    console.log(
      "Initial setup SQL applied locally; rerun safely rejected; verifying CLI history compatibility…",
    );
  }
  run(["migration", "up", "--local"]);
  console.log(
    "Clean migration replay completed; running RLS and PostGIS tests…",
  );
  run(["test", "db", "--local"], true);
  run([
    "db",
    "lint",
    "--local",
    "--schema",
    "public,private",
    "--level",
    "warning",
    "--fail-on",
    "warning",
  ]);
  console.log(
    "Clean migration replay, database tests and database lint passed.",
  );
} finally {
  run(["stop", "--no-backup"]);
  console.log("Isolated replay containers and database volumes removed.");
}
