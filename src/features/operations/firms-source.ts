import "server-only";
import type { z } from "zod";
import { type bboxSchema, parseFirms, type sourceSchema } from "./firms";

// Never attach upstream URLs/bodies to errors: the MAP_KEY is in the URL path.
export async function fetchFirms(
  source: z.infer<typeof sourceSchema>,
  bbox: z.infer<typeof bboxSchema>,
  key: string,
) {
  try {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${source}/${bbox.join(",")}/2`,
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
    if (
      !response?.ok ||
      response.headers.get("content-type")?.includes("text/html")
    )
      throw new Error("UPSTREAM_UNAVAILABLE");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("EMPTY_BODY");
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 5_000_000) throw new Error("PAYLOAD_TOO_LARGE");
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const fetchedAt = new Date().toISOString();
    return {
      rows: parseFirms(
        Buffer.concat(chunks).toString("utf8"),
        source,
        bbox,
        new Date(fetchedAt),
      ),
      fetchedAt,
    };
  } catch {
    throw new Error("FIRMS_FETCH_FAILED");
  }
}
