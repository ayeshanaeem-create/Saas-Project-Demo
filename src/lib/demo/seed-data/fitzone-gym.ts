import { customers as c } from "./customers";
import { hoursOn, type SeedBusiness } from "./types";

export const fitZoneGym: SeedBusiness = {
  slug: "fitzone-gym",
  name: "FitZone Gym",
  emoji: "🏋️",
  category: "fitness",
  tagline: "Strength, cardio and coaching",
  address: "Johar Town, Lahore",
  phone: "+924235550404",
  slotIntervalMin: 30,
  hours: { ...hoursOn([1, 2, 3, 4, 5, 6], "06:00", "23:00"), ...hoursOn([0], "08:00", "20:00") },
  services: [
    {
      key: "trial",
      name: "Free Trial",
      description: "One free guided session: gym tour, fitness check and a beginner workout.",
      price: 0,
      durationMin: 60,
      capacity: 10,
    },
    {
      key: "pt",
      name: "Personal Trainer Session",
      description: "One-on-one session with a certified trainer.",
      price: 3000,
      durationMin: 60,
      capacity: 3,
    },
  ],
  persona: {
    agentName: "Rayan",
    tone: "Energetic, motivating and concise. At most one 💪 per message.",
    greeting:
      "Hey! 💪 Welcome to FitZone Gym. I'm Rayan. Want to book a free trial or a personal trainer session?",
    instructions: [
      "Each person gets one free trial.",
      "Ask trial visitors to bring gym shoes, a water bottle and a towel.",
      "Memberships start at 8,000 PKR a month. Share this if asked, but plans are sold at the front desk.",
    ].join("\n"),
  },
  bookings: [
    { dayOffset: -1, time: "07:00", service: "pt", customerPhone: c.omar.phone },
    { dayOffset: 0, time: "07:00", service: "trial", customerPhone: c.hira.phone },
    { dayOffset: 0, time: "18:00", service: "pt", customerPhone: c.usman.phone },
    { dayOffset: 0, time: "19:00", service: "trial", customerPhone: c.fatima.phone },
    { dayOffset: 1, time: "06:30", service: "pt", customerPhone: c.ahmed.phone },
    { dayOffset: 1, time: "20:00", service: "trial", customerPhone: c.zainab.phone },
    { dayOffset: 2, time: "18:30", service: "pt", customerPhone: c.omar.phone },
    { dayOffset: 4, time: "19:00", service: "pt", customerPhone: c.usman.phone, cancelled: true },
    { dayOffset: 6, time: "10:00", service: "trial", customerPhone: c.ahmed.phone },
  ],
};
