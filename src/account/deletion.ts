/**
 * Pure logic behind the account-deletion flow.
 *
 * Lives here so apps/desktop can consume it: desktop has no unit-test runner, so
 * anything written directly into its .tsx is untestable by construction. This
 * module is covered by the root vitest run, which is the first entry in
 * scripts/test-all.mjs.
 *
 * apps/web and apps/mobile carry their own copies. Web cannot take a
 * ../../packages/* dependency (its deploy mirror contains only apps/web/), and
 * mobile is deliberately decoupled from this package. Keep the three in sync.
 */

/** Mirrors COOLDOWN_SECONDS in apps/api/src/pages/api/me/delete-request.ts. */
export const DELETE_RESEND_COOLDOWN_SECONDS = 60;
export const DELETE_CODE_LENGTH = 6;

const DIGITS_ONLY = /\D/g;
const COMPLETE_CODE = new RegExp(`^\\d{${DELETE_CODE_LENGTH}}$`);

export interface AccountDeletionBlocker {
  kind: "workspace_has_members";
  workspace_id: string;
  workspace_name: string;
  member_count: number;
}

export interface AccountDeletePreview {
  workspaces: { id: string; name: string }[];
  file_count: number;
  total_bytes: number;
  blockers: AccountDeletionBlocker[];
  window_days: number;
  deletion_scheduled_for: number | null;
}

/** Digits only, capped at the code length, so pasting "12 34-56" from an email works. */
export function normaliseDeleteCode(raw: string): string {
  return raw.replace(DIGITS_ONLY, "").slice(0, DELETE_CODE_LENGTH);
}

export function isCompleteDeleteCode(code: string): boolean {
  return COMPLETE_CODE.test(code);
}

/** Whole seconds left before Resend will actually work. `sentAt`/`now` are epoch ms. */
export function deleteCooldownRemaining(sentAt: number | null, now: number): number {
  if (sentAt == null) return 0;
  return Math.max(0, DELETE_RESEND_COOLDOWN_SECONDS - Math.floor((now - sentAt) / 1000));
}

/** Names the workspace, the count and the recovery - "you have blockers" is unactionable. */
export function describeDeletionBlocker(b: AccountDeletionBlocker): string {
  const n = b.member_count;
  return `${b.workspace_name} still has ${n} other ${n === 1 ? "member" : "members"}. Transfer it or remove them first.`;
}

export function formatDeletionDate(scheduledFor: number): string {
  return new Date(scheduledFor * 1000).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * Whole days left, floored and never negative. Floored rather than rounded:
 * saying "1 day" when six hours remain is the wrong direction to be wrong in.
 */
export function deletionDaysRemaining(scheduledFor: number, nowSeconds: number): number {
  return Math.max(0, Math.floor((scheduledFor - nowSeconds) / 86400));
}

export type DeleteFailureKind = "wrong_code" | "rate_limited" | "code_burned" | "blocked" | "unknown";

export interface DeleteFailure {
  kind: DeleteFailureKind;
  message: string;
}

function statusOf(err: unknown): number {
  if (typeof err === "object" && err !== null) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return 0;
}

function messageOf(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

/**
 * Map a failure onto advice the user can act on.
 *
 * The two 429s need opposite advice: an hourly cap means wait, but the per-code
 * cap BURNS the code, so retrying the same digits can never succeed and telling
 * the user to try again would be actively wrong.
 */
export function classifyDeleteFailure(err: unknown): DeleteFailure {
  const status = statusOf(err);
  const raw = messageOf(err);

  if (status === 429) {
    if (/request a new code/i.test(raw)) {
      return { kind: "code_burned", message: "Too many tries on that code. Request a new one." };
    }
    return { kind: "rate_limited", message: "Too many attempts. Wait a few minutes, then try again." };
  }
  if (status === 400 && /other members|transfer/i.test(raw)) {
    return { kind: "blocked", message: raw };
  }
  if (status === 400) {
    return {
      kind: "wrong_code",
      message: "That code is not right, or it has expired. Check the 6 digits, or request a new one.",
    };
  }
  return { kind: "unknown", message: raw.trim() || "Could not delete your account. Please try again." };
}
