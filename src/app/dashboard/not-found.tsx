import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1>Not found</h1>
      <p className="text-muted-foreground">That business or conversation isn&apos;t part of the demo.</p>
      <Link href="/dashboard" className="text-sm font-medium underline underline-offset-4">
        Back to the dashboard
      </Link>
    </div>
  );
}
