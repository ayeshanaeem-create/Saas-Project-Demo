import { Bot, CalendarCheck, Clock, LayoutDashboard, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { BusinessSummary } from "@/lib/businesses";
import { formatDuration, formatPrice } from "@/lib/format";
import { formatClockTime } from "@/lib/time";
import type { BusinessCategory } from "@/types/domain";

const categoryLabel: Record<BusinessCategory, string> = {
  salon: "Salon",
  dental: "Dental",
  restaurant: "Restaurant",
  fitness: "Fitness",
};

export function BusinessCard({ business }: { business: BusinessSummary }) {
  const { hoursToday, persona } = business;

  return (
    // @container: the footer stacks when the card itself is narrow (phones, and the
    // two-column grid on tablets), not just on small screens.
    <Card className="@container h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl"
          >
            {business.emoji}
          </span>
          <div className="min-w-0">
            {/* Wraps rather than truncating, so a long name never pushes the badge off the card. */}
            <CardTitle className="text-balance">{business.name}</CardTitle>
            <CardDescription>{business.tagline}</CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge variant="outline">{categoryLabel[business.category]}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="flex flex-col gap-2 text-muted-foreground">
          {persona && (
            <li className="flex gap-2">
              <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-medium text-foreground">{persona.agentName}</span>
                {" · "}
                {persona.tone}
              </span>
            </li>
          )}
          <li className="flex gap-2">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {hoursToday ? (
              <span>
                Open today {formatClockTime(hoursToday.opensAt)} – {formatClockTime(hoursToday.closesAt)}
              </span>
            ) : (
              <span>Closed today</span>
            )}
          </li>
          <li className="flex gap-2">
            <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {business.bookingsToday} {business.bookingsToday === 1 ? "booking" : "bookings"} today ·{" "}
              {business.upcomingBookings} upcoming
            </span>
          </li>
        </ul>

        <Separator />

        <ul className="flex flex-col gap-2">
          {business.services.map((service) => (
            <li key={service.id} className="flex items-baseline justify-between gap-4">
              <span className="font-medium">{service.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatDuration(service.durationMin)} · {formatPrice(service.price, business.currency)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 text-muted-foreground @md:flex-row @md:items-center @md:justify-between">
        <span className="flex min-w-0 items-start gap-2 @md:items-center">
          <MapPin className="mt-0.5 size-4 shrink-0 @md:mt-0" aria-hidden />
          <span className="@md:truncate">{business.address}</span>
        </span>
        <span className="flex shrink-0 gap-2">
          <Link
            href={`/dashboard/${business.slug}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "flex-1 pointer-coarse:h-9 @md:flex-none" })}
            aria-label={`${business.name} dashboard`}
          >
            <LayoutDashboard aria-hidden />
            Dashboard
          </Link>
          <Link
            href={`/demo/${business.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1 pointer-coarse:h-9 @md:flex-none" })}
            aria-label={`Try the ${business.name} demo`}
          >
            <MessageCircle aria-hidden />
            Try demo
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
