import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const mobileLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type MobileLoginRequest = z.infer<typeof mobileLoginRequestSchema>;

export const mobile2faRequestSchema = z.object({
  challenge_token: z.string().min(1),
  code: z.string().min(1),
  is_recovery: z.boolean().optional(),
});
export type Mobile2faRequest = z.infer<typeof mobile2faRequestSchema>;

export const mobileRefreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});
export type MobileRefreshRequest = z.infer<typeof mobileRefreshRequestSchema>;

export const mobileAuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  created_at: z.number(),
});

export const mobileTokenSuccessSchema = z.object({
  ok: z.literal(true),
  access_token: z.string(),
  refresh_token: z.string(),
  user: mobileAuthUserSchema,
});
export type MobileTokenSuccess = z.infer<typeof mobileTokenSuccessSchema>;
