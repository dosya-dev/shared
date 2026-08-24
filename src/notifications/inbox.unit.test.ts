import { describe, it, expect } from "vitest";
import {
  isUnread, applyRead, applyReadAll, applyDismiss,
  mergeInboxPages, nextCursor, applySummary, type InboxState,
} from "./inbox";
import type { NotificationItem } from "./types";

function item(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1", kind: "personal", type: "t", category: "c", priority: "normal",
    title: "T", body: null, icon: null, link_path: null, actions: null,
    actor_name: null, created_at: 1000, read_at: null, dismissed_at: null, ...over,
  };
}

const NOW = 5000;

describe("isUnread", () => {
  it("treats a null read_at as unread and any timestamp as read", () => {
    expect(isUnread(item())).toBe(true);
    expect(isUnread(item({ read_at: 1 }))).toBe(false);
  });
});

describe("applyRead", () => {
  it("marks one item read and decrements unread", () => {
    const state: InboxState = { items: [item({ id: "a" }), item({ id: "b" })], unread: 2 };
    const next = applyRead(state, "a", NOW);
    expect(next.items.find((i) => i.id === "a")!.read_at).toBe(NOW);
    expect(next.items.find((i) => i.id === "b")!.read_at).toBeNull();
    expect(next.unread).toBe(1);
  });

  it("returns the same reference for an already-read item, so a double tap cannot double-decrement", () => {
    const state: InboxState = { items: [item({ id: "a", read_at: 10 })], unread: 0 };
    expect(applyRead(state, "a", NOW)).toBe(state);
  });

  it("returns the same reference for an unknown id", () => {
    const state: InboxState = { items: [item({ id: "a" })], unread: 1 };
    expect(applyRead(state, "missing", NOW)).toBe(state);
  });

  it("never returns a negative unread count", () => {
    const state: InboxState = { items: [item({ id: "a" })], unread: 0 };
    expect(applyRead(state, "a", NOW).unread).toBe(0);
  });
});

describe("applyReadAll", () => {
  it("reads every unread item, preserves an existing read_at, and zeroes the count", () => {
    const state: InboxState = {
      items: [item({ id: "a" }), item({ id: "b", read_at: 42 })], unread: 1,
    };
    const next = applyReadAll(state, NOW);
    expect(next.items.find((i) => i.id === "a")!.read_at).toBe(NOW);
    expect(next.items.find((i) => i.id === "b")!.read_at).toBe(42);
    expect(next.unread).toBe(0);
  });
});

describe("applyDismiss", () => {
  it("removes the item and decrements only when it was unread", () => {
    const state: InboxState = {
      items: [item({ id: "a" }), item({ id: "b", read_at: 10 })], unread: 1,
    };
    expect(applyDismiss(state, "a")).toEqual({ items: [state.items[1]], unread: 0 });
    expect(applyDismiss(state, "b").unread).toBe(1);
  });

  it("returns the same reference for an unknown id", () => {
    const state: InboxState = { items: [item({ id: "a" })], unread: 1 };
    expect(applyDismiss(state, "missing")).toBe(state);
  });
});

describe("mergeInboxPages", () => {
  it("dedupes by id and sorts newest first", () => {
    const merged = mergeInboxPages([
      [item({ id: "a", created_at: 100 }), item({ id: "b", created_at: 300 })],
      [item({ id: "b", created_at: 300 }), item({ id: "c", created_at: 200 })],
    ]);
    expect(merged.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("returns [] for no pages", () => {
    expect(mergeInboxPages([])).toEqual([]);
  });
});

describe("nextCursor", () => {
  it("returns the last created_at only on a full page", () => {
    expect(nextCursor([item({ created_at: 7 })], 1)).toBe(7);
  });

  it("returns null on a short page, which is the end of the list", () => {
    expect(nextCursor([item({ created_at: 7 })], 30)).toBeNull();
  });

  it("returns null on an empty page", () => {
    expect(nextCursor([], 0)).toBeNull();
  });
});

describe("applySummary", () => {
  it("does not report hasNew on the very first poll", () => {
    expect(applySummary({ lastLatestId: null }, { unread: 3, latest: item({ id: "x" }) }))
      .toEqual({ unread: 3, lastLatestId: "x", hasNew: false });
  });

  it("reports hasNew when the latest id changes after a known baseline", () => {
    const r = applySummary({ lastLatestId: "x" }, { unread: 4, latest: item({ id: "y" }) });
    expect(r.hasNew).toBe(true);
    expect(r.lastLatestId).toBe("y");
  });

  it("keeps the previous id when the summary has no latest", () => {
    expect(applySummary({ lastLatestId: "x" }, { unread: 0, latest: null }))
      .toEqual({ unread: 0, lastLatestId: "x", hasNew: false });
  });
});
