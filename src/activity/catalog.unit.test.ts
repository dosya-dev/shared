import { describe, it, expect } from "vitest";
import {
  ACTIVITY_CATEGORIES, CATEGORY_ACTIONS, CATEGORY_ACTION_NAMES,
  actionsForCategories, actionPhrase, humanAction, parseUA,
} from "./catalog";

describe("categories", () => {
  it("names an action list for every category it offers", () => {
    // A category with no actions filters to nothing, which reads as "the
    // filter is broken" rather than "nothing happened".
    for (const c of ACTIVITY_CATEGORIES) {
      expect(CATEGORY_ACTIONS[c.value]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("exposes the same table as bare names, which is what the endpoint binds", () => {
    // GET /api/activity turns a category filter into `action IN (...)` from
    // this map; a name here that is not in CATEGORY_ACTIONS filters to nothing.
    for (const [category, options] of Object.entries(CATEGORY_ACTIONS)) {
      expect(CATEGORY_ACTION_NAMES[category]).toEqual(options.map((o) => o.value));
    }
    expect(Object.keys(CATEGORY_ACTION_NAMES).sort()).toEqual(Object.keys(CATEGORY_ACTIONS).sort());
  });

  it("gives every action a phrase that reads after an actor's name", () => {
    // A filterable action with no label reads as its raw machine code in the
    // feed, which is exactly what the label table exists to prevent.
    for (const option of Object.values(CATEGORY_ACTIONS).flat()) {
      expect(actionPhrase(option.value)).not.toBe(option.value.replace(/_/g, " "));
    }
  });

  it("never lists the same action under two categories", () => {
    // The endpoint ORs the actions of every chosen category, so a duplicate
    // would bind the same value twice and make the filter's result depend on
    // which categories happen to be selected.
    const all = Object.values(CATEGORY_ACTIONS).flat().map((o) => o.value);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("actionsForCategories", () => {
  it("offers everything when no category is chosen", () => {
    const all = Object.values(CATEGORY_ACTIONS).flat();
    expect(actionsForCategories([])).toHaveLength(all.length);
  });

  it("narrows to the chosen categories", () => {
    const actions = actionsForCategories(["folders"]);
    expect(actions.map((a) => a.value)).toEqual([
      "folder_created", "folder_renamed", "folder_moved", "folder_deleted",
    ]);
  });

  it("unions several categories", () => {
    const actions = actionsForCategories(["folders", "comments"]);
    expect(actions).toHaveLength(CATEGORY_ACTIONS.folders.length + CATEGORY_ACTIONS.comments.length);
  });

  it("ignores a category it does not know rather than emptying the list", () => {
    // A stale saved filter (or a category the API added first) must not leave
    // the Action section blank with no way to tell why.
    expect(actionsForCategories(["nope"])).toHaveLength(
      Object.values(CATEGORY_ACTIONS).flat().length,
    );
    expect(actionsForCategories(["folders", "nope"]).map((a) => a.value)).toContain("folder_created");
  });
});

describe("labels", () => {
  it("reads as a sentence after the actor's name", () => {
    expect(actionPhrase("file_uploaded")).toBe("uploaded");
    expect(actionPhrase("member_left")).toBe("left the workspace");
  });

  it("falls back to the opened-up machine name for an action it has not met", () => {
    // The API grows action codes faster than either client learns them.
    expect(actionPhrase("quantum_entangled")).toBe("quantum entangled");
    expect(humanAction("quantum_entangled")).toBe("Quantum entangled");
  });

  it("prefers the catalog's own label for a standalone row", () => {
    expect(humanAction("file_uploaded")).toBe("File uploaded");
    expect(humanAction("file_version_uploaded")).toBe("Version uploaded");
    expect(humanAction("member_role_changed")).toBe("Member role changed");
  });

  it("survives an empty action", () => {
    expect(actionPhrase("")).toBe("");
    expect(humanAction("")).toBe("");
  });
});

describe("parseUA", () => {
  it("names the browser and OS", () => {
    expect(parseUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"))
      .toEqual({ browser: "Chrome 120", os: "macOS" });
  });

  it("does not mistake Edge or Opera for Chrome, or Chrome for Safari", () => {
    expect(parseUA("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0").browser).toBe("Edge 120");
    expect(parseUA("Mozilla/5.0 (Windows NT 10.0) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0").browser).toBe("Opera 105");
  });

  it("recognises mobile Safari", () => {
    expect(parseUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"))
      .toEqual({ browser: "Safari 17", os: "iOS" });
  });

  it("says Unknown rather than throwing on nothing", () => {
    expect(parseUA(null)).toEqual({ browser: "Unknown", os: "" });
    expect(parseUA("dosya-cli/1.2.0")).toEqual({ browser: "Unknown", os: "" });
  });
});
