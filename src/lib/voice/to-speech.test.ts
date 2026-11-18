import { describe, expect, it } from "vitest";

import { sentences, toSpeech } from "@/lib/voice/to-speech";

describe("toSpeech", () => {
  it("drops formatting and emoji", () => {
    expect(toSpeech("You're booked! ✅ *Haircut* tomorrow at *5:00 PM*.")).toBe("You're booked! Haircut tomorrow at 5:00 PM.");
    expect(toSpeech("Hi! ✨ Welcome to Glamour Salon.")).toBe("Hi! Welcome to Glamour Salon.");
  });

  it("reads lists as sentences and prices in rupees", () => {
    expect(toSpeech("Here's what we offer:\n• *Haircut*: Rs 1,500, 45 min\n• *Facial*: Rs 3,500, 1 hr")).toBe(
      "Here's what we offer. Haircut. 1,500 rupees, 45 min. Facial. 3,500 rupees, 1 hr.",
    );
    expect(toSpeech("1. *Checkup*, Friday at 3:00 PM\n2. *Cleaning*, Monday")).toBe("Checkup, Friday at 3:00 PM. Cleaning, Monday.");
  });

  it("reads ranges with 'to'", () => {
    expect(toSpeech("Open 11:00 AM – 9:00 PM")).toBe("Open 11:00 AM to 9:00 PM.");
  });
});

describe("sentences", () => {
  it("splits on sentence ends but not inside times or numbers", () => {
    expect(sentences("Sure! I have 11:00 AM or 1,500 rupees. Which suits you?")).toEqual([
      "Sure!",
      "I have 11:00 AM or 1,500 rupees.",
      "Which suits you?",
    ]);
    expect(sentences("No full stop at the end")).toEqual(["No full stop at the end"]);
  });
});
