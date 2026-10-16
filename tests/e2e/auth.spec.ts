import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { type APIRequestContext, expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { localConfig } from "../../scripts/local-config.mjs";
import type { Database } from "../../src/types/database.types";

const status = localConfig();
const admin = createClient(
  status.API_URL,
  status.SECRET_KEY || status.SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const password = "Local-test-password-2026";

test.beforeAll(() => {
  localFixtureSql(
    readFileSync("supabase/tests/fixtures/test-districts.psql", "utf8"),
  );
});

async function emailVerificationLink(
  request: APIRequestContext,
  email: string,
) {
  let messageId: string | undefined;
  await expect
    .poll(async () => {
      const response = await request.get(
        "http://127.0.0.1:54324/api/v1/messages",
      );
      const data = z
        .object({
          messages: z.array(
            z.object({
              ID: z.string(),
              To: z.array(z.object({ Address: z.string() })),
            }),
          ),
        })
        .parse(await response.json());
      messageId = data.messages.find((message) =>
        message.To.some((to) => to.Address === email),
      )?.ID;
      return Boolean(messageId);
    })
    .toBe(true);
  const response = await request.get(
    `http://127.0.0.1:54324/api/v1/message/${messageId}`,
  );
  const message = z.object({ HTML: z.string() }).parse(await response.json());
  const link = [...message.HTML.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1].replaceAll("&amp;", "&"))
    .find((value) => value.includes("/auth/v1/verify"));
  if (!link || new URL(link).hostname !== "127.0.0.1")
    throw new Error("Expected local email verification link");
  return link;
}

function localFixtureSql(sql: string) {
  // localConfig verifies loopback services; container name is fixed, never derived from .env.
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
    { input: sql, stdio: ["pipe", "pipe", "pipe"] },
  );
}

test("unauthenticated dashboard and recovery form are guarded", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
  await page.goto("/reset-password");
  await expect(page.getByText("Tautan pemulihan diperlukan.")).toBeVisible();
  await expect(page.getByLabel("Kata sandi baru")).toHaveCount(0);
});

test("registration signs in a named viewer without confirmation or district access", async ({
  page,
}) => {
  const email = `e2e-${randomUUID()}@example.test`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/register");
  await expect(page.getByLabel("Nama", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/register-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Nama", { exact: true }).fill("Siti E2E");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Daftar akun", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard pemantauan" }),
  ).toBeVisible();
  await expect(page.getByText(/Selamat datang,\s*Siti E2E\./)).toBeVisible();
  await expect(
    page.getByText("Belum ada wilayah akses.", { exact: false }),
  ).toBeVisible();
  const client = createClient<Database>(
    status.API_URL,
    status.PUBLISHABLE_KEY || status.ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  expect(error).toBeNull();
  const { data: profile } = await client
    .from("profiles")
    .select("display_name,role,status")
    .single();
  expect(profile).toEqual({
    display_name: "Siti E2E",
    role: "viewer",
    status: "active",
  });
  const escalation = await client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", data.user?.id ?? "");
  expect(Boolean(escalation.error)).toBe(true);
  for (const table of [
    "incidents",
    "hotspot_observations",
    "profile_district_grants",
  ] as const) {
    const result = await client.from(table).select("*");
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  }
  await page.getByRole("link", { name: "Lihat profil" }).click();
  await expect(page.getByLabel("Nama tampilan")).toHaveValue("Siti E2E");
  await page.getByLabel("Nama tampilan").fill("Siti Updated");
  await page.getByRole("button", { name: "Simpan profil" }).click();
  await expect(page.getByRole("status")).toContainText("Profil diperbarui");
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  // A stale confirmation-link warning must not prevent password login.
  await page.goto("/login?callback=failed");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByText(/Selamat datang,\s*Siti Updated\./),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/viewer-welcome-mobile.png",
    fullPage: true,
  });
});

test("administrator can assign a new viewer's role and district", async ({
  page,
}) => {
  const suffix = randomUUID();
  const adminEmail = `role-admin-${suffix}@example.test`;
  const targetEmail = `role-target-${suffix}@example.test`;
  const operator = await admin.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
  });
  const target = await admin.auth.admin.createUser({
    email: targetEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Role assignment test" },
  });
  expect(operator.error).toBeNull();
  expect(target.error).toBeNull();
  const operatorId = z.uuid().parse(operator.data.user?.id);
  const targetId = z.uuid().parse(target.data.user?.id);
  // Local fixture bootstrap; the application never grants its own admin role.
  localFixtureSql(
    `update public.profiles set role='admin',status='active' where id='${operatorId}'; insert into public.profile_district_grants(user_id,district_code,granted_by) values('${operatorId}','TEST-A','${operatorId}');`,
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Akses akun", exact: true }).click();
  await page.locator('select[name="target_user_id"]').selectOption(targetId);
  await page.locator('select[name="new_role"]').selectOption("field_officer");
  await expect(page.locator('select[name="new_status"]')).toHaveValue("active");
  await page.locator('input[name="district_codes"][value="TEST-A"]').check();
  await page
    .locator('textarea[name="reason"]')
    .fill("Synthetic role and district assignment test");
  await page
    .getByRole("button", { name: "Simpan akses akun", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Akses akun disimpan dan diaudit",
  );
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(targetEmail);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard pemantauan" }),
  ).toBeVisible();
  await expect(
    page.getByText("Peran: field_officer", { exact: false }),
  ).toContainText("TEST-A");
  await page.goto("/admin/users");
  await expect(
    page.getByRole("alert").filter({ hasText: "Akses ditolak" }),
  ).toContainText("hanya untuk administrator");
});

test("password recovery email, PKCE callback, reset and re-login", async ({
  page,
  request,
}) => {
  const email = `recover-${randomUUID()}@example.test`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Kirim tautan pemulihan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Jika akun dapat dipulihkan",
  );
  await page.goto(await emailVerificationLink(request, email));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page
    .getByLabel("Kata sandi baru", { exact: true })
    .fill(`${password}-new`);
  await page.getByRole("button", { name: "Simpan kata sandi" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(`${password}-new`);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("approved scoped viewer can enter; revocation applies to the same session", async ({
  page,
}) => {
  const email = `viewer-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const id = z.uuid().parse(data.user?.id);
  // Synthetic test setup only, deliberately bypassing approval UI that is a later slice.
  localFixtureSql(`update public.profiles set role='viewer',status='active' where id='${id}';
    insert into public.profile_district_grants(user_id,district_code,granted_by) values ('${id}','TEST-A','${id}');`);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard pemantauan" }),
  ).toBeVisible();
  await expect(
    page.getByText("Wilayah tugas:", { exact: false }),
  ).toContainText("TEST-A");
  localFixtureSql(
    `update public.profiles set status='suspended' where id='${id}';`,
  );
  await page.reload();
  await expect(page).toHaveURL(/\/pending$/);
  await expect(page.getByRole("status")).toContainText("dinonaktifkan");
});

test("callback rejects invalid tokens and external redirects", async ({
  page,
}) => {
  await page.goto("/auth/callback?next=https://example.test&code=invalid");
  await expect(page).toHaveURL(/\/login\?callback=failed$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Tautan tidak valid" }),
  ).toContainText("tidak valid atau kedaluwarsa");
});

test("auth form supports keyboard and narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Lewati ke konten utama" }),
  ).toBeFocused();
  await page.getByLabel("Email", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Kata sandi", { exact: true })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 812, height: 375 });
  await page.getByLabel("Email", { exact: true }).scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
