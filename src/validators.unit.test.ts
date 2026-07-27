import { describe, it, expect } from "vitest";
import { isValidEmail, validatePassword, loginRequestSchema } from "./index";

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });
  it("rejects a malformed address", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("returns null for a strong password", () => {
    expect(validatePassword("Test1234!x")).toBeNull();
  });
  it("rejects a short password", () => {
    expect(validatePassword("aB1!")).toMatch(/at least 8/);
  });
});

describe("loginRequestSchema", () => {
  it("parses a valid body", () => {
    const parsed = loginRequestSchema.parse({ email: "a@b.com", password: "x" });
    expect(parsed.email).toBe("a@b.com");
  });
  it("rejects a missing password", () => {
    expect(loginRequestSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });
});
