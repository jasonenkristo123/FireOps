import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// MapLibre 6 resolves its module worker relative to import.meta.url. After
// bundling, that is a Next chunk URL, not the package's dist directory.
// Serve the installed worker from our own origin with its exact package version.
const require = createRequire(import.meta.url);
const packagePath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(packagePath, "utf8"));
if (typeof version !== "string" || !/^\d+\.\d+\.\d+[\w.-]*$/.test(version))
  throw new Error("Invalid installed MapLibre version.");
const packageRoot = dirname(packagePath);
const target = join(process.cwd(), "public", "maplibre", version);
mkdirSync(target, { recursive: true });
for (const file of [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-worker.mjs.map",
  "maplibre-gl-shared.mjs",
]) {
  copyFileSync(join(packageRoot, "dist", file), join(target, file));
}
copyFileSync(join(packageRoot, "LICENSE.txt"), join(target, "LICENSE.txt"));
console.log(`Prepared same-origin MapLibre ${version} worker.`);
