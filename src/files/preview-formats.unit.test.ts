import { describe, expect, it } from "vitest";
import { contentFamilyFor, extOf, isTextReadable, previewKindFor } from "./preview-formats";

describe("previewKindFor", () => {
    it("follows the web viewer's dispatch order", () => {
        expect(previewKindFor("card.vcf")).toBe("contact");
        expect(previewKindFor("Personal.ics")).toBe("calendar");
        expect(previewKindFor("invite.ICS", "text/calendar")).toBe("calendar");
        expect(previewKindFor("logo.svg")).toBe("image");
        expect(previewKindFor("IMG_1.HEIC")).toBe("image");
        expect(previewKindFor("clip.m4v")).toBe("video");
        expect(previewKindFor("song.aiff")).toBe("audio");
        expect(previewKindFor("doc.pdf")).toBe("pdf");
        expect(previewKindFor("book.fb2")).toBe("ebook");
        expect(previewKindFor("comic.cbz")).toBe("ebook");
        expect(previewKindFor("backup.zip")).toBe("archive");
        expect(previewKindFor("disk.img")).toBe("archive");
        expect(previewKindFor("README.md")).toBe("markdown");
        expect(previewKindFor("data.csv")).toBe("table");
        expect(previewKindFor("data.tsv")).toBe("table");
        expect(previewKindFor("report.docx")).toBe("office");
    });

    it("reads the code and config files the share page used to refuse as text", () => {
        for (const name of ["Main.kt", "app.swift", "theme.scss", "fix.diff", "schema.graphql", "run.ps1", ".gitignore", "build.gradle", "subs.ass"]) {
            expect(previewKindFor(name), name).toBe("text");
        }
        for (const name of ["README", "LICENSE", "Dockerfile", "Makefile"]) {
            expect(previewKindFor(name), name).toBe("text");
        }
    });

    it("sends formats nothing can draw to the download card", () => {
        for (const name of ["a.rar", "b.azw", "c.bin", "d.heics", "e.exr"]) {
            expect(previewKindFor(name), name).toBe("none");
        }
    });

    it("puts formats the browser can decode behind the Open button", () => {
        for (const name of ["scan.tif", "scan.TIFF", "photo.dng", "IMG_1.CR3", "DSC_1.NEF", "a.arw", "b.raf", "c.orf", "d.rw2", "art.psd", "big.psb", "notes.pages", "budget.numbers", "talk.key"]) {
            expect(previewKindFor(name), name).toBe("decode");
        }
    });

    it("falls back to the mime only when the name says nothing", () => {
        expect(previewKindFor("photo", "image/jpeg")).toBe("image");
        expect(previewKindFor("clip", "video/mp4")).toBe("video");
        expect(previewKindFor("export", "application/pdf")).toBe("pdf");
        expect(previewKindFor("notes", "text/plain")).toBe("text");
        // A known extension wins over a sniffed mime.
        expect(previewKindFor("scan.tiff", "image/tiff")).toBe("decode");
        expect(previewKindFor("raw.dng", "image/x-adobe-dng")).toBe("decode");
        // Without a name the decoder cannot tell what it is holding.
        expect(previewKindFor("photo", "image/tiff")).toBe("none");
        expect(previewKindFor("blob", "application/octet-stream")).toBe("none");
    });
});

describe("contentFamilyFor", () => {
    it("keeps undrawable images in the image family", () => {
        // The share metadata stripper refuses images it cannot clean; a TIFF
        // falling out of this family would be served with its GPS tags.
        expect(contentFamilyFor("scan.tiff")).toBe("image");
        expect(contentFamilyFor("scan.TIF")).toBe("image");
    });

    it("settles overlapping lists the way the share page always has", () => {
        expect(contentFamilyFor("data.csv")).toBe("spreadsheet");
        expect(contentFamilyFor("Personal.ics")).toBe("text");
        expect(contentFamilyFor("logo.svg")).toBe("image");
        expect(contentFamilyFor("card.vcf")).toBe("text");
        expect(contentFamilyFor("notes.pages")).toBe("document");
        expect(contentFamilyFor("talk.key")).toBe("presentation");
        expect(contentFamilyFor("a.rar")).toBe("archive");
        expect(contentFamilyFor("b.cbr")).toBe("ebook");
        expect(contentFamilyFor("Main.kt")).toBe("text");
        expect(contentFamilyFor("README")).toBe("text");
    });

    it("uses a specific mime when the name has no known extension", () => {
        expect(contentFamilyFor("x", "image/png")).toBe("image");
        expect(contentFamilyFor("x", "application/json")).toBe("text");
        expect(contentFamilyFor("x", "application/octet-stream")).toBe("other");
        expect(contentFamilyFor("x.bin")).toBe("other");
    });
});

describe("helpers", () => {
    it("extOf and isTextReadable", () => {
        expect(extOf("a.B.TXT")).toBe("txt");
        expect(extOf("noext")).toBe("");
        expect(isTextReadable("x.unknown", "application/x-yaml")).toBe(true);
        expect(isTextReadable("x.unknown", null)).toBe(false);
    });
});
