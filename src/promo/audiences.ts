/**
 * Promo audiences: the one place that says how a campaign reads to a given
 * kind of visitor.
 *
 * A Synology owner who clicked a "synology cloud backup" ad, a reader halfway
 * through a post about rclone, and a visitor on the pCloud comparison page all
 * see the same offer, but each should read it in their own words. Every
 * surface that sells the campaign (the /promo landing page, the promo cards on
 * dosya.dev's marketing pages and on the blog) looks an audience up here, so
 * the words never drift between surfaces and adding an audience is one entry.
 *
 * Shared by the marketing site and the blog (separate workers), and typed so a
 * page can only name an audience that exists.
 *
 * How a page finds its audience, in order:
 *   1. the `for` query parameter on /promo (an ad link, or a card's link);
 *   2. the page's own declaration (a compare page's rival, a post's frontmatter);
 *   3. `guessAudience()` over the page's title and summary.
 * Anything unknown renders the generic campaign copy, never an error.
 *
 * Copy rules: every claim here must be a feature the product ships today (the
 * /promo ledger is the checklist). No competitor is named except on that
 * competitor's own audience, and then only with checkable facts.
 */

export type PromoAudience = {
    /** Stable id: ad links, frontmatter and analytics all carry it. */
    id: string;
    /** Short human label for admin breakdowns. */
    label: string;
    /** /promo hero: follows the size, replacing "of private storage." */
    headline: string;
    /** /promo hero: replaces the generic one-sentence pitch under the headline. */
    sub: string;
    /** /promo ledger: the title of the feature group to show first. */
    lead: string;
    /** /promo trust strip: the first item. */
    trust: string;
    /** The in-flow promo card (blog post, compare page, resources page). */
    card: { headline: string; sub: string };
    /** Plan the ad link should open on; the card never forces a size. */
    plan: string;
    /**
     * /promo "How it works": three short steps a cold visitor can picture
     * before paying, each one a fact from the linked setup guide. Only for
     * audiences with a tested guide; the rest show no steps.
     */
    steps?: readonly [string, string, string];
    /** /promo: the full setup guide the steps summarise. */
    guide?: { href: string; label: string };
    /** Lower-case words or phrases that identify this audience in a title. */
    keywords: readonly string[];
};

const FEATURE_GROUP_CONNECT = "Connect anything";
const FEATURE_GROUP_STORAGE = "Storage and sync";
const FEATURE_GROUP_PRIVACY = "Privacy and security";
const FEATURE_GROUP_MONEY = "Money";

export const PROMO_AUDIENCES = {
    synology: {
        id: "synology",
        label: "Synology",
        headline: "of off-site backup for your Synology.",
        sub: "Hyper Backup over S3, tested on real hardware, or rclone from the NAS itself. No agent to install, and no egress fees if you ever restore everything.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "Works with Hyper Backup",
        card: {
            headline: "Off-site backup for a Synology, without egress fees.",
            sub: "Hyper Backup over S3, or rclone from the NAS. Source-available, encrypted Vault.",
        },
        plan: "tb4",
        steps: [
            "Create a free dosya account, then an S3 key under Profile > API keys.",
            "In Hyper Backup, add a data backup task: S3 Storage, Custom Server URL, s3.dosya.dev.",
            "Pick your shared folders and a schedule. Setup takes about 15 minutes.",
        ],
        guide: { href: "/nas-cloud-backup/synology-hyper-backup/", label: "Read the Hyper Backup guide" },
        keywords: ["synology", "hyper backup", "diskstation", "dsm 7"],
    },
    qnap: {
        id: "qnap",
        label: "QNAP",
        headline: "of off-site backup for your QNAP.",
        sub: "Hybrid Backup Sync 3 over S3, tested on real hardware, or rclone from the NAS itself. No agent to install, and no egress fees if you ever restore everything.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "Works with HBS 3",
        card: {
            headline: "Off-site backup for a QNAP, without egress fees.",
            sub: "Hybrid Backup Sync 3 over S3, or rclone from the NAS. Source-available, encrypted Vault.",
        },
        plan: "tb4",
        steps: [
            "Create a free dosya account, then an S3 key under Profile > API keys.",
            "In Hybrid Backup Sync 3, add a storage space: S3 Compatible, s3.dosya.dev.",
            "Create the backup job and set a schedule. Setup takes about 15 minutes.",
        ],
        guide: { href: "/nas-cloud-backup/qnap-hybrid-backup-sync/", label: "Read the HBS 3 guide" },
        keywords: ["qnap", "hbs 3", "hbs3", "qts"],
    },
    nas: {
        id: "nas",
        label: "NAS",
        headline: "of cloud backup for any NAS.",
        sub: "S3, SFTP, WebDAV and rclone are all included, so whatever your NAS speaks, it can back up here. No egress fees when you restore.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "S3, SFTP, WebDAV, rclone",
        card: {
            headline: "Cloud backup for any NAS.",
            sub: "S3, SFTP, WebDAV and rclone on every plan. No egress fees when you restore.",
        },
        plan: "tb4",
        steps: [
            "Create a free dosya account, then an S3 key under Profile > API keys.",
            "Point your NAS backup app at s3.dosya.dev, or use SFTP, WebDAV or rclone.",
            "Pick your folders and a schedule. Restores never cost a download fee.",
        ],
        guide: { href: "/nas-cloud-backup/", label: "See the NAS backup guides" },
        keywords: ["nas", "truenas", "unraid", "asustor", "terramaster", "openmediavault", "network attached storage"],
    },
    sftp: {
        id: "sftp",
        label: "SFTP",
        headline: "of SFTP cloud storage.",
        sub: "A real SFTP endpoint for servers and scheduled jobs, with per-key folder confinement. Nothing to install, nothing to run.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "SFTP on every plan",
        card: {
            headline: "SFTP cloud storage, no server to run.",
            sub: "A real SFTP endpoint with per-key folder confinement. Source-available, no egress fees.",
        },
        plan: "pro",
        keywords: ["sftp", "scp", "ssh"],
    },
    webdav: {
        id: "webdav",
        label: "WebDAV",
        headline: "of storage you can mount as a drive.",
        sub: "WebDAV on every plan, so it appears as a drive on macOS, Windows and Linux and in any app that can open a WebDAV folder.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "WebDAV on every plan",
        card: {
            headline: "Cloud storage you can mount as a drive.",
            sub: "WebDAV on every plan, on every desktop. Source-available, no egress fees.",
        },
        plan: "pro",
        keywords: ["webdav", "mount", "network drive", "mountain duck", "cyberduck"],
    },
    rclone: {
        id: "rclone",
        label: "rclone",
        headline: "of storage behind a native rclone remote.",
        sub: "A first-class rclone backend, not a wrapper. rclone sync, copy and mount all work, and taking your files back out is free.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "Native rclone backend",
        card: {
            headline: "Storage with a native rclone remote.",
            sub: "sync, copy and mount all work. Source-available, no egress fees.",
        },
        plan: "pro",
        keywords: ["rclone", "bisync"],
    },
    s3: {
        id: "s3",
        label: "S3 backup tools",
        headline: "of S3-compatible storage with no egress fees.",
        sub: "Point Duplicati, restic, Kopia or any S3 client at it like a bucket. Scoped keys with IP conditions, and restores cost nothing.",
        lead: FEATURE_GROUP_CONNECT,
        trust: "S3-compatible API",
        card: {
            headline: "S3-compatible storage with no egress fees.",
            sub: "Works with Duplicati, restic, Kopia and any S3 client. Source-available, encrypted Vault.",
        },
        plan: "pro",
        steps: [
            "Create a free dosya account, then an S3 key under Profile > API keys.",
            "Point Duplicati, restic, Kopia or any S3 client at s3.dosya.dev.",
            "Choose your workspace as the bucket and run your first backup.",
        ],
        guide: { href: "/nas-cloud-backup/", label: "See the backup guides" },
        keywords: ["s3", "duplicati", "restic", "kopia", "borg", "object storage", "bucket"],
    },
    pcloud: {
        id: "pcloud",
        label: "pCloud switchers",
        headline: "of private storage with nothing sold separately.",
        sub: "The end-to-end encrypted Vault, password and expiry on every share link, and version history are all included, not add-ons. No egress fees.",
        lead: FEATURE_GROUP_PRIVACY,
        trust: "Encrypted Vault included",
        card: {
            headline: "Private storage with nothing sold separately.",
            sub: "Encrypted Vault, share-link controls and version history are included, not add-ons.",
        },
        plan: "business",
        keywords: ["pcloud"],
    },
    mega: {
        id: "mega",
        label: "MEGA switchers",
        headline: "of storage on code you can read.",
        sub: "Source-available, with an end-to-end encrypted Vault the server cannot open and no tracking. Taking your files back out is always free.",
        lead: FEATURE_GROUP_PRIVACY,
        trust: "Source-available code",
        card: {
            headline: "Encrypted storage on code you can read.",
            sub: "Source-available, end-to-end encrypted Vault, no tracking, no egress fees.",
        },
        plan: "business",
        keywords: ["mega.nz", "mega.io", "mega "],
    },
    family: {
        id: "family",
        label: "Families",
        headline: "of storage for the whole family.",
        sub: "Up to five family members, each with their own account and private files, on one storage pool and one bill. Phone photo backup runs on its own. No egress fees.",
        lead: FEATURE_GROUP_STORAGE,
        trust: "One pool, one bill",
        card: {
            headline: "One plan for the whole family.",
            sub: "Up to five members, each with their own account and private files, one pool, one bill.",
        },
        plan: "business",
        keywords: ["family", "families", "kids", "household"],
    },
    photos: {
        id: "photos",
        label: "Photo backup",
        headline: "of photo and video backup.",
        sub: "Background backup from iPhone and Android, HEIC and RAW previews, a map of everything geotagged, and no egress fees when you want them all back.",
        lead: FEATURE_GROUP_STORAGE,
        trust: "Phone photo backup",
        card: {
            headline: "Photo backup that runs on its own.",
            sub: "iPhone and Android, HEIC and RAW previews, no egress fees to get them back.",
        },
        plan: "pro",
        keywords: ["photo", "photos", "camera roll", "icloud photos", "google photos"],
    },
    egress: {
        id: "egress",
        label: "No egress fees",
        headline: "of storage with no egress fees.",
        sub: "Taking your files back out is always free, however many terabytes. No download charges, no minimum retention, no tiers to pick.",
        lead: FEATURE_GROUP_MONEY,
        trust: "No egress fees",
        card: {
            headline: "Terabytes without egress fees.",
            sub: "Taking your files back out is always free. No download charges, no retention minimums.",
        },
        plan: "tb4",
        keywords: ["egress", "download fees", "glacier", "cold storage", "b2", "wasabi"],
    },
} as const satisfies Record<string, PromoAudience>;

export type PromoAudienceId = keyof typeof PROMO_AUDIENCES;

export const PROMO_AUDIENCE_IDS = Object.keys(PROMO_AUDIENCES) as [PromoAudienceId, ...PromoAudienceId[]];

const ID_RE = /^[a-z0-9-]{1,32}$/;

/** True when `id` is a plausible audience id as carried in a URL (not necessarily a known one). */
export function isAudienceIdShape(id: unknown): id is string {
    return typeof id === "string" && ID_RE.test(id);
}

/** The audience for an id from a URL, frontmatter or a prop; null for anything unknown. */
export function promoAudience(id: string | null | undefined): PromoAudience | null {
    if (!id) return null;
    const key = id.trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROMO_AUDIENCES, key) ? PROMO_AUDIENCES[key as PromoAudienceId] : null;
}

/**
 * Guess an audience from free text: the title first, and only when the title
 * says nothing, the summary. A post titled "What is WebDAV" that mentions
 * SFTP in passing is about WebDAV. Within one text the first audience, in
 * registry order, whose keyword appears as a whole word wins, so the specific
 * entries (synology, qnap) are listed before the general one (nas). Returns
 * null when nothing matches: the caller renders generic copy.
 */
export function guessAudience(title: string, summary = ""): PromoAudience | null {
    return matchAudience(title) ?? matchAudience(summary);
}

function matchAudience(text: string): PromoAudience | null {
    if (!text) return null;
    const hay = ` ${text.toLowerCase().replace(/[^a-z0-9.+ -]+/g, " ").replace(/\s+/g, " ")} `;
    for (const a of Object.values(PROMO_AUDIENCES)) {
        for (const k of a.keywords) {
            const needle = k.endsWith(" ") ? ` ${k}` : ` ${k} `;
            if (hay.includes(needle)) return a;
        }
    }
    return null;
}

/** The /promo link for an audience: code, audience, and (for ad links only) the opening size. */
export function promoHref(code: string, audience: PromoAudience | null, opts: { plan?: boolean; base?: string } = {}): string {
    const q = new URLSearchParams({ code });
    if (audience) {
        q.set("for", audience.id);
        if (opts.plan) q.set("plan", audience.plan);
    }
    return `${opts.base ?? "/promo/"}?${q.toString()}`;
}
