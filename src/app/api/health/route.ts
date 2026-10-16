import { connection } from "next/server";
// Liveness only. Database/NASA readiness is available to authorized administrators.
export async function GET() {
  await connection();
  return Response.json(
    { status: "ok", service: "fireops" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
