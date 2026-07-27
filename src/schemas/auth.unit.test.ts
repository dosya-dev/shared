import { describe, it, expect } from "vitest";
import {
  mobileLoginRequestSchema,
  mobile2faRequestSchema,
  mobileRefreshRequestSchema,
  mobileTokenSuccessSchema,
} from "./auth";

describe("mobile auth schemas", () => {
  it("accepts a valid login body", () => {
    expect(mobileLoginRequestSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rejects a login body with a bad email", () => {
    expect(mobileLoginRequestSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
  it("requires challenge_token and code for 2fa", () => {
    expect(mobile2faRequestSchema.safeParse({ code: "123456" }).success).toBe(false);
    expect(mobile2faRequestSchema.safeParse({ challenge_token: "t", code: "123456" }).success).toBe(true);
  });
  it("requires a refresh_token", () => {
    expect(mobileRefreshRequestSchema.safeParse({}).success).toBe(false);
    expect(mobileRefreshRequestSchema.safeParse({ refresh_token: "r" }).success).toBe(true);
  });
  it("validates a token success payload", () => {
    const ok = mobileTokenSuccessSchema.safeParse({
      ok: true,
      access_token: "dosm_x",
      refresh_token: "dosr_y",
      user: { id: "u", email: "a@b.com", name: "A", created_at: 1 },
    });
    expect(ok.success).toBe(true);
  });
});
