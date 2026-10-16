import { spawn } from "node:child_process";
import { localAppEnvironment } from "./local-config.mjs";

const child = spawn(
  "pnpm",
  ["dev", "--hostname", "127.0.0.1", "--port", "3100"],
  { env: localAppEnvironment(), stdio: "inherit" },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
