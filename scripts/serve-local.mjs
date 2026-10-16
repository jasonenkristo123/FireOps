import { spawn, spawnSync } from "node:child_process";
import { localAppEnvironment } from "./local-config.mjs";

const env = localAppEnvironment();
const build = spawnSync("pnpm", ["build"], { env, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);
const child = spawn(
  "pnpm",
  ["start", "--hostname", "127.0.0.1", "--port", "3100"],
  {
    env,
    stdio: "inherit",
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
