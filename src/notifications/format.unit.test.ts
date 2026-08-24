import { describe, it, expect } from "vitest";
import { parseActions, relativeTime, groupByDay } from "./format";
import type { NotificationItem } from "./types";

function item(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1", kind: "personal", type: "files_uploaded", category: "files",
    priority: "normal", title: "T", body: null, icon: null, link_path: null,
    actions: null, actor_name: null, created_at: 1000, read_at: null,
    dismissed_at: null, ...over,
  };
}

describe("parseActions", () => {
  it("returns [] for null, malformed JSON and non-arrays", () => {
    expect(parseActions(null)).toEqual([]);
    expect(parseActions("{oops")).toEqual([]);
    expect(parseActions('{"a":1}')).toEqual([]);
  });

  it("drops entries with an unknown handler or a missing label", () => {
    const json = JSON.stringify([
      { handler: "navigate", label: "Open", params: { path: "/files/a" } },
      { handler: "launch_missiles", label: "Nope" },
      { handler: "dismiss" },
    ]);
    expect(parseActions(json)).toEqual([
      { handler: "navigate", label: "Open", params: { path: "/files/a" } },
    ]);
  });
});

describe("relativeTime", () => {
  it("never goes negative when created_at is in the future", () => {
    expect(relativeTime(2000, 1000)).toBe("just now");
  });

  it("steps through seconds, minutes, hours and days", () => {
    expect(relativeTime(0, 59)).toBe("just now");
    expect(relativeTime(0, 120)).toBe("2m");
    expect(relativeTime(0, 7200)).toBe("2h");
    expect(relativeTime(0, 172800)).toBe("2d");
  });
});

describe("groupByDay", () => {
  it("splits on LOCAL midnight, not UTC midnight", () => {
    const now = Math.floor(new Date(2026, 7, 12, 9, 0, 0).getTime() / 1000);
    const localMidnight = Math.floor(new Date(2026, 7, 12, 0, 0, 0).getTime() / 1000);
    const groups = groupByDay(
      [item({ id: "today", created_at: localMidnight + 60 }),
       item({ id: "old", created_at: localMidnight - 60 })],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Earlier"]);
    expect(groups[0].items[0].id).toBe("today");
    expect(groups[1].items[0].id).toBe("old");
  });

  it("omits an empty group entirely", () => {
    const now = Math.floor(new Date(2026, 7, 12, 9, 0, 0).getTime() / 1000);
    expect(groupByDay([item({ created_at: now })], now).map((g) => g.label)).toEqual(["Today"]);
  });
});
