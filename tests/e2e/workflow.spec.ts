import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig } from "../../scripts/local-config.mjs";

const config = localConfig();
const fixtureAuth = createClient(
  config.API_URL,
  config.SECRET_KEY || config.SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
function sql(input: string) {
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_fireops",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input, stdio: ["pipe", "pipe", "pipe"] },
  );
}
const suffix = randomUUID();
const password = `Local-workflow-${randomUUID()}`;
const coordinatorEmail = `coordinator-${suffix}@example.test`;
const officerEmail = `officer-${suffix}@example.test`;
const viewerEmail = `readonly-${suffix}@example.test`;
const adminEmail = `admin-${suffix}@example.test`;
const observation = randomUUID();
const team = randomUUID();
const title = `SIMULASI E2E ${suffix.slice(0, 8)}`;
let officer = "";
test.beforeAll(async () => {
  sql(readFileSync("supabase/tests/fixtures/test-districts.psql", "utf8"));
  for (const [email, role] of [
    [coordinatorEmail, "coordinator"],
    [officerEmail, "field_officer"],
    [viewerEmail, "viewer"],
    [adminEmail, "admin"],
  ]) {
    const user = await fixtureAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (user.error || !user.data.user)
      throw new Error("Local fixture account failed");
    const id = user.data.user.id;
    if (role === "field_officer") officer = id;
    sql(
      `update public.profiles set role='${role}',status='active',display_name='Synthetic ${role}' where id='${id}';insert into public.profile_district_grants(user_id,district_code,granted_by) values('${id}','TEST-A','${id}');`,
    );
  }
  sql(
    `insert into public.hotspot_observations(id,observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,district_id,data_mode) select '${observation}','e2e:${observation}','DEMO_SIMULATION','SIMULATED','SIMULATED',1,1,now(),'{"provenance":"Synthetic browser workflow fixture; not NASA data"}',id,'demo' from public.districts where code='TEST-A';insert into public.teams(id,name,district_id,authority_type) select '${team}','Synthetic E2E ${suffix}',id,'Synthetic test mandate' from public.districts where code='TEST-A';insert into public.team_members(team_id,user_id,availability) values('${team}','${officer}','available');`,
  );
});
test("coordinator and officer complete persistent human-operated workflow", async ({
  page,
}) => {
  // This complete three-role story includes private Storage and many page loads.
  test.setTimeout(90_000);
  const login = async (email: string) => {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Kata sandi", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page).toHaveURL(/dashboard$/);
  };
  await login(coordinatorEmail);
  await expect(
    page.getByRole("heading", { name: "Dashboard pemantauan" }),
  ).toBeVisible();
  await page.goto("/dashboard?mode=demo");
  await expect(
    page.getByText("DEMO / DATA SIMULASI", { exact: true }),
  ).toBeVisible();
  await page.goto(`/incidents/new?observation=${observation}`);
  await page.getByLabel("Judul insiden").fill(title);
  await page
    .getByLabel("Alasan pembukaan insiden")
    .fill("SIMULASI: pembukaan kasus untuk pengujian alur lengkap.");
  await page.getByRole("button", { name: "Buat insiden", exact: true }).click();
  await expect(page).toHaveURL(/\/incidents\/[a-f0-9-]{36}$/);
  const incidentUrl = page.url();
  const verify = page.locator("#verification");
  await verify
    .getByRole("combobox", { name: "Keputusan", exact: true })
    .selectOption("confirmed");
  await verify
    .getByLabel("Alasan / justifikasi")
    .fill(
      "SIMULASI: verifikasi manusia menggunakan laporan lapangan sintetis.",
    );
  await verify.getByRole("checkbox").check();
  await verify
    .getByRole("button", { name: "Catat keputusan verifikasi" })
    .click();
  await expect(verify.getByRole("status")).toContainText("tersimpan");
  await page.reload();
  await expect(
    page.locator("header").getByText("Dikonfirmasi petugas", { exact: true }),
  ).toBeVisible();
  const priority = page.locator("#priority");
  await priority.getByLabel("Prioritas akhir").selectOption("high");
  await priority
    .getByLabel("Justifikasi prioritas manual")
    .fill(
      "SIMULASI: prioritas manual berdasarkan kebutuhan penelaahan petugas.",
    );
  await priority
    .getByRole("button", { name: "Tetapkan prioritas manual" })
    .click();
  await expect(priority.getByRole("status")).toContainText("tersimpan");
  await page.reload();
  const assignment = page.locator("#assignment");
  await assignment
    .getByLabel("Tim berwenang di wilayah insiden")
    .selectOption(team);
  await assignment
    .getByLabel("Petugas (harus tersedia dan anggota tim terpilih)")
    .selectOption(officer);
  await assignment
    .getByLabel("Alasan penugasan / pengalihan")
    .fill("SIMULASI: tugaskan petugas berwenang dalam wilayah uji.");
  await assignment
    .getByRole("button", { name: "Tugaskan / alihkan petugas" })
    .click();
  await expect(assignment.getByRole("status")).toContainText("tersimpan");
  await page.reload();
  const reports = page.locator("#reports");
  await reports
    .getByLabel("Isi laporan / catatan")
    .fill("SIMULASI: bukti tambahan dari skenario uji, bukan kejadian nyata.");
  await reports
    .getByRole("button", { name: "Kirim laporan / catatan" })
    .click();
  await expect(reports.getByRole("status")).toContainText("tersimpan");
  await page.reload();
  await reports.getByLabel("Foto / dokumen (maksimal 750 KB)").setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRa8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await reports
    .getByLabel("Deskripsi bukti")
    .fill("SIMULASI: gambar satu piksel untuk pengujian akses bukti.");
  await reports.getByRole("button", { name: "Unggah bukti privat" }).click();
  await expect(reports.getByRole("status")).toContainText(
    "Bukti privat disimpan",
  );
  const downloadHref = await reports
    .getByRole("link", { name: /Unduh:/ })
    .getAttribute("href");
  if (!downloadHref) throw new Error("Expected evidence download link");
  const download = await page.request.get(downloadHref, { maxRedirects: 0 });
  expect(download.status()).toBe(303);
  const signed = download.headers().location;
  expect((await page.request.get(signed)).status()).toBe(200);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await login(officerEmail);
  await page
    .getByRole("link", { name: "Penugasan", exact: true })
    .click({ timeout: 10_000 });
  await expect(
    page.getByRole("heading", { name: "Penugasan & progres", exact: true }),
  ).toBeVisible();
  await test.step("open the incident from the officer assignment queue", async () => {
    const assignedIncident = page
      .getByRole("table")
      .locator(`a[href="${new URL(incidentUrl).pathname}"]`);
    await expect(assignedIncident).toBeVisible();
    await assignedIncident.click({ timeout: 10_000 });
    await expect(page).toHaveURL(incidentUrl);
  });
  await expect(page.locator("#verification").getByRole("button")).toHaveCount(
    0,
  );
  await page
    .locator("#assignment")
    .getByLabel("Status berikutnya")
    .selectOption("in_progress");
  await page
    .locator("#assignment")
    .getByLabel("Catatan progres")
    .fill("SIMULASI: petugas memulai penanganan untuk skenario uji.");
  await page
    .locator("#assignment")
    .getByRole("button", { name: "Perbarui progres" })
    .click();
  await expect(page.locator("#assignment").getByRole("status")).toContainText(
    "tersimpan",
  );
  await page.reload();
  await expect(
    page.locator("header").getByText("Dalam penanganan", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#timeline")).toContainText(
    "petugas memulai penanganan",
  );
  await page.getByRole("link", { name: "Notifikasi", exact: true }).click();
  await expect(
    page.getByText("Belum dibaca", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tandai dibaca" }).first().click();
  await expect(
    page.getByText("Sudah dibaca", { exact: false }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(incidentUrl);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await login(viewerEmail);
  await page.goto(incidentUrl);
  await expect(page.locator("#verification").getByRole("button")).toHaveCount(
    0,
  );
  await expect(page.locator("#assignment").getByRole("button")).toHaveCount(0);
  await expect(page.locator("#reports").getByRole("button")).toHaveCount(0);
  await page.goto(
    `/incidents?mode=demo&source=DEMO_SIMULATION&verification=confirmed&priority=high&time=all&q=${encodeURIComponent(title)}`,
  );
  await expect(
    page.getByRole("cell", { name: new RegExp(title) }),
  ).toBeVisible();
  for (const [path, heading] of [
    ["/priorities", "Papan prioritas"],
    ["/teams", "Tim & petugas"],
    ["/settings", "Profil & pengaturan"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
});
test("disabled ingestion and unauthenticated evidence fail closed", async ({
  request,
}) => {
  const ingest = await request.post("/api/ingest");
  expect(ingest.status()).toBe(503);
  const evidence = await request.get(`/api/evidence/${randomUUID()}`);
  expect(evidence.status()).toBe(403);
  expect((await request.get("/api/notifications")).status()).toBe(401);
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok", service: "fireops" });
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");
});
test("report-origin case, documented base, scoped maps and admin health work end to end", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.goto("/teams");
  const card = page
    .locator("section.panel")
    .filter({ hasText: `Synthetic E2E ${suffix}` })
    .first();
  await card
    .getByText("Edit pengaturan & lokasi basis", { exact: true })
    .click();
  await card.getByLabel("Lintang basis", { exact: true }).fill("1");
  await card.getByLabel("Bujur basis", { exact: true }).fill("1");
  await card
    .getByLabel("Sumber lokasi basis")
    .fill("Synthetic E2E base record, not an officer position");
  await card
    .getByLabel("Waktu pencatatan basis (WIB)")
    .fill("2026-10-01T07:00");
  await card
    .getByLabel("Alasan perubahan tim")
    .fill(`SIMULASI: catat basis untuk pengujian jarak ${suffix}.`);
  await card.getByRole("button", { name: "Simpan pengaturan tim" }).click();
  await expect(card.getByRole("status")).toContainText("diaudit");
  await page.goto("/incidents/new?mode=demo");
  const reportTitle = `SIMULASI laporan ${suffix.slice(0, 8)}`;
  await page.getByLabel("Judul insiden").fill(reportTitle);
  await page
    .getByLabel("Wilayah laporan")
    .selectOption({ label: "DEMO / Test square A" });
  await page.getByLabel("Lintang (WGS84)").fill("1.01");
  await page.getByLabel("Bujur (WGS84)").fill("1.01");
  await page.getByLabel("Waktu pengamatan (WIB)").fill("2026-10-01T07:00");
  await page
    .getByLabel("Sumber laporan", { exact: true })
    .fill("SIMULASI radio petugas, bukan NASA");
  await page
    .getByLabel("Isi laporan / alasan pembukaan")
    .fill(
      "SIMULASI: laporan lapangan sintetis untuk pengujian alur tanpa observasi satelit.",
    );
  await page.getByRole("button", { name: "Buka insiden dari laporan" }).click();
  await expect(page).toHaveURL(/\/incidents\/[a-f0-9-]{36}$/);
  await expect(page.locator("#reports")).toContainText(
    "SIMULASI radio petugas, bukan NASA",
  );
  await expect(
    page.locator("header").getByText("Perlu informasi", { exact: true }),
  ).toBeVisible();
  await page
    .locator("#assignment")
    .getByLabel("Tim berwenang di wilayah insiden")
    .selectOption(team);
  await expect(page.locator("#assignment")).toContainText("1.6 km");
  const notifications = await page.request.get("/api/notifications");
  expect(notifications.status()).toBe(200);
  const snapshot = await notifications.json();
  expect(snapshot.modes.map((m: { mode: string }) => m.mode)).toEqual([
    "demo",
    "live",
  ]);
  expect(notifications.headers()["cache-control"]).toContain("no-store");
  await page.goto("/dashboard?mode=demo&time=all&status=new&view=list");
  await expect(page.getByLabel("Status operasional")).toHaveValue("new");
  await expect(
    page.getByText("Observasi satelit", { exact: true }),
  ).toBeVisible();
  const bannerBox = await page
    .getByText("DEMO / DATA SIMULASI", { exact: true })
    .boundingBox();
  const summaryBox = await page
    .getByText("Observasi satelit", { exact: true })
    .boundingBox();
  expect(bannerBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(bannerBox?.y).toBeLessThan(summaryBox?.y ?? 0);
  await expect(
    page.locator('section[aria-label^="Peta Kalimantan"]'),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/completion-dashboard-desktop.png",
    fullPage: true,
  });
  await page.goto("/admin/settings?mode=live");
  await expect(
    page.getByRole("heading", { name: "Kesehatan sistem & konfigurasi" }),
  ).toBeVisible();
  await expect(page.getByText(/Ringkasan AI:/)).toBeVisible();
  await page.goto("/admin/audit");
  await expect(
    page.getByText(`SIMULASI: catat basis untuk pengujian jarak ${suffix}.`, {
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/completion-audit-mobile.png",
    fullPage: true,
  });
});
