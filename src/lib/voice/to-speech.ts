import { stripWhatsAppFormatting } from "@/lib/whatsapp-format";

/**
 * Rewrites a chat reply so text-to-speech reads it naturally: no formatting markers or
 * emoji, list items become sentences, "Rs 1,500" becomes "1,500 rupees", and "11:00 AM –
 * 9:00 PM" reads as "11:00 AM to 9:00 PM".
 */
export function toSpeech(text: string): string {
  return stripWhatsAppFormatting(text)
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[•\-*]|\d+\.)\s+/, "").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:]$/.test(line) ? line : `${line}.`))
    .join(" ")
    .replace(/\bRs\.?\s*(\d{1,3}(?:,\d{3})+|\d+)/g, "$1 rupees")
    .replace(/\s*[–—]\s*/g, " to ")
    .replace(/:\s/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text into sentences so long replies can be spoken (and interrupted) piece by piece. */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}
