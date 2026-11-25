import { describe, expect, it } from "vitest";
import { activityFromApi, cleanRelayEvent, RELAY_EVENT_NAMES, RELAY_PARAM_KEYS, screenFromSegments, sizeBand } from "./events";

describe("the relay's allow-list", () => {
    it("holds every event the API table can produce, and the ones apps send by name", () => {
        for (const [method, path] of [["POST", "/api/shares"], ["DELETE", "/api/files/f_1"], ["POST", "/api/search"]] as const) {
            const event = activityFromApi(method, path);
            expect(event && RELAY_EVENT_NAMES.has(event.name)).toBe(true);
        }
        for (const name of ["page_view", "app_open", "sign_up", "login", "file_upload", "file_download", "paywall_view", "purchase_complete", "sync_complete"]) {
            expect(RELAY_EVENT_NAMES.has(name)).toBe(true);
        }
    });

    it("has no name GA4 reserves, or keeps for app streams", () => {
        for (const name of ["session_start", "first_visit", "first_open", "user_engagement", "screen_view", "in_app_purchase", "error", "purchase"]) {
            expect(RELAY_EVENT_NAMES.has(name)).toBe(false);
        }
    });

    it("stays inside GA4's limits for names", () => {
        for (const name of RELAY_EVENT_NAMES) expect(name).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
        for (const key of RELAY_PARAM_KEYS) expect(key).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
    });
});

describe("cleanRelayEvent", () => {
    it("passes a catalogue event with its category parameters", () => {
        expect(cleanRelayEvent("login", { method: "google" })).toEqual({ name: "login", params: { method: "google" } });
        expect(cleanRelayEvent("file_delete", { batch: true })).toEqual({ name: "file_delete", params: { batch: true } });
        expect(cleanRelayEvent("logout", undefined)).toEqual({ name: "logout" });
    });

    it("drops an unknown event outright", () => {
        expect(cleanRelayEvent("holiday-photos.zip", {})).toBeNull();
        expect(cleanRelayEvent(42, {})).toBeNull();
        expect(cleanRelayEvent(undefined, {})).toBeNull();
    });

    it("drops what could carry a name: unknown keys, sentences, addresses, nested values", () => {
        expect(cleanRelayEvent("file_upload", { size_band: "1_10mb", name: "passport.pdf" })).toEqual({ name: "file_upload", params: { size_band: "1_10mb" } });
        expect(cleanRelayEvent("search", { mode: "my tax return" })).toEqual({ name: "search" });
        expect(cleanRelayEvent("login", { method: "ada@example.com" })).toEqual({ name: "login" });
        expect(cleanRelayEvent("login", { method: { nested: "x" } })).toEqual({ name: "login" });
        expect(cleanRelayEvent("login", { method: "x".repeat(65) })).toEqual({ name: "login" });
        expect(cleanRelayEvent("login", ["password"])).toEqual({ name: "login" });
    });

    it("does not let a client set what the relay stamps", () => {
        expect(cleanRelayEvent("page_view", { screen: "/files", session_id: "1", app_platform: "web", page_location: "https://x.test" }))
            .toEqual({ name: "page_view", params: { screen: "/files" } });
    });
});

describe("screenFromSegments", () => {
    it("drops route groups and replaces dynamic segments", () => {
        expect(screenFromSegments(["(tabs)", "(files)"])).toBe("/");
        expect(screenFromSegments(["(tabs)", "settings"])).toBe("/settings");
        expect(screenFromSegments(["(tabs)", "(files)", "file", "[id]", "calendar"])).toBe("/file/:id/calendar");
        expect(screenFromSegments(["(auth)", "signup"])).toBe("/signup");
        expect(screenFromSegments(["s", "[token]"])).toBe("/s/:id");
    });

    it("says only that the Vault was open, never where in it", () => {
        expect(screenFromSegments(["(tabs)", "vault"])).toBe("/vault");
        expect(screenFromSegments(["(tabs)", "vault", "space", "[id]", "[folderId]"])).toBe("/vault");
        expect(screenFromSegments(["vault-diagnostics"])).toBe("/vault");
    });

    it("treats a resolved value in place of a template as an id", () => {
        expect(screenFromSegments(["file", "f_8839201"])).toBe("/file/:id");
        expect(screenFromSegments(["folder", "Tax returns 2026"])).toBe("/folder/:id");
    });
});

describe("sizeBand", () => {
    it("reports a band, never a size", () => {
        expect(sizeBand(10)).toBe("under_1mb");
        expect(sizeBand(5 * 1_048_576)).toBe("1_10mb");
        expect(sizeBand(Number.NaN)).toBe("unknown");
    });
});
