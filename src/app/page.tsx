import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-5 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">TransportOS</h1>
      <p style={{ color: "var(--muted)" }}>Logistics, fleet and transport management for South African trucking companies.</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-xl px-4 py-2.5 font-medium text-white" style={{ background: "var(--accent)" }}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
