"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  requireAccountAccess,
  requireOperationalAccess,
} from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./action-form";
import { isSchemaMismatch } from "./data-errors";
import { decisions, priorities, reasonSchema, statuses } from "./domain";

function fail(message: string): ActionState {
  return { error: message };
}
function dbError(code: string) {
  if (isSchemaMismatch({ code }))
    return "Fitur ini memerlukan pembaruan database. Minta administrator menerapkan pembaruan 008; data sebelumnya tetap tersimpan.";
  return code === "40001"
    ? "Data telah berubah. Muat ulang halaman sebelum menyimpan."
    : code === "42501"
      ? "Anda tidak memiliki izin untuk tindakan atau wilayah ini."
      : "Perubahan ditolak. Periksa alasan, status, kelayakan petugas, dan versi data.";
}
const mutationSchema = z.object({
  target: z.uuid(),
  expected_version: z.coerce.number().int().positive(),
  operation: z.enum([
    "verify",
    "priority",
    "assign",
    "status",
    "report",
    "link",
  ]),
  severity: z.enum(["unknown", "low", "medium", "high"]).optional(),
  urgency: z.enum(["unknown", "low", "medium", "high"]).optional(),
  evidence_strength: z.enum(["insufficient", "partial", "strong"]).optional(),
  data_freshness: z.enum(["unknown", "fresh", "aging", "stale"]).optional(),
  reason: reasonSchema,
  decision: z.enum(decisions).optional(),
  priority: z.enum(priorities).optional(),
  owner_id: z.uuid().optional(),
  team_id: z.uuid().optional(),
  status: z.enum(statuses).optional(),
  observation_id: z.uuid().optional(),
  observed_at: z.iso.datetime().optional(),
  field_conditions: z.string().trim().max(2000).optional(),
});
export async function mutate(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  const raw = Object.fromEntries(form);
  if (
    typeof raw.observed_at === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw.observed_at)
  ) {
    const observed = localTimeSchema.safeParse(raw.observed_at);
    if (!observed.success) return fail("Waktu pengamatan tidak valid.");
    raw.observed_at = new Date(observed.data).toISOString();
  }
  const p = mutationSchema.safeParse(raw);
  if (!p.success)
    return fail(
      "Isi seluruh bidang dengan benar. Alasan minimal 10 karakter; waktu harus valid.",
    );
  if (!["admin", "coordinator", "field_officer"].includes(access.profile.role))
    return fail("Akses hanya baca.");
  const { target, expected_version, operation, ...payload } = p.data;
  const db = await createClient();
  const { error } = await db.rpc("mutate_incident", {
    target,
    expected_version,
    operation,
    payload,
  });
  if (error) return fail(dbError(error.code));
  revalidatePath("/", "layout");
  return { success: "Perubahan tersimpan dalam histori." };
}
export async function createCase(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  if (!["admin", "coordinator"].includes(access.profile.role))
    return fail("Hanya koordinator/admin yang dapat membuat insiden.");
  const p = z
    .object({
      observation: z.uuid(),
      incident_title: z.string().trim().min(3).max(200),
      reason: reasonSchema,
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return fail("Isi judul dan alasan minimal 10 karakter.");
  const db = await createClient();
  const result = await db.rpc("create_incident", p.data);
  if (result.error) return fail(dbError(result.error.code));
  revalidatePath("/", "layout");
  redirect(`/incidents/${result.data}`);
}
const localTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((v) => `${v}:00+07:00`)
  .pipe(z.iso.datetime({ offset: true }));
export async function createReportCase(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  if (!["admin", "coordinator"].includes(access.profile.role))
    return fail("Hanya koordinator/admin yang dapat membuka insiden.");
  const p = z
    .object({
      title: z.string().trim().min(3).max(200),
      body: reasonSchema,
      source_label: z.string().trim().min(3).max(300),
      district_id: z.uuid(),
      data_mode: z.enum(["demo", "live"]),
      latitude: z
        .string()
        .trim()
        .min(1)
        .transform(Number)
        .pipe(z.number().min(-90).max(90)),
      longitude: z
        .string()
        .trim()
        .min(1)
        .transform(Number)
        .pipe(z.number().min(-180).max(180)),
      observed_at: localTimeSchema,
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return fail(
      "Periksa judul, sumber laporan, waktu WIB, koordinat, dan wilayah. Isi laporan minimal 10 karakter.",
    );
  const db = await createClient();
  const result = await db.rpc("create_report_incident", { payload: p.data });
  if (result.error) return fail(dbError(result.error.code));
  revalidatePath("/", "layout");
  redirect(`/incidents/${result.data}`);
}
export async function updateTeamDetails(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  if (access.profile.role !== "admin") return fail("Hanya administrator.");
  const coordinate = (min: number, max: number) =>
    z.union([
      z.literal("").transform(() => null),
      z
        .string()
        .trim()
        .min(1)
        .transform(Number)
        .pipe(z.number().min(min).max(max)),
    ]);
  const p = z
    .object({
      target: z.uuid(),
      expected_version: z.coerce.number().int().positive(),
      name: z.string().trim().min(3).max(150),
      authority_type: z.string().trim().min(3).max(300),
      active: z.enum(["true", "false"]).transform((v) => v === "true"),
      reason: reasonSchema,
      base_latitude: coordinate(-90, 90),
      base_longitude: coordinate(-180, 180),
      base_source: z
        .string()
        .trim()
        .max(500)
        .transform((v) => v || null),
      base_recorded_at: z.union([
        z.literal("").transform(() => null),
        localTimeSchema,
      ]),
    })
    .refine(
      (v) =>
        [
          v.base_latitude,
          v.base_longitude,
          v.base_source,
          v.base_recorded_at,
        ].every((x) => x === null) ||
        ([
          v.base_latitude,
          v.base_longitude,
          v.base_source,
          v.base_recorded_at,
        ].every((x) => x !== null) &&
          (v.base_source?.length ?? 0) >= 3),
    )
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return fail(
      "Periksa nama, mandat, alasan, dan lokasi basis. Isi seluruh bidang basis atau kosongkan seluruhnya.",
    );
  const { target, expected_version, ...payload } = p.data;
  const db = await createClient();
  const result = await db.rpc("update_team_details", {
    target,
    expected_version,
    payload,
  });
  if (result.error) return fail(dbError(result.error.code));
  revalidatePath("/", "layout");
  return { success: "Pengaturan tim tersimpan dan diaudit." };
}
export async function saveProfile(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireAccountAccess();
  const p = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .safeParse(form.get("display_name"));
  if (!p.success) return fail("Nama harus 1–100 karakter.");
  const db = await createClient();
  const { error } = await db
    .from("profiles")
    .update({ display_name: p.data })
    .eq("id", access.profile.id);
  if (error) return fail("Nama gagal disimpan.");
  revalidatePath("/", "layout");
  return { success: "Profil diperbarui." };
}
export async function markRead(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return fail("Notifikasi tidak valid.");
  const db = await createClient();
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("recipient_id", access.profile.id)
    .is("read_at", null);
  if (error) return fail("Notifikasi gagal diperbarui.");
  revalidatePath("/notifications");
  return { success: "Ditandai sudah dibaca." };
}
export async function saveTeam(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  if (access.profile.role !== "admin") return fail("Hanya administrator.");
  const p = z
    .object({
      team_name: z.string().trim().min(3).max(150),
      district: z.uuid(),
      authority: z.string().trim().min(3).max(300),
      member: z.uuid(),
      availability_value: z.enum([
        "available",
        "busy",
        "unavailable",
        "unknown",
      ]),
      target_team: z
        .union([z.uuid(), z.literal("")])
        .transform((v) => v || undefined),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return fail("Periksa nama, wilayah, kewenangan, dan petugas.");
  const db = await createClient();
  const { error } = await db.rpc("manage_team", p.data);
  if (error) return fail(dbError(error.code));
  revalidatePath("/", "layout");
  return { success: "Tim/keanggotaan tersimpan dan diaudit." };
}
export async function approveAccount(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  if (access.profile.role !== "admin") return fail("Hanya administrator.");
  const p = z
    .object({
      target_user_id: z.uuid(),
      new_role: z.enum([
        "pending",
        "viewer",
        "field_officer",
        "coordinator",
        "admin",
      ]),
      new_status: z.enum(["pending", "active", "suspended"]),
      reason: reasonSchema,
    })
    .safeParse(Object.fromEntries(form));
  const grants = z
    .array(z.string().min(1).max(32))
    .max(100)
    .safeParse(form.getAll("district_codes"));
  if (!p.success || !grants.success)
    return fail("Periksa peran, status, alasan, dan wilayah.");
  const db = await createClient();
  const { error } = await db.rpc("set_account_access", {
    ...p.data,
    district_codes: grants.data,
  });
  if (error) return fail(dbError(error.code));
  revalidatePath("/", "layout");
  return { success: "Akses akun disimpan dan diaudit." };
}
export async function uploadEvidence(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const access = await requireOperationalAccess();
  if (!["coordinator", "admin", "field_officer"].includes(access.profile.role))
    return fail("Akses hanya baca.");
  const p = z
    .object({
      target: z.uuid(),
      expected_version: z.coerce.number().int().positive(),
      reason: reasonSchema,
      captured_at: localTimeSchema,
    })
    .safeParse(Object.fromEntries(form));
  const file = form.get("file");
  if (
    !p.success ||
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > 750000
  )
    return fail(
      "Bukti harus JPEG, PNG, WebP, atau PDF, maksimal 750 KB. Deskripsi minimal 10 karakter.",
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  let mime = "";
  let ext = "";
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    mime = "image/jpeg";
    ext = "jpg";
  } else if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    mime = "image/png";
    ext = "png";
  } else if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  ) {
    mime = "image/webp";
    ext = "webp";
  } else if (bytes.subarray(0, 5).toString() === "%PDF-") {
    mime = "application/pdf";
    ext = "pdf";
  }
  if (!mime || file.type !== mime)
    return fail("Isi berkas tidak cocok dengan tipe yang diizinkan.");
  const db = await createClient();
  const { data: i } = await db
    .from("incidents")
    .select("data_mode,row_version")
    .eq("id", p.data.target)
    .single();
  if (!i) return fail("Insiden tidak ditemukan atau akses ditolak.");
  if (i.row_version !== p.data.expected_version) return fail(dbError("40001"));
  const storage_path = `${i.data_mode}/${p.data.target}/${crypto.randomUUID()}.${ext}`;
  const upload = await db.storage
    .from("incident-evidence")
    .upload(storage_path, bytes, { contentType: mime, upsert: false });
  if (upload.error)
    return fail("Unggahan ditolak. Periksa penugasan dan izin bukti.");
  const result = await db.rpc("mutate_incident", {
    target: p.data.target,
    expected_version: p.data.expected_version,
    operation: "evidence",
    payload: {
      reason: p.data.reason,
      storage_path,
      mime_type: mime,
      size_bytes: file.size,
      captured_at: p.data.captured_at,
    },
  });
  if (result.error) {
    await db.storage.from("incident-evidence").remove([storage_path]);
    return fail(dbError(result.error.code));
  }
  revalidatePath("/", "layout");
  return {
    success: "Bukti privat disimpan. Tautan unduhan memiliki batas waktu.",
  };
}
