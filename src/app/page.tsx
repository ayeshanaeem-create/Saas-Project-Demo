import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  LayoutDashboard,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

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

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            BookMate AI
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            <a href="#pricing" className={buttonVariants({ variant: "ghost", size: "sm", className: "pointer-coarse:h-9" })}>
              Pricing
            </a>
            {/* On phones the hero's "See the owner dashboard" button covers this link. */}
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
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_auto]">
          <div className="flex max-w-xl flex-col gap-6">
            <span className="w-fit rounded-full bg-tint px-3 py-1 text-xs font-semibold text-primary">
              AI booking agent for WhatsApp
            </span>
            <h1>
              Your front desk, answering every WhatsApp message and call.
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
            <p className="text-sm text-muted-foreground">Four sample businesses, no sign-up.</p>
          </div>
          <ChatPreview />
        </section>

        <section aria-labelledby="how-heading" className="border-y bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="how-heading">
              How it works
            </h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-tint text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                  </span>
                  <h3>{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="features-heading">
            Built for appointment businesses
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3>{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="demo-heading" className="border-t bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
            <div className="flex flex-col gap-2">
              <h2 id="demo-heading">
                Try it with a demo business
              </h2>
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
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="pricing-heading">Simple monthly pricing</h2>
            <p className="mt-3 text-muted-foreground">Sample plans for this demo. Cancel any time.</p>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {PLANS.map((plan) => (
                <li key={plan.name}>
                  <PlanCard plan={plan} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          BookMate AI demo. The WhatsApp experience is simulated in the browser; no messages are sent through WhatsApp.
        </div>
      </footer>
    </div>
  );
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
    <div className="grid gap-4 md:grid-cols-2">
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
        "flex h-full flex-col gap-4 rounded-[14px] border bg-card p-[24px]",
        plan.popular && "border-2 border-primary p-[23px]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px]">{plan.name}</h3>
        {plan.popular && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Most popular</span>
        )}
      </div>
      <p className="font-heading text-[32px] leading-none font-bold text-heading">
        {plan.price}
        {plan.perMonth && <span className="font-sans text-[15px] font-normal text-muted-foreground"> / month</span>}
      </p>
      <ul className="flex flex-1 flex-col gap-2 text-[15px] text-muted-foreground">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden />
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
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading businesses">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
