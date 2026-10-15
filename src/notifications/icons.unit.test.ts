import { describe, it, expect } from "vitest";
import {
  NOTIFICATION_ICON_KEYS,
  NOTIFICATION_GROUP_ICONS,
  NOTIFICATION_FALLBACK_ICON,
  isNotificationIconKey,
  resolveNotificationIcon,
  notificationTone,
} from "./icons";

describe("notification icon keys", () => {
  it("has no duplicate keys", () => {
    expect(new Set(NOTIFICATION_ICON_KEYS).size).toBe(NOTIFICATION_ICON_KEYS.length);
  });

  it("writes every key in Lucide's kebab-case form", () => {
    for (const k of NOTIFICATION_ICON_KEYS) expect(k).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
  });

  it("maps every one of the 14 preference groups to a known key", () => {
    const groups = ["security", "account", "team", "billing", "files", "sharing", "requests",
      "comments", "sync", "transfers", "integrations", "support", "product", "system"];
    expect(Object.keys(NOTIFICATION_GROUP_ICONS).sort()).toEqual([...groups].sort());
    for (const k of Object.values(NOTIFICATION_GROUP_ICONS)) expect(isNotificationIconKey(k)).toBe(true);
    expect(isNotificationIconKey(NOTIFICATION_FALLBACK_ICON)).toBe(true);
  });
});

describe("resolveNotificationIcon", () => {
  it("returns a known key as-is", () => {
    expect(resolveNotificationIcon("credit-card", "security")).toBe("credit-card");
  });

  it("falls back to the group for a legacy emoji", () => {
    expect(resolveNotificationIcon("🔐", "security")).toBe("shield");
  });

  it("falls back to the group for a null icon", () => {
    expect(resolveNotificationIcon(null, "billing")).toBe("credit-card");
  });

  it("falls back to the bell when neither icon nor group is known", () => {
    expect(resolveNotificationIcon(undefined, "admin_message")).toBe("bell");
    expect(resolveNotificationIcon("", null)).toBe("bell");
  });

  it("does not treat Object.prototype names as groups", () => {
    expect(resolveNotificationIcon(null, "constructor")).toBe("bell");
  });
});

describe("notificationTone", () => {
  it("passes important and critical through", () => {
    expect(notificationTone("important")).toBe("important");
    expect(notificationTone("critical")).toBe("critical");
  });

  it("treats anything else as normal", () => {
    expect(notificationTone("normal")).toBe("normal");
    expect(notificationTone("urgent")).toBe("normal");
    expect(notificationTone(null)).toBe("normal");
  });
});
