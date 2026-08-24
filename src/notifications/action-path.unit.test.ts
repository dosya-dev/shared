import { describe, it, expect } from "vitest";
import { mapActionPath } from "./action-path";

describe("rejects unsafe or absent input on every target", () => {
  for (const target of ["web", "desktop"] as const) {
    it(`returns null for null, empty, relative and protocol-relative paths (${target})`, () => {
      expect(mapActionPath(null, target)).toBeNull();
      expect(mapActionPath(undefined, target)).toBeNull();
      expect(mapActionPath("", target)).toBeNull();
      expect(mapActionPath("files/a", target)).toBeNull();
      expect(mapActionPath("//evil.example.com", target)).toBeNull();
      expect(mapActionPath("https://evil.example.com", target)).toBeNull();
    });
  }
});

describe("web", () => {
  it("passes any safe internal path through untouched", () => {
    expect(mapActionPath("/files/abc", "web")).toBe("/files/abc");
    expect(mapActionPath("/anything/new", "web")).toBe("/anything/new");
  });
});

describe("desktop", () => {
  it("translates the routes whose names differ from web", () => {
    expect(mapActionPath("/uploads", "desktop")).toBe("/upload");
    expect(mapActionPath("/teams", "desktop")).toBe("/team");
  });

  it("maps a single file onto the deep-link param FileBrowserPage already reads", () => {
    expect(mapActionPath("/files/abc", "desktop")).toBe("/files?view=abc");
  });

  it("keeps routes that already match", () => {
    expect(mapActionPath("/files", "desktop")).toBe("/files");
    expect(mapActionPath("/shared", "desktop")).toBe("/shared");
    expect(mapActionPath("/activity", "desktop")).toBe("/activity");
    expect(mapActionPath("/file-requests", "desktop")).toBe("/file-requests");
  });

  it("returns null for a web-only surface so the action is hidden, not broken", () => {
    expect(mapActionPath("/vault", "desktop")).toBeNull();
    expect(mapActionPath("/billing", "desktop")).toBeNull();
    expect(mapActionPath("/duplicates", "desktop")).toBeNull();
  });

  it("does not mistake a nested path for a file id", () => {
    expect(mapActionPath("/files/a/b", "desktop")).toBeNull();
  });
});
