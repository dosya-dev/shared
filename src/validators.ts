/**
 * Legacy entry point for the two validators that existed before the policy
 * module.
 *
 * These are re-exports, not copies: `validation/policy.ts` is the one definition
 * and the only file to edit. Kept because desktop and the CLI import these names
 * from `@dosya-dev/shared` at a dozen call sites, and renaming them at the same
 * time as centralising the rules would have made the diff impossible to read.
 *
 * Prefer importing from `validation/policy` in new code - it carries the rest of
 * the rules (names, share links, comments, tickets, API keys) and returns the
 * server's own message rather than a boolean.
 */
export { isValidEmail, validatePassword } from "./validation/policy";
