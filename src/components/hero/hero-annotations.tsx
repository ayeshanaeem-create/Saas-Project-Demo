import { Annotation, AnnotationNote, type AnnotationProps } from "@/components/hero/annotation";

// The hand-drawn callouts around the landing hero's phone (ChatPreview).
//
// Positions are px from the phone's edges. The phone is 340px wide from md up, so these land
// on the same bubbles everywhere. Callouts aimed low (the booking card, the phone's bottom
// edge) measure from the bottom, so they stay put if a system font wraps a bubble differently.
// Each callout starts drawing STAGGER seconds after the one before it.

const TEXT = {
  customer: "Customer messages at 4:41 PM…",
  reply: "AI replies in seconds ⚡ — checks real availability",
  booked: "Booked straight into your calendar",
  allDay: "24/7 — even when you're closed 🌙",
};

const FIRST_DELAY = 0.5;
const STAGGER = 0.3;

type Callout = Omit<AnnotationProps, "delay" | "className">;

/** From the left, under the chat header, to the customer's first message. */
const customer: Callout = {
  text: TEXT.customer,
  pointAt: { left: 58, top: 106 },
  direction: 12,
  length: 100,
  curve: 0.2,
  noteWidth: 150,
};

// The reply note needs 180px to break as "AI replies in seconds ⚡ / — checks real availability";
// any narrower and the ⚡ starts a line on its own.
const REPLY_NOTE_WIDTH = 180;

/** From the left to the agent's first reply. */
const replyFromLeft: Callout = {
  text: TEXT.reply,
  pointAt: { left: 16, top: 190 },
  direction: 6,
  length: 52,
  curve: -0.25,
  noteWidth: REPLY_NOTE_WIDTH,
};

/**
 * From the right to the agent's first reply (tablet, where the phone is centred). The tail sits
 * just outside the phone so the note still fits beside it at 768px.
 */
const replyFromRight: Callout = {
  text: TEXT.reply,
  pointAt: { left: 280, top: 196 },
  direction: 186,
  length: 66,
  curve: 0.22,
  noteWidth: REPLY_NOTE_WIDTH,
};

/** From below-left up to the "New booking" card, with the note under the tail. */
const bookedFromBelowLeft: Callout = {
  text: TEXT.booked,
  pointAt: { left: -38, bottom: 64 },
  direction: -62,
  length: 78,
  curve: -0.25,
  noteWidth: 150,
};

/** Straight up to the card, through the narrow gap beside the headline (1024–1279px). */
const bookedFromBelow: Callout = {
  text: TEXT.booked,
  pointAt: { left: -30, bottom: 64 },
  direction: -95,
  length: 72,
  curve: 0.2,
  noteAlign: "start",
  noteWidth: 150,
};

/** Up to the bottom edge of the phone. The note overhangs the phone's right edge a little. */
const allDay: Callout = {
  text: TEXT.allDay,
  pointAt: { left: 222, bottom: -8 },
  direction: -118,
  length: 62,
  curve: 0.22,
  noteWidth: 180,
};

const LAYOUTS: { className: string; callouts: Callout[] }[] = [
  // 1280px and up: room for notes between the headline and the phone.
  { className: "hidden xl:block", callouts: [customer, replyFromLeft, bookedFromBelowLeft, allDay] },
  // 1024–1279px: only ~54px beside the headline, so both notes sit under the phone.
  { className: "hidden lg:block xl:hidden", callouts: [bookedFromBelow, allDay] },
  // 768–1023px: the phone is centred under the text, with room on both sides.
  { className: "hidden md:block lg:hidden", callouts: [replyFromRight, bookedFromBelowLeft] },
];

/** Renders inside the phone's `relative` wrapper in the hero. */
export function HeroAnnotations() {
  return (
    <>
      {LAYOUTS.map(({ className, callouts }) =>
        callouts.map((callout, i) => (
          <Annotation key={`${className}-${i}`} {...callout} className={className} delay={FIRST_DELAY + i * STAGGER} />
        )),
      )}
      {/* Phones: no arrows, one small note under the phone (in the hero's bottom padding). */}
      <AnnotationNote
        text={TEXT.allDay}
        delay={FIRST_DELAY}
        className="absolute inset-x-0 top-full mt-3 text-center text-[19px] md:hidden"
      />
    </>
  );
}
