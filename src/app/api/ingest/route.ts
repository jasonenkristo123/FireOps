import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  bboxSchema,
  parseFirms,
  sourceSchema,
} from "@/features/operations/firms";
import type { Database } from "@/types/database.types";
export const maxDuration = 120;
export async function POST(request: Request) {
  const token = process.env.NASA_FIRMS_SYNC_TOKEN;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  if (!token || token.length < 32)
    return Response.json(
      {
        error: "Sinkronisasi dinonaktifkan; konfigurasi server belum lengkap.",
      },
      { status: 503 },
    );
  if (
    Buffer.byteLength(auth) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const source = sourceSchema.safeParse(process.env.NASA_FIRMS_SOURCE);
  const bbox = bboxSchema.safeParse(process.env.NASA_FIRMS_BBOX);
  const key = process.env.NASA_FIRMS_MAP_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!source.success || !bbox.success || !key || !secret || !url)
    return Response.json(
      {
        error:
          "Konfigurasi NASA, bbox yang disetujui, atau database belum lengkap.",
      },
      { status: 503 },
    );
  const db = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 1);
  const run = await db.rpc("begin_ingestion", {
    feed_source: source.data,
    window_start: start.toISOString(),
    window_end: now.toISOString(),
  });
  if (run.error)
    return Response.json(
      {
        error:
          run.error.code === "55000"
            ? "Sinkronisasi sedang berjalan atau terlalu sering."
            : "Tidak dapat mencatat sinkronisasi.",
      },
      { status: run.error.code === "55000" ? 409 : 503 },
    );
  try {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${source.data}/${bbox.data.join(",")}/2`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
          redirect: "error",
        },
      );
      if (response.status < 500 && response.status !== 429) break;
      if (attempt === 0)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!response?.ok) throw new Error("UPSTREAM_UNAVAILABLE");
    if (response.headers.get("content-type")?.includes("text/html"))
      throw new Error("INVALID_CONTENT_TYPE");
    // Bound the response while streaming, before allocating the complete CSV.
    const reader = response.body?.getReader();
    if (!reader) throw new Error("EMPTY_BODY");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 5000000) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      chunks.push(part.value);
    }
    const csv = Buffer.concat(chunks).toString("utf8");
    const rows = parseFirms(csv, source.data, bbox.data, now);
    const result = await db.rpc("finish_ingestion", {
      run_id: run.data,
      observations: rows,
    });
    if (result.error) throw new Error("PERSISTENCE_FAILED");
    return Response.json({
      status: "success",
      rows_seen: rows.length,
      run_id: run.data,
    });
  } catch {
    // Never store upstream error text/URLs: NASA embeds the private key in its request path.
    await db.rpc("finish_ingestion", {
      run_id: run.data,
      observations: [],
      failure:
        "Sinkronisasi gagal: upstream, validasi CSV, atau penyimpanan. Periksa konfigurasi dan layanan tanpa mencatat kunci.",
    });
    return Response.json(
      {
        error: "Sinkronisasi gagal; data terakhir tetap dipertahankan.",
        run_id: run.data,
      },
      { status: 502 },
    );
  }
}
