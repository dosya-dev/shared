import { describe, expect, it } from "vitest";
import {
    calendarSpan, calendarWindow, dayKey, expandCalendar, expandOccurrences, findConferenceLink, googleCalendarLink,
    occurrenceDays, parseDuration, parseIcal, resolveZone, singleEventIcs, toEpoch, unescapeText,
} from "./ical";

const ics = (...lines: string[]) => lines.join("\r\n") + "\r\n";

const TAKEOUT = ics(
    "BEGIN:VCALENDAR",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Personal",
    "X-WR-TIMEZONE:Australia/Brisbane",
    "BEGIN:VEVENT",
    "DTSTART;TZID=Australia/Brisbane:20261102T090000",
    "DTEND;TZID=Australia/Brisbane:20261102T093000",
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20261218T235959Z",
    "EXDATE;TZID=Australia/Brisbane:20261104T090000",
    "UID:standup@google.com",
    "SUMMARY:Team standup",
    "ORGANIZER;CN=Priya Shah:mailto:priya@example.com",
    "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=Alex M",
    " organ;X-NUM-GUESTS=0:mailto:alex@example.com",
    "ATTENDEE;PARTSTAT=DECLINED;CN=\"Lee, Hannah\":mailto:hannah@example.com",
    "DESCRIPTION:Join: https://meet.google.com/xpq-rmtd-bkw\\nAgenda\\, notes",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:This is an event reminder",
    "TRIGGER:-P0DT0H10M0S",
    "END:VALARM",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;TZID=Australia/Brisbane:20261106T100000",
    "DTEND;TZID=Australia/Brisbane:20261106T103000",
    "RECURRENCE-ID;TZID=Australia/Brisbane:20261106T090000",
    "UID:standup@google.com",
    "SUMMARY:Team standup (moved)",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20191103",
    "DTEND;VALUE=DATE:20191104",
    "RRULE:FREQ=YEARLY",
    "UID:bday@google.com",
    "SUMMARY:Mum's birthday",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART:20261106T204000Z",
    "DTEND:20261106T221500Z",
    "UID:flight@google.com",
    "SUMMARY:Flight QF 512",
    "LOCATION:Brisbane Airport (BNE)\\, T3",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20261107",
    "DTEND;VALUE=DATE:20261110",
    "UID:trip@google.com",
    "SUMMARY:Sydney weekend",
    "END:VEVENT",
    "BEGIN:VTODO",
    "SUMMARY:not an event",
    "END:VTODO",
    "END:VCALENDAR",
);

describe("parseIcal", () => {
    const cal = parseIcal(TAKEOUT);

    it("reads the calendar header", () => {
        expect(cal.name).toBe("Personal");
        expect(cal.timeZone).toBe("Australia/Brisbane");
        expect(cal.method).toBe("PUBLISH");
        expect(cal.events).toHaveLength(5);
        expect(cal.todoCount).toBe(1);
    });

    it("unfolds lines, unescapes text and keeps alarm text off the event", () => {
        const ev = cal.events[0];
        expect(ev.summary).toBe("Team standup");
        expect(ev.description).toBe("Join: https://meet.google.com/xpq-rmtd-bkw\nAgenda, notes");
        expect(ev.attendees.map((a) => a.name)).toEqual(["Alex Morgan", "Lee, Hannah"]);
        expect(ev.attendees.map((a) => a.status)).toEqual(["accepted", "declined"]);
        expect(ev.attendees[0].email).toBe("alex@example.com");
        expect(ev.organizer).toMatchObject({ name: "Priya Shah", email: "priya@example.com" });
        expect(ev.alarms).toEqual([10]);
        expect(ev.conference).toBe("https://meet.google.com/xpq-rmtd-bkw");
    });

    it("reads repeat rules", () => {
        const rule = cal.events[0].rule!;
        expect(rule.freq).toBe("WEEKLY");
        expect(rule.byDay.map((b) => b.wd)).toEqual(["MO", "TU", "WE", "TH", "FR"]);
        expect(rule.until && toEpoch(rule.until)).toBe(Date.UTC(2026, 11, 18, 23, 59, 59));
    });

    it("converts zoned, UTC and all-day times", () => {
        // Brisbane is UTC+10 with no daylight saving.
        expect(toEpoch(cal.events[0].start)).toBe(Date.UTC(2026, 10, 1, 23, 0));
        expect(toEpoch(cal.events[3].start)).toBe(Date.UTC(2026, 10, 6, 20, 40));
        expect(cal.events[2].start.date).toBe(true);
        expect(toEpoch(cal.events[2].start)).toBe(Date.UTC(2019, 10, 3));
    });

    it("cuts one event back out as its own file", () => {
        const one = singleEventIcs(TAKEOUT, cal.events[3]);
        expect(one.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
        expect(one).toContain("SUMMARY:Flight QF 512\r\n");
        expect(one).toContain("END:VEVENT\r\nEND:VCALENDAR\r\n");
        expect(one).not.toContain("Sydney weekend");
        expect(parseIcal(one).events).toHaveLength(1);
    });

    it("never throws on junk and accepts bare LF files", () => {
        expect(parseIcal("").events).toEqual([]);
        expect(parseIcal("hello\nworld").events).toEqual([]);
        expect(parseIcal("BEGIN:VEVENT\nSUMMARY:no start\nEND:VEVENT").events).toEqual([]);
        const lf = parseIcal("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260101T100000Z\nSUMMARY:x\nEND:VEVENT\nEND:VCALENDAR\n");
        expect(lf.events[0].summary).toBe("x");
    });
});

describe("expandOccurrences", () => {
    const cal = parseIcal(TAKEOUT);
    const nov = (d: number, h = 0) => Date.UTC(2026, 10, d, h);

    it("expands weekdays, drops the EXDATE and swaps in the moved occurrence", () => {
        const occ = expandOccurrences(cal, { from: nov(1), to: nov(8) }).filter((o) => o.event.uid === "standup@google.com");
        // Mon 2, Tue 3, (Wed 4 excluded), Thu 5, Fri 6 moved to 10:00.
        expect(occ.map((o) => new Date(o.start).toISOString())).toEqual([
            "2026-11-01T23:00:00.000Z",
            "2026-11-02T23:00:00.000Z",
            "2026-11-04T23:00:00.000Z",
            "2026-11-06T00:00:00.000Z",
        ]);
        expect(occ[3].event.summary).toBe("Team standup (moved)");
        expect(occ.every((o) => o.recurring)).toBe(true);
    });

    it("stops a series at UNTIL", () => {
        const occ = expandOccurrences(cal, { from: nov(1), to: Date.UTC(2027, 5, 1) }).filter((o) => o.event.uid === "standup@google.com");
        expect(new Date(occ[occ.length - 1].start).toISOString()).toBe("2026-12-17T23:00:00.000Z");
    });

    it("repeats a yearly all-day event every year from its first date", () => {
        const occ = expandOccurrences(cal, { from: Date.UTC(2019, 0, 1), to: Date.UTC(2027, 0, 1) }).filter((o) => o.event.uid === "bday@google.com");
        expect(occ).toHaveLength(8);
        expect(occ.every((o) => o.allDay && new Date(o.start).getUTCDate() === 3)).toBe(true);
    });

    it("keeps a multi-day all-day event on every day it covers", () => {
        const trip = expandOccurrences(cal, { from: nov(1), to: nov(30) }).find((o) => o.event.uid === "trip@google.com")!;
        expect(occurrenceDays(trip)).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
    });

    it("handles monthly by weekday ordinal, last weekday and BYSETPOS", () => {
        const c = parseIcal(ics(
            "BEGIN:VCALENDAR",
            "BEGIN:VEVENT", "UID:a", "SUMMARY:2nd Tue", "DTSTART:20260113T090000Z", "RRULE:FREQ=MONTHLY;BYDAY=2TU;COUNT=4", "END:VEVENT",
            "BEGIN:VEVENT", "UID:b", "SUMMARY:last Fri", "DTSTART:20260130T090000Z", "RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3", "END:VEVENT",
            "BEGIN:VEVENT", "UID:c", "SUMMARY:last weekday", "DTSTART:20260130T090000Z", "RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1;COUNT=3", "END:VEVENT",
            "BEGIN:VEVENT", "UID:d", "SUMMARY:31st", "DTSTART:20260131T090000Z", "RRULE:FREQ=MONTHLY;COUNT=3", "END:VEVENT",
            "BEGIN:VEVENT", "UID:e", "SUMMARY:every 2 days", "DTSTART:20260101T090000Z", "RRULE:FREQ=DAILY;INTERVAL=2;COUNT=3", "END:VEVENT",
            "END:VCALENDAR",
        ));
        const days = (uid: string) => expandOccurrences(c, { from: Date.UTC(2026, 0, 1), to: Date.UTC(2027, 0, 1) })
            .filter((o) => o.event.uid === uid).map((o) => new Date(o.start).toISOString().slice(0, 10));
        expect(days("a")).toEqual(["2026-01-13", "2026-02-10", "2026-03-10", "2026-04-14"]);
        expect(days("b")).toEqual(["2026-01-30", "2026-02-27", "2026-03-27"]);
        expect(days("c")).toEqual(["2026-01-30", "2026-02-27", "2026-03-31"]);
        // Months without a 31st are skipped, as RFC 5545 says.
        expect(days("d")).toEqual(["2026-01-31", "2026-03-31", "2026-05-31"]);
        expect(days("e")).toEqual(["2026-01-01", "2026-01-03", "2026-01-05"]);
    });

    it("keeps wall-clock time across a daylight-saving change", () => {
        const c = parseIcal(ics(
            "BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:x", "SUMMARY:Gym",
            "DTSTART;TZID=Europe/London:20260323T180000", "DTEND;TZID=Europe/London:20260323T190000",
            "RRULE:FREQ=WEEKLY;COUNT=2", "END:VEVENT", "END:VCALENDAR",
        ));
        const occ = expandCalendar(c, Date.UTC(2026, 2, 1));
        expect(occ.map((o) => new Date(o.start).toISOString())).toEqual(["2026-03-23T18:00:00.000Z", "2026-03-30T17:00:00.000Z"]);
    });

    it("bounds endless repeats to the calendar window", () => {
        const c = parseIcal(ics("BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:x", "SUMMARY:Daily", "DTSTART:20260101T090000Z", "RRULE:FREQ=DAILY", "END:VEVENT", "END:VCALENDAR"));
        const now = Date.UTC(2026, 0, 1);
        const w = calendarWindow(c, now);
        expect(w.to).toBeGreaterThan(now);
        const occ = expandCalendar(c, now);
        expect(occ.length).toBeGreaterThan(360);
        expect(occ.length).toBeLessThan(370);
    });

    it("shows an edited occurrence whose series is missing", () => {
        const c = parseIcal(ics("BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:orphan", "RECURRENCE-ID:20260105T090000Z", "DTSTART:20260105T100000Z", "SUMMARY:Lone", "END:VEVENT", "END:VCALENDAR"));
        expect(expandCalendar(c, Date.UTC(2026, 0, 1)).map((o) => o.event.summary)).toEqual(["Lone"]);
    });
});

describe("helpers", () => {
    it("spans the dates a calendar covers, not how far its repeats were expanded", () => {
        const { first, last } = calendarSpan(parseIcal(TAKEOUT));
        expect(new Date(first).toISOString().slice(0, 10)).toBe("2019-11-03");
        expect(new Date(last).toISOString().slice(0, 10)).toBe("2026-12-18");
    });

    it("resolves IANA, Windows and prefixed zone names", () => {
        expect(resolveZone("Europe/Berlin")).toBe("Europe/Berlin");
        expect(resolveZone("W. Europe Standard Time")).toBe("Europe/Berlin");
        expect(resolveZone("/mozilla.org/20050126_1/America/New_York")).toBe("America/New_York");
        expect(resolveZone("Custom Zone 7")).toBeNull();
    });

    it("parses durations", () => {
        expect(parseDuration("-PT15M")).toBe(-15 * 60_000);
        expect(parseDuration("P1D")).toBe(86_400_000);
        expect(parseDuration("P1W")).toBe(7 * 86_400_000);
        expect(parseDuration("nonsense")).toBeNull();
    });

    it("unescapes TEXT", () => {
        expect(unescapeText("a\\, b\\; c\\\\d\\Ne")).toBe("a, b; c\\d\ne");
    });

    it("finds a call link", () => {
        expect(findConferenceLink("Zoom: https://us02web.zoom.us/j/8123456789?pwd=abc).")).toBe("https://us02web.zoom.us/j/8123456789?pwd=abc");
        expect(findConferenceLink("no link here")).toBeNull();
    });

    it("puts timed instants on the viewer's day and all-day dates on their own", () => {
        expect(dayKey(Date.UTC(2026, 10, 1, 23), false, "Australia/Brisbane")).toBe("2026-11-02");
        expect(dayKey(Date.UTC(2026, 10, 1, 23), false, "Europe/London")).toBe("2026-11-01");
        expect(dayKey(Date.UTC(2026, 10, 3), true, "America/Los_Angeles")).toBe("2026-11-03");
    });

    it("builds a Google Calendar link", () => {
        const c = parseIcal(TAKEOUT);
        const o = expandOccurrences(c, { from: Date.UTC(2026, 10, 1), to: Date.UTC(2026, 10, 30) }).find((x) => x.event.uid === "flight@google.com")!;
        const url = new URL(googleCalendarLink(o));
        expect(url.searchParams.get("dates")).toBe("20261106T204000Z/20261106T221500Z");
        expect(url.searchParams.get("location")).toBe("Brisbane Airport (BNE), T3");
    });
});
