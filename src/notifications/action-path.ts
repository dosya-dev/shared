export type ClientTarget = "web" | "desktop";

interface Rule {
  re: RegExp;
  to: (m: RegExpMatchArray) => string;
}

/**
 * Server-authored notification links are WEB routes. `validateLinkPath` on the
 * API only checks that a path is internal and absolute, so anything web can
 * route to can arrive here, including surfaces desktop does not have.
 *
 * MAINTENANCE: adding a new server-side link_path target requires an entry
 * below, or that action silently disappears on desktop. That is the deliberate
 * failure mode - a hidden button beats a button that opens a blank screen -
 * but it is a maintenance point, not a free lunch.
 *
 * Desktop routes verified against apps/desktop/src/renderer/App.tsx.
 */
const DESKTOP_RULES: Rule[] = [
  // Desktop already reads ?view=<id> (open the viewer) and ?panel=<id> (open
  // the detail panel) on FileBrowserPage, with a fetch fallback for a file
  // outside the current page. Reuse ?view rather than inventing a param.
  { re: /^\/files\/([^/?#]+)\/?$/, to: (m) => `/files?view=${m[1]}` },
  { re: /^\/files\/?$/, to: () => "/files" },
  { re: /^\/uploads\/?$/, to: () => "/upload" },
  { re: /^\/teams\/?$/, to: () => "/team" },
  { re: /^\/shared\/?$/, to: () => "/shared" },
  { re: /^\/file-requests\/?$/, to: () => "/file-requests" },
  { re: /^\/activity\/?$/, to: () => "/activity" },
  { re: /^\/search\/?$/, to: () => "/search" },
  { re: /^\/workspaces\/?$/, to: () => "/workspaces" },
  { re: /^\/settings\/?$/, to: () => "/settings" },
  { re: /^\/profile\/?$/, to: () => "/profile" },
  { re: /^\/notifications\/?$/, to: () => "/notifications" },
];

/**
 * Translate a server-authored web route for `target`.
 * Returns null when there is no equivalent; callers MUST hide the action
 * rather than navigate.
 */
export function mapActionPath(
  path: string | null | undefined,
  target: ClientTarget,
): string | null {
  if (typeof path !== "string" || path.length === 0) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (target === "web") return path;
  for (const rule of DESKTOP_RULES) {
    const m = path.match(rule.re);
    if (m) return rule.to(m);
  }
  return null;
}
