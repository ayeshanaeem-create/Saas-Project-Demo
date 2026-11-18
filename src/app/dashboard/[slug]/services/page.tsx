import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { HoursEditor } from "@/components/dashboard/hours-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
import { ServiceEditor } from "@/components/dashboard/service-editor";
import { getBusinessBySlug, getServicesAndHours } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Services & hours" };

export default function ServicesPage({ params }: PageProps<"/dashboard/[slug]/services">) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Services params={params} />
    </Suspense>
  );
}

async function Services({ params }: Pick<PageProps<"/dashboard/[slug]/services">, "params">) {
  const { slug } = await params;
  await connection();
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();
  const { services, hours } = await getServicesAndHours(business);
  // Restaurants book tables: services with seats.
  const tables = services.length > 0 && services.every((s) => s.partySize !== null);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Services & hours"
        description="What customers can book, and when. The agent uses these on the next message; existing bookings stay as they are."
      />

      <section aria-labelledby="services-heading" className="flex flex-col gap-3">
        <h2 id="services-heading" className="font-heading text-lg font-medium">
          {tables ? "Tables" : "Services"}
        </h2>
        {services.map((service) => (
          <ServiceEditor key={service.id} slug={slug} service={service} tables={tables} />
        ))}
        <details className="group rounded-xl border border-dashed">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Plus className="size-4" aria-hidden />
            {tables ? "Add a table size" : "Add a service"}
          </summary>
          <div className="px-4 pb-4">
            <ServiceEditor slug={slug} tables={tables} />
          </div>
        </details>
      </section>

      <section aria-labelledby="hours-heading" className="flex flex-col gap-3">
        <h2 id="hours-heading" className="font-heading text-lg font-medium">
          Opening hours
        </h2>
        <HoursEditor slug={slug} hours={hours} slotIntervalMin={business.slotIntervalMin} />
      </section>
    </div>
  );
}
