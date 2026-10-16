import { randomBytes } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { parseEnv } from "node:util";
import { z } from "zod";

// Local configuration only: default is read-only, --apply fills empty entries.
// No credentials are printed and existing nonempty values are never replaced.
const apply = process.argv.includes("--apply");
const acceptBbox = process.argv.includes("--accept-candidate-bbox");
const file = ".env.local";
try {
  if (!existsSync(file))
    throw new Error(
      ".env.local belum tersedia. Konfigurasi Supabase dan MAP_KEY perlu diisi terlebih dahulu.",
    );
  const original = readFileSync(file, "utf8");
  const env = parseEnv(original);
  const review = z
    .object({
      candidate_bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    })
    .parse(
      JSON.parse(readFileSync("data/reference/kalbar-big/review.json", "utf8")),
    );
  const [west, south, east, north] = review.candidate_bbox;
  if (
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    west >= east ||
    south >= north
  )
    throw new Error("Kandidat bbox tidak valid.");
  const names = ["NASA_FIRMS_BBOX", "NASA_FIRMS_SYNC_TOKEN"];
  const definitionName = (line) => {
    const equals = line.indexOf("=");
    if (equals < 0) return "";
    return line
      .slice(0, equals)
      .trim()
      .replace(/^export[ \t]+/, "");
  };
  for (const name of names) {
    const matches = original
      .split(/\r?\n/)
      .filter((line) => definitionName(line) === name);
    if (matches.length > 1)
      throw new Error(
        `${name} memiliki definisi ganda. Hapus duplikasi secara manual dahulu.`,
      );
    console.log(
      `${name}: ${env[name]?.trim() ? "sudah terisi; dipertahankan" : "kosong; dapat dilengkapi"}`,
    );
  }
  if (
    env.NASA_FIRMS_SYNC_TOKEN?.trim() &&
    env.NASA_FIRMS_SYNC_TOKEN.length < 32
  )
    throw new Error(
      "Token yang sudah ada kurang dari 32 karakter; tidak ditimpa. Tinjau lalu kosongkan nilainya jika ingin membuat token baru.",
    );
  if (!apply) {
    console.log(
      "Pemeriksaan saja, tidak ada perubahan. Untuk memakai kandidat cakupan Kalbar dan membuat token: pnpm live:configure --apply --accept-candidate-bbox",
    );
    process.exit(0);
  }
  if (!env.NASA_FIRMS_BBOX?.trim() && !acceptBbox)
    throw new Error(
      "Tinjau bbox pada docs/runbooks/live-map-setup.md lalu sertakan --accept-candidate-bbox untuk memilih cakupan pengembangan ini. Ini bukan persetujuan batas/operasi instansi.",
    );
  const changes = [];
  if (!env.NASA_FIRMS_BBOX?.trim())
    changes.push(["NASA_FIRMS_BBOX", review.candidate_bbox.join(",")]);
  if (!env.NASA_FIRMS_SYNC_TOKEN?.trim())
    changes.push(["NASA_FIRMS_SYNC_TOKEN", randomBytes(32).toString("hex")]);
  if (!changes.length) {
    console.log("Kedua nilai sudah tersedia; tidak ada perubahan.");
    process.exit(0);
  }
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  let updated = original;
  for (const [name, value] of changes) {
    const lines = updated.split(/\r?\n/);
    const index = lines.findIndex((line) => definitionName(line) === name);
    if (index >= 0) {
      lines[index] = `${name}=${value}`;
      updated = lines.join(newline);
    } else {
      updated += `${updated.endsWith("\n") ? "" : newline}${name}=${value}${newline}`;
    }
  }
  const temporary = `${file}.fireops-${randomBytes(8).toString("hex")}.tmp`;
  try {
    writeFileSync(temporary, updated, { mode: 0o600, flag: "wx" });
    if (readFileSync(file, "utf8") !== original)
      throw new Error(
        ".env.local berubah saat diproses. Tidak ditimpa; jalankan kembali.",
      );
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  console.log(
    `Melengkapi ${changes.map(([name]) => name).join(", ")}. Nilai rahasia tidak ditampilkan. Mulai ulang pnpm dev.`,
  );
  console.log(
    "Tidak ada permintaan NASA, impor database, atau jadwal yang dijalankan.",
  );
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Berkas kandidat bbox tidak valid. Jalankan pnpm boundaries:prepare terlebih dahulu."
      : error instanceof Error
        ? error.message
        : "Pengaturan env gagal.",
  );
  process.exitCode = 1;
}
