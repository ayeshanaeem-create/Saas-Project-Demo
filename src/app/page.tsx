import {
  ArrowRight,
  CalendarCheck,
  Check,
  CircleCheck,
  Clock,
  LayoutDashboard,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { BusinessCard } from "@/components/business/business-card";
import { ChatPreview } from "@/components/marketing/chat-preview";
import { buttonVariants } from "@/components/ui/button";
import { getBusinessSummaries } from "@/lib/businesses";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Customers message or call",
    body: "On WhatsApp, the app they already use, at any hour. No forms, no app to download.",
  },
  {
    icon: CalendarCheck,
    title: "BookMate books them in",
    body: "It checks your real availability, suggests times, confirms the details and books, reschedules or cancels.",
  },
  {
    icon: LayoutDashboard,
    title: "You see everything live",
    body: "Every booking and conversation lands in your dashboard the moment it happens.",
  },
];

const FEATURES = [
  { icon: PhoneCall, title: "Chat and voice calls", body: "Answers typed messages and spoken calls with the same booking skills." },
  { icon: CalendarCheck, title: "No double-booking", body: "Works from your hours, service lengths and capacity, so a full slot stays full." },
  { icon: Store, title: "Knows your business", body: "Your services, prices, hours and house rules, in your own agent's voice." },
  { icon: UserRound, title: "Hands over to your team", body: "When a customer wants a person, it flags the chat for you straight away." },
  { icon: Clock, title: "Open 24/7", body: "Takes bookings at midnight and on holidays, while you're busy with customers." },
  { icon: ShieldCheck, title: "You stay in control", body: "Edit services, hours and the agent's tone, and see exactly what it did and why." },
];

// Feature icon tiles alternate between the brand green and the warm accent.
const FEATURE_TILES = ["bg-tint text-primary", "bg-sun/30 text-sun-foreground"];

const HIGHLIGHTS = ["4 sample businesses", "No sign-up", "Chat and voice calls"];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="BookMate AI home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {/* On phones only the logo and "Live demo" fit: pricing is a scroll away, and the
                hero's "See the owner dashboard" button covers the dashboard link. */}
            <a
              href="#pricing"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "pointer-coarse:h-9 max-sm:hidden" })}
            >
              Pricing
            </a>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "pointer-coarse:h-9 max-sm:hidden" })}
            >
              Dashboard
            </Link>
            <Link href="/demo" className={buttonVariants({ size: "sm", className: "pointer-coarse:h-9" })}>
              Live demo
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          {/* Soft colour behind the hero: a green glow top left, a warm one behind the phone. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-40 -left-32 size-[32rem] rounded-full bg-tint blur-3xl" />
            <div className="absolute top-1/3 -right-40 size-[30rem] rounded-full bg-sun/25 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-size-[22px_22px] opacity-70" />
          </div>
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_auto]">
            <div className="flex max-w-xl flex-col gap-6">
              <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-xs font-bold text-primary shadow-sm">
                <Sparkles className="size-3.5" aria-hidden />
                AI booking agent for WhatsApp
              </span>
              <h1>
                Your front desk, answering{" "}
                <span className="bg-linear-120 from-primary to-brand-to bg-clip-text text-transparent">
                  every WhatsApp message and call.
                </span>
              </h1>
              <p className="text-lg text-pretty text-muted-foreground">
                BookMate AI books appointments, answers questions and handles changes for salons, clinics, restaurants and
                gyms, day and night, straight into your calendar.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/demo" className={buttonVariants({ size: "lg" })}>
                  Try the live demo
                  <ArrowRight aria-hidden />
                </Link>
                <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  <LayoutDashboard aria-hidden />
                  See the owner dashboard
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CircleCheck className="size-4 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Same width as the phone, so the notification card overlaps the phone's edge. */}
            <div className="relative mx-auto w-full max-w-[340px]">
              <div
                aria-hidden
                className="absolute inset-x-6 inset-y-10 -z-10 rounded-full bg-linear-135 from-brand-from/45 to-sun/45 blur-3xl"
              />
              <ChatPreview />
              {/* A decorative "new booking" notification beside the phone (repeats the chat's outcome). */}
              <div
                aria-hidden
                className="absolute bottom-16 -left-16 hidden items-center gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-xl backdrop-blur sm:flex"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-linear-135 from-brand-from to-brand-to text-white">
                  <CalendarCheck className="size-[18px]" />
                </span>
                <span className="leading-tight">
                  <span className="block text-xs font-bold text-primary">New booking</span>
                  <span className="block text-sm font-semibold text-heading">Haircut · 5:00 PM</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="border-y bg-canvas">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <SectionEyebrow>Three steps</SectionEyebrow>
            <h2 id="how-heading">How it works</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li
                  key={title}
                  className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {/* Coloured top edge */}
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand-from to-sun" />
                  <span className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-linear-135 from-brand-from to-brand-to text-white shadow-[0_6px_14px_-6px_var(--primary-glow)]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-xs font-bold tracking-wider text-primary uppercase">Step {i + 1}</span>
                  </span>
                  <h3>{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <SectionEyebrow>Features</SectionEyebrow>
          <h2 id="features-heading">Built for appointment businesses</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                className="flex gap-4 rounded-2xl border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg"
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    FEATURE_TILES[i % FEATURE_TILES.length],
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="demo-heading" className="border-t bg-canvas">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
            <div className="flex flex-col gap-2">
              <SectionEyebrow>Live demo</SectionEyebrow>
              <h2 id="demo-heading">Try it with a demo business</h2>
              <p className="max-w-2xl text-muted-foreground">
                Each has its own services, hours and agent. Chat or call as a customer, then watch the booking appear in
                the owner&apos;s dashboard.
              </p>
            </div>
            <Suspense fallback={<BusinessGridSkeleton />}>
              <BusinessGrid />
            </Suspense>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-heading" className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <SectionEyebrow>Pricing</SectionEyebrow>
            <h2 id="pricing-heading">Simple monthly pricing</h2>
            <p className="mt-3 text-muted-foreground">Sample plans for this demo. Cancel any time.</p>
            <ul className="mt-10 grid items-stretch gap-5 md:grid-cols-3">
              {PLANS.map((plan) => (
                <li key={plan.name}>
                  <PlanCard plan={plan} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="px-4 pb-16 sm:px-6">
          <div className="relative isolate mx-auto flex w-full max-w-6xl flex-col items-start gap-6 overflow-hidden rounded-3xl bg-linear-135 from-brand-from to-brand-to px-6 py-10 text-white shadow-[0_24px_48px_-24px_var(--primary-glow)] sm:px-12 sm:py-14 md:flex-row md:items-center md:justify-between">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-sun/30 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 -z-10 size-72 rounded-full bg-white/10 blur-2xl" />
            <div className="flex max-w-xl flex-col gap-3">
              <h2 id="cta-heading" className="text-white">
                See BookMate take a booking
              </h2>
              <p className="text-white">
                Send a message from the demo phone and watch the booking land in the owner&apos;s dashboard, live.
              </p>
            </div>
            <Link href="/demo" className={buttonVariants({ variant: "inverse", size: "lg" })}>
              Try the live demo
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-canvas">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>The WhatsApp experience is simulated in the browser; no messages are sent through WhatsApp.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return <p className="mb-2 text-xs font-bold tracking-wider text-primary uppercase">{children}</p>;
}

async function BusinessGrid() {
  // Booking counts change constantly, so read them on every request.
  await connection();
  const businesses = await getBusinessSummaries();

  if (businesses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No businesses yet. Run <code className="font-mono">npm run db:seed</code> to load the demo data.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
}

type Plan = {
  name: string;
  price: string;
  perMonth: boolean;
  features: string[];
  cta: string;
  popular?: boolean;
};

// Sample plans for the demo. There is no sign-up or sales flow, so every button opens the live demo.
const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "Rs 6,000",
    perMonth: true,
    features: ["1 WhatsApp number", "Up to 300 bookings a month", "Owner dashboard"],
    cta: "Start free trial",
  },
  {
    name: "Growth",
    price: "Rs 12,000",
    perMonth: true,
    features: ["Chat and voice calls", "Up to 1,000 bookings a month", "Hand-off to your team"],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Multi-branch",
    price: "Custom",
    perMonth: false,
    features: ["Several locations and staff", "Custom agent rules", "Priority support"],
    cta: "Talk to us",
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={cn(
        // 24px padding inside a 1px border; the highlighted card's 2px border takes 1px of it.
        "flex h-full flex-col gap-4 rounded-2xl border bg-card p-[24px] transition-all duration-200 hover:shadow-lg",
        plan.popular &&
          "border-2 border-primary bg-linear-to-b from-tint to-card p-[23px] shadow-[0_24px_48px_-24px_var(--primary-glow)] hover:shadow-[0_28px_56px_-24px_var(--primary-glow)]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px]">{plan.name}</h3>
        {plan.popular && (
          <span className="flex items-center gap-1 rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-foreground shadow-sm">
            <Sparkles className="size-3.5" aria-hidden />
            Most popular
          </span>
        )}
      </div>
      <p className="font-heading text-[34px] leading-none font-bold text-heading">
        {plan.price}
        {plan.perMonth && <span className="font-sans text-[15px] font-normal text-muted-foreground"> / month</span>}
      </p>
      <ul className="flex flex-1 flex-col gap-2.5 text-[15px] text-muted-foreground">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-tint text-primary">
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/demo"
        className={buttonVariants({ variant: plan.popular ? "default" : "outline", className: "w-full" })}
      >
        {plan.cta}
      </Link>
    </article>
  );
}

function BusinessGridSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading businesses">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
