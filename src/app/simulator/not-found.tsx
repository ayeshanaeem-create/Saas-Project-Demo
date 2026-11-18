import Link from "next/link";

export default function SimulatorNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-wa-surface p-8 text-center text-wa-text">
      <p className="text-[16px] font-medium">Chat not found</p>
      <p className="text-[14px] text-wa-meta">This business isn&apos;t part of the demo.</p>
      <Link href="/simulator" className="text-[14px] font-medium text-wa-primary">
        Back to chats
      </Link>
    </div>
  );
}
