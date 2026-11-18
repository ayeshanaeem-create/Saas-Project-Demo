import type { BusinessCategory } from "@/types/domain";

// Suggested messages for the demo view, in a sensible order: book something, ask a few
// questions, change or cancel, then ask for a person. Every message is understood by the
// scripted agent (scenarios.db.test.ts checks), so a click never hits a dead end.

export type Scenario = { label: string; message: string };

export const SCENARIOS: Record<BusinessCategory, Scenario[]> = {
  salon: [
    { label: "Ask for a haircut", message: "Hi! Do you have a haircut slot tomorrow?" },
    { label: "Pick a time", message: "5pm please" },
    { label: "Give a name", message: "My name is Sara" },
    { label: "Confirm", message: "Yes, book it" },
    { label: "Ask a price", message: "How much is bridal makeup?" },
    { label: "Not now", message: "No thanks" },
    { label: "Reschedule", message: "Can I move my appointment to Saturday at 4pm?" },
    { label: "Confirm the move", message: "Yes" },
    { label: "Ask for a person", message: "I'd like to speak to a manager" },
  ],
  dental: [
    { label: "Toothache", message: "Hello, I have a toothache. Can I come in tomorrow?" },
    { label: "Pick a time", message: "11am" },
    { label: "Give a name", message: "My name is Ali" },
    { label: "Confirm", message: "Yes please" },
    { label: "Opening hours", message: "What are your opening hours?" },
    { label: "Ask a price", message: "How much is a cleaning?" },
    { label: "Location", message: "Where is the clinic?" },
    { label: "Cancel", message: "I need to cancel my appointment" },
    { label: "Confirm", message: "Yes" },
  ],
  restaurant: [
    { label: "Book a table", message: "Can I get a table for 4 tomorrow at 8pm?" },
    { label: "Give a name", message: "My name is Omar" },
    { label: "Confirm", message: "Yes" },
    { label: "Location", message: "Where are you located?" },
    { label: "My bookings", message: "Do I have any bookings?" },
    { label: "Big group", message: "We're 12 people on Saturday" },
  ],
  fitness: [
    { label: "Free trial", message: "Can I book a free trial tomorrow morning?" },
    { label: "Pick a time", message: "7am" },
    { label: "Give a name", message: "My name is Hira" },
    { label: "Confirm", message: "Yes" },
    { label: "Ask a price", message: "How much is a personal trainer session?" },
    { label: "Sunday hours", message: "Are you open on Sunday?" },
    { label: "Reschedule", message: "Move my booking to Friday at 6pm" },
    { label: "Confirm the move", message: "Yes" },
  ],
};
