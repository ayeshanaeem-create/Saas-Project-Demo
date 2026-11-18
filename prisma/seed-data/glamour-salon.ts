import { customers as c } from "./customers";
import { hoursOn, type SeedBusiness } from "./types";

export const glamourSalon: SeedBusiness = {
  slug: "glamour-salon",
  name: "Glamour Salon",
  emoji: "💇‍♀️",
  category: "salon",
  tagline: "Hair, skin and bridal studio",
  address: "Main Boulevard, Gulberg III, Lahore",
  phone: "+924235550101",
  slotIntervalMin: 30,
  // Closed on Mondays.
  hours: { ...hoursOn([2, 3, 4, 5, 6], "11:00", "21:00"), ...hoursOn([0], "12:00", "20:00") },
  services: [
    {
      key: "haircut",
      name: "Haircut",
      description: "Wash, cut and blow-dry with a senior stylist.",
      price: 1500,
      durationMin: 45,
      capacity: 2,
    },
    {
      key: "facial",
      name: "Facial",
      description: "Deep-cleansing facial with steam, mask and massage.",
      price: 3500,
      durationMin: 60,
      capacity: 1,
    },
    {
      key: "bridal",
      name: "Bridal Makeup",
      description: "Full bridal look: makeup, hairstyling and dupatta setting. Includes one trial.",
      price: 45000,
      durationMin: 180,
      capacity: 1,
    },
  ],
  persona: {
    agentName: "Sana",
    tone: "Warm, friendly and a little glamorous. Short messages. At most one emoji per message (✨ or 💇‍♀️).",
    greeting:
      "Hi! ✨ Welcome to Glamour Salon. I'm Sana. I can book a haircut, facial or bridal makeup for you. What would you like?",
    instructions: [
      "Bridal makeup needs at least 7 days' notice. For anything sooner, offer a handoff to the salon manager.",
      "Bridal bookings are confirmed with a 10,000 PKR advance, paid at the salon.",
      "Free cancellation up to 24 hours before the appointment.",
    ].join("\n"),
  },
  bookings: [
    { dayOffset: -1, time: "12:00", service: "haircut", customerPhone: c.hira.phone },
    { dayOffset: -1, time: "15:00", service: "facial", customerPhone: c.usman.phone },
    { dayOffset: 0, time: "11:30", service: "haircut", customerPhone: c.fatima.phone },
    { dayOffset: 0, time: "14:00", service: "facial", customerPhone: c.ahmed.phone },
    { dayOffset: 0, time: "17:00", service: "haircut", customerPhone: c.zainab.phone },
    { dayOffset: 1, time: "13:00", service: "haircut", customerPhone: c.usman.phone },
    {
      dayOffset: 2,
      time: "11:00",
      service: "bridal",
      customerPhone: c.omar.phone,
      notes: "Booked for a sister's walima. Trial done last week.",
    },
    { dayOffset: 3, time: "16:00", service: "facial", customerPhone: c.hira.phone, cancelled: true },
    { dayOffset: 4, time: "18:00", service: "haircut", customerPhone: c.ahmed.phone },
    { dayOffset: 5, time: "12:30", service: "facial", customerPhone: c.fatima.phone },
  ],
};
