import { describe, it, expect } from "vitest";
import {
  buildShareLinkBody, buildShareEmailBody, shareEndpoint, type ShareTarget,
} from "./payload";

const FILE: ShareTarget = { kind: "file", fileIds: ["f1"] };
const FOLDER: ShareTarget = { kind: "folder", folderId: "d1" };
const BUNDLE: ShareTarget = { kind: "bundle", fileIds: ["f1", "f2"] };

describe("shareEndpoint", () => {
  it("routes each target and flavour to the right path", () => {
    expect(shareEndpoint(FILE, "link")).toBe("/api/files/f1/share");
    expect(shareEndpoint(FILE, "email")).toBe("/api/files/f1/share-email");
    expect(shareEndpoint(FOLDER, "link")).toBe("/api/folders/d1/share");
    expect(shareEndpoint(FOLDER, "email")).toBe("/api/folders/d1/share-email");
    expect(shareEndpoint(BUNDLE, "link")).toBe("/api/files/share-bundle");
    expect(shareEndpoint(BUNDLE, "email")).toBe("/api/files/share-bundle");
  });

  it("accepts an as-const literal without a type error", () => {
    const literal = { kind: "file", fileIds: ["f9"] } as const;
    expect(shareEndpoint(literal, "link")).toBe("/api/files/f9/share");
  });
});

describe("buildShareLinkBody", () => {
  it("omits password and expiry when unset, rather than sending nulls", () => {
    expect(buildShareLinkBody({ target: FILE })).toEqual({});
  });

  it("sends expires_at as the single canonical expiry form", () => {
    expect(buildShareLinkBody({ target: FILE, expiresAt: 1800 })).toEqual({ expires_at: 1800 });
  });

  it("drops a blank password instead of creating an unprotected 'protected' link", () => {
    expect(buildShareLinkBody({ target: FILE, password: "" })).toEqual({});
    expect(buildShareLinkBody({ target: FILE, password: "  " })).toEqual({});
  });

  it("carries file_ids only for a bundle", () => {
    expect(buildShareLinkBody({ target: BUNDLE })).toEqual({ file_ids: ["f1", "f2"] });
  });
});

describe("buildShareEmailBody", () => {
  const base = { target: FILE, emails: ["a@b.com"], restrictToRecipients: false };

  it("sends the public shape when the toggle is off", () => {
    expect(buildShareEmailBody(base)).toEqual({
      emails: ["a@b.com"], message: "", restrict_to_recipients: false,
    });
  });

  it("sets restrict_to_recipients when the toggle is on", () => {
    expect(buildShareEmailBody({ ...base, restrictToRecipients: true }).restrict_to_recipients)
      .toBe(true);
  });

  it("uses access_mode for a bundle, which is a different route with a different contract", () => {
    const body = buildShareEmailBody({
      target: BUNDLE, emails: ["a@b.com"], restrictToRecipients: true,
    });
    expect(body).toMatchObject({
      file_ids: ["f1", "f2"], notify: true,
      recipient_emails: ["a@b.com"], access_mode: "restricted",
    });
    expect(body.restrict_to_recipients).toBeUndefined();
  });

  it("uses access_mode public for an unrestricted bundle", () => {
    expect(buildShareEmailBody({ target: BUNDLE, emails: ["a@b.com"], restrictToRecipients: false })
      .access_mode).toBe("public");
  });

  it("trims the message and normalises emails", () => {
    const body = buildShareEmailBody({ ...base, emails: [" A@B.com ", "c@d.com"], message: "  hi  " });
    expect(body.message).toBe("hi");
    expect(body.emails).toEqual(["a@b.com", "c@d.com"]);
  });

  it("throws rather than building a body with no recipients", () => {
    expect(() => buildShareEmailBody({ ...base, emails: [] })).toThrow(/recipient/i);
    expect(() => buildShareEmailBody({ ...base, emails: ["   "] })).toThrow(/recipient/i);
  });

  it("carries password and expiry through alongside the restriction", () => {
    expect(buildShareEmailBody({
      ...base, restrictToRecipients: true, password: "hunter2", expiresAt: 99,
    })).toMatchObject({ restrict_to_recipients: true, password: "hunter2", expires_at: 99 });
  });
});
