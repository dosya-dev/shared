export type ShareTarget =
  | { kind: "file"; fileIds: readonly [string] }
  | { kind: "folder"; folderId: string }
  | { kind: "bundle"; fileIds: readonly string[] };

export interface ShareLinkOpts {
  target: ShareTarget;
  /** Absolute unix seconds. The API also accepts expires_in_days; we send one form everywhere. */
  expiresAt?: number | null;
  password?: string | null;
}

export interface ShareEmailOpts extends ShareLinkOpts {
  emails: string[];
  message?: string;
  /** When true the link only opens for the named recipients. */
  restrictToRecipients: boolean;
}

export function shareEndpoint(target: ShareTarget, flavour: "link" | "email"): string {
  if (target.kind === "bundle") return "/api/files/share-bundle";
  if (target.kind === "folder") {
    return flavour === "link"
      ? `/api/folders/${target.folderId}/share`
      : `/api/folders/${target.folderId}/share-email`;
  }
  return flavour === "link"
    ? `/api/files/${target.fileIds[0]}/share`
    : `/api/files/${target.fileIds[0]}/share-email`;
}

/**
 * A blank password must not reach the API. Sending password: "" produces a
 * link flagged as protected that opens for anyone, which is worse than no
 * protection because the UI then claims a guarantee that is not there.
 */
function cleanPassword(password: string | null | undefined): string | null {
  const trimmed = (password ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseEmails(emails: string[]): string[] {
  return emails.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0);
}

function applyCommon(body: Record<string, unknown>, opts: ShareLinkOpts): Record<string, unknown> {
  const pw = cleanPassword(opts.password);
  if (pw) body.password = pw;
  if (opts.expiresAt != null) body.expires_at = opts.expiresAt;
  return body;
}

export function buildShareLinkBody(opts: ShareLinkOpts): Record<string, unknown> {
  const body: Record<string, unknown> =
    opts.target.kind === "bundle" ? { file_ids: [...opts.target.fileIds] } : {};
  return applyCommon(body, opts);
}

/**
 * The bundle route is a different endpoint with a different contract: it takes
 * recipient_emails plus access_mode, where the single-file and folder routes
 * take emails plus restrict_to_recipients. Getting this wrong is SILENT - the
 * API ignores an unknown field and returns a PUBLIC link - so the two shapes
 * are built separately rather than patched from one another.
 */
export function buildShareEmailBody(opts: ShareEmailOpts): Record<string, unknown> {
  const emails = normaliseEmails(opts.emails);
  if (emails.length === 0) {
    throw new Error("buildShareEmailBody: at least one recipient is required");
  }
  const message = (opts.message ?? "").trim();

  if (opts.target.kind === "bundle") {
    return applyCommon(
      {
        file_ids: [...opts.target.fileIds],
        notify: true,
        recipient_emails: emails,
        message,
        access_mode: opts.restrictToRecipients ? "restricted" : "public",
      },
      opts,
    );
  }

  return applyCommon(
    { emails, message, restrict_to_recipients: opts.restrictToRecipients },
    opts,
  );
}
