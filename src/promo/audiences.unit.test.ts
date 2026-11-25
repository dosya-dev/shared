import { describe, expect, it } from "vitest";
import { PROMO_AUDIENCES, PROMO_AUDIENCE_IDS, guessAudience, isAudienceIdShape, promoAudience, promoHref } from "./audiences";

describe("promo audiences registry", () => {
    it("every entry's id matches its key and carries complete copy", () => {
        for (const [key, a] of Object.entries(PROMO_AUDIENCES)) {
            expect(a.id).toBe(key);
            expect(isAudienceIdShape(a.id)).toBe(true);
            for (const text of [a.label, a.headline, a.sub, a.lead, a.trust, a.card.headline, a.card.sub, a.plan]) {
                expect(text.trim().length, `${key} has an empty field`).toBeGreaterThan(0);
            }
            expect(a.keywords.length).toBeGreaterThan(0);
            // The hero headline follows the size ("4 TB of ..."): it must start with "of".
            expect(a.headline.startsWith("of ")).toBe(true);
            expect(a.headline.endsWith(".")).toBe(true);
        }
    });

    it("steps come in threes, as sentences, with a guide on this site to read on", () => {
        for (const [key, a] of Object.entries(PROMO_AUDIENCES) as [string, { steps?: readonly string[]; guide?: { href: string; label: string } }][]) {
            if (!a.steps) {
                expect(a.guide, `${key} has a guide but no steps`).toBeUndefined();
                continue;
            }
            expect(a.steps).toHaveLength(3);
            for (const step of a.steps) expect(step.endsWith("."), `${key}: "${step}"`).toBe(true);
            expect(a.guide?.href, `${key} has steps but no guide`).toMatch(/^\/[a-z0-9/-]+\/$/);
            expect(a.guide?.label.trim().length).toBeGreaterThan(0);
        }
    });

    it("never names a rival outside that rival's own audience", () => {
        const rivals = ["pcloud", "mega", "dropbox", "google drive", "onedrive", "icloud"];
        for (const a of Object.values(PROMO_AUDIENCES)) {
            const text = [a.headline, a.sub, a.card.headline, a.card.sub, a.trust].join(" ").toLowerCase();
            for (const r of rivals) {
                if (a.id === r) continue;
                expect(text.includes(r), `${a.id} names ${r}`).toBe(false);
            }
        }
    });

    it("ids are unique and stable", () => {
        expect(new Set(PROMO_AUDIENCE_IDS).size).toBe(PROMO_AUDIENCE_IDS.length);
        expect(PROMO_AUDIENCE_IDS).toContain("synology");
        expect(PROMO_AUDIENCE_IDS).toContain("nas");
    });
});

describe("promoAudience", () => {
    it("looks up by id, case- and space-insensitively", () => {
        expect(promoAudience("rclone")?.id).toBe("rclone");
        expect(promoAudience(" RCLONE ")?.id).toBe("rclone");
    });
    it("returns null for unknown, empty, or hostile values", () => {
        expect(promoAudience("dropbox")).toBeNull();
        expect(promoAudience("")).toBeNull();
        expect(promoAudience(null)).toBeNull();
        expect(promoAudience(undefined)).toBeNull();
        expect(promoAudience("__proto__")).toBeNull();
        expect(promoAudience("constructor")).toBeNull();
    });
});

describe("guessAudience", () => {
    it("prefers the specific NAS brand over the generic NAS entry", () => {
        expect(guessAudience("Back up a Synology NAS to the cloud")?.id).toBe("synology");
        expect(guessAudience("QNAP NAS backup with Hybrid Backup Sync")?.id).toBe("qnap");
        expect(guessAudience("Cloud backup for a TrueNAS box")?.id).toBe("nas");
    });
    it("matches whole words only", () => {
        expect(guessAudience("Snas is not a nas")?.id).toBe("nas");
        expect(guessAudience("megabytes and gigabytes explained")).toBeNull();
        expect(guessAudience("Moving from MEGA to dosya.dev")?.id).toBe("mega");
        expect(guessAudience("Why we chose rclone for our pipeline")?.id).toBe("rclone");
    });
    it("lets the title win over the summary, and falls back to the summary", () => {
        expect(guessAudience("What is WebDAV and when is it the right choice?", "Compared with SFTP and S3 for mounting.")?.id).toBe("webdav");
        expect(guessAudience("Using rclone with S3-compatible storage", "How to mount a bucket.")?.id).toBe("rclone");
        expect(guessAudience("Duplicate files: where they come from", "Photo libraries are the usual source.")?.id).toBe("photos");
    });
    it("returns null when nothing matches", () => {
        expect(guessAudience("How to write a good share link password")).toBeNull();
        expect(guessAudience("", "")).toBeNull();
    });
});

describe("promoHref", () => {
    it("carries the code alone for a generic link", () => {
        expect(promoHref("LOVEDOSYA", null)).toBe("/promo/?code=LOVEDOSYA");
    });
    it("adds the audience, and the opening size only for ad links", () => {
        const a = PROMO_AUDIENCES.synology;
        expect(promoHref("NAS30", a)).toBe("/promo/?code=NAS30&for=synology");
        expect(promoHref("NAS30", a, { plan: true })).toBe("/promo/?code=NAS30&for=synology&plan=tb4");
    });
    it("escapes what it is given and honours an absolute base", () => {
        expect(promoHref("A B", null, { base: "https://dosya.dev/promo/" })).toBe("https://dosya.dev/promo/?code=A+B");
    });
});
