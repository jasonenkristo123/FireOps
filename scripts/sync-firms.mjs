import { z } from "zod";

// Scheduler entrypoint. No NASA key or database credential is needed on the scheduler.
const url = z.url().safeParse(process.env.FIREOPS_APP_URL);
const token = process.env.NASA_FIRMS_SYNC_TOKEN;
if (!url.success || !token || token.length < 32) {
  console.error(
    "Configure FIREOPS_APP_URL and a private NASA_FIRMS_SYNC_TOKEN of at least 32 characters.",
  );
  process.exit(1);
}
const target = new URL(url.data);
if (
  target.username ||
  target.password ||
  target.search ||
  target.hash ||
  target.pathname !== "/" ||
  (target.protocol !== "https:" &&
    !(
      target.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
    ))
) {
  console.error(
    "FIREOPS_APP_URL must be a bare HTTPS origin (HTTP allowed only for loopback). No request was sent.",
  );
  process.exit(1);
}
if (process.argv.includes("--check")) {
  console.log(
    "Scheduler configuration is valid. No request sent; NASA credentials and deployment readiness were not checked.",
  );
  process.exit(0);
}
try {
  const response = await fetch(new URL("/api/ingest", target), {
    method: "POST",
    redirect: "error",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(125000),
  });
  if (response.status === 409) {
    console.log(
      "Ingestion skipped: another job is active or cooldown applies.",
    );
  } else if (!response.ok) {
    console.error(
      `Ingestion failed (HTTP ${response.status}). Check the protected system-health screen; response body omitted.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      "Ingestion completed. Review source timestamps and unmatched observations in system health.",
    );
  }
} catch {
  console.error(
    "Ingestion request failed or timed out. No URL, token or upstream response was logged.",
  );
  process.exitCode = 1;
}
