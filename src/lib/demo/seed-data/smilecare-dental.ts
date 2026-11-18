import { customers as c } from "./customers";
import { hoursOn, type SeedBusiness } from "./types";

export const smileCareDental: SeedBusiness = {
  slug: "smilecare-dental",
  name: "SmileCare Dental Clinic",
  emoji: "🦷",
  category: "dental",
  tagline: "Gentle family dentistry",
  address: "Phase 5, DHA, Lahore",
  phone: "+924235550202",
  slotIntervalMin: 30,
  // Closed on Sundays; Friday is an afternoon shift.
  hours: { ...hoursOn([1, 2, 3, 4, 6], "10:00", "19:00"), ...hoursOn([5], "15:00", "20:00") },
  services: [
    {
      key: "checkup",
      name: "Checkup",
      description: "Dental exam with a dentist, including advice on any treatment needed.",
      price: 2000,
      durationMin: 30,
      capacity: 2,
    },
    {
      key: "cleaning",
      name: "Cleaning",
      description: "Scaling and polishing by our hygienist.",
      price: 5000,
      durationMin: 45,
      capacity: 1,
    },
    {
      key: "rootcanal",
      name: "Root Canal Consultation",
      description: "Assessment and X-ray review for a possible root canal. Treatment is booked separately.",
      price: 3000,
      durationMin: 30,
      capacity: 1,
    },
  ],
  persona: {
    agentName: "Nadia",
    tone: "Calm, reassuring and professional. Plain language, no emoji.",
    greeting:
      "Hello, thank you for contacting SmileCare Dental Clinic. I'm Nadia, the clinic's assistant. How can I help you today?",
    instructions: [
      "You are not a dentist. Never diagnose or give medical advice.",
      "For severe pain, swelling or bleeding, tell the patient to call the clinic directly or go to emergency care, and offer a handoff to staff.",
      "Ask first-time patients to arrive 10 minutes early to fill in a short form.",
    ].join("\n"),
  },
  bookings: [
    { dayOffset: -1, time: "10:30", service: "checkup", customerPhone: c.zainab.phone },
    { dayOffset: 0, time: "11:00", service: "cleaning", customerPhone: c.hira.phone },
    { dayOffset: 0, time: "12:00", service: "checkup", customerPhone: c.omar.phone },
    { dayOffset: 0, time: "16:30", service: "rootcanal", customerPhone: c.usman.phone },
    { dayOffset: 1, time: "10:00", service: "checkup", customerPhone: c.fatima.phone },
    { dayOffset: 1, time: "15:00", service: "cleaning", customerPhone: c.ahmed.phone },
    { dayOffset: 2, time: "17:30", service: "checkup", customerPhone: c.usman.phone, cancelled: true },
    { dayOffset: 3, time: "11:30", service: "rootcanal", customerPhone: c.zainab.phone },
    { dayOffset: 4, time: "16:00", service: "cleaning", customerPhone: c.omar.phone },
  ],
};
