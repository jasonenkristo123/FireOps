import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, createClient } = vi.hoisted(() => {
  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  };
  return { auth, createClient: vi.fn(async () => ({ auth })) };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { login, register, requestRecovery, resetPassword } from "./actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ auth });
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
});
describe("server auth actions", () => {
  it("does not contact Auth on invalid input", async () => {
    expect(
      (await login({}, form({ email: "bad", password: "" }))).fields,
    ).toBeDefined();
    expect(createClient).not.toHaveBeenCalled();
  });
  it("uses a neutral provider error without leaking details", async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: { message: "sensitive provider internals" },
    });
    const result = await login(
      {},
      form({ email: "user@example.test", password: "password" }),
    );
    expect(result.error).toBeDefined();
    expect(JSON.stringify(result)).not.toContain("sensitive");
  });
  it("fails closed on a provider outage", async () => {
    createClient.mockRejectedValue(new Error("private configuration"));
    expect(
      (
        await login(
          {},
          form({ email: "user@example.test", password: "password" }),
        )
      ).error,
    ).toContain("belum tersedia");
  });
  it("creates a session with only validated name metadata and redirects", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    });
    await expect(
      register(
        {},
        form({
          display_name: "  Siti Test  ",
          email: "user@example.test",
          password: "long-test-password",
          role: "admin",
          status: "active",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "user@example.test",
      password: "long-test-password",
      options: { data: { display_name: "Siti Test" } },
    });
  });
  it("rejects missing or blank names before contacting Auth", async () => {
    const result = await register(
      {},
      form({
        display_name: "  ",
        email: "user@example.test",
        password: "long-test-password",
      }),
    );
    expect(result.fields?.display_name).toBeDefined();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("reports a configuration mismatch when confirmation is still enabled", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const result = await register(
      {},
      form({
        display_name: "Siti",
        email: "user@example.test",
        password: "long-test-password",
      }),
    );
    expect(result.error).toContain("menonaktifkan konfirmasi email");
    expect(result.success).toBeUndefined();
  });
  it("does not claim success for provider validation errors", async () => {
    auth.signUp.mockResolvedValue({
      data: null,
      error: { status: 422, message: "private provider detail" },
    });
    const result = await register(
      {},
      form({
        display_name: "Siti",
        email: "user@example.test",
        password: "long-test-password",
      }),
    );
    expect(result.error).toBeDefined();
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });
  it("uses the configured canonical origin for recovery", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestRecovery({}, form({ email: "user@example.test" }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "user@example.test",
      {
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      },
    );
  });
  it("denies password mutation without validated identity", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(
      (await resetPassword({}, form({ password: "long-test-password" }))).error,
    ).toContain("kedaluwarsa");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("resets only after identity validation, then signs out", async () => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user" } },
      error: null,
    });
    auth.updateUser.mockResolvedValue({ error: null });
    auth.signOut.mockResolvedValue({ error: null });
    await expect(
      resetPassword({}, form({ password: "long-test-password" })),
    ).rejects.toThrow("REDIRECT:/login");
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "long-test-password",
    });
    expect(auth.signOut).toHaveBeenCalled();
  });
});
