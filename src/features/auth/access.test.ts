import { describe, expect, it } from "vitest";
import {
  type AccessProfile,
  hasAccountAccess,
  hasOperationalAccess,
  profileSchema,
} from "./access";
import {
  callbackDestination,
  loginSchema,
  registerSchema,
  resetSchema,
} from "./validation";

const profile: AccessProfile = {
  id: "b1fdab24-849c-4e1d-b0ac-2a6505ee9ca9",
  display_name: "",
  role: "viewer",
  status: "active",
};
describe("operational access", () => {
  it("allows the account shell without granting district data", () => {
    expect(hasAccountAccess(profile)).toBe(true);
    expect(hasOperationalAccess(profile, [])).toBe(false);
    expect(hasAccountAccess({ ...profile, status: "suspended" })).toBe(false);
    expect(hasAccountAccess({ ...profile, role: "pending" })).toBe(false);
  });
  it.each([
    "viewer",
    "field_officer",
    "coordinator",
    "admin",
  ] as const)("requires explicit districts for %s", (role) => {
    expect(hasOperationalAccess({ ...profile, role }, [])).toBe(false);
    expect(hasOperationalAccess({ ...profile, role }, ["TEST-A"])).toBe(true);
  });
  it("denies missing, pending and suspended profiles", () => {
    expect(hasOperationalAccess(null, ["TEST-A"])).toBe(false);
    expect(
      hasOperationalAccess({ ...profile, role: "pending" }, ["TEST-A"]),
    ).toBe(false);
    expect(
      hasOperationalAccess({ ...profile, status: "suspended" }, ["TEST-A"]),
    ).toBe(false);
    expect(
      hasOperationalAccess({ ...profile, status: "pending" }, ["TEST-A"]),
    ).toBe(false);
  });
  it("rejects unknown database roles", () => {
    expect(
      profileSchema.safeParse({ ...profile, role: "superuser" }).success,
    ).toBe(false);
  });
});
describe("auth trust boundaries", () => {
  it("validates signup without accepting role or grants", () => {
    const value = registerSchema.parse({
      display_name: "  Siti  ",
      email: "staff@example.test",
      password: "long-test-password",
      role: "admin",
      district_codes: ["*"],
    });
    expect(value.display_name).toBe("Siti");
    expect(value).not.toHaveProperty("role");
    expect(value).not.toHaveProperty("district_codes");
    expect(
      registerSchema.safeParse({ email: "invalid", password: "short" }).success,
    ).toBe(false);
    expect(resetSchema.safeParse({ password: "short" }).success).toBe(false);
  });
  it("allows existing shorter passwords at login", () => {
    expect(
      loginSchema.safeParse({ email: "staff@example.test", password: "legacy" })
        .success,
    ).toBe(true);
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/admin/users",
    "/\\evil.test",
    null,
  ])("disallows callback redirect %s", (value) => {
    expect(callbackDestination(value)).toBe("/dashboard");
  });
  it("allows the fixed recovery route", () => {
    expect(callbackDestination("/reset-password")).toBe("/reset-password");
  });
});
