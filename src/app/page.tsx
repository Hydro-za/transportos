import Link from "next/link";
import { APP_NAME } from "@/config/app";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-5 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p style={{ color: "var(--muted)" }}>Fleet, jobs and dispatch management.</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-xl px-4 py-2.5 font-medium text-white" style={{ background: "var(--accent)" }}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
