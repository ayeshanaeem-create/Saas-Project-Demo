import { describe, expect, it } from "vitest";

import {
  detectIntents,
  extractName,
  isNo,
  isYes,
  matchService,
  parseChoice,
  parseDate,
  parseDayPart,
  parsePartySize,
  parseTime,
  resolveTime,
} from "@/lib/agent/scripted/parse";

const WED = "2026-11-18"; // a Wednesday

describe("parseDate", () => {
  it("understands relative days", () => {
    expect(parseDate("today please", WED)).toBe(WED);
    expect(parseDate("tonight", WED)).toBe(WED);
    expect(parseDate("Tomorrow at 5", WED)).toBe("2026-11-19");
    expect(parseDate("tmrw", WED)).toBe("2026-11-19");
    expect(parseDate("day after tomorrow", WED)).toBe("2026-11-20");
  });

  it("finds the next matching weekday", () => {
    expect(parseDate("on Friday", WED)).toBe("2026-11-20");
    expect(parseDate("sat", WED)).toBe("2026-11-21");
    expect(parseDate("monday morning", WED)).toBe("2026-11-23");
    expect(parseDate("wednesday", WED)).toBe(WED);
    expect(parseDate("next wednesday", WED)).toBe("2026-11-25");
  });

  it("reads written and numeric dates, rolling into next year when needed", () => {
    expect(parseDate("19 Nov", WED)).toBe("2026-11-19");
    expect(parseDate("the 25th of November", WED)).toBe("2026-11-25");
    expect(parseDate("December 3rd", WED)).toBe("2026-12-03");
    expect(parseDate("5 jan", WED)).toBe("2027-01-05");
    expect(parseDate("20/11", WED)).toBe("2026-11-20");
    expect(parseDate("2026-12-01", WED)).toBe("2026-12-01");
    expect(parseDate("on the 2nd", WED)).toBe("2026-12-02");
  });

  it("returns null when there is no date or it isn't real", () => {
    expect(parseDate("a haircut please", WED)).toBeNull();
    expect(parseDate("31/02", WED)).toBeNull();
  });
});

describe("parseTime / resolveTime", () => {
  const salon = { opensAt: "11:00", closesAt: "21:00" };
  const gym = { opensAt: "06:00", closesAt: "23:00" };
  const at = (text: string, hours = salon, bare = false) => {
    const parsed = parseTime(text, { allowBareNumber: bare });
    return parsed && resolveTime(parsed, hours);
  };

  it("reads explicit times", () => {
    expect(at("5pm")).toBe("17:00");
    expect(at("at 5:30 PM")).toBe("17:30");
    expect(at("5.30 pm")).toBe("17:30");
    expect(at("11am")).toBe("11:00");
    expect(at("12 pm")).toBe("12:00");
    expect(at("17:00")).toBe("17:00");
    expect(at("noon")).toBe("12:00");
  });

  it("picks the reading that falls in opening hours", () => {
    expect(at("at 5")).toBe("17:00");
    expect(at("at 11")).toBe("11:00");
    expect(at("around 7", gym)).toBe("19:00"); // both fit; evening wins
    expect(at("6:30", gym)).toBe("18:30");
  });

  it("accepts a bare number only when we asked for a time", () => {
    expect(at("4")).toBeNull();
    expect(at("4", salon, true)).toBe("16:00");
  });

  it("doesn't mistake party sizes or dates for times", () => {
    expect(parseTime("table for 4")).toBeNull();
    expect(parseTime("at 4 people")).toBeNull();
    expect(parseTime("19 Nov")).toBeNull();
  });
});

describe("parseDayPart", () => {
  it("spots morning, afternoon and evening", () => {
    expect(parseDayPart("something in the morning")).toBe("morning");
    expect(parseDayPart("afternoon works")).toBe("afternoon");
    expect(parseDayPart("dinner")).toBe("evening");
    expect(parseDayPart("tomorrow")).toBeNull();
  });
});

describe("parsePartySize", () => {
  it("reads party sizes in several phrasings", () => {
    expect(parsePartySize("table for 4 at 8pm")).toBe(4);
    expect(parsePartySize("we are 5 people")).toBe(5);
    expect(parsePartySize("party of six")).toBe(6);
    expect(parsePartySize("3 guests")).toBe(3);
  });

  it("ignores times and bare numbers unless asked", () => {
    expect(parsePartySize("for 8pm")).toBeNull();
    expect(parsePartySize("for 7:30")).toBeNull();
    expect(parsePartySize("4")).toBeNull();
    expect(parsePartySize("4", { allowBareNumber: true })).toBe(4);
  });
});

describe("matchService", () => {
  const salon = ["Haircut", "Facial", "Bridal Makeup"];
  const dental = ["Checkup", "Cleaning", "Root Canal Consultation"];
  const gym = ["Free Trial", "Personal Trainer Session"];
  const restaurant = ["Table for 2", "Table for 4", "Table for 6", "Table for 8"];

  it("matches names and everyday words", () => {
    expect(matchService("need a trim tomorrow", salon)).toBe("Haircut");
    expect(matchService("makeup for my wedding", salon)).toBe("Bridal Makeup");
    expect(matchService("bridal hair and makeup", salon)).toBe("Bridal Makeup"); // longest phrase wins
    expect(matchService("I have a toothache", dental)).toBe("Root Canal Consultation");
    expect(matchService("teeth cleaning please", dental)).toBe("Cleaning");
    expect(matchService("book a PT session", gym)).toBe("Personal Trainer Session");
    expect(matchService("can I try the gym", gym)).toBe("Free Trial");
    expect(matchService("Table for 4 tonight", restaurant)).toBe("Table for 4");
  });

  it("returns null when nothing matches", () => {
    expect(matchService("hello", salon)).toBeNull();
    expect(matchService("a shortcut", salon)).toBeNull();
  });
});

describe("extractName", () => {
  it("finds a stated name anywhere", () => {
    expect(extractName("Yes, my name is sara khan")).toBe("Sara Khan");
  });

  it("takes the reply as a name when we asked for one", () => {
    expect(extractName("Ahmed", { awaitingName: true })).toBe("Ahmed");
    expect(extractName("it's zainab malik.", { awaitingName: true })).toBe("Zainab Malik");
    expect(extractName("Omar please", { awaitingName: true })).toBe("Omar");
    expect(extractName("yes", { awaitingName: true })).toBeNull();
    expect(extractName("Ahmed")).toBeNull();
  });
});

describe("detectIntents", () => {
  const has = (text: string) => [...detectIntents(text)].sort();

  it("recognises what the customer wants", () => {
    expect(has("Can I talk to a real person?")).toContain("handoff");
    expect(has("I want to cancel my booking")).toEqual(expect.arrayContaining(["cancel"]));
    expect(has("can you move my appointment to friday")).toContain("reschedule");
    expect(has("what are your prices?")).toContain("prices");
    expect(has("are you open today")).toContain("hours");
    expect(has("where are you located")).toContain("location");
    expect(has("I'd like to book a haircut")).toContain("book");
    expect(has("Hello!")).toContain("greeting");
    expect(has("thank you so much")).toContain("thanks");
    expect(has("do I have any bookings")).toContain("list");
  });

  it("doesn't treat a party size as a request for a person", () => {
    expect(has("table for 4 persons")).not.toContain("handoff");
    expect(has("change the time to 6pm")).not.toContain("reschedule");
  });
});

describe("yes / no / choice", () => {
  it("reads confirmations", () => {
    for (const yes of ["yes", "Yes please", "ok", "sure!", "👍", "go ahead"]) expect(isYes(yes)).toBe(true);
    for (const no of ["no", "nope", "not now", "wait"]) expect(isNo(no)).toBe(true);
    expect(isYes("no thanks")).toBe(false);
  });

  it("reads list choices", () => {
    expect(parseChoice("2")).toBe(2);
    expect(parseChoice("the second one")).toBe(2);
    expect(parseChoice("1st")).toBe(1);
    expect(parseChoice("haircut")).toBeNull();
  });
});
